import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsInt, Min, ValidateNested } from 'class-validator';

export class RespuestaDiagnosticoDto {
  @IsInt()
  @Min(1)
  preguntaId: number;

  @IsInt()
  @Min(1)
  opcionId: number;
}

/** POST /plan/diagnosticos/:id/respuestas */
export class ResponderDiagnosticoDto {
  @IsArray()
  @ArrayMaxSize(9)
  @ValidateNested({ each: true })
  @Type(() => RespuestaDiagnosticoDto)
  respuestas: RespuestaDiagnosticoDto[];
}

/** POST /plan/:id/aceptar: las actividades que se conservan, en el orden elegido (FA1). */
export class AceptarPlanDto {
  @IsArray()
  @ArrayMaxSize(50)
  @IsInt({ each: true })
  actividadIds: number[];
}

export class OpcionDiagnosticoDto {
  opcionId: number;
  texto: string;
}

/** Pregunta del diagnóstico: nunca incluye cuál es la opción correcta. */
export class PreguntaDiagnosticoDto {
  preguntaId: number;
  orden: number;
  enunciado: string;
  opciones: OpcionDiagnosticoDto[];
}

export class DiagnosticoIniciadoDto {
  diagnosticoId: number;
  preguntas: PreguntaDiagnosticoDto[];
}

export class ResultadoTemaDto {
  tema: string;
  nombre: string;
  aciertos: number;
  preguntas: number;
  /** Aciertos ÷ preguntas × 100. */
  porcentaje: number;
  /** Dominio del tema (RN-26) después del diagnóstico. */
  dominio: number;
  debil: boolean;
}

/** Revisión que se muestra una vez terminado el diagnóstico. */
export class RevisionPreguntaDto {
  preguntaId: number;
  enunciado: string;
  opcionElegidaId: number;
  opcionCorrectaId: number;
  correcta: boolean;
  explicacion: string | null;
}

export class ActividadPlanDto {
  actividadId: number;
  orden: number;
  tipo: 'RETO' | 'REPASO' | 'DUELO';
  tema: string;
  temaNombre: string;
  /** Fase del tema: lleva al tablón (reto) o al material (repaso). */
  faseId: number;
  retoId: number | null;
  retoTitulo: string | null;
  motivo: string;
  /** Solo en un plan activo: realizada después de aceptar el plan. */
  hecha: boolean;
}

export class PlanEstudioDto {
  planId: number;
  estado: 'PROPUESTO' | 'ACTIVO' | 'REEMPLAZADO';
  esPlanMejora: boolean;
  creadoEn: Date;
  aceptadoEn: Date | null;
  actividades: ActividadPlanDto[];
  avance: { hechas: number; total: number; porcentaje: number };
}

export class DiagnosticoTerminadoDto {
  diagnosticoId: number;
  resultados: ResultadoTemaDto[];
  revision: RevisionPreguntaDto[];
  plan: PlanEstudioDto;
}

export class PlanActivoDto {
  plan: PlanEstudioDto | null;
}
