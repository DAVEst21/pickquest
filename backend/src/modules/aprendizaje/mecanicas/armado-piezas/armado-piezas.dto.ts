import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsInt,
  Min,
  ValidateNested,
} from 'class-validator';
class ColocacionDto {
  @IsInt() @Min(1) casillaId: number;
  @IsInt() @Min(1) piezaId: number;
}
export class BorradorHistoriasDto {
  @IsArray()
  @ArrayMaxSize(300)
  @ArrayUnique((c: ColocacionDto) => c.casillaId)
  @ValidateNested({ each: true })
  @Type(() => ColocacionDto)
  colocaciones: ColocacionDto[];
}
