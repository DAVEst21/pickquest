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
import { BorradorMoscowDto } from './tablero-moscow.dto';
import {
  calificarMoscow,
  concordanciaOrdenMust,
  faltantesMoscow,
  TarjetaEval,
} from './tablero-moscow.calificacion';

/** CU-03 Tablero MoSCoW (RF-06, RN-18). */
@Injectable()
export class TableroMoscowEvaluador implements EvaluadorMecanica {
  readonly mecanica = Mecanica.TABLERO_MOSCOW;

  /** Tarjetas del reto combinadas con la respuesta del estudiante. */
  private async cargarTarjetas(db: Db, intentoId: number, retoId: number): Promise<TarjetaEval[]> {
    const tarjetas = await db.tarjetaRequerimiento.findMany({
      where: { retoId },
      orderBy: { orden: 'asc' },
    });
    const respuestas = await db.respuestaTarjeta.findMany({ where: { intentoId } });
    const porTarjeta = new Map(respuestas.map((r) => [r.tarjetaId, r]));
    return tarjetas.map((t) => {
      const r = porTarjeta.get(t.id);
      return {
        id: t.id,
        texto: t.texto,
        puntos: t.puntos,
        columnaCorrecta: t.columnaCorrecta,
        tipoCorrecto: t.tipoCorrecto,
        ordenMustReferencia: t.ordenMustReferencia,
        columna: r?.columna ?? null,
        tipo: r?.tipo ?? null,
        ordenMust: r?.ordenMust ?? null,
      };
    });
  }

  async contenidoPublico(db: Db, retoId: number): Promise<ContenidoPublicoDto> {
    const tablero = await db.tableroPriorizacion.findUniqueOrThrow({ where: { retoId } });
    const tarjetas = await db.tarjetaRequerimiento.findMany({
      where: { retoId },
      orderBy: { orden: 'asc' },
    });
    // Sin columnaCorrecta, tipoCorrecto ni ordenMustReferencia.
    return {
      capacidad: tablero.capacidad,
      tarjetas: tarjetas.map((t) => ({
        id: t.id,
        orden: t.orden,
        texto: t.texto,
        puntos: t.puntos,
      })),
    };
  }

  async borrador(db: Db, intentoId: number): Promise<BorradorDto> {
    const respuestas = await db.respuestaTarjeta.findMany({
      where: { intentoId },
      orderBy: { tarjetaId: 'asc' },
    });
    return {
      tarjetas: respuestas.map((r) => ({
        tarjetaId: r.tarjetaId,
        columna: r.columna,
        tipo: r.tipo,
        ordenMust: r.ordenMust,
      })),
    };
  }

  async guardarBorrador(db: Db, intentoId: number, cuerpo: unknown): Promise<void> {
    const dto = validarCuerpo(BorradorMoscowDto, cuerpo);
    const retoId = await retoIdDeIntento(db, intentoId);
    const validas = new Set(
      (await db.tarjetaRequerimiento.findMany({ where: { retoId }, select: { id: true } })).map(
        (t) => t.id,
      ),
    );
    for (const t of dto.tarjetas) {
      if (!validas.has(t.tarjetaId)) {
        throw new BadRequestException(`La tarjeta ${t.tarjetaId} no pertenece a este reto`);
      }
    }

    // El orden solo tiene sentido dentro de MUST: se normaliza a 1..n.
    const enMust = dto.tarjetas
      .filter((t) => t.columna === 'MUST')
      .sort(
        (a, b) =>
          (a.ordenMust ?? Number.MAX_SAFE_INTEGER) - (b.ordenMust ?? Number.MAX_SAFE_INTEGER) ||
          a.tarjetaId - b.tarjetaId,
      );
    const ordenNormalizado = new Map(enMust.map((t, i) => [t.tarjetaId, i + 1]));

    await db.respuestaTarjeta.deleteMany({ where: { intentoId } });
    await db.respuestaTarjeta.createMany({
      data: dto.tarjetas.map((t) => ({
        intentoId,
        tarjetaId: t.tarjetaId,
        columna: t.columna ?? null,
        tipo: t.tipo ?? null,
        ordenMust: ordenNormalizado.get(t.tarjetaId) ?? null,
      })),
    });
  }

  async faltantes(db: Db, intentoId: number): Promise<string[]> {
    const retoId = await retoIdDeIntento(db, intentoId);
    const tablero = await db.tableroPriorizacion.findUniqueOrThrow({ where: { retoId } });
    const tarjetas = await this.cargarTarjetas(db, intentoId, retoId);
    return faltantesMoscow(tarjetas, tablero.capacidad);
  }

  async calificar(db: Db, intentoId: number): Promise<ResultadoCalificacion> {
    const retoId = await retoIdDeIntento(db, intentoId);
    const tablero = await db.tableroPriorizacion.findUniqueOrThrow({ where: { retoId } });
    const tarjetas = await this.cargarTarjetas(db, intentoId, retoId);
    const concordancia = concordanciaOrdenMust(tarjetas);

    return {
      porcentaje: calificarMoscow(tarjetas),
      retroalimentacion: {
        mecanica: this.mecanica,
        capacidad: tablero.capacidad,
        tarjetas: tarjetas.map((t) => ({
          tarjetaId: t.id,
          texto: t.texto,
          puntos: t.puntos,
          columnaElegida: t.columna,
          tipoElegido: t.tipo,
          columnaCorrecta: t.columnaCorrecta,
          tipoCorrecto: t.tipoCorrecto,
          columnaAcertada: t.columna === t.columnaCorrecta,
          tipoAcertado: t.tipo === t.tipoCorrecto,
        })),
        ordenMustReferencia: tarjetas
          .filter((t) => t.columnaCorrecta === 'MUST')
          .sort((a, b) => (a.ordenMustReferencia ?? 0) - (b.ordenMustReferencia ?? 0))
          .map((t) => ({ tarjetaId: t.id, texto: t.texto, orden: t.ordenMustReferencia })),
        ordenMustConcordantes: concordancia.concordantes,
        ordenMustPares: concordancia.pares,
      },
    };
  }

  /** FA2: coloca y guarda una tarjeta en su columna correcta. */
  async aplicarAyuda(db: Db, intentoId: number): Promise<PistaDto> {
    const retoId = await retoIdDeIntento(db, intentoId);
    const tarjetas = await this.cargarTarjetas(db, intentoId, retoId);
    const objetivo = tarjetas.find((t) => t.columna !== t.columnaCorrecta);
    if (!objetivo) {
      throw new BadRequestException('Todas las tarjetas ya están en su columna correcta; no se consumió la ayuda');
    }
    const ultimoMust = Math.max(0, ...tarjetas.map((t) => t.ordenMust ?? 0));
    await this.guardarBorrador(db, intentoId, {
      tarjetas: tarjetas.map((t) => ({
        tarjetaId: t.id,
        columna: t.id === objetivo.id ? objetivo.columnaCorrecta : t.columna,
        tipo: t.tipo,
        ordenMust: t.id === objetivo.id
          ? (objetivo.columnaCorrecta === 'MUST' ? ultimoMust + 1 : null)
          : t.ordenMust,
      })),
    });
    return {
      tipo: 'COLUMNA_TARJETA',
      tarjetaId: objetivo.id,
      columna: objetivo.columnaCorrecta,
    };
  }
}
