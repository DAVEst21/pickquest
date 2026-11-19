import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { dateADia, diaADate, diaCalendarioMx } from '../../../common/fechas/dia-calendario';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { transaccionDeEstudiante } from '../../../common/prisma/transaccion-estudiante';
import { calcularDominio } from '../../progreso/dominio';
import { ProgresoService } from '../../progreso/progreso.service';
import { cargarProgresoFases } from '../progreso-fases';
import {
  MaterialTemaDto,
  ResumenSesionDto,
  SesionRepasoDto,
  TarjetaDto,
  TemaEstudioDto,
} from './estudio.dto';
import {
  AutoevaluacionTarjeta,
  debeOtorgarXpDeRepaso,
  posicionAlFinal,
  programarTarjeta,
  resumirAutoevaluaciones,
  tarjetasDeLaSesion,
  XP_REPASO,
} from './repaso.reglas';

type Db = Prisma.TransactionClient | PrismaService;

/** CU-09 FE1 (RN-01). */
export const MENSAJE_TEMA_BLOQUEADO =
  'Este tema se desbloquea al completar la fase anterior';

/**
 * CU-09 Repasar un tema con tarjetas de estudio (RF-12, RN-01, RN-24, RN-25, RN-26).
 */
@Injectable()
export class EstudioService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly progreso: ProgresoService,
  ) {}

  /** Paso 1: biblioteca de estudio, un tema por fase con su estado. */
  async temas(estudianteId: number): Promise<TemaEstudioDto[]> {
    const { fases, estados } = await cargarProgresoFases(this.prisma, estudianteId);
    const hoy = diaCalendarioMx();
    const tarjetas = await this.prisma.tarjeta.findMany({ select: { id: true, faseId: true, orden: true } });
    const programadas = await this.prisma.progresoTarjeta.findMany({ where: { estudianteId } });
    const proximo = new Map(programadas.map((p) => [p.tarjetaId, dateADia(p.proximoRepaso)]));
    const pendientes = await this.prisma.sesionRepaso.findMany({
      where: { estudianteId, terminadaEn: null },
      select: { faseId: true },
    });
    const dominios = await this.prisma.dominioTema.findMany({ where: { estudianteId } });

    return fases.map((fase) => {
      const delTema = tarjetas.filter((t) => t.faseId === fase.id);
      const estado = estados.get(fase.id) ?? 'bloqueada';
      return {
        faseId: fase.id,
        orden: fase.orden,
        nombre: fase.nombre,
        tema: fase.tema,
        estado,
        bloqueado: estado === 'bloqueada',
        totalTarjetas: delTema.length,
        tarjetasParaHoy: delTema.filter((t) => {
          const p = proximo.get(t.id);
          return p === undefined || p <= hoy;
        }).length,
        sesionPendiente: pendientes.some((s) => s.faseId === fase.id),
        dominio: dominios.find((d) => d.tema === fase.tema)?.porcentaje ?? null,
      };
    });
  }

  /** Pasos 2 y 3 y FE1: explicación, ejemplos y glosario del tema. */
  async material(estudianteId: number, faseId: number): Promise<MaterialTemaDto> {
    const fase = await this.faseDesbloqueada(this.prisma, estudianteId, faseId);
    const material = await this.prisma.materialTema.findUnique({ where: { faseId } });
    if (!material) throw new NotFoundException('Este tema todavía no tiene material de estudio');
    const ejemplos = await this.prisma.ejemploTema.findMany({ where: { faseId }, orderBy: { orden: 'asc' } });
    const glosario = await this.prisma.terminoGlosario.findMany({ where: { faseId }, orderBy: { termino: 'asc' } });
    return {
      faseId,
      nombre: fase.nombre,
      tema: fase.tema,
      explicacion: material.explicacion,
      ejemplos: ejemplos.map((e) => ({ orden: e.orden, titulo: e.titulo, texto: e.texto })),
      glosario: glosario.map((g) => ({ termino: g.termino, definicion: g.definicion })),
      totalTarjetas: await this.prisma.tarjeta.count({ where: { faseId } }),
      sesionPendiente:
        (await this.prisma.sesionRepaso.count({ where: { estudianteId, faseId, terminadaEn: null } })) > 0,
    };
  }

  /** FA1: el estudiante cerró el material sin repasar; el tema queda como consultado. */
  async registrarConsulta(estudianteId: number, faseId: number): Promise<{ consultaId: number }> {
    await this.faseDesbloqueada(this.prisma, estudianteId, faseId);
    const consulta = await this.prisma.consultaTema.create({ data: { estudianteId, faseId } });
    return { consultaId: consulta.id };
  }

  /**
   * Pasos 3 y 4. Retoma la sesión sin terminar (FA2) o crea una con las tarjetas
   * que tocan hoy: nuevas y vencidas; si ninguna, todo el mazo (RN-24).
   */
  iniciarSesion(estudianteId: number, faseId: number): Promise<SesionRepasoDto> {
    return transaccionDeEstudiante(this.prisma, estudianteId, async (tx) => {
      await this.faseDesbloqueada(tx, estudianteId, faseId);
      const pendiente = await tx.sesionRepaso.findFirst({
        where: { estudianteId, faseId, terminadaEn: null },
        orderBy: { id: 'desc' },
      });
      if (pendiente) return this.estado(tx, pendiente.id, true);

      const tarjetas = await tx.tarjeta.findMany({ where: { faseId }, select: { id: true, orden: true } });
      if (tarjetas.length === 0) throw new ConflictException('Este tema todavía no tiene tarjetas');
      const programadas = await tx.progresoTarjeta.findMany({
        where: { estudianteId, tarjetaId: { in: tarjetas.map((t) => t.id) } },
      });
      const ids = tarjetasDeLaSesion(
        tarjetas,
        new Map(programadas.map((p) => [p.tarjetaId, dateADia(p.proximoRepaso)])),
        diaCalendarioMx(),
      );
      const sesion = await tx.sesionRepaso.create({
        data: {
          estudianteId,
          faseId,
          tarjetas: { create: ids.map((tarjetaId, i) => ({ tarjetaId, posicion: i + 1 })) },
        },
      });
      return this.estado(tx, sesion.id, false);
    });
  }

  /** Estado de una sesión propia (para retomarla al volver). */
  async sesion(estudianteId: number, sesionId: number): Promise<SesionRepasoDto> {
    await this.sesionPropia(this.prisma, estudianteId, sesionId);
    return this.estado(this.prisma, sesionId, false);
  }

  /**
   * Pasos 7 a 10. Programa la tarjeta (RN-24); al completar todas, termina la sesión,
   * otorga 10 XP si es la primera del día en el tema (RN-25) y recalcula el dominio (RN-26).
   */
  autoevaluar(
    estudianteId: number,
    sesionId: number,
    tarjetaId: number,
    autoevaluacion: AutoevaluacionTarjeta,
  ): Promise<SesionRepasoDto> {
    return transaccionDeEstudiante(this.prisma, estudianteId, async (tx) => {
      const sesion = await this.sesionPropia(tx, estudianteId, sesionId);
      if (sesion.terminadaEn) throw new ConflictException('Esta sesión de repaso ya terminó');
      const delMazo = await tx.tarjetaSesion.findMany({ where: { sesionId } });
      const actual = delMazo.find((t) => t.tarjetaId === tarjetaId);
      if (!actual) throw new NotFoundException('Esa tarjeta no pertenece a la sesión');
      if (actual.completada) throw new ConflictException('Ya te autoevaluaste en esta tarjeta');

      const hoy = diaCalendarioMx();
      const programacion = programarTarjeta(autoevaluacion, hoy);
      await tx.progresoTarjeta.upsert({
        where: { estudianteId_tarjetaId: { estudianteId, tarjetaId } },
        update: { proximoRepaso: diaADate(programacion.proximoRepaso), ultimaAutoeval: autoevaluacion },
        create: {
          estudianteId,
          tarjetaId,
          proximoRepaso: diaADate(programacion.proximoRepaso),
          ultimaAutoeval: autoevaluacion,
        },
      });
      await tx.tarjetaSesion.update({
        where: { sesionId_tarjetaId: { sesionId, tarjetaId } },
        data: {
          autoevaluacion,
          primeraAutoevaluacion: actual.primeraAutoevaluacion ?? autoevaluacion,
          completada: programacion.completada,
          // «No lo sabía» pasa al final de la cola de la sesión (RN-24).
          ...(programacion.completada ? {} : { posicion: posicionAlFinal(delMazo.map((t) => t.posicion)) }),
        },
      });

      const quedan = await tx.tarjetaSesion.count({ where: { sesionId, completada: false } });
      if (quedan === 0) await this.terminar(tx, estudianteId, sesion.id, sesion.faseId, hoy);
      return this.estado(tx, sesionId, false);
    });
  }

  // ------------------------------------------------------------------

  private async terminar(
    tx: Prisma.TransactionClient,
    estudianteId: number,
    sesionId: number,
    faseId: number,
    hoy: string,
  ): Promise<void> {
    const previas = await tx.sesionRepaso.count({
      where: { estudianteId, faseId, diaTerminada: diaADate(hoy), id: { not: sesionId }, terminadaEn: { not: null } },
    });
    const xp = debeOtorgarXpDeRepaso(previas) ? XP_REPASO : 0;
    // RN-25: solo XP, sin QP.
    if (xp > 0) await this.progreso.otorgarRecompensa(tx, estudianteId, xp, 0);
    await tx.sesionRepaso.update({
      where: { id: sesionId },
      data: { terminadaEn: new Date(), diaTerminada: diaADate(hoy), xpOtorgada: xp },
    });
    const fase = await tx.fase.findUniqueOrThrow({ where: { id: faseId }, select: { tema: true } });
    await calcularDominio(tx, estudianteId, fase.tema);
  }

  /** RN-01: 404 si la fase no existe; 403 con el mensaje del anexo si está bloqueada (FE1). */
  private async faseDesbloqueada(db: Db, estudianteId: number, faseId: number) {
    const fase = await db.fase.findUnique({ where: { id: faseId } });
    if (!fase) throw new NotFoundException(`La fase ${faseId} no existe`);
    const { estados } = await cargarProgresoFases(db as Prisma.TransactionClient, estudianteId);
    if (estados.get(faseId) === 'bloqueada') throw new ForbiddenException(MENSAJE_TEMA_BLOQUEADO);
    return fase;
  }

  /** La sesión existe y es del estudiante; si no, 404 (no se revela si es de otro). */
  private async sesionPropia(db: Db, estudianteId: number, sesionId: number) {
    const sesion = await db.sesionRepaso.findFirst({ where: { id: sesionId, estudianteId } });
    if (!sesion) throw new NotFoundException('La sesión de repaso no existe');
    return sesion;
  }

  private async estado(db: Db, sesionId: number, retomada: boolean): Promise<SesionRepasoDto> {
    const sesion = await db.sesionRepaso.findUniqueOrThrow({
      where: { id: sesionId },
      include: {
        fase: { select: { nombre: true, tema: true } },
        tarjetas: { include: { tarjeta: true }, orderBy: { posicion: 'asc' } },
      },
    });
    const completadas = sesion.tarjetas.filter((t) => t.completada).length;
    const siguiente = sesion.tarjetas.find((t) => !t.completada);
    const terminada = sesion.terminadaEn !== null;

    let resumen: ResumenSesionDto | null = null;
    if (terminada) {
      const dominio = await db.dominioTema.findUnique({
        where: { estudianteId_tema: { estudianteId: sesion.estudianteId, tema: sesion.fase.tema } },
      });
      resumen = {
        ...resumirAutoevaluaciones(sesion.tarjetas.map((t) => t.primeraAutoevaluacion)),
        xpOtorgada: sesion.xpOtorgada,
        dominio: dominio?.porcentaje ?? 0,
      };
    }
    const tarjetaActual: TarjetaDto | null = siguiente
      ? {
          tarjetaId: siguiente.tarjetaId,
          posicion: siguiente.posicion,
          frente: siguiente.tarjeta.frente,
          reverso: siguiente.tarjeta.reverso,
        }
      : null;
    return {
      sesionId: sesion.id,
      faseId: sesion.faseId,
      nombre: sesion.fase.nombre,
      retomada,
      terminada,
      total: sesion.tarjetas.length,
      completadas,
      pendientes: sesion.tarjetas.length - completadas,
      tarjetaActual,
      resumen,
    };
  }
}
