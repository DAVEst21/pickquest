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
}

export class RetoDto {
  id: number;
  faseId: number;
  criteriosAceptacion: string;
  /** Fracción 0.0-1.0 (0.8 = 80%). @example 0.8 */
  calificacionMinima: number;
  recompensaXp: number;
  recompensaQp: number;
  /**
   * Identificadores de las preguntas que se evalúan. La clave de respuestas nunca se expone.
   * @example ["req-1", "req-2", "req-3", "tradeoff"]
   */
  preguntas: string[];
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
