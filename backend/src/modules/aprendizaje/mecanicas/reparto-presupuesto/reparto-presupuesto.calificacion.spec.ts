import {
  AtributoEval,
  calcularMedidores,
  DetallePresupuesto,
  EfectoEval,
  evaluarPresupuesto,
  faltantesPresupuesto,
  porcentajePresupuesto,
  restriccionMasLejana,
} from './reparto-presupuesto.calificacion';

/** Mismo escenario que el seed (presupuesto 20). 1 Seguridad · 2 Usabilidad · 3 Eficiencia · 4 Mantenibilidad. */
const ATRIBUTOS: AtributoEval[] = [
  { id: 1, valorBase: 30, ganancia: 5, minimoObligatorio: 70, asignacionReferencia: 8 },
  { id: 2, valorBase: 40, ganancia: 5, minimoObligatorio: 60, asignacionReferencia: 6 },
  { id: 3, valorBase: 40, ganancia: 4, minimoObligatorio: 40, asignacionReferencia: 4 },
  { id: 4, valorBase: 30, ganancia: 4, minimoObligatorio: null, asignacionReferencia: 2 },
];
const EFECTOS: EfectoEval[] = [
  { origenId: 1, destinoId: 3, factor: -1.5 },
  { origenId: 1, destinoId: 2, factor: -1 },
  { origenId: 3, destinoId: 4, factor: -1 },
  { origenId: 4, destinoId: 3, factor: 0.5 },
];
const PRESUPUESTO = 20;

function puntaje(
  puntos: [number, number, number, number],
  justificacionCorrecta: boolean,
): number {
  const mapa = new Map(puntos.map((p, i) => [i + 1, p]));
  const medidores = calcularMedidores(ATRIBUTOS, EFECTOS, mapa);
  return porcentajePresupuesto(
    evaluarPresupuesto(ATRIBUTOS, mapa, medidores),
    PRESUPUESTO,
    justificacionCorrecta,
  );
}

describe('CU-06 medidor de un atributo', () => {
  it('suma la ganancia propia y los efectos cruzados (reparto de referencia 8-6-4-2)', () => {
    const m = calcularMedidores(ATRIBUTOS, EFECTOS, new Map([[1, 8], [2, 6], [3, 4], [4, 2]]));
    expect(m.get(1)).toBe(70); // 30 + 5·8
    expect(m.get(2)).toBe(62); // 40 + 5·6 − 1·8
    expect(m.get(3)).toBe(45); // 40 + 4·4 − 1.5·8 + 0.5·2
    expect(m.get(4)).toBe(34); // 30 + 4·2 − 1·4
  });

  it('se acota entre 0 y 100', () => {
    const m = calcularMedidores(ATRIBUTOS, EFECTOS, new Map([[1, 20]]));
    expect(m.get(1)).toBe(100); // 30 + 100 = 130
    const bajo = calcularMedidores(
      [{ id: 1, valorBase: 10, ganancia: 1 }, { id: 2, valorBase: 50, ganancia: 1 }],
      [{ origenId: 2, destinoId: 1, factor: -2 }],
      new Map([[2, 20]]),
    );
    expect(bajo.get(1)).toBe(0); // 10 − 40
  });
});

describe('CU-06 RN-21 calificación del reparto de presupuesto', () => {
  it('reparto de referencia con la justificación correcta: 100', () => {
    expect(puntaje([8, 6, 4, 2], true)).toBe(100);
  });

  it('el caso en cero: sin restricciones cumplidas, reparto lo más lejano posible y justificación errónea', () => {
    const d: DetallePresupuesto = {
      restriccionesCumplidas: 0,
      restriccionesTotales: 3,
      distancia: 2 * PRESUPUESTO,
    };
    expect(porcentajePresupuesto(d, PRESUPUESTO, false)).toBe(0);
  });

  it('intermedio a mano (8-6-2-4): 2/3 restricciones (33.33) + cercanía 36/40 (27) + justificación errónea (0) = 60.33 → 60', () => {
    // medidores: Seg 70 ✓, Usab 62 ✓, Efic 40 + 8 − 12 + 2 = 38 ✗; distancia = |2−4| + |4−2| = 4
    expect(puntaje([8, 6, 2, 4], false)).toBe(60);
  });

  it('trunca: 5-0-0-0 cumple 0/3 restricciones, distancia 15 → 30·(1 − 15/40) = 18.75 → 18', () => {
    expect(puntaje([5, 0, 0, 0], false)).toBe(18);
  });

  it('la justificación correcta vale exactamente 20 puntos', () => {
    expect(puntaje([8, 6, 4, 2], true) - puntaje([8, 6, 4, 2], false)).toBe(20);
  });

  it('el reparto parejo 5-5-5-5 incumple Seguridad (55 < 70)', () => {
    const mapa = new Map([[1, 5], [2, 5], [3, 5], [4, 5]]);
    const medidores = calcularMedidores(ATRIBUTOS, EFECTOS, mapa);
    expect(medidores.get(1)).toBe(55);
    expect(evaluarPresupuesto(ATRIBUTOS, mapa, medidores).restriccionesCumplidas).toBe(2);
  });
});

describe('CU-06 FE1 y faltantes', () => {
  it('sin justificación no se puede enviar', () => {
    expect(faltantesPresupuesto(null, 20, 20)).toEqual(['Falta elegir una justificación para tu reparto']);
  });

  it('FE1: asignar más que el presupuesto no se permite', () => {
    expect(faltantesPresupuesto(3, 21, 20)).toHaveLength(1);
    expect(faltantesPresupuesto(3, 20, 20)).toEqual([]);
  });

  it('FA2: la restricción más lejos de cumplirse es la de mayor déficit', () => {
    const medidores = calcularMedidores(ATRIBUTOS, EFECTOS, new Map());
    const lejana = restriccionMasLejana(ATRIBUTOS, medidores);
    expect(lejana?.atributo.id).toBe(1); // Seguridad: 30 de 70 → déficit 40
    expect(lejana?.deficit).toBe(40);
  });
});
