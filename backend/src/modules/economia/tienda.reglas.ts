/**
 * CU-12 Tienda (RF-15). Reglas puras de compra y equipado.
 *
 * RN-11: una compra solo procede si el saldo de QP alcanza.
 * RN-28: máximo 5 unidades de un mismo objeto en el inventario.
 * RN-10: máximo 2 objetos equipados.
 */
export const MAX_UNIDADES_POR_OBJETO = 5;
export const MAX_EQUIPADOS = 2;

export type ResultadoCompra =
  | { ok: true; total: number; saldoFinal: number; unidadesFinales: number }
  | { ok: false; motivo: 'SALDO_INSUFICIENTE'; total: number; qpFaltantes: number }
  | { ok: false; motivo: 'LIMITE_UNIDADES'; limite: number; unidadesActuales: number; disponibles: number };

/** FE1 (saldo) y FE2 (límite de unidades); el saldo se verifica primero. */
export function evaluarCompra(
  saldoQP: number,
  costoQP: number,
  cantidad: number,
  unidadesActuales: number,
): ResultadoCompra {
  const total = costoQP * cantidad;
  if (saldoQP < total) {
    return { ok: false, motivo: 'SALDO_INSUFICIENTE', total, qpFaltantes: total - saldoQP };
  }
  if (unidadesActuales + cantidad > MAX_UNIDADES_POR_OBJETO) {
    return {
      ok: false,
      motivo: 'LIMITE_UNIDADES',
      limite: MAX_UNIDADES_POR_OBJETO,
      unidadesActuales,
      disponibles: Math.max(0, MAX_UNIDADES_POR_OBJETO - unidadesActuales),
    };
  }
  return { ok: true, total, saldoFinal: saldoQP - total, unidadesFinales: unidadesActuales + cantidad };
}

export type DecisionEquipar =
  | { accion: 'YA_EQUIPADO' }
  | { accion: 'EQUIPAR' }
  | { accion: 'PEDIR_REEMPLAZO' }
  | { accion: 'REEMPLAZAR'; desequipar: number }
  | { accion: 'REEMPLAZO_INVALIDO' };

/** FA2: con el cinto lleno hay que elegir cuál reemplazar. */
export function decidirEquipar(
  equipados: number[],
  objetoId: number,
  reemplazaObjetoId?: number,
): DecisionEquipar {
  if (equipados.includes(objetoId)) return { accion: 'YA_EQUIPADO' };
  if (equipados.length < MAX_EQUIPADOS) return { accion: 'EQUIPAR' };
  if (reemplazaObjetoId === undefined) return { accion: 'PEDIR_REEMPLAZO' };
  if (!equipados.includes(reemplazaObjetoId)) return { accion: 'REEMPLAZO_INVALIDO' };
  return { accion: 'REEMPLAZAR', desequipar: reemplazaObjetoId };
}
