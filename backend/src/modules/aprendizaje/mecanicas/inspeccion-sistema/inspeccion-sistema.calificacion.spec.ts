import {
  calificarInspeccion,
  evaluarInspeccion,
  excedeMaxMarcas,
  faltantesInspeccion,
} from './inspeccion-sistema.calificacion';

/** 6 fallas (elementos 1-6) y 3 elementos sin falla (7-9). */
const FALLAS = [
  { elementoId: 1, atributo: 'SEGURIDAD' },
  { elementoId: 2, atributo: 'USABILIDAD' },
  { elementoId: 3, atributo: 'USABILIDAD' },
  { elementoId: 4, atributo: 'EFICIENCIA_DESEMPENO' },
  { elementoId: 5, atributo: 'ADECUACION_FUNCIONAL' },
  { elementoId: 6, atributo: 'FIABILIDAD' },
];
const correctas = FALLAS.map((f) => ({ elementoId: f.elementoId, atributo: f.atributo }));

describe('CU-04 RN-19 calificación de la inspección', () => {
  it('las 6 fallas con su atributo correcto y sin marcas de más: 100 (sin error de punto flotante)', () => {
    // 6 × (100/6) en punto flotante daría 99.99999… y se truncaría a 99
    expect(calificarInspeccion(FALLAS, correctas)).toBe(100);
  });

  it('sin marcas: 0', () => {
    expect(calificarInspeccion(FALLAS, [])).toBe(0);
  });

  it('encontrar las fallas pero con atributo equivocado vale 60%: 60', () => {
    const marcas = FALLAS.map((f) => ({ elementoId: f.elementoId, atributo: 'PORTABILIDAD' }));
    expect(calificarInspeccion(FALLAS, marcas)).toBe(60);
  });

  it('intermedio a mano: 4 encontradas (3 con atributo) y 1 marca sin falla = (240 + 120 − 50) / 6 = 51.67 → 51', () => {
    const marcas = [
      { elementoId: 1, atributo: 'SEGURIDAD' },
      { elementoId: 2, atributo: 'USABILIDAD' },
      { elementoId: 3, atributo: 'USABILIDAD' },
      { elementoId: 4, atributo: 'COMPATIBILIDAD' }, // atributo equivocado
      { elementoId: 7, atributo: 'USABILIDAD' }, // sin falla
    ];
    expect(calificarInspeccion(FALLAS, marcas)).toBe(51);
  });

  it('cada marca sin falla resta la mitad del valor de una falla y se acota en 0', () => {
    const solasMalas = [7, 8, 9].map((e) => ({ elementoId: e, atributo: 'USABILIDAD' }));
    expect(calificarInspeccion(FALLAS, solasMalas)).toBe(0); // −150/6 = −25 → 0
    // una buena (100/6 = 16.67) y una mala (−8.33) = 8.33 → 8
    expect(
      calificarInspeccion(FALLAS, [
        { elementoId: 1, atributo: 'SEGURIDAD' },
        { elementoId: 7, atributo: 'SEGURIDAD' },
      ]),
    ).toBe(8);
  });

  it('el detalle separa encontradas, no encontradas y marcas sin falla', () => {
    const d = evaluarInspeccion(FALLAS, [
      { elementoId: 1, atributo: 'SEGURIDAD' },
      { elementoId: 2, atributo: 'SEGURIDAD' },
      { elementoId: 8, atributo: null },
    ]);
    expect(d.encontradas.map((e) => [e.falla.elementoId, e.atributoAcertado])).toEqual([
      [1, true],
      [2, false],
    ]);
    expect(d.noEncontradas.map((f) => f.elementoId)).toEqual([3, 4, 5, 6]);
    expect(d.marcasSinFalla.map((m) => m.elementoId)).toEqual([8]);
  });
});

describe('CU-04 FE1 y FE2: faltantes', () => {
  it('FE2: las marcas sin atributo se listan y bloquean el envío', () => {
    const f = faltantesInspeccion(
      [
        { elementoId: 1, atributo: null },
        { elementoId: 2, atributo: 'USABILIDAD' },
      ],
      (id) => `E${id}`,
    );
    expect(f).toEqual(['La marca sobre "E1" no tiene atributo de calidad']);
  });

  it('FE1: al llegar al máximo no se permiten más marcas', () => {
    expect(excedeMaxMarcas(9, 9)).toBe(false);
    expect(excedeMaxMarcas(10, 9)).toBe(true);
  });
});
