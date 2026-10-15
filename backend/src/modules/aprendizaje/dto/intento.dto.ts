import { ApiProperty } from '@nestjs/swagger';
import { Mecanica } from '@prisma/client';
import { IsInt } from 'class-validator';
import { PistaDto, RetroalimentacionDto } from '../mecanicas/tipos';
import { ContenidoApoyoDto } from './fase.dto';

/** El reto al que pertenece un intento, con las recompensas que se anunciaron (RN-02). */
export class RetoIntentoDto {
  id: number;
  orden: number;
  titulo: string;
  objetivo: string;
  contexto: string;
  @ApiProperty({ enum: Mecanica, enumName: 'Mecanica' })
  mecanica: Mecanica;
  recompensaXp: number;
  /** Ya con el multiplicador de racha vigente. */
  recompensaQp: number;
}

export class FaseIntentoDto {
  id: number;
  nombre: string;
  orden: number;
  /** Cantidad de retos de la fase. */
  totalRetos: number;
}

/** Resultado de un intento calificado. */
export class ResultadoIntentoDto {
  id: number;
  retoId: number;
  faseId: number;
  /** 0-100 */
  porcentaje: number;
  /** 0-3 (RN-06) */
  calificacionEstrellas: number;
  aprobado: boolean;
  /** Solo la primera aprobación de un reto otorga recompensa (RN-07). */
  xpGanado: number;
  qpGanado: number;
  /** RN-04: se usó una ayuda en este intento (máximo 2 estrellas). */
  usoAyuda: boolean;
  creadoEn: Date;
  calificadoEn: Date;
}

/** GET /intentos/:id (EN_CURSO) y POST /retos/:id/intentos. */
export class IntentoEnCursoDto {
  estado: 'EN_CURSO';
  intentoId: number;
  reto: RetoIntentoDto;
  fase: FaseIntentoDto;
  /** Contenido público de la mecánica: nunca incluye respuestas ni datos de referencia. */
  contenido: Record<string, unknown>;
  /** Avance guardado en el servidor (RF-01). */
  borrador: Record<string, unknown>;
  /** Ya se usó la ayuda de este intento (RN-10: máximo 1). */
  ayudaUsada: boolean;
  /** Pista de la ayuda ya usada en este intento, para volver a dibujarla al retomarlo (null si no usó ayuda). */
  pista: PistaDto | null;
  contenidosApoyo: ContenidoApoyoDto[];
  creadoEn: Date;
  actualizadoEn: Date;
}

/** GET /intentos/:id (CALIFICADO) y POST /intentos/:id/enviar. */
export class IntentoCalificadoDto {
  estado: 'CALIFICADO';
  intentoId: number;
  reto: RetoIntentoDto;
  fase: FaseIntentoDto;
  resultado: ResultadoIntentoDto;
  /** Detalle específico de la mecánica (ver SRS, sección de cada CU). */
  retroalimentacion: RetroalimentacionDto;
  contenidosApoyo: ContenidoApoyoDto[];
}

export class BorradorGuardadoDto {
  actualizadoEn: Date;
}

export class RegistrarAyudaDto {
  /** Objeto equipado a usar (RN-10). */
  @IsInt()
  objetoId: number;
}

export class AyudaAplicadaDto {
  intentoId: number;
  objetoId: number;
  /** Efecto de la ayuda para la interfaz de la mecánica (resaltar una opción, tarjeta, pantalla...). */
  pista: PistaDto;
  /** CU-03: tablero persistido después de mover la tarjeta con la ayuda. */
  borradorActualizado?: Record<string, unknown>;
}

export class LibretaDto {
  codigo: string;
  descripcion: string;
}
