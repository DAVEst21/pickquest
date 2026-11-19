/**
 * Tiempo de una pregunta cronometrada (reto diario, CU-11, y duelos, CU-13).
 *
 * RNF-SE-05: el servidor, no el navegador, decide si una respuesta llegó a tiempo.
 * El servidor registra el instante en que habilita la pregunta (`entregadaEn`) y una
 * respuesta es válida solo si llega a más tardar 20 s + 1 s de tolerancia de red después.
 */
export const SEGUNDOS_POR_PREGUNTA = 20;
export const TOLERANCIA_RED_SEGUNDOS = 1;

/** Segundos transcurridos entre dos instantes (con decimales). */
export function segundosTranscurridos(desde: Date, hasta: Date): number {
  return (hasta.getTime() - desde.getTime()) / 1000;
}

/** ¿La respuesta llegó dentro de los 20 s más 1 s de tolerancia? */
export function llegoATiempo(entregadaEn: Date, ahora: Date): boolean {
  return segundosTranscurridos(entregadaEn, ahora) <= SEGUNDOS_POR_PREGUNTA + TOLERANCIA_RED_SEGUNDOS;
}

/** Segundos que le quedan al estudiante en pantalla (0 si ya se agotó); sin tolerancia, para el temporizador. */
export function segundosRestantes(entregadaEn: Date, ahora: Date): number {
  const restantes = SEGUNDOS_POR_PREGUNTA - segundosTranscurridos(entregadaEn, ahora);
  return Math.max(0, Math.round(restantes * 100) / 100);
}

/**
 * Tiempo usado por pregunta (desempate de los duelos): los segundos hasta responder,
 * como máximo 20; si no respondió o se agotó el tiempo, 20.
 */
export function segundosUsados(entregadaEn: Date, respondidaEn: Date | null): number {
  if (respondidaEn === null) return SEGUNDOS_POR_PREGUNTA;
  const usados = segundosTranscurridos(entregadaEn, respondidaEn);
  return Math.round(Math.min(SEGUNDOS_POR_PREGUNTA, Math.max(0, usados)) * 100) / 100;
}
