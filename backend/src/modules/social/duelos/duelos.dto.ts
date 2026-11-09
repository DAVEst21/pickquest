import { IsIn, IsString, MaxLength, MinLength, ValidateIf, IsInt, Min } from 'class-validator';

/**
 * POST /duelos. El rival se identifica por su nombre de aventurero (único y público), porque nunca se
 * exponen correos ni ids internos de otros estudiantes (RNF-SE-04).
 */
export class CrearDueloDto {
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  rival: string;

  @IsIn(['CICLO_VIDA', 'ELICITACION', 'ATRIBUTOS_CALIDAD'])
  tema: 'CICLO_VIDA' | 'ELICITACION' | 'ATRIBUTOS_CALIDAD';
}

/** POST /duelos/:id/preguntas/:n/respuesta. `null` significa que se agotó el tiempo. */
export class ResponderDueloDto {
  @ValidateIf((o: ResponderDueloDto) => o.opcionId !== null)
  @IsInt()
  @Min(1)
  opcionId: number | null;
}

export class TemaComunDto {
  tema: string;
  nombre: string;
}

export class RecordDuelosDto {
  ganados: number;
  perdidos: number;
  empatados: number;
}

/** De los demás estudiantes solo se muestran nombre de aventurero, nivel y resultados de duelos. */
export class RivalDto {
  nombreAventurero: string;
  nivel: number;
  temasEnComun: TemaComunDto[];
  duelos: RecordDuelosDto;
}

export class ParticipanteDto {
  nombreAventurero: string;
  nivel: number;
}

export class RondaEstadoDto {
  total: number;
  resueltas: number;
  /** Número de la pregunta que sigue; null si ya terminó la ronda. */
  siguiente: number | null;
  terminada: boolean;
  /** Segundos que le quedan a la pregunta ya entregada. */
  segundosRestantes: number | null;
}

export class ResultadoParticipanteDto {
  porcentaje: number;
  segundosTotales: number;
  xpOtorgada: number;
}

export class RevisionDueloDto {
  numero: number;
  enunciado: string;
  opcionElegidaId: number | null;
  opcionCorrectaId: number;
  correcta: boolean;
  explicacion: string | null;
}

/** Solo existe cuando el duelo terminó: hasta entonces el resultado de uno no se muestra al otro. */
export class ResultadoDueloDto {
  yo: ResultadoParticipanteDto;
  rival: ResultadoParticipanteDto;
  ganador: 'YO' | 'RIVAL' | 'EMPATE';
  revision: RevisionDueloDto[];
}

export class DueloDto {
  dueloId: number;
  tema: string;
  temaNombre: string;
  estado: 'PENDIENTE' | 'ACEPTADO' | 'TERMINADO' | 'RECHAZADO' | 'EXPIRADO';
  rol: 'RETADOR' | 'RETADO';
  rival: ParticipanteDto;
  creadoEn: Date;
  expiraEn: Date;
  miRonda: RondaEstadoDto;
  /** Mi propio resultado, una vez que termino mi ronda. */
  miResultado: ResultadoParticipanteDto | null;
  accion: 'ACEPTAR_O_RECHAZAR' | 'JUGAR_RONDA' | 'ESPERAR_RIVAL' | 'VER_RESULTADO' | null;
  resultado: ResultadoDueloDto | null;
}

export class ListaDuelosDto {
  /** Retos que me hicieron y debo aceptar o rechazar. */
  pendientes: DueloDto[];
  /** Duelos con mi ronda por resolver. */
  porJugar: DueloDto[];
  /** Ya resolví mi ronda; espero al rival. */
  enEspera: DueloDto[];
  /** Terminados, rechazados y expirados. */
  historial: DueloDto[];
  limitePendientes: number;
  /** Duelos que cuentan para el límite (pendientes o aceptados). */
  activos: number;
}

export class AvisoDueloDto {
  dueloId: number;
  retador: ParticipanteDto;
  tema: string;
  temaNombre: string;
  expiraEn: Date;
}

export class PreguntaDueloDto {
  numero: number;
  total: number;
  enunciado: string;
  opciones: { opcionId: number; texto: string }[];
  limiteSegundos: number;
  segundosRestantes: number;
}

/** No se revela si acertó ni cuál era la correcta hasta que el duelo termina. */
export class RespuestaDueloDto {
  numero: number;
  registrada: boolean;
  rondaTerminada: boolean;
  duelo: DueloDto;
}
