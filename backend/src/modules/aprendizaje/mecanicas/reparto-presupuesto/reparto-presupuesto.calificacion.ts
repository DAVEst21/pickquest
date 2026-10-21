import { porcentajeEntero } from '../calificacion.util';

/**
 * CU-06 Reparto de presupuesto (RF-09, RN-21). Funciones puras.
 *
 * Medidor de un atributo:
 *   clamp(0, 100, round(valorBase + ganancia × puntosPropios + Σ(factor × puntos del atributo origen)))
 * donde la suma recorre los efectos cruzados cuyo destino es ese atributo.
 * El frontend usa la MISMA fórmula (frontend/src/features/reto/presupuesto/medidores.ts)
 * para que el medidor se actualice al instante; esta es la versión que califica.
 *
 * RN-21: 50 × (restricciones obligatorias cumplidas ÷ total)
 *      + 30 × (1 − Σ|asignado − referencia| ÷ (2 × presupuesto))
 *      + 20 × (justificación correcta ? 1 : 0)
 */

export interface AtributoEval {
  id: number;
  valorBase: number;
  ganancia: number;
  /** Valor mínimo que debe alcanzar el medidor (restricción obligatoria), si hay. */
  minimoObligatorio: number | null;
  asignacionReferencia: number;
}
export interface EfectoEval {
  origenId: number;
  destinoId: number;
  factor: number;
}

export function calcularMedidores(
  atributos: Pick<AtributoEval, 'id' | 'valorBase' | 'ganancia'>[],
  efectos: EfectoEval[],
  puntos: Map<number, number>,
): Map<number, number> {
  const medidores = new Map<number, number>();
  for (const a of atributos) {
    let valor = a.valorBase + a.ganancia * (puntos.get(a.id) ?? 0);
    for (const e of efectos) {
      if (e.destinoId === a.id) valor += e.factor * (puntos.get(e.origenId) ?? 0);
    }
    medidores.set(a.id, Math.max(0, Math.min(100, Math.round(valor))));
  }
  return medidores;
}

export interface DetallePresupuesto {
  restriccionesCumplidas: number;
  restriccionesTotales: number;
  /** Σ|asignado − referencia|. */
  distancia: number;
}

export function evaluarPresupuesto(
  atributos: AtributoEval[],
  puntos: Map<number, number>,
  medidores: Map<number, number>,
): DetallePresupuesto {
  const conRestriccion = atributos.filter((a) => a.minimoObligatorio !== null);
  const cumplidas = conRestriccion.filter(
    (a) => (medidores.get(a.id) ?? 0) >= a.minimoObligatorio!,
  ).length;
  const distancia = atributos.reduce(
    (suma, a) => suma + Math.abs((puntos.get(a.id) ?? 0) - a.asignacionReferencia),
    0,
  );
  return {
    restriccionesCumplidas: cumplidas,
    restriccionesTotales: conRestriccion.length,
    distancia,
  };
}

/** Sin restricciones obligatorias, ese componente se considera cumplido por completo. */
export function porcentajePresupuesto(
  d: DetallePresupuesto,
  presupuesto: number,
  justificacionCorrecta: boolean,
): number {
  if (presupuesto <= 0) return 0;
  const total = d.restriccionesTotales > 0 ? d.restriccionesTotales : 1;
  const cumplidas = d.restriccionesTotales > 0 ? d.restriccionesCumplidas : 1;
  const base = 2 * presupuesto;
  const cercania = Math.max(0, base - d.distancia);
  const numerador =
    50 * cumplidas * base + 30 * cercania * total + 20 * (justificacionCorrecta ? 1 : 0) * total * base;
  return porcentajeEntero(numerador, total * base);
}

/** CU-06: justificación sin elegir (y, por seguridad, reparto que rebasa el presupuesto: FE1). */
export function faltantesPresupuesto(
  justificacionId: number | null,
  puntosAsignados: number,
  presupuesto: number,
): string[] {
  const faltantes: string[] = [];
  if (justificacionId === null) faltantes.push('Falta elegir una justificación para tu reparto');
  if (puntosAsignados > presupuesto) {
    faltantes.push(`Asignaste ${puntosAsignados} puntos y el presupuesto es de ${presupuesto}`);
  }
  return faltantes;
}

/** Restricción más lejos de cumplirse (mayor déficit); null si no hay restricciones. */
export function restriccionMasLejana(
  atributos: AtributoEval[],
  medidores: Map<number, number>,
): { atributo: AtributoEval; deficit: number } | null {
  let mejor: { atributo: AtributoEval; deficit: number } | null = null;
  for (const a of atributos) {
    if (a.minimoObligatorio === null) continue;
    const deficit = a.minimoObligatorio - (medidores.get(a.id) ?? 0);
    if (mejor === null || deficit > mejor.deficit) mejor = { atributo: a, deficit };
  }
  return mejor;
}
