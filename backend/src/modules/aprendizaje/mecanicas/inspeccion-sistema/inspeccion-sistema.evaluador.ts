import { BadRequestException, Injectable } from '@nestjs/common';
import { AtributoCalidad, Mecanica } from '@prisma/client';
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
import { BorradorInspeccionDto } from './inspeccion-sistema.dto';
import {
  calificarInspeccion,
  evaluarInspeccion,
  excedeMaxMarcas,
  faltantesInspeccion,
} from './inspeccion-sistema.calificacion';

/** CU-04 Inspección de un sistema (RF-07, RN-19). */
@Injectable()
export class InspeccionSistemaEvaluador implements EvaluadorMecanica {
  readonly mecanica = Mecanica.INSPECCION_SISTEMA;

  private pantallasConElementos(db: Db, retoId: number) {
    return db.pantallaSimulada.findMany({
      where: { retoId },
      orderBy: { orden: 'asc' },
      include: {
        elementos: { orderBy: { orden: 'asc' }, include: { falla: true } },
      },
    });
  }

  async contenidoPublico(db: Db, retoId: number): Promise<ContenidoPublicoDto> {
    const sistema = await db.sistemaInspeccion.findUniqueOrThrow({ where: { retoId } });
    const pantallas = await this.pantallasConElementos(db, retoId);
    // Sin la falla de cada elemento (atributo ni explicación).
    return {
      nombreAplicacion: sistema.nombreAplicacion,
      maxMarcas: sistema.maxMarcas,
      atributos: Object.values(AtributoCalidad),
      pantallas: pantallas.map((p) => ({
        id: p.id,
        orden: p.orden,
        titulo: p.titulo,
        elementos: p.elementos.map((e) => ({
          id: e.id,
          orden: e.orden,
          tipo: e.tipo,
          etiqueta: e.etiqueta,
          contenido: e.contenido,
          variante: e.variante,
        })),
      })),
    };
  }

  async borrador(db: Db, intentoId: number): Promise<BorradorDto> {
    // Sin ORDER BY: se conserva el orden en que se guardaron (numeración de las marcas).
    const marcas = await db.marcaInspeccion.findMany({ where: { intentoId } });
    return {
      marcas: marcas.map((m) => ({ elementoId: m.elementoId, atributo: m.atributo })),
    };
  }

  async guardarBorrador(db: Db, intentoId: number, cuerpo: unknown): Promise<void> {
    const dto = validarCuerpo(BorradorInspeccionDto, cuerpo);
    const retoId = await retoIdDeIntento(db, intentoId);
    const sistema = await db.sistemaInspeccion.findUniqueOrThrow({ where: { retoId } });
    if (excedeMaxMarcas(dto.marcas.length, sistema.maxMarcas)) {
      throw new BadRequestException(
        `Solo se permiten ${sistema.maxMarcas} marcas por intento (CU-04 FE1)`,
      );
    }
    const pantallas = await this.pantallasConElementos(db, retoId);
    const validos = new Set(pantallas.flatMap((p) => p.elementos.map((e) => e.id)));
    for (const m of dto.marcas) {
      if (!validos.has(m.elementoId)) {
        throw new BadRequestException(`El elemento ${m.elementoId} no pertenece a este sistema`);
      }
    }
    await db.marcaInspeccion.deleteMany({ where: { intentoId } });
    await db.marcaInspeccion.createMany({
      data: dto.marcas.map((m) => ({
        intentoId,
        elementoId: m.elementoId,
        atributo: m.atributo ?? null,
      })),
    });
  }

  async faltantes(db: Db, intentoId: number): Promise<string[]> {
    const retoId = await retoIdDeIntento(db, intentoId);
    const pantallas = await this.pantallasConElementos(db, retoId);
    const etiqueta = new Map(
      pantallas.flatMap((p) => p.elementos.map((e) => [e.id, e.etiqueta] as const)),
    );
    const marcas = await db.marcaInspeccion.findMany({ where: { intentoId } });
    return faltantesInspeccion(marcas, (id) => etiqueta.get(id) ?? `elemento ${id}`);
  }

  async calificar(db: Db, intentoId: number): Promise<ResultadoCalificacion> {
    const retoId = await retoIdDeIntento(db, intentoId);
    const pantallas = await this.pantallasConElementos(db, retoId);
    const elementos = pantallas.flatMap((p) => p.elementos.map((e) => ({ ...e, pantalla: p })));
    const porId = new Map(elementos.map((e) => [e.id, e]));
    const fallas = elementos
      .filter((e) => e.falla)
      .map((e) => ({ elementoId: e.id, atributo: e.falla!.atributo as string }));
    const marcas = await db.marcaInspeccion.findMany({ where: { intentoId } });
    const marcasEval = marcas.map((m) => ({
      elementoId: m.elementoId,
      atributo: m.atributo as string | null,
    }));

    const detalle = evaluarInspeccion(fallas, marcasEval);
    return {
      porcentaje: calificarInspeccion(fallas, marcasEval),
      retroalimentacion: {
        mecanica: this.mecanica,
        encontradas: detalle.encontradas.map((e) => {
          const el = porId.get(e.falla.elementoId)!;
          return {
            elementoId: el.id,
            etiqueta: el.etiqueta,
            pantalla: el.pantalla.titulo,
            atributoCorrecto: el.falla!.atributo,
            atributoElegido: e.marca.atributo,
            atributoAcertado: e.atributoAcertado,
            explicacion: el.falla!.explicacion,
          };
        }),
        noEncontradas: detalle.noEncontradas.map((f) => {
          const el = porId.get(f.elementoId)!;
          return {
            elementoId: el.id,
            etiqueta: el.etiqueta,
            pantallaId: el.pantalla.id,
            pantalla: el.pantalla.titulo,
            atributoCorrecto: el.falla!.atributo,
            explicacion: el.falla!.explicacion,
          };
        }),
        marcasSinFalla: detalle.marcasSinFalla.map((m) => {
          const el = porId.get(m.elementoId)!;
          return { elementoId: el.id, etiqueta: el.etiqueta, pantalla: el.pantalla.titulo };
        }),
      },
    };
  }

  /** FA2: devuelve una pantalla que contiene una falla aún no marcada. */
  async aplicarAyuda(db: Db, intentoId: number): Promise<PistaDto> {
    const retoId = await retoIdDeIntento(db, intentoId);
    const pantallas = await this.pantallasConElementos(db, retoId);
    const marcados = new Set(
      (await db.marcaInspeccion.findMany({ where: { intentoId } })).map((m) => m.elementoId),
    );
    const pantalla =
      pantallas.find((p) => p.elementos.some((e) => e.falla && !marcados.has(e.id))) ?? pantallas[0];
    return { tipo: 'PANTALLA', pantallaId: pantalla?.id ?? null };
  }
}
