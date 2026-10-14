import { ColumnaMoscow, TipoRequerimiento } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class RespuestaTarjetaDto {
  @IsInt()
  tarjetaId: number;

  /** null o ausente = "Sin clasificar". */
  @IsOptional()
  @IsEnum(ColumnaMoscow)
  columna?: ColumnaMoscow | null;

  @IsOptional()
  @IsEnum(TipoRequerimiento)
  tipo?: TipoRequerimiento | null;

  /** Posición dentro de MUST (1 = la más urgente). */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  ordenMust?: number | null;
}

/** CU-03: cuerpo de PUT /intentos/:id/borrador. */
export class BorradorMoscowDto {
  @IsArray()
  @ArrayMaxSize(100)
  @ArrayUnique((t: RespuestaTarjetaDto) => t.tarjetaId)
  @ValidateNested({ each: true })
  @Type(() => RespuestaTarjetaDto)
  tarjetas: RespuestaTarjetaDto[];
}
