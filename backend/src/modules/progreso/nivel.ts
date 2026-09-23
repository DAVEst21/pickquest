/**
 * Curva de niveles.
 *
 * Regla tomada de frontend/src/store/playerStore.ts: el nivel sube mientras
 * xpTotal >= umbral del nivel actual, y el umbral aumenta 500 cada vez que se
 * sube de nivel. El umbral es XP acumulada (xpTotal no se reinicia al subir).
 *
 * El mock no dice cuál es el umbral de los primeros niveles (arranca ya en
 * nivel 5 con umbral 1000, lo que no es compatible con +500 por nivel desde el
 * nivel 1). Se eligió, PENDIENTE DE CONFIRMAR:
 *   - Todo estudiante empieza en nivel 1 con 0 XP.
 *   - Umbral del nivel 1 = 500 XP; cada nivel suma 500 → umbral(n) = 500 · n.
 * Equivale a: nivel = floor(xpTotal / 500) + 1.
 */
export const UMBRAL_BASE = 500;
export const INCREMENTO_UMBRAL = 500;

export interface Nivel {
  nivel: number;
  /** XP acumulada necesaria para pasar al siguiente nivel. */
  xpSiguienteNivel: number;
}

export function calcularNivel(xpTotal: number): Nivel {
  let nivel = 1;
  let umbral = UMBRAL_BASE;
  while (xpTotal >= umbral) {
    nivel += 1;
    umbral += INCREMENTO_UMBRAL;
  }
  return { nivel, xpSiguienteNivel: umbral };
}
