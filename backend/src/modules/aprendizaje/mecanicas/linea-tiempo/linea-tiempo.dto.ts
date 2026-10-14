import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsInt,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

/** Semana máxima en la que se puede iniciar un bloque (tope defensivo). */
export const SEMANA_MAXIMA = 200;

export class PosicionBloqueDto {
  @IsInt()
  bloqueId: number;

  /** Semana de inicio, contada desde 0. */
  @IsInt()
  @Min(0)
  @Max(SEMANA_MAXIMA)
  inicioSemana: number;
}

export class AsociacionEntregableDto {
  @IsInt()
  entregableId: number;

  /** Bloque de tipo FASE que el estudiante cree que produce el entregable. */
  @IsInt()
  faseBloqueId: number;
}

/** CU-08: cuerpo de PUT /intentos/:id/borrador. */
export class BorradorLineaTiempoDto {
  @IsArray()
  @ArrayMaxSize(100)
  @ArrayUnique((p: PosicionBloqueDto) => p.bloqueId)
  @ValidateNested({ each: true })
  @Type(() => PosicionBloqueDto)
  posiciones: PosicionBloqueDto[];

  @IsArray()
  @ArrayMaxSize(100)
  @ArrayUnique((a: AsociacionEntregableDto) => a.entregableId)
  @ValidateNested({ each: true })
  @Type(() => AsociacionEntregableDto)
  asociaciones: AsociacionEntregableDto[];
}
