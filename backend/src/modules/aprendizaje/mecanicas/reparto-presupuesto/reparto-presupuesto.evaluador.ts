import { BadRequestException, Injectable } from '@nestjs/common';
import { Mecanica } from '@prisma/client';
import {
  BorradorDto,
  ContenidoPublicoDto,
  Db,
  EvaluadorMecanica,
  PistaDto,
  ResultadoCalificacion,
  retoIdDeIntento,
} from '../tipos';
import { validarCuerpo } from '../validar-cuerpo';
import { BorradorPresupuestoDto } from './reparto-presupuesto.dto';
import {
  AtributoEval,
  calcularMedidores,
  EfectoEval,
  evaluarPresupuesto,
  faltantesPresupuesto,
  porcentajePresupuesto,
  restriccionMasLejana,
} from './reparto-presupuesto.calificacion';

/** CU-06 Reparto de presupuesto (RF-09, RN-21). */
@Injectable()
export class RepartoPresupuestoEvaluador implements EvaluadorMecanica {
  readonly mecanica = Mecanica.REPARTO_PRESUPUESTO;

  private async cargarContenido(db: Db, retoId: number) {
    const escenario = await db.escenarioPresupuesto.findUniqueOrThrow({ where: { retoId } });
    const filas = await db.atributoEscenario.findMany({ where: { retoId }, orderBy: { id: 'asc' } });
    const atributos: (AtributoEval & { atributo: string })[] = filas.map((a) => ({
      id: a.id,
      atributo: a.atributo,
      valorBase: a.valorBase,
      ganancia: Number(a.ganancia),
      minimoObligatorio: a.minimoObligatorio,
      asignacionReferencia: a.asignacionReferencia,
    }));
    const efectosDb = await db.efectoCruzado.findMany({
      where: { origenId: { in: filas.map((a) => a.id) } },
      orderBy: [{ origenId: 'asc' }, { destinoId: 'asc' }],
    });
    const efectos: EfectoEval[] = efectosDb.map((e) => ({
      origenId: e.origenId,
      destinoId: e.destinoId,
      factor: Number(e.factor),
    }));
    const justificaciones = await db.opcionJustificacion.findMany({
      where: { retoId },
      orderBy: { orden: 'asc' },
    });
    return { escenario, atributos, efectos, justificaciones };
  }

  private async cargarRespuesta(db: Db, intentoId: number) {
    const asignaciones = await db.asignacionPuntos.findMany({ where: { intentoId } });
    const respuesta = await db.respuestaPresupuesto.findUnique({ where: { intentoId } });
    return {
      puntos: new Map(asignaciones.map((a) => [a.atributoEscenarioId, a.puntos])),
      justificacionId: respuesta?.justificacionId ?? null,
    };
  }

  async contenidoPublico(db: Db, retoId: number): Promise<ContenidoPublicoDto> {
    const c = await this.cargarContenido(db, retoId);
    // Sin asignacionReferencia ni cuál justificación es la correcta.
    return {
      presupuesto: c.escenario.presupuesto,
      atributos: c.atributos.map((a) => ({
        id: a.id,
        atributo: a.atributo,
        valorBase: a.valorBase,
        ganancia: a.ganancia,
        minimoObligatorio: a.minimoObligatorio,
      })),
      efectos: c.efectos,
      justificaciones: c.justificaciones.map((j) => ({ id: j.id, texto: j.texto })),
    };
  }

  async borrador(db: Db, intentoId: number): Promise<BorradorDto> {
    const r = await this.cargarRespuesta(db, intentoId);
    return {
      asignaciones: [...r.puntos.entries()].map(([atributoEscenarioId, puntos]) => ({
        atributoEscenarioId,
        puntos,
      })),
      justificacionId: r.justificacionId,
    };
  }

  async guardarBorrador(db: Db, intentoId: number, cuerpo: unknown): Promise<void> {
    const dto = validarCuerpo(BorradorPresupuestoDto, cuerpo);
    const retoId = await retoIdDeIntento(db, intentoId);
    const c = await this.cargarContenido(db, retoId);

    const atributosValidos = new Set(c.atributos.map((a) => a.id));
    for (const a of dto.asignaciones) {
      if (!atributosValidos.has(a.atributoEscenarioId)) {
        throw new BadRequestException(
          `El atributo ${a.atributoEscenarioId} no pertenece a este escenario`,
        );
      }
    }
    // CU-06 FE1: no se puede asignar más que el presupuesto.
    const total = dto.asignaciones.reduce((s, a) => s + a.puntos, 0);
    if (total > c.escenario.presupuesto) {
      throw new BadRequestException(
        `Asignaste ${total} puntos y el presupuesto es de ${c.escenario.presupuesto} (CU-06 FE1)`,
      );
    }
    const justificacionId = dto.justificacionId ?? null;
    if (justificacionId !== null && !c.justificaciones.some((j) => j.id === justificacionId)) {
      throw new BadRequestException(`La justificación ${justificacionId} no pertenece a este reto`);
    }

    await db.asignacionPuntos.deleteMany({ where: { intentoId } });
    await db.asignacionPuntos.createMany({
      data: dto.asignaciones.map((a) => ({ intentoId, ...a })),
    });
    await db.respuestaPresupuesto.upsert({
      where: { intentoId },
      update: { justificacionId },
      create: { intentoId, justificacionId },
    });
  }

  async faltantes(db: Db, intentoId: number): Promise<string[]> {
    const retoId = await retoIdDeIntento(db, intentoId);
    const c = await this.cargarContenido(db, retoId);
    const r = await this.cargarRespuesta(db, intentoId);
    const asignado = [...r.puntos.values()].reduce((s, p) => s + p, 0);
    return faltantesPresupuesto(r.justificacionId, asignado, c.escenario.presupuesto);
  }

  async calificar(db: Db, intentoId: number): Promise<ResultadoCalificacion> {
    const retoId = await retoIdDeIntento(db, intentoId);
    const c = await this.cargarContenido(db, retoId);
    const r = await this.cargarRespuesta(db, intentoId);

    const medidores = calcularMedidores(c.atributos, c.efectos, r.puntos);
    const referencia = new Map(c.atributos.map((a) => [a.id, a.asignacionReferencia]));
    const medidoresReferencia = calcularMedidores(c.atributos, c.efectos, referencia);
    const detalle = evaluarPresupuesto(c.atributos, r.puntos, medidores);

    const elegida = c.justificaciones.find((j) => j.id === r.justificacionId) ?? null;
    const correcta = c.justificaciones.find((j) => j.correcta) ?? null;
    const justificacionCorrecta = elegida?.correcta === true;

    return {
      porcentaje: porcentajePresupuesto(detalle, c.escenario.presupuesto, justificacionCorrecta),
      retroalimentacion: {
        mecanica: this.mecanica,
        presupuesto: c.escenario.presupuesto,
        atributos: c.atributos.map((a) => ({
          atributoEscenarioId: a.id,
          atributo: a.atributo,
          asignado: r.puntos.get(a.id) ?? 0,
          referencia: a.asignacionReferencia,
          medidor: medidores.get(a.id),
          medidorReferencia: medidoresReferencia.get(a.id),
          minimo: a.minimoObligatorio,
          cumple: a.minimoObligatorio === null ? null : (medidores.get(a.id) ?? 0) >= a.minimoObligatorio,
        })),
        restriccionesCumplidas: detalle.restriccionesCumplidas,
        restriccionesTotales: detalle.restriccionesTotales,
        justificacionElegida: elegida ? { id: elegida.id, texto: elegida.texto } : null,
        justificacionCorrecta: correcta ? { id: correcta.id, texto: correcta.texto } : null,
        justificacionAcertada: justificacionCorrecta,
      },
    };
  }

  /** FA2: devuelve la restricción obligatoria que está más lejos de cumplirse. */
  async aplicarAyuda(db: Db, intentoId: number): Promise<PistaDto> {
    const retoId = await retoIdDeIntento(db, intentoId);
    const c = await this.cargarContenido(db, retoId);
    const r = await this.cargarRespuesta(db, intentoId);
    const medidores = calcularMedidores(c.atributos, c.efectos, r.puntos);
    const lejana = restriccionMasLejana(c.atributos, medidores);
    return {
      tipo: 'RESTRICCION',
      atributoEscenarioId: lejana?.atributo.id ?? null,
      minimo: lejana?.atributo.minimoObligatorio ?? null,
    };
  }
}
