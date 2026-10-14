import { TecnicaElicitacion } from '@prisma/client';
import { IsEnum, IsInt } from 'class-validator';

/** CU-01: POST /intentos/:id/dialogo/tecnica */
export class ElegirTecnicaDto {
  @IsEnum(TecnicaElicitacion)
  tecnica: TecnicaElicitacion;
}

/** CU-01: POST /intentos/:id/dialogo/turnos */
export class RegistrarTurnoDto {
  /** Id de la opción (pregunta) elegida, entre las ofrecidas en el nodo actual. */
  @IsInt()
  opcionId: number;
}
