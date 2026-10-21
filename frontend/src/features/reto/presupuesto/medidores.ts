import type { AtributoEscenarioContenido } from '../../../types';

/**
 * CU-06: medidor de cada atributo, para que se actualice al instante mientras
 * se reparte el presupuesto.
 *
 * ES LA MISMA FÓRMULA que califica el servidor
 * (backend/src/modules/aprendizaje/mecanicas/reparto-presupuesto/reparto-presupuesto.calificacion.ts,
 * función calcularMedidores). Si cambia allá, hay que cambiarla aquí. Aquí solo
 * sirve para mostrar; la calificación siempre la calcula el backend.
 *
 *   clamp(0, 100, round(valorBase + ganancia × puntosPropios + Σ(factor × puntos del atributo origen)))
 */
export function calcularMedidores(
  atributos: Pick<AtributoEscenarioContenido, 'id' | 'valorBase' | 'ganancia'>[],
  efectos: { origenId: number; destinoId: number; factor: number }[],
  puntos: Record<number, number>,
): Record<number, number> {
  const medidores: Record<number, number> = {};
  for (const a of atributos) {
    let valor = a.valorBase + a.ganancia * (puntos[a.id] ?? 0);
    for (const e of efectos) {
      if (e.destinoId === a.id) valor += e.factor * (puntos[e.origenId] ?? 0);
    }
    medidores[a.id] = Math.max(0, Math.min(100, Math.round(valor)));
  }
  return medidores;
}
