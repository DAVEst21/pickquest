import type { AtributoCalidad, ColumnaMoscow, TecnicaElicitacion, TipoRequerimiento } from '../../types';

/** Nombres de las características de calidad de ISO/IEC 25010. */
export const NOMBRE_ATRIBUTO: Record<AtributoCalidad, string> = {
  ADECUACION_FUNCIONAL: 'Adecuación funcional',
  EFICIENCIA_DESEMPENO: 'Eficiencia de desempeño',
  COMPATIBILIDAD: 'Compatibilidad',
  USABILIDAD: 'Usabilidad',
  FIABILIDAD: 'Fiabilidad',
  SEGURIDAD: 'Seguridad',
  MANTENIBILIDAD: 'Mantenibilidad',
  PORTABILIDAD: 'Portabilidad',
};

export const NOMBRE_TECNICA: Record<TecnicaElicitacion, string> = {
  ENTREVISTA: 'Entrevista',
  CUESTIONARIO: 'Cuestionario',
  OBSERVACION: 'Observación',
  TALLER: 'Taller',
};

export const NOMBRE_COLUMNA: Record<ColumnaMoscow, string> = {
  MUST: 'MUST',
  SHOULD: 'SHOULD',
  COULD: 'COULD',
  WONT: "WON'T",
};

export const NOMBRE_TIPO: Record<TipoRequerimiento, string> = {
  FUNCIONAL: 'RF',
  NO_FUNCIONAL: 'RNF',
};
