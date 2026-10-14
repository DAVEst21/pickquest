import {
  BloqueEval,
  calificarLineaTiempo,
  DetalleLineaTiempo,
  EntradaLineaTiempo,
  evaluarLineaTiempo,
  faltantesLineaTiempo,
  finDelPlan,
  porcentajeLineaTiempo,
} from './linea-tiempo.calificacion';

/**
 * Plan de prueba (semanas desde 0), fecha límite 7:
 *   A fase dur 2 ref 0 · B fase dur 2 ref 2 · C fase dur 2 ref 4 · X actividad dur 1 ref 0
 *   B requiere A · C requiere B · C requiere X
 *   entregable 1 → A · entregable 2 → C
 */
const BLOQUES: BloqueEval[] = [
  { id: 1, tipo: 'FASE', nombre: 'A', duracionSemanas: 2, inicioReferencia: 0 },
  { id: 2, tipo: 'FASE', nombre: 'B', duracionSemanas: 2, inicioReferencia: 2 },
  { id: 3, tipo: 'FASE', nombre: 'C', duracionSemanas: 2, inicioReferencia: 4 },
  { id: 4, tipo: 'ACTIVIDAD', nombre: 'X', duracionSemanas: 1, inicioReferencia: 0 },
];

function entrada(
  inicios: [number, number][],
  asociaciones: [number, number][],
): EntradaLineaTiempo {
  return {
    bloques: BLOQUES,
    dependencias: [
      { bloqueId: 2, requiereId: 1 },
      { bloqueId: 3, requiereId: 2 },
      { bloqueId: 3, requiereId: 4 },
    ],
    entregables: [
      { id: 1, nombre: 'E1', faseCorrectaId: 1 },
      { id: 2, nombre: 'E2', faseCorrectaId: 3 },
    ],
    inicios: new Map(inicios),
    asociaciones: new Map(asociaciones),
    duracionMaximaSemanas: 7,
  };
}

describe('CU-08 RN-23 calificación de la línea de tiempo', () => {
  it('plan de referencia con todo bien asociado: 100', () => {
    // 40 (orden) + 30 (3/3 dependencias) + 20 (2/2 entregables) + 10 (fin 6 ≤ 7)
    const e = entrada([[1, 0], [2, 2], [3, 4], [4, 0]], [[1, 1], [2, 3]]);
    expect(calificarLineaTiempo(e)).toBe(100);
  });

  it('todo mal: orden invertido, dependencias rotas, entregables cruzados y fuera de plazo: 0', () => {
    const e = entrada([[1, 4], [2, 2], [3, 0], [4, 8]], [[1, 3], [2, 1]]);
    const d = evaluarLineaTiempo(e);
    expect(d.paresConcordantes).toBe(0);
    expect(d.dependenciasRespetadas).toBe(0);
    expect(d.entregablesBien).toBe(0);
    expect(d.fin).toBe(9);
    expect(d.dentroDelPlazo).toBe(false);
    expect(calificarLineaTiempo(e)).toBe(0);
  });

  it('caso intermedio calculado a mano: 40 + 20 + 10 + 10 = 80', () => {
    // inicios A0 B1 C4 X0: orden de fases 3/3 → 40; B (1) < fin de A (2) incumple,
    // C≥B+2 y C≥X+1 cumplen → 2/3 → 20; E1→A bien y E2→B mal → 1/2 → 10; fin 6 ≤ 7 → 10.
    const e = entrada([[1, 0], [2, 1], [3, 4], [4, 0]], [[1, 1], [2, 2]]);
    const d = evaluarLineaTiempo(e);
    expect(d.paresConcordantes).toBe(3);
    expect(d.dependenciasIncumplidas).toEqual([{ bloqueId: 2, requiereId: 1 }]);
    expect(d.entregablesMal.map((x) => x.id)).toEqual([2]);
    expect(calificarLineaTiempo(e)).toBe(80);
  });

  it('trunca en lugar de redondear: 86.67 → 86', () => {
    const detalle: DetalleLineaTiempo = {
      paresConcordantes: 2,
      paresTotales: 3,
      dependenciasRespetadas: 3,
      dependenciasIncumplidas: [],
      entregablesBien: 2,
      entregablesMal: [],
      fin: 6,
      dentroDelPlazo: true,
    };
    // 40·2/3 + 30 + 20 + 10 = 86.666…
    expect(porcentajeLineaTiempo(detalle, { dependencias: 3, entregables: 2 })).toBe(86);
  });

  it('rebasar la fecha límite solo quita los 10 puntos del plazo', () => {
    const e = entrada([[1, 0], [2, 2], [3, 5], [4, 0]], [[1, 1], [2, 3]]); // fin = 7 → sí cumple
    expect(calificarLineaTiempo(e)).toBe(100);
    const tarde = entrada([[1, 0], [2, 2], [3, 6], [4, 0]], [[1, 1], [2, 3]]); // fin = 8 > 7
    expect(calificarLineaTiempo(tarde)).toBe(90);
  });

  it('finDelPlan es máx(inicio + duración) de los bloques colocados', () => {
    expect(finDelPlan(BLOQUES, new Map([[1, 0], [3, 5]]))).toBe(7);
    expect(finDelPlan(BLOQUES, new Map())).toBe(0);
  });
});

describe('CU-08 FE1: faltantes para enviar', () => {
  const entregables = [
    { id: 1, nombre: 'E1' },
    { id: 2, nombre: 'E2' },
  ];

  it('bloques sin colocar y entregables sin asociar se listan', () => {
    const faltantes = faltantesLineaTiempo(
      BLOQUES,
      new Map([[1, 0], [2, 2]]),
      entregables,
      new Map([[1, 1]]),
    );
    expect(faltantes).toHaveLength(3); // C y X sin colocar + E2 sin asociar
    expect(faltantes.some((f) => f.includes('"C"'))).toBe(true);
    expect(faltantes.some((f) => f.includes('"X"'))).toBe(true);
    expect(faltantes.some((f) => f.includes('"E2"'))).toBe(true);
  });

  it('con todo colocado y asociado no falta nada (rebasar la fecha límite no bloquea: FE2)', () => {
    const faltantes = faltantesLineaTiempo(
      BLOQUES,
      new Map([[1, 0], [2, 50], [3, 90], [4, 0]]),
      entregables,
      new Map([[1, 1], [2, 3]]),
    );
    expect(faltantes).toEqual([]);
  });
});
