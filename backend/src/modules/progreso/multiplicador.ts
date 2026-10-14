/**
 * RN-13 (parte del Sprint 2): los QP otorgados se multiplican por
 * RachaEstudio.multiplicadorQP y se redondean al entero más cercano.
 * Hoy el multiplicador siempre vale 1.00; la lógica que lo actualiza es del
 * Sprint 3. Sin racha se usa 1.00.
 */
export const MULTIPLICADOR_POR_DEFECTO = 1;

export function aplicarMultiplicador(qpBase: number, multiplicador: number): number {
  return Math.round(qpBase * multiplicador);
}
