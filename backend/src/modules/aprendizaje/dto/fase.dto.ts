import { ApiProperty } from '@nestjs/swagger';
import { Mecanica, TemaFase } from '@prisma/client';
import { ESTADOS_FASE, ESTADOS_RETO, EstadoFase, EstadoReto } from '../estado-fases';

export class FaseDto {
  id: number;
  nombre: string;
  @ApiProperty({ enum: TemaFase, enumName: 'TemaFase' })
  tema: TemaFase;
  /** @example "Intermedia" */
  dificultad: string;
  orden: number;
  /** Descripción narrativa de la fase (se guarda en la base de datos). */
  descripcion: string;
  /** Calculado para el estudiante autenticado a partir de sus intentos CALIFICADOS. */
  @ApiProperty({ enum: ESTADOS_FASE, enumName: 'EstadoFase' })
  estado: EstadoFase;
  /** El "reto actual" de la fase: el siguiente sin aprobar, o el último si ya están todos aprobados. */
  retoId: number | null;
  /** Intentos calificados en el reto actual. */
  intentosRealizados: number;
  /** Mejor porcentaje (0-100) del estudiante en el reto actual. */
  mejorPorcentaje: number | null;
  /** Mejor calificación (0-3 estrellas) del estudiante en el reto actual. */
  mejorCalificacionEstrellas: number | null;
  /** Cantidad de retos que tiene la fase. */
  totalRetos: number;
  /** Cuántos de esos retos tienen al menos un intento aprobado (RN-09). */
  retosAprobados: number;
  /** % de la fase completado: retosAprobados / totalRetos, 0-100. */
  progreso: number | null;
  /** Promedio de la mejor marca de cada reto, redondeado. Solo si la fase está completada. */
  calificacionEstrellasFase: number | null;
  /** Suma del QP realmente otorgado por cada reto de la fase. Solo si está completada. */
  recompensaQpFase: number | null;
}

export class ContenidoApoyoDto {
  id: number;
  contenidoTeorico: string;
  ejemplos: string;
  glosario: string;
}

/** Un reto en el tablón de su fase (RF-18). */
export class RetoTablonDto {
  id: number;
  /** Posición dentro del recorrido secuencial de la fase (1, 2, 3...). */
  orden: number;
  titulo: string;
  objetivo: string;
  @ApiProperty({ enum: Mecanica, enumName: 'Mecanica' })
  mecanica: Mecanica;
  recompensaXp: number;
  /** Ya con el multiplicador de racha vigente (RN-02, RN-13): coincide con lo que se otorga. */
  recompensaQp: number;
  @ApiProperty({ enum: ESTADOS_RETO, enumName: 'EstadoReto' })
  estado: EstadoReto;
  mejorPorcentaje: number | null;
  mejorCalificacionEstrellas: number | null;
}

/** GET /fases/:faseId — tablón de la fase. */
export class FaseTablonDto {
  fase: FaseDto;
  retos: RetoTablonDto[];
  contenidosApoyo: ContenidoApoyoDto[];
}
