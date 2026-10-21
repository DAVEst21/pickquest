import { BadRequestException, Injectable } from '@nestjs/common';
import {
  BloquePlan,
  DependenciaBloque,
  EntregablePlan,
  Mecanica,
  PlanProyecto,
} from '@prisma/client';
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
import { BorradorLineaTiempoDto } from './linea-tiempo.dto';
import {
  calificarLineaTiempo,
  evaluarLineaTiempo,
  faltantesLineaTiempo,
  finDelPlan,
} from './linea-tiempo.calificacion';

interface ContenidoLineaTiempo {
  plan: PlanProyecto;
  bloques: BloquePlan[];
  dependencias: DependenciaBloque[];
  entregables: EntregablePlan[];
}

/** CU-08 Línea de tiempo (RF-11, RN-23). */
@Injectable()
export class LineaTiempoEvaluador implements EvaluadorMecanica {
  readonly mecanica = Mecanica.LINEA_TIEMPO;

  private async cargarContenido(db: Db, retoId: number): Promise<ContenidoLineaTiempo> {
    const plan = await db.planProyecto.findUniqueOrThrow({ where: { retoId } });
    const bloques = await db.bloquePlan.findMany({ where: { retoId }, orderBy: { id: 'asc' } });
    const ids = bloques.map((b) => b.id);
    const dependencias = await db.dependenciaBloque.findMany({
      where: { bloqueId: { in: ids } },
      orderBy: [{ bloqueId: 'asc' }, { requiereId: 'asc' }],
    });
    const entregables = await db.entregablePlan.findMany({ where: { retoId }, orderBy: { id: 'asc' } });
    return { plan, bloques, dependencias, entregables };
  }

  private async cargarRespuestas(db: Db, intentoId: number) {
    const posiciones = await db.posicionBloque.findMany({ where: { intentoId } });
    const asociaciones = await db.asociacionEntregable.findMany({ where: { intentoId } });
    return {
      inicios: new Map(posiciones.map((p) => [p.bloqueId, p.inicioSemana])),
      asociaciones: new Map(asociaciones.map((a) => [a.entregableId, a.faseBloqueId])),
    };
  }

  async contenidoPublico(db: Db, retoId: number): Promise<ContenidoPublicoDto> {
    const c = await this.cargarContenido(db, retoId);
    // Sin inicioReferencia, sin dependencias y sin faseCorrectaId: se evalúan en el servidor.
    return {
      modelo: c.plan.modelo,
      duracionMaximaSemanas: c.plan.duracionMaximaSemanas,
      bloques: c.bloques.map((b) => ({
        id: b.id,
        tipo: b.tipo,
        nombre: b.nombre,
        duracionSemanas: b.duracionSemanas,
      })),
      entregables: c.entregables.map((e) => ({ id: e.id, nombre: e.nombre })),
    };
  }

  async borrador(db: Db, intentoId: number): Promise<BorradorDto> {
    const posiciones = await db.posicionBloque.findMany({
      where: { intentoId },
      orderBy: { bloqueId: 'asc' },
    });
    const asociaciones = await db.asociacionEntregable.findMany({
      where: { intentoId },
      orderBy: { entregableId: 'asc' },
    });
    return {
      posiciones: posiciones.map((p) => ({ bloqueId: p.bloqueId, inicioSemana: p.inicioSemana })),
      asociaciones: asociaciones.map((a) => ({
        entregableId: a.entregableId,
        faseBloqueId: a.faseBloqueId,
      })),
    };
  }

  async guardarBorrador(db: Db, intentoId: number, cuerpo: unknown): Promise<void> {
    const dto = validarCuerpo(BorradorLineaTiempoDto, cuerpo);
    const retoId = await retoIdDeIntento(db, intentoId);
    const c = await this.cargarContenido(db, retoId);
    const bloquePorId = new Map(c.bloques.map((b) => [b.id, b]));
    const entregableIds = new Set(c.entregables.map((e) => e.id));

    for (const p of dto.posiciones) {
      if (!bloquePorId.has(p.bloqueId)) {
        throw new BadRequestException(`El bloque ${p.bloqueId} no pertenece a este reto`);
      }
    }
    for (const a of dto.asociaciones) {
      if (!entregableIds.has(a.entregableId)) {
        throw new BadRequestException(`El entregable ${a.entregableId} no pertenece a este reto`);
      }
      if (bloquePorId.get(a.faseBloqueId)?.tipo !== 'FASE') {
        throw new BadRequestException(
          `El bloque ${a.faseBloqueId} no es una fase: los entregables solo se asocian a fases`,
        );
      }
    }

    await db.posicionBloque.deleteMany({ where: { intentoId } });
    await db.asociacionEntregable.deleteMany({ where: { intentoId } });
    await db.posicionBloque.createMany({
      data: dto.posiciones.map((p) => ({ intentoId, ...p })),
    });
    await db.asociacionEntregable.createMany({
      data: dto.asociaciones.map((a) => ({ intentoId, ...a })),
    });
  }

  async faltantes(db: Db, intentoId: number): Promise<string[]> {
    const retoId = await retoIdDeIntento(db, intentoId);
    const c = await this.cargarContenido(db, retoId);
    const r = await this.cargarRespuestas(db, intentoId);
    return faltantesLineaTiempo(c.bloques, r.inicios, c.entregables, r.asociaciones);
  }

  async calificar(db: Db, intentoId: number): Promise<ResultadoCalificacion> {
    const retoId = await retoIdDeIntento(db, intentoId);
    const c = await this.cargarContenido(db, retoId);
    const r = await this.cargarRespuestas(db, intentoId);
    const entrada = {
      bloques: c.bloques,
      dependencias: c.dependencias,
      entregables: c.entregables,
      inicios: r.inicios,
      asociaciones: r.asociaciones,
      duracionMaximaSemanas: c.plan.duracionMaximaSemanas,
    };
    const detalle = evaluarLineaTiempo(entrada);
    const nombre = new Map(c.bloques.map((b) => [b.id, b.nombre]));

    return {
      porcentaje: calificarLineaTiempo(entrada),
      retroalimentacion: {
        mecanica: this.mecanica,
        finCalculado: detalle.fin,
        duracionMaximaSemanas: c.plan.duracionMaximaSemanas,
        dentroDelPlazo: detalle.dentroDelPlazo,
        dependenciasIncumplidas: detalle.dependenciasIncumplidas.map((d) => ({
          bloque: nombre.get(d.bloqueId),
          requiere: nombre.get(d.requiereId),
        })),
        entregablesMalAsociados: detalle.entregablesMal.map((e) => ({
          entregable: e.nombre,
          faseElegida: nombre.get(r.asociaciones.get(e.id) ?? -1) ?? null,
          faseCorrecta: nombre.get(e.faseCorrectaId),
        })),
        planReferencia: c.bloques.map((b) => ({
          bloqueId: b.id,
          nombre: b.nombre,
          tipo: b.tipo,
          inicio: b.inicioReferencia,
          duracionSemanas: b.duracionSemanas,
          inicioElegido: r.inicios.get(b.id) ?? null,
        })),
        finReferencia: finDelPlan(
          c.bloques,
          new Map(c.bloques.map((b) => [b.id, b.inicioReferencia])),
        ),
      },
    };
  }

  /** FA2: revela una dependencia, de preferencia una que el estudiante esté incumpliendo. */
  async aplicarAyuda(db: Db, intentoId: number): Promise<PistaDto> {
    const retoId = await retoIdDeIntento(db, intentoId);
    const c = await this.cargarContenido(db, retoId);
    const r = await this.cargarRespuestas(db, intentoId);
    const porId = new Map(c.bloques.map((b) => [b.id, b]));

    const incumplida = c.dependencias.find((d) => {
      const b = r.inicios.get(d.bloqueId);
      const req = r.inicios.get(d.requiereId);
      if (b === undefined || req === undefined) return false;
      return b < req + porId.get(d.requiereId)!.duracionSemanas;
    });
    const elegida = incumplida ?? c.dependencias[0];
    return {
      tipo: 'DEPENDENCIA',
      bloqueId: elegida?.bloqueId ?? null,
      requiereId: elegida?.requiereId ?? null,
    };
  }
}
