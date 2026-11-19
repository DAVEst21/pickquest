import { ParteEscenario } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class EleccionParteDto {
  @IsEnum(ParteEscenario)
  parte: ParteEscenario;

  @IsInt()
  @Min(1)
  opcionId: number;
}

/** CU-05: cuerpo de PUT /intentos/:id/borrador. Lo que falta puede ir vacío (avance parcial, FA3). */
export class BorradorEscenarioDto {
  @IsArray()
  @ArrayMaxSize(5)
  @ArrayUnique((e: EleccionParteDto) => e.parte)
  @ValidateNested({ each: true })
  @Type(() => EleccionParteDto)
  elecciones: EleccionParteDto[];

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100000)
  valor?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  unidadId?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10000000)
  carga?: number | null;
}
