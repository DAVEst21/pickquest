import {
  calificarExpediente,
  EntradaExpediente,
  faltantesExpediente,
  FragmentoEval,
} from './expediente-proyecto.calificacion';

/**
 * 10 fragmentos relevantes (ids 1-10; 1-7 respaldan el modelo) y 4 irrelevantes (ids 11-14).
 * La característica correcta de cada relevante es su propio id (basta para comparar).
 */
const FRAGMENTOS: FragmentoEval[] = [
  ...Array.from({ length: 10 }, (_, i) => ({
    id: i + 1,
    caracteristicaCorrectaId: i + 1,
    respaldaModelo: i < 7,
  })),
  ...Array.from({ length: 4 }, (_, i) => ({ id: 11 + i, caracteristicaCorrectaId: null, respaldaModelo: false })),
];

const correctas = (ids: number[]) => ids.map((id) => ({ fragmentoId: id, caracteristicaId: id }));
const base = (e: Partial<EntradaExpediente>): EntradaExpediente => ({
  modeloElegido: 'AGIL',
  modeloCorrecto: 'AGIL',
  fragmentos: FRAGMENTOS,
  evidencias: [],
  vinculos: [],
  ...e,
});

describe('CU-07 RN-22: calificación de la investigación', () => {
  it('perfecto: modelo correcto, las 10 evidencias relevantes bien caracterizadas y vínculos de respaldo = 100 %', () => {
    const r = calificarExpediente(
      base({ evidencias: correctas([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]), vinculos: [1, 2, 3] }),
    );
    expect(r).toBe(100);
  });

  it('cero: modelo equivocado, nada relevante y sin vínculos = 0 %', () => {
    expect(calificarExpediente(base({ modeloElegido: 'CASCADA' }))).toBe(0);
  });

  it('intermedio calculado a mano: 50 + 30×5/10 + 20×3/4 = 80', () => {
    expect(calificarExpediente(base({ evidencias: correctas([1, 2, 3, 4, 5]), vinculos: [1, 2, 3, 8] }))).toBe(80);
  });

  it('se trunca: 50 + 9 + 6.67 = 65', () => {
    expect(calificarExpediente(base({ evidencias: correctas([1, 2, 3]), vinculos: [1, 8, 9] }))).toBe(65);
  });

  it('con el modelo equivocado no cuentan los vínculos de respaldo (20 % = 0)', () => {
    expect(
      calificarExpediente(base({ modeloElegido: 'CASCADA', evidencias: correctas([1, 2, 3, 4, 5]), vinculos: [1, 2] })),
    ).toBe(15);
  });

  it('una evidencia relevante con la característica equivocada no suma el 30 %', () => {
    const evidencias = [{ fragmentoId: 1, caracteristicaId: 2 }, ...correctas([2, 3])];
    expect(calificarExpediente(base({ evidencias, vinculos: [2, 3] }))).toBe(50 + 6 + 20);
  });

  it('cada evidencia irrelevante resta 5 puntos', () => {
    const evidencias = [...correctas([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]), { fragmentoId: 11, caracteristicaId: 1 }];
    expect(calificarExpediente(base({ evidencias, vinculos: [1, 2] }))).toBe(95);
    const dos = [...evidencias, { fragmentoId: 12, caracteristicaId: 1 }];
    expect(calificarExpediente(base({ evidencias: dos, vinculos: [1, 2] }))).toBe(90);
  });

  it('nunca baja de 0 ni pasa de 100', () => {
    const solo = [11, 12, 13, 14].map((id) => ({ fragmentoId: id, caracteristicaId: 1 }));
    expect(calificarExpediente(base({ modeloElegido: 'CASCADA', evidencias: solo }))).toBe(0);
    const todas = [...correctas([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])];
    expect(calificarExpediente(base({ evidencias: todas, vinculos: [1, 2] }))).toBeLessThanOrEqual(100);
  });

  it('un vínculo a un fragmento sin respaldo baja el 20 % proporcionalmente', () => {
    // 100 con 2 vínculos de respaldo; con uno de dos que respalda: 50 + 30 + 10 = 90
    const evidencias = correctas([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(calificarExpediente(base({ evidencias, vinculos: [1, 8] }))).toBe(90);
  });
});

describe('CU-07 FE1: faltantes para enviar', () => {
  it('sin modelo y sin vínculos', () => {
    const f = faltantesExpediente(null, [], []);
    expect(f).toHaveLength(2);
    expect(f.join(' ')).toMatch(/modelo/);
    expect(f.join(' ')).toMatch(/al menos 2 evidencias/);
  });

  it('con un solo vínculo no se puede enviar', () => {
    expect(faltantesExpediente('AGIL', correctas([1]), [1])).toEqual([
      'Debes vincular al menos 2 evidencias al modelo elegido',
    ]);
  });

  it('con modelo y 2 vínculos no falta nada', () => {
    expect(faltantesExpediente('AGIL', correctas([1, 2]), [1, 2])).toEqual([]);
  });

  it('una evidencia sin característica cuenta como faltante', () => {
    const f = faltantesExpediente(
      'AGIL',
      [
        { fragmentoId: 1, caracteristicaId: 1, texto: 'A' },
        { fragmentoId: 2, caracteristicaId: null, texto: 'B' },
      ],
      [1, 2],
    );
    expect(f).toHaveLength(1);
    expect(f[0]).toMatch(/«B»/);
  });
});
