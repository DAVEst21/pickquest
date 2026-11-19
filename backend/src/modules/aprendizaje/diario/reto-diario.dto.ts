import { IsInt, Min, ValidateIf } from 'class-validator';

/** POST /reto-diario/:id/preguntas/:n/respuesta. `null` significa que se agotó el tiempo (FA1). */
export class ResponderPreguntaDto {
  @ValidateIf((o: ResponderPreguntaDto) => o.opcionId !== null)
  @IsInt()
  @Min(1)
  opcionId: number | null;
}

export class RachaDiariaDto {
  diasActuales: number;
  diasRecord: number;
  multiplicadorQP: number;
}

export class ReglasRetoDiarioDto {
  preguntas: number;
  segundosPorPregunta: number;
  /** Porcentaje mínimo para que la racha aumente (RN-13). */
  porcentajeRacha: number;
  xpPorAcierto: number;
  qpPorAcierto: number;
}

export class PreguntaEstadoDto {
  numero: number;
  entregada: boolean;
  /** null mientras no se resuelve. */
  correcta: boolean | null;
}

export class ResultadoRetoDiarioDto {
  aciertos: number;
  total: number;
  porcentaje: number;
  xpOtorgada: number;
  qpOtorgado: number;
  /** Multiplicador con el que se pagaron los QP (el vigente al iniciar). */
  multiplicadorAplicado: number;
  /** ¿Alcanzó el 50 % que hace crecer la racha? */
  logroRacha: boolean;
  racha: RachaDiariaDto;
}

export class EstadoRetoDiarioDto {
  retoDiarioId: number;
  dia: string;
  multiplicador: number;
  total: number;
  /** Preguntas ya resueltas (respondidas, vencidas o abandonadas). */
  resueltas: number;
  /** Número de la pregunta que sigue (la que está en pantalla o la próxima); null al terminar. */
  siguiente: number | null;
  /** Segundos que le quedan a la pregunta ya entregada; null si aún no se entrega. */
  segundosRestantes: number | null;
  terminado: boolean;
  preguntas: PreguntaEstadoDto[];
  /** Solo cuando el reto terminó. */
  resultado: ResultadoRetoDiarioDto | null;
}

export class HoyDto {
  dia: string;
  racha: RachaDiariaDto;
  reglas: ReglasRetoDiarioDto;
  estado: 'DISPONIBLE' | 'EN_CURSO' | 'TERMINADO';
  reto: EstadoRetoDiarioDto | null;
  /** FE1: segundos que faltan para el siguiente reto (medianoche de México); null si aún puede jugarlo. */
  segundosHastaSiguiente: number | null;
}

export class OpcionPreguntaDto {
  opcionId: number;
  texto: string;
}

/** Pregunta cronometrada: nunca incluye la opción correcta. */
export class PreguntaEntregadaDto {
  numero: number;
  total: number;
  enunciado: string;
  opciones: OpcionPreguntaDto[];
  limiteSegundos: number;
  segundosRestantes: number;
}

export class RespuestaRetoDiarioDto {
  numero: number;
  correcta: boolean;
  /** Se agotó el tiempo o no se respondió. */
  tiempoAgotado: boolean;
  /**
   * CU-11 paso 6: la respuesta solo indica si fue correcta. Nunca trae la opción correcta ni la explicación:
   * el banco de preguntas lo comparten el diagnóstico y los duelos (RNF-SE-02).
   */
  /** Número de la pregunta que sigue; null si el reto terminó. */
  siguiente: number | null;
  /** Aciertos acumulados hasta ahora. */
  aciertos: number;
  terminado: boolean;
  estado: EstadoRetoDiarioDto;
}
