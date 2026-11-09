import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, TemaFase } from '@prisma/client';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { transaccionDeEstudiante } from '../../../common/prisma/transaccion-estudiante';
import { calcularDominio } from '../../progreso/dominio';
import { retoDesbloqueado } from '../estado-fases';
import { cargarProgresoFases } from '../progreso-fases';
import {
  ActividadPlanDto,
  DiagnosticoIniciadoDto,
  DiagnosticoTerminadoDto,
  PlanActivoDto,
  PlanEstudioDto,
  ResultadoTemaDto,
  RevisionPreguntaDto,
} from './plan.dto';
import {
  elegirAlAzar,
  esTemaDebil,
  generarPlan,
  PREGUNTAS_POR_TEMA,
  porcentajeDeTema,
  preguntasPendientes,
  TEMAS_DIAGNOSTICO,
  TemaParaPlan,
  validarAjuste,
} from './plan.reglas';

type Db = Prisma.TransactionClient | PrismaService;

/**
 * CU-10 Diagnóstico y plan de estudio (RF-13, RN-26, RN-27): un diagnóstico de 9 preguntas
 * (3 por tema) calcula el dominio y genera un plan que el estudiante ajusta y acepta.
 */
@Injectable()
export class PlanService {
  constructor(private readonly prisma: PrismaService) {}

  // ------------------------------------------------------------------
  // Pasos 1 y 2: el diagnóstico (sin la opción correcta)
  // ------------------------------------------------------------------

  async iniciarDiagnostico(estudianteId: number): Promise<DiagnosticoIniciadoDto> {
    const elegidas: number[] = [];
    for (const tema of TEMAS_DIAGNOSTICO) {
      const banco = await this.prisma.preguntaBanco.findMany({ where: { tema, activa: true }, select: { id: true } });
      if (banco.length < PREGUNTAS_POR_TEMA) {
        throw new ConflictException('El banco de preguntas todavía no tiene suficientes preguntas para el diagnóstico');
      }
      elegidas.push(...elegirAlAzar(banco.map((p) => p.id), PREGUNTAS_POR_TEMA));
    }
    // Se mezclan los temas para que las preguntas no salgan agrupadas.
    const orden = elegirAlAzar(elegidas, elegidas.length);
    const diagnostico = await this.prisma.diagnostico.create({
      data: {
        estudianteId,
        preguntas: { create: orden.map((preguntaId, i) => ({ preguntaId, orden: i + 1 })) },
      },
    });
    return { diagnosticoId: diagnostico.id, preguntas: await this.preguntasDe(this.prisma, diagnostico.id) };
  }

  /** Preguntas de un diagnóstico propio, para retomarlo. */
  async obtenerDiagnostico(estudianteId: number, diagnosticoId: number): Promise<DiagnosticoIniciadoDto> {
    await this.diagnosticoPropio(this.prisma, estudianteId, diagnosticoId);
    return { diagnosticoId, preguntas: await this.preguntasDe(this.prisma, diagnosticoId) };
  }

  // ------------------------------------------------------------------
  // Pasos 3 a 6: terminar el diagnóstico, dominio y plan propuesto
  // ------------------------------------------------------------------

  responderDiagnostico(
    estudianteId: number,
    diagnosticoId: number,
    respuestas: { preguntaId: number; opcionId: number }[],
  ): Promise<DiagnosticoTerminadoDto> {
    return transaccionDeEstudiante(this.prisma, estudianteId, async (tx) => {
      const diagnostico = await this.diagnosticoPropio(tx, estudianteId, diagnosticoId);
      if (diagnostico.terminadoEn) throw new ConflictException('Este diagnóstico ya se terminó');

      const delDiagnostico = await tx.preguntaDiagnostico.findMany({
        where: { diagnosticoId },
        include: { pregunta: { include: { opciones: true } } },
        orderBy: { orden: 'asc' },
      });
      const porPregunta = new Map(delDiagnostico.map((d) => [d.preguntaId, d.pregunta]));

      const vistas = new Set<number>();
      for (const r of respuestas) {
        const pregunta = porPregunta.get(r.preguntaId);
        if (!pregunta) throw new BadRequestException(`La pregunta ${r.preguntaId} no es de este diagnóstico`);
        if (vistas.has(r.preguntaId)) throw new BadRequestException(`La pregunta ${r.preguntaId} se respondió dos veces`);
        vistas.add(r.preguntaId);
        if (!pregunta.opciones.some((o) => o.id === r.opcionId)) {
          throw new BadRequestException(`La opción ${r.opcionId} no pertenece a la pregunta ${r.preguntaId}`);
        }
      }

      // FE1: preguntas sin responder → no se califica ni se genera el plan.
      const pendientes = preguntasPendientes(
        delDiagnostico.map((d) => d.preguntaId),
        respuestas.map((r) => r.preguntaId),
      );
      if (pendientes.length > 0) {
        throw new BadRequestException({
          statusCode: 400,
          error: 'Bad Request',
          message:
            pendientes.length === 1
              ? 'Falta 1 pregunta por responder'
              : `Faltan ${pendientes.length} preguntas por responder`,
          pendientes,
        });
      }

      const aciertosPorTema = new Map<TemaFase, number>();
      const revision: RevisionPreguntaDto[] = [];
      for (const d of delDiagnostico) {
        const elegida = respuestas.find((r) => r.preguntaId === d.preguntaId)!;
        const correcta = d.pregunta.opciones.find((o) => o.correcta)!;
        const acerto = elegida.opcionId === correcta.id;
        await tx.respuestaDiagnostico.create({
          data: { diagnosticoId, preguntaId: d.preguntaId, opcionId: elegida.opcionId, correcta: acerto },
        });
        if (acerto) aciertosPorTema.set(d.pregunta.tema, (aciertosPorTema.get(d.pregunta.tema) ?? 0) + 1);
        revision.push({
          preguntaId: d.preguntaId,
          enunciado: d.pregunta.enunciado,
          opcionElegidaId: elegida.opcionId,
          opcionCorrectaId: correcta.id,
          correcta: acerto,
          explicacion: d.pregunta.explicacion,
        });
      }

      const fases = await tx.fase.findMany({ select: { tema: true, nombre: true } });
      const nombreDe = new Map(fases.map((f) => [f.tema, f.nombre]));
      const resultados: ResultadoTemaDto[] = [];
      for (const tema of TEMAS_DIAGNOSTICO) {
        const preguntas = delDiagnostico.filter((d) => d.pregunta.tema === tema).length;
        const aciertos = aciertosPorTema.get(tema) ?? 0;
        const porcentaje = porcentajeDeTema(aciertos, preguntas);
        await tx.resultadoDiagnosticoTema.create({ data: { diagnosticoId, tema, porcentaje } });
        resultados.push({
          tema,
          nombre: nombreDe.get(tema) ?? tema,
          aciertos,
          preguntas,
          porcentaje,
          dominio: 0,
          debil: false,
        });
      }
      await tx.diagnostico.update({ where: { id: diagnosticoId }, data: { terminadoEn: new Date() } });

      // RN-26: el diagnóstico recién guardado cuenta como «último diagnóstico del tema».
      for (const r of resultados) {
        r.dominio = await calcularDominio(tx, estudianteId, r.tema as TemaFase);
        r.debil = esTemaDebil(r.dominio);
      }

      const plan = await this.crearPlanPropuesto(tx, estudianteId, diagnosticoId);
      return { diagnosticoId, resultados, revision, plan: await this.aDto(tx, plan.id) };
    });
  }

  // ------------------------------------------------------------------
  // Pasos 7 y 8, FA1 y FA2: ajustar y aceptar
  // ------------------------------------------------------------------

  aceptarPlan(estudianteId: number, planId: number, actividadIds: number[]): Promise<PlanEstudioDto> {
    return transaccionDeEstudiante(this.prisma, estudianteId, async (tx) => {
      const plan = await tx.planEstudio.findFirst({
        where: { id: planId, estudianteId },
        include: { actividades: true },
      });
      if (!plan) throw new NotFoundException('El plan no existe');
      if (plan.estado !== 'PROPUESTO') throw new ConflictException('Este plan ya no es una propuesta');
      const motivo = validarAjuste(
        plan.actividades.map((a) => a.id),
        actividadIds,
      );
      if (motivo) throw new BadRequestException(motivo);

      await tx.actividadPlan.deleteMany({ where: { planId, id: { notIn: actividadIds } } });
      for (const [i, id] of actividadIds.entries()) {
        await tx.actividadPlan.update({ where: { id }, data: { orden: i + 1 } });
      }
      // El plan activo anterior se reemplaza solo al aceptar el nuevo.
      await tx.planEstudio.updateMany({
        where: { estudianteId, estado: 'ACTIVO' },
        data: { estado: 'REEMPLAZADO' },
      });
      await tx.planEstudio.update({ where: { id: planId }, data: { estado: 'ACTIVO', aceptadoEn: new Date() } });
      return this.aDto(tx, planId);
    });
  }

  async planActivo(estudianteId: number): Promise<PlanActivoDto> {
    const plan = await this.prisma.planEstudio.findFirst({
      where: { estudianteId, estado: 'ACTIVO' },
      orderBy: { aceptadoEn: 'desc' },
    });
    return { plan: plan ? await this.aDto(this.prisma, plan.id) : null };
  }

  async obtenerPlan(estudianteId: number, planId: number): Promise<PlanEstudioDto> {
    const plan = await this.prisma.planEstudio.findFirst({ where: { id: planId, estudianteId } });
    if (!plan) throw new NotFoundException('El plan no existe');
    return this.aDto(this.prisma, planId);
  }

  // ------------------------------------------------------------------

  private async diagnosticoPropio(db: Db, estudianteId: number, diagnosticoId: number) {
    const diagnostico = await db.diagnostico.findFirst({ where: { id: diagnosticoId, estudianteId } });
    if (!diagnostico) throw new NotFoundException('El diagnóstico no existe');
    return diagnostico;
  }

  private async preguntasDe(db: Db, diagnosticoId: number) {
    const filas = await db.preguntaDiagnostico.findMany({
      where: { diagnosticoId },
      orderBy: { orden: 'asc' },
      include: { pregunta: { include: { opciones: { orderBy: { orden: 'asc' } } } } },
    });
    // Solo id y texto de cada opción: nunca cuál es la correcta.
    return filas.map((f) => ({
      preguntaId: f.preguntaId,
      orden: f.orden,
      enunciado: f.pregunta.enunciado,
      opciones: f.pregunta.opciones.map((o) => ({ opcionId: o.id, texto: o.texto })),
    }));
  }

  /** RN-27: arma el plan con el dominio vigente y el estado de las fases y los retos. */
  private async crearPlanPropuesto(tx: Prisma.TransactionClient, estudianteId: number, diagnosticoId: number) {
    const { fases, estados, resumen } = await cargarProgresoFases(tx, estudianteId);
    const retos = await tx.reto.findMany({ select: { id: true, titulo: true } });
    const titulo = new Map(retos.map((r) => [r.id, r.titulo]));
    const dominios = await tx.dominioTema.findMany({ where: { estudianteId } });

    const temas: TemaParaPlan[] = fases.map((f) => ({
      tema: f.tema,
      nombre: f.nombre,
      faseOrden: f.orden,
      faseDesbloqueada: estados.get(f.id) !== 'bloqueada',
      dominio: dominios.find((d) => d.tema === f.tema)?.porcentaje ?? 0,
      retos: f.retos.map((r) => {
        const resumenReto = resumen.get(r.id);
        return {
          id: r.id,
          orden: r.orden,
          titulo: titulo.get(r.id) ?? `Reto ${r.id}`,
          desbloqueado: estados.get(f.id) !== 'bloqueada' && retoDesbloqueado(r, f.retos, resumen),
          aprobado: resumenReto?.aprobado ?? false,
          mejorPorcentaje: resumenReto?.mejorPorcentaje ?? null,
          mejorEstrellas: resumenReto?.mejorEstrellas ?? null,
        };
      }),
    }));

    const generado = generarPlan(temas);
    return tx.planEstudio.create({
      data: {
        estudianteId,
        diagnosticoId,
        estado: 'PROPUESTO',
        esPlanMejora: generado.esPlanMejora,
        actividades: {
          create: generado.actividades.map((a, i) => ({
            orden: i + 1,
            tipo: a.tipo,
            tema: a.tema,
            retoId: a.retoId,
            motivo: a.motivo,
          })),
        },
      },
    });
  }

  /**
   * El avance se calcula al consultar: una actividad está hecha si, después de aceptar el plan,
   * el reto quedó aprobado (RETO), hay una sesión de repaso terminada del tema (REPASO) o un duelo
   * terminado del tema (DUELO).
   */
  async aDto(db: Db, planId: number): Promise<PlanEstudioDto> {
    const plan = await db.planEstudio.findUniqueOrThrow({
      where: { id: planId },
      include: { actividades: { orderBy: { orden: 'asc' }, include: { reto: { select: { titulo: true } } } } },
    });
    const fases = await db.fase.findMany({ select: { id: true, tema: true, nombre: true } });
    const faseDe = new Map(fases.map((f) => [f.tema, f]));
    const desde = plan.estado === 'ACTIVO' || plan.estado === 'REEMPLAZADO' ? plan.aceptadoEn : null;

    const actividades: ActividadPlanDto[] = [];
    for (const a of plan.actividades) {
      const fase = faseDe.get(a.tema)!;
      actividades.push({
        actividadId: a.id,
        orden: a.orden,
        tipo: a.tipo,
        tema: a.tema,
        temaNombre: fase.nombre,
        faseId: fase.id,
        retoId: a.retoId,
        retoTitulo: a.reto?.titulo ?? null,
        motivo: a.motivo,
        hecha: desde ? await this.estaHecha(db, plan.estudianteId, a, fase.id, desde) : false,
      });
    }
    const hechas = actividades.filter((a) => a.hecha).length;
    return {
      planId: plan.id,
      estado: plan.estado,
      esPlanMejora: plan.esPlanMejora,
      creadoEn: plan.creadoEn,
      aceptadoEn: plan.aceptadoEn,
      actividades,
      avance: {
        hechas,
        total: actividades.length,
        porcentaje: actividades.length === 0 ? 0 : Math.round((hechas / actividades.length) * 100),
      },
    };
  }

  private async estaHecha(
    db: Db,
    estudianteId: number,
    actividad: { tipo: string; tema: TemaFase; retoId: number | null },
    faseId: number,
    desde: Date,
  ): Promise<boolean> {
    switch (actividad.tipo) {
      case 'RETO':
        return (
          actividad.retoId !== null &&
          (await db.intentoReto.count({
            where: {
              estudianteId,
              retoId: actividad.retoId,
              estado: 'CALIFICADO',
              aprobado: true,
              calificadoEn: { gt: desde },
            },
          })) > 0
        );
      case 'REPASO':
        return (
          (await db.sesionRepaso.count({
            where: { estudianteId, faseId, terminadaEn: { gt: desde } },
          })) > 0
        );
      default:
        // DUELO: se completa con el módulo de duelos (CU-13).
        return false;
    }
  }
}
