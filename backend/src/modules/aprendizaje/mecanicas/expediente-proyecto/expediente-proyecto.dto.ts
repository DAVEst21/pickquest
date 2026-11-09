import { ModeloCicloVida } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  Min,
  ValidateNested,
} from 'class-validator';

export class EvidenciaDto {
  @IsInt()
  @Min(1)
  fragmentoId: number;

  /** null o ausente = todavía sin característica. */
  @IsOptional()
  @IsInt()
  @Min(1)
  caracteristicaId?: number | null;
}

/** CU-07: cuerpo de PUT /intentos/:id/borrador. El avance parcial es válido (FA3). */
export class BorradorExpedienteDto {
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => EvidenciaDto)
  evidencias: EvidenciaDto[];

  /** null o ausente = sin elegir. */
  @IsOptional()
  @IsEnum(ModeloCicloVida)
  modelo?: ModeloCicloVida | null;

  /** Fragmentos (ya seleccionados como evidencia) que el estudiante vincula como respaldo del modelo. */
  @IsArray()
  @ArrayMaxSize(200)
  @IsInt({ each: true })
  vinculos: number[];
}
