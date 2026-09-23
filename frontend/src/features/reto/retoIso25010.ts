import type { Reto } from '../../types';

/** preguntaId del reto ISO 25010 (deben coincidir con Reto.preguntas del backend). */
export const PREGUNTAS_ISO = ['req-1', 'req-2', 'req-3', 'tradeoff'] as const;

/** Opción del trade-off que elimina el Pergamino de Descarte. */
export const OPCION_DESCARTABLE = 'B';

export function esRetoIso25010(reto: Reto): boolean {
  return reto.preguntas.length === PREGUNTAS_ISO.length && PREGUNTAS_ISO.every((p) => reto.preguntas.includes(p));
}
