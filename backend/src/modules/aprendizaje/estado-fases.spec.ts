import {
  calcularEstadosFases,
  FaseParaEstado,
  ResumenReto,
  resumirIntentos,
} from './estado-fases';

// Fase n tiene el reto 100 + n; la fase 4 no tiene reto.
const FASES: FaseParaEstado[] = [
  { id: 1, orden: 1, retoId: 101 },
  { id: 2, orden: 2, retoId: 102 },
  { id: 3, orden: 3, retoId: 103 },
  { id: 4, orden: 4, retoId: null },
];

const aprobado: ResumenReto = {
  aprobado: true,
  intentos: 1,
  mejorPorcentaje: 100,
  mejorEstrellas: 3,
};
const fallido: ResumenReto = {
  aprobado: false,
  intentos: 2,
  mejorPorcentaje: 60,
  mejorEstrellas: 1,
};

const estados = (resumen: [number, ResumenReto][]) =>
  Object.fromEntries(calcularEstadosFases(FASES, new Map(resumen)));

describe('calcularEstadosFases', () => {
  it('estudiante nuevo: solo la primera fase está desbloqueada', () => {
    expect(estados([])).toEqual({
      1: 'desbloqueada',
      2: 'bloqueada',
      3: 'bloqueada',
      4: 'bloqueada',
    });
  });

  it('completar una fase desbloquea la siguiente', () => {
    expect(estados([[101, aprobado]])).toEqual({
      1: 'completada',
      2: 'desbloqueada',
      3: 'bloqueada',
      4: 'bloqueada',
    });
  });

  it('una fase desbloqueada con intentos no aprobados está en progreso', () => {
    expect(
      estados([
        [101, aprobado],
        [102, aprobado],
        [103, fallido],
      ]),
    ).toEqual({
      1: 'completada',
      2: 'completada',
      3: 'en_progreso',
      4: 'bloqueada',
    });
  });

  it('los intentos fallidos en una fase bloqueada no la desbloquean', () => {
    expect(estados([[102, fallido]])[2]).toBe('bloqueada');
  });

  it('una fase sin reto nunca se completa', () => {
    const resultado = estados([
      [101, aprobado],
      [102, aprobado],
      [103, aprobado],
    ]);
    expect(resultado[4]).toBe('desbloqueada');
  });

  it('usa el orden, no el id, para decidir cuál es la fase anterior', () => {
    const desordenadas: FaseParaEstado[] = [
      { id: 10, orden: 2, retoId: 202 },
      { id: 20, orden: 1, retoId: 201 },
    ];
    const resultado = calcularEstadosFases(
      desordenadas,
      new Map([[201, aprobado]]),
    );
    expect(resultado.get(20)).toBe('completada');
    expect(resultado.get(10)).toBe('desbloqueada');
  });
});

describe('resumirIntentos', () => {
  it('combina los grupos aprobado/no aprobado de un mismo reto', () => {
    const resumen = resumirIntentos([
      {
        retoId: 1,
        aprobado: false,
        intentos: 2,
        maxPorcentaje: 60,
        maxEstrellas: 1,
      },
      {
        retoId: 1,
        aprobado: true,
        intentos: 1,
        maxPorcentaje: 80,
        maxEstrellas: 2,
      },
    ]);
    expect(resumen.get(1)).toEqual({
      aprobado: true,
      intentos: 3,
      mejorPorcentaje: 80,
      mejorEstrellas: 2,
    });
  });
});
