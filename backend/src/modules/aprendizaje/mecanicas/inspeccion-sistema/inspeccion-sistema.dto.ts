import { AtributoCalidad } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  ValidateNested,
} from 'class-validator';

export class MarcaInspeccionDto {
  @IsInt()
  elementoId: number;

  /** Atributo ISO/IEC 25010 afectado; null mientras no se haya elegido. */
  @IsOptional()
  @IsEnum(AtributoCalidad)
  atributo?: AtributoCalidad | null;
}

/** CU-04: cuerpo de PUT /intentos/:id/borrador. */
export class BorradorInspeccionDto {
  @IsArray()
  @ArrayMaxSize(100)
  @ArrayUnique((m: MarcaInspeccionDto) => m.elementoId)
  @ValidateNested({ each: true })
  @Type(() => MarcaInspeccionDto)
  marcas: MarcaInspeccionDto[];
}
