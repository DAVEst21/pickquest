import { IsIn } from 'class-validator';

/** POST /estudio/sesiones/:id/tarjetas/:tarjetaId */
export class AutoevaluarDto {
  @IsIn(['LO_SABIA', 'DUDE', 'NO_LO_SABIA'], {
    message: 'La autoevaluación debe ser LO_SABIA, DUDE o NO_LO_SABIA',
  })
  autoevaluacion: 'LO_SABIA' | 'DUDE' | 'NO_LO_SABIA';
}

/** Un tema de la biblioteca de estudio (uno por fase). */
export class TemaEstudioDto {
  faseId: number;
  orden: number;
  nombre: string;
  tema: string;
  /** Estado de la fase (RN-01): un tema de una fase bloqueada no se puede abrir. */
  estado: string;
  bloqueado: boolean;
  totalTarjetas: number;
  /** Tarjetas nuevas o vencidas que tocan hoy (RN-24). */
  tarjetasParaHoy: number;
  /** Hay una sesión de repaso sin terminar (FA2). */
  sesionPendiente: boolean;
  /** Dominio del tema (RN-26); null si todavía no se calcula. */
  dominio: number | null;
}

export class EjemploDto {
  orden: number;
  titulo: string;
  texto: string;
}

export class TerminoDto {
  termino: string;
  definicion: string;
}

export class MaterialTemaDto {
  faseId: number;
  nombre: string;
  tema: string;
  explicacion: string;
  ejemplos: EjemploDto[];
  glosario: TerminoDto[];
  totalTarjetas: number;
  sesionPendiente: boolean;
}

export class TarjetaDto {
  tarjetaId: number;
  posicion: number;
  frente: string;
  reverso: string;
}

export class ResumenSesionDto {
  /** Según la primera autoevaluación de cada tarjeta en la sesión. */
  sabidas: number;
  dudadas: number;
  noSabidas: number;
  /** 10 la primera sesión terminada del día en el tema; 0 después (RN-25). */
  xpOtorgada: number;
  dominio: number;
}

export class SesionRepasoDto {
  sesionId: number;
  faseId: number;
  nombre: string;
  /** true si se retomó una sesión que había quedado a medias (FA2). */
  retomada: boolean;
  terminada: boolean;
  total: number;
  completadas: number;
  pendientes: number;
  tarjetaActual: TarjetaDto | null;
  /** Solo cuando la sesión terminó. */
  resumen: ResumenSesionDto | null;
}
