import { ApiProperty } from '@nestjs/swagger';
import { TemaFase } from '@prisma/client';
import { ESTADOS_FASE, EstadoFase } from '../estado-fases';

export class FaseDto {
  id: number;
  nombre: string;
  @ApiProperty({ enum: TemaFase, enumName: 'TemaFase' })
  tema: TemaFase;
  /** @example "Intermedia" */
  dificultad: string;
  orden: number;
  /** Calculado para el estudiante autenticado a partir de su historial de intentos. */
  @ApiProperty({ enum: ESTADOS_FASE, enumName: 'EstadoFase' })
  estado: EstadoFase;
  retoId: number | null;
  intentosRealizados: number;
  /** Mejor porcentaje (0-100) del estudiante en el reto de la fase. */
  mejorPorcentaje: number | null;
  /** Mejor calificación (0-3 estrellas) del estudiante en el reto de la fase. */
  mejorCalificacionEstrellas: number | null;

  /** (Fase 3) Cantidad de retos que tiene la fase (0 si todavía no se le cargó ninguno). */
  totalRetos: number;
  /** (Fase 3) Cuántos de esos retos ya tiene al menos un intento aprobado. */
  retosAprobados: number;
  /**
   * (Fase 3) % de la fase completado: retosAprobados / totalRetos, 0-100.
   * null si la fase no tiene retos todavía (no hay nada que medir).
   */
  progreso: number | null;
  /**
   * (Fase 3) Promedio de la mejor marca histórica de cada reto, redondeado.
   * Solo se calcula cuando la fase está completada (todos sus retos aprobados).
   */
  calificacionEstrellasFase: number | null;
  /**
   * (Fase 3) Suma del QP realmente otorgado por cada reto de la fase (solo
   * cuenta la primera aprobación de cada uno). Solo cuando está completada.
   */
  recompensaQpFase: number | null;
}

/** Una opción visible de una pregunta (nunca indica cuál es la correcta). */
export class OpcionDto {
  valor: string;
  texto: string;
}

/** Una pregunta del reto, tal como la ve el estudiante (sin la respuesta correcta). */
export class PreguntaDto {
  preguntaId: string;
  texto: string;
  /** Si la pregunta es de opción múltiple/clasificar/emparejar. Ausente si es de texto libre. */
  opciones?: OpcionDto[];
  /** Para retos COMPUESTO: a cuál parte pertenece ("A", "B"...). */
  parte?: string;
}

export class RetoDto {
  id: number;
  faseId: number;
  /**
   * (Fase 4) Posición de este reto dentro del recorrido secuencial de su
   * fase (1, 2, 3...). Combinado con Fase.totalRetos permite mostrar
   * "Reto {orden} de {totalRetos}": cuál es el reto actual dentro de la fase.
   */
  orden: number;
  criteriosAceptacion: string | null;
  /** Fracción 0.0-1.0 (0.8 = 80%). @example 0.8 */
  calificacionMinima: number;
  recompensaXp: number;
  recompensaQp: number;
  /** Las preguntas que se evalúan, con su texto y opciones. La clave de respuestas nunca se expone. */
  preguntas: PreguntaDto[];
}

export class ContenidoApoyoDto {
  id: number;
  contenidoTeorico: string;
  ejemplos: string;
  glosario: string;
}

export class FaseDetalleDto {
  fase: FaseDto;
  reto: RetoDto | null;
  contenidosApoyo: ContenidoApoyoDto[];
}
