import {
  calificarMoscow,
  concordanciaOrdenMust,
  faltantesMoscow,
  puntosEnMust,
  TarjetaEval,
} from './tablero-moscow.calificacion';

/**
 * Tarjetas de prueba:
 *   t1 MUST RF ref 1 (5 pts) · t2 MUST RF ref 2 (5 pts) · t3 SHOULD RNF (3 pts) · t4 WONT RF (8 pts)
 */
function tarjetas(respuestas: Partial<Record<number, Partial<TarjetaEval>>>): TarjetaEval[] {
  const base: TarjetaEval[] = [
    { id: 1, texto: 'T1', puntos: 5, columnaCorrecta: 'MUST', tipoCorrecto: 'FUNCIONAL', ordenMustReferencia: 1, columna: null, tipo: null, ordenMust: null },
    { id: 2, texto: 'T2', puntos: 5, columnaCorrecta: 'MUST', tipoCorrecto: 'FUNCIONAL', ordenMustReferencia: 2, columna: null, tipo: null, ordenMust: null },
    { id: 3, texto: 'T3', puntos: 3, columnaCorrecta: 'SHOULD', tipoCorrecto: 'NO_FUNCIONAL', ordenMustReferencia: null, columna: null, tipo: null, ordenMust: null },
    { id: 4, texto: 'T4', puntos: 8, columnaCorrecta: 'WONT', tipoCorrecto: 'FUNCIONAL', ordenMustReferencia: null, columna: null, tipo: null, ordenMust: null },
  ];
  return base.map((t) => ({ ...t, ...respuestas[t.id] }));
}

const PERFECTO = {
  1: { columna: 'MUST', tipo: 'FUNCIONAL', ordenMust: 1 },
  2: { columna: 'MUST', tipo: 'FUNCIONAL', ordenMust: 2 },
  3: { columna: 'SHOULD', tipo: 'NO_FUNCIONAL' },
  4: { columna: 'WONT', tipo: 'FUNCIONAL' },
} as const;

describe('CU-03 RN-18 calificación del tablero MoSCoW', () => {
  it('todo correcto y en orden: 100', () => {
    expect(calificarMoscow(tarjetas(PERFECTO as never))).toBe(100);
  });

  it('todo incorrecto: 0', () => {
    const t = tarjetas({
      1: { columna: 'WONT', tipo: 'NO_FUNCIONAL' },
      2: { columna: 'COULD', tipo: 'NO_FUNCIONAL' },
      3: { columna: 'MUST', tipo: 'FUNCIONAL', ordenMust: 1 },
      4: { columna: 'SHOULD', tipo: 'NO_FUNCIONAL' },
    });
    expect(calificarMoscow(t)).toBe(0);
  });

  it('sin clasificar nada: 0', () => {
    expect(calificarMoscow(tarjetas({}))).toBe(0);
  });

  it('intermedio a mano: 3/4 columnas (37.5) + 3/4 tipos (22.5) + orden invertido (0) = 60', () => {
    const t = tarjetas({
      1: { columna: 'MUST', tipo: 'FUNCIONAL', ordenMust: 2 },
      2: { columna: 'MUST', tipo: 'NO_FUNCIONAL', ordenMust: 1 },
      3: { columna: 'COULD', tipo: 'NO_FUNCIONAL' },
      4: { columna: 'WONT', tipo: 'FUNCIONAL' },
    });
    expect(calificarMoscow(t)).toBe(60);
  });

  it('trunca en lugar de redondear: 37.5 + 30 + 20 = 87.5 → 87', () => {
    const t = tarjetas({
      1: { columna: 'MUST', tipo: 'FUNCIONAL', ordenMust: 1 },
      2: { columna: 'MUST', tipo: 'FUNCIONAL', ordenMust: 2 },
      3: { columna: 'COULD', tipo: 'NO_FUNCIONAL' },
      4: { columna: 'WONT', tipo: 'FUNCIONAL' },
    });
    expect(calificarMoscow(t)).toBe(87);
  });
});

describe('CU-03 RN-18 concordancia del orden de MUST', () => {
  const must3 = (orden: [number, number, number]): TarjetaEval[] =>
    [1, 2, 3].map((id, i) => ({
      id,
      texto: `M${id}`,
      puntos: 1,
      columnaCorrecta: 'MUST' as const,
      tipoCorrecto: 'FUNCIONAL' as const,
      ordenMustReferencia: id,
      columna: 'MUST' as const,
      tipo: 'FUNCIONAL' as const,
      ordenMust: orden[i],
    }));

  it('mismo orden: todos los pares concuerdan', () => {
    expect(concordanciaOrdenMust(must3([1, 2, 3]))).toEqual({ concordantes: 3, pares: 3 });
  });

  it('un intercambio: 2 de 3 pares concuerdan', () => {
    expect(concordanciaOrdenMust(must3([1, 3, 2]))).toEqual({ concordantes: 2, pares: 3 });
  });

  it('orden completamente invertido: 0 de 3', () => {
    expect(concordanciaOrdenMust(must3([3, 2, 1]))).toEqual({ concordantes: 0, pares: 3 });
  });

  it('con menos de 2 tarjetas comunes vale 1 si puso en MUST exactamente las de referencia', () => {
    const una: TarjetaEval[] = [
      { id: 1, texto: 'U', puntos: 1, columnaCorrecta: 'MUST', tipoCorrecto: 'FUNCIONAL', ordenMustReferencia: 1, columna: 'MUST', tipo: 'FUNCIONAL', ordenMust: 1 },
      { id: 2, texto: 'V', puntos: 1, columnaCorrecta: 'COULD', tipoCorrecto: 'FUNCIONAL', ordenMustReferencia: null, columna: 'COULD', tipo: 'FUNCIONAL', ordenMust: null },
    ];
    expect(concordanciaOrdenMust(una)).toEqual({ concordantes: 1, pares: 1 });
    // …y 0 si además puso en MUST una tarjeta que no era de MUST
    una[1] = { ...una[1], columna: 'MUST', ordenMust: 2 };
    expect(concordanciaOrdenMust(una)).toEqual({ concordantes: 0, pares: 1 });
  });
});

describe('CU-03 FE1 y FE2: faltantes para enviar', () => {
  it('FE1: tarjetas sin columna o sin tipo', () => {
    const f = faltantesMoscow(tarjetas({ 1: { columna: 'MUST' }, 2: { tipo: 'FUNCIONAL' } }), 20);
    expect(f.filter((m) => m.includes('columna'))).toHaveLength(3); // t2, t3, t4 sin columna
    expect(f.filter((m) => m.includes('RF o RNF'))).toHaveLength(3); // t1, t3, t4 sin tipo
  });

  it('FE2: MUST por encima de la capacidad no deja enviar', () => {
    const t = tarjetas({
      1: { columna: 'MUST', tipo: 'FUNCIONAL', ordenMust: 1 },
      2: { columna: 'MUST', tipo: 'FUNCIONAL', ordenMust: 2 },
      3: { columna: 'MUST', tipo: 'NO_FUNCIONAL', ordenMust: 3 },
      4: { columna: 'WONT', tipo: 'FUNCIONAL' },
    });
    expect(puntosEnMust(t)).toBe(13);
    expect(faltantesMoscow(t, 12)).toEqual([
      'Los puntos de MUST (13) superan la capacidad permitida (12)',
    ]);
  });

  it('exactamente en la capacidad sí se puede enviar', () => {
    expect(faltantesMoscow(tarjetas(PERFECTO as never), 10)).toEqual([]);
  });
});
