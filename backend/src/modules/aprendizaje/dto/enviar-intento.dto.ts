import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsNotEmpty,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class RespuestaPreguntaDto {
  /**
   * Identificador de la pregunta (ver "preguntas" en GET /fases/:faseId).
   * @example "req-1"
   */
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  preguntaId: string;

  /** @example "seguridad" */
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  respuesta: string;
}

/**
 * Solo contiene la respuesta del estudiante. usoAyuda NO se acepta aquí: lo
 * calcula el servidor (Corrección d); si el cliente lo envía, el
 * ValidationPipe global (whitelist) lo descarta.
 */
export class EnviarIntentoDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ArrayUnique((r: RespuestaPreguntaDto) => r.preguntaId, {
    message: 'Cada preguntaId debe aparecer una sola vez',
  })
  @ValidateNested({ each: true })
  @Type(() => RespuestaPreguntaDto)
  respuestas: RespuestaPreguntaDto[];
}
