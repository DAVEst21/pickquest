/**
 * Porcentaje entero 0-100 de una fracción exacta `numerador / denominador`:
 * se trunca (Math.floor) y se acota entre 0 y 100. Todas las fórmulas de
 * calificación (RN-16, 17, 18, 19, 21 y 23) se expresan con numeradores enteros
 * sobre un denominador común para evitar errores de punto flotante (p. ej.
 * que 6 fallas de 100/6 sumen 99.99999 y se trunquen a 99).
 */
export function porcentajeEntero(numerador: number, denominador: number): number {
  if (denominador <= 0) return 0;
  const valor = Math.floor(numerador / denominador);
  return Math.max(0, Math.min(100, valor));
}

/** -1, 0 o 1. */
export function signo(n: number): number {
  return n > 0 ? 1 : n < 0 ? -1 : 0;
}

/**
 * Concordancia de orden: fracción de pares (i, j) cuyo orden relativo en `a`
 * coincide con el de `b`. Devuelve los conteos para poder usarlos como
 * fracción exacta.
 */
export function paresConcordantes(
  elementos: { a: number; b: number }[],
): { concordantes: number; pares: number } {
  let concordantes = 0;
  let pares = 0;
  for (let i = 0; i < elementos.length; i++) {
    for (let j = i + 1; j < elementos.length; j++) {
      pares++;
      if (
        signo(elementos[i].a - elementos[j].a) ===
        signo(elementos[i].b - elementos[j].b)
      ) {
        concordantes++;
      }
    }
  }
  return { concordantes, pares };
}
