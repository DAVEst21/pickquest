import { Mecanica, Prisma } from '@prisma/client';

/** Cliente de base de datos (PrismaService o transacción). */
export type Db = Prisma.TransactionClient;

/** Contenido que ve el estudiante: NUNCA incluye claves ni datos de referencia (RNF-SE-02). */
export type ContenidoPublicoDto = Record<string, unknown>;
/** Avance guardado del intento en curso (RF-01). */
export type BorradorDto = Record<string, unknown>;
/** Efecto de la ayuda sobre la interfaz de la mecánica (CU-0x, FA2). */
export interface PistaDto {
  tipo: string;
  [clave: string]: unknown;
}
/** Detalle que se muestra en el resultado, específico de cada mecánica. */
export interface RetroalimentacionDto {
  mecanica: Mecanica;
  [clave: string]: unknown;
}
export interface ResultadoCalificacion {
  /** 0-100, entero. */
  porcentaje: number;
  retroalimentacion: RetroalimentacionDto;
}

/**
 * Contrato común de las mecánicas de reto. El servicio de aprendizaje se
 * encarga de la transacción, los estados, las estrellas, las recompensas, la
 * ayuda y el desbloqueo; cada mecánica solo conoce su propio contenido y su
 * propia regla de calificación.
 */
export interface EvaluadorMecanica {
  readonly mecanica: Mecanica;
  /** Contenido del reto SIN respuestas correctas ni datos de referencia. */
  contenidoPublico(db: Db, retoId: number): Promise<ContenidoPublicoDto>;
  /** Lo que el estudiante lleva hecho en este intento. */
  borrador(db: Db, intentoId: number): Promise<BorradorDto>;
  /** RF-01: guarda el avance en el servidor. Valida el cuerpo según la mecánica. */
  guardarBorrador(db: Db, intentoId: number, cuerpo: unknown): Promise<void>;
  /** Flujos de excepción: qué falta para poder enviar (vacío = se puede enviar). */
  faltantes(db: Db, intentoId: number): Promise<string[]>;
  /** Calcula el porcentaje (RN-16/17/18/19/21/23) y la retroalimentación. No escribe. */
  calificar(db: Db, intentoId: number): Promise<ResultadoCalificacion>;
  /** Efecto de la ayuda (FA2) sobre el estado actual del intento. No escribe. */
  aplicarAyuda(db: Db, intentoId: number): Promise<PistaDto>;
}

export async function retoIdDeIntento(db: Db, intentoId: number): Promise<number> {
  const intento = await db.intentoReto.findUniqueOrThrow({
    where: { id: intentoId },
    select: { retoId: true },
  });
  return intento.retoId;
}
