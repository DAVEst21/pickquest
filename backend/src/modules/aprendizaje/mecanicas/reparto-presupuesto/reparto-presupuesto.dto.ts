import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsInt,
  IsOptional,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class AsignacionPuntosDto {
  @IsInt()
  atributoEscenarioId: number;

  @IsInt()
  @Min(0)
  @Max(1000)
  puntos: number;
}

/** CU-06: cuerpo de PUT /intentos/:id/borrador. */
export class BorradorPresupuestoDto {
  @IsArray()
  @ArrayMaxSize(50)
  @ArrayUnique((a: AsignacionPuntosDto) => a.atributoEscenarioId)
  @ValidateNested({ each: true })
  @Type(() => AsignacionPuntosDto)
  asignaciones: AsignacionPuntosDto[];

  /** null o ausente = sin elegir. */
  @IsOptional()
  @IsInt()
  justificacionId?: number | null;
}
