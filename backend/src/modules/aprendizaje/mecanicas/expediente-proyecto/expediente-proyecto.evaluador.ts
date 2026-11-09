import { BadRequestException, Injectable } from '@nestjs/common';
import { Mecanica, ModeloCicloVida } from '@prisma/client';
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
import { BorradorExpedienteDto } from './expediente-proyecto.dto';
import {
  calificarExpediente,
  faltantesExpediente,
  MINIMO_VINCULOS,
} from './expediente-proyecto.calificacion';

export const MODELOS: ModeloCicloVida[] = ['CASCADA', 'MODELO_V', 'INCREMENTAL', 'ESPIRAL', 'PROTOTIPOS', 'AGIL'];

/** CU-07 Expediente del proyecto (RF-10, RN-22, RN-31). */
@Injectable()
export class ExpedienteProyectoEvaluador implements EvaluadorMecanica {
  readonly mecanica = Mecanica.EXPEDIENTE_PROYECTO;

  private fragmentosDelReto(db: Db, retoId: number) {
    return db.fragmentoDocumento.findMany({
      where: { documento: { retoId } },
      include: { documento: true },
      orderBy: [{ documento: { orden: 'asc' } }, { orden: 'asc' }],
    });
  }

  async contenidoPublico(db: Db, retoId: number): Promise<ContenidoPublicoDto> {
    const expediente = await db.expediente.findUniqueOrThrow({ where: { retoId } });
    const documentos = await db.documentoExpediente.findMany({
      where: { retoId },
      orderBy: { orden: 'asc' },
      include: { fragmentos: { orderBy: { orden: 'asc' } } },
    });
    const caracteristicas = await db.caracteristicaProyecto.findMany({ where: { retoId }, orderBy: { id: 'asc' } });
    // Sin caracteristicaCorrectaId, respaldaModelo, modelo correcto ni explicación (RNF-SE-02).
    return {
      nombreProyecto: expediente.nombreProyecto,
      minimoVinculos: MINIMO_VINCULOS,
      modelos: MODELOS,
      caracteristicas: caracteristicas.map((c) => ({ id: c.id, nombre: c.nombre })),
      documentos: documentos.map((d) => ({
        id: d.id,
        orden: d.orden,
        tipo: d.tipo,
        titulo: d.titulo,
        fragmentos: d.fragmentos.map((f) => ({ id: f.id, orden: f.orden, texto: f.texto })),
      })),
    };
  }

  async borrador(db: Db, intentoId: number): Promise<BorradorDto> {
    const evidencias = await db.evidenciaSeleccionada.findMany({
      where: { intentoId },
      orderBy: { fragmentoId: 'asc' },
    });
    const modelo = await db.eleccionModelo.findUnique({ where: { intentoId } });
    const vinculos = await db.vinculoEvidencia.findMany({ where: { intentoId }, orderBy: { fragmentoId: 'asc' } });
    return {
      evidencias: evidencias.map((e) => ({ fragmentoId: e.fragmentoId, caracteristicaId: e.caracteristicaId })),
      modelo: modelo?.modelo ?? null,
      vinculos: vinculos.map((v) => v.fragmentoId),
    };
  }

  async guardarBorrador(db: Db, intentoId: number, cuerpo: unknown): Promise<void> {
    const dto = validarCuerpo(BorradorExpedienteDto, cuerpo);
    const retoId = await retoIdDeIntento(db, intentoId);
    const fragmentos = new Set((await this.fragmentosDelReto(db, retoId)).map((f) => f.id));
    const caracteristicas = new Set(
      (await db.caracteristicaProyecto.findMany({ where: { retoId }, select: { id: true } })).map((c) => c.id),
    );

    const vistos = new Set<number>();
    for (const ev of dto.evidencias) {
      if (!fragmentos.has(ev.fragmentoId)) {
        throw new BadRequestException(`El fragmento ${ev.fragmentoId} no pertenece a este reto`);
      }
      if (vistos.has(ev.fragmentoId)) {
        // FE2: la evidencia ya estaba en el tablero; no se duplica.
        throw new BadRequestException('La evidencia ya fue agregada: no se puede duplicar');
      }
      vistos.add(ev.fragmentoId);
      if (ev.caracteristicaId != null && !caracteristicas.has(ev.caracteristicaId)) {
        throw new BadRequestException(`La característica ${ev.caracteristicaId} no pertenece a este reto`);
      }
    }
    const vinculosUnicos = new Set(dto.vinculos);
    if (vinculosUnicos.size !== dto.vinculos.length) {
      throw new BadRequestException('Una evidencia solo se vincula una vez al modelo');
    }
    for (const v of dto.vinculos) {
      if (!vistos.has(v)) {
        throw new BadRequestException('Solo puedes vincular evidencias que ya agregaste al tablero');
      }
    }

    await db.vinculoEvidencia.deleteMany({ where: { intentoId } });
    await db.evidenciaSeleccionada.deleteMany({ where: { intentoId } });
    await db.evidenciaSeleccionada.createMany({
      data: dto.evidencias.map((e) => ({
        intentoId,
        fragmentoId: e.fragmentoId,
        caracteristicaId: e.caracteristicaId ?? null,
      })),
    });
    await db.vinculoEvidencia.createMany({
      data: dto.vinculos.map((fragmentoId) => ({ intentoId, fragmentoId })),
    });
    if (dto.modelo) {
      await db.eleccionModelo.upsert({
        where: { intentoId },
        update: { modelo: dto.modelo },
        create: { intentoId, modelo: dto.modelo },
      });
    } else {
      await db.eleccionModelo.deleteMany({ where: { intentoId } });
    }
  }

  async faltantes(db: Db, intentoId: number): Promise<string[]> {
    const retoId = await retoIdDeIntento(db, intentoId);
    const b = (await this.borrador(db, intentoId)) as {
      evidencias: { fragmentoId: number; caracteristicaId: number | null }[];
      modelo: ModeloCicloVida | null;
      vinculos: number[];
    };
    const textos = new Map((await this.fragmentosDelReto(db, retoId)).map((f) => [f.id, f.texto]));
    return faltantesExpediente(
      b.modelo,
      b.evidencias.map((e) => ({ ...e, texto: textos.get(e.fragmentoId) })),
      b.vinculos,
    );
  }

  async calificar(db: Db, intentoId: number): Promise<ResultadoCalificacion> {
    const retoId = await retoIdDeIntento(db, intentoId);
    const expediente = await db.expediente.findUniqueOrThrow({ where: { retoId } });
    const fragmentos = await this.fragmentosDelReto(db, retoId);
    const caracteristicas = await db.caracteristicaProyecto.findMany({ where: { retoId } });
    const nombreCar = new Map(caracteristicas.map((c) => [c.id, c.nombre]));
    const b = (await this.borrador(db, intentoId)) as {
      evidencias: { fragmentoId: number; caracteristicaId: number | null }[];
      modelo: ModeloCicloVida | null;
      vinculos: number[];
    };

    const porcentaje = calificarExpediente({
      modeloElegido: b.modelo,
      modeloCorrecto: expediente.modeloCorrecto,
      fragmentos: fragmentos.map((f) => ({
        id: f.id,
        caracteristicaCorrectaId: f.caracteristicaCorrectaId,
        respaldaModelo: f.respaldaModelo,
      })),
      evidencias: b.evidencias,
      vinculos: b.vinculos,
    });

    const porId = new Map(fragmentos.map((f) => [f.id, f]));
    const seleccionadas = new Set(b.evidencias.map((e) => e.fragmentoId));
    return {
      porcentaje,
      retroalimentacion: {
        mecanica: this.mecanica,
        nombreProyecto: expediente.nombreProyecto,
        modeloElegido: b.modelo,
        modeloAcertado: b.modelo === expediente.modeloCorrecto,
        // Evidencias elegidas: siempre se señala cuáles son irrelevantes (RN-31: sin decir lo correcto).
        evidencias: b.evidencias.map((e) => {
          const f = porId.get(e.fragmentoId)!;
          return {
            fragmentoId: f.id,
            texto: f.texto,
            documento: f.documento.titulo,
            caracteristicaElegida: e.caracteristicaId ? (nombreCar.get(e.caracteristicaId) ?? null) : null,
            relevante: f.caracteristicaCorrectaId !== null,
            // Referencia (RN-31): se recorta si el estudiante todavía no puede verla.
            caracteristicaCorrecta: f.caracteristicaCorrectaId ? (nombreCar.get(f.caracteristicaCorrectaId) ?? null) : null,
            caracteristicaAcertada: f.caracteristicaCorrectaId !== null && f.caracteristicaCorrectaId === e.caracteristicaId,
          };
        }),
        vinculos: b.vinculos.length,
        // Referencia (RN-31)
        modeloCorrecto: expediente.modeloCorrecto,
        explicacion: expediente.explicacion,
        fragmentosRelevantes: fragmentos
          .filter((f) => f.caracteristicaCorrectaId !== null)
          .map((f) => ({
            fragmentoId: f.id,
            texto: f.texto,
            documento: f.documento.titulo,
            caracteristica: nombreCar.get(f.caracteristicaCorrectaId!) ?? null,
            respaldaModelo: f.respaldaModelo,
            seleccionada: seleccionadas.has(f.id),
          })),
      },
    };
  }

  /** FA2: resalta un documento con una evidencia relevante que el estudiante aún no seleccionó. */
  async aplicarAyuda(db: Db, intentoId: number): Promise<PistaDto> {
    const retoId = await retoIdDeIntento(db, intentoId);
    const fragmento = await db.fragmentoDocumento.findFirst({
      where: {
        documento: { retoId },
        caracteristicaCorrectaId: { not: null },
        evidencias: { none: { intentoId } },
      },
      orderBy: [{ documento: { orden: 'asc' } }, { orden: 'asc' }],
    });
    if (!fragmento) {
      throw new BadRequestException(
        'Ya seleccionaste todas las evidencias relevantes; no se consumió la ayuda',
      );
    }
    return { tipo: 'DOCUMENTO', documentoId: fragmento.documentoId };
  }
}
