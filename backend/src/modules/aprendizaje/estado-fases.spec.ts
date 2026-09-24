import {
  calcularEstadosFases,
  calcularProgresoFase,
  FaseParaEstado,
  ResumenReto,
  resumirIntentos,
} from './estado-fases';

// Fase n tiene el reto 100 + n (o los que se indiquen); la fase 4 no tiene retos.
const FASES: FaseParaEstado[] = [
  { id: 1, orden: 1, retoIds: [101] },
  { id: 2, orden: 2, retoIds: [102] },
  { id: 3, orden: 3, retoIds: [103] },
  { id: 4, orden: 4, retoIds: [] },
];

const resumen = (parcial: Partial<ResumenReto>): ResumenReto => ({
  aprobado: false,
  intentos: 0,
  mejorPorcentaje: null,
  mejorEstrellas: null,
  qpGanadoTotal: 0,
  ...parcial,
});

const aprobado = resumen({
  aprobado: true,
  intentos: 1,
  mejorPorcentaje: 100,
  mejorEstrellas: 3,
  qpGanadoTotal: 100,
});
const fallido = resumen({
  intentos: 2,
  mejorPorcentaje: 60,
  mejorEstrellas: 1,
});

const estados = (mapa: [number, ResumenReto][]) =>
  Object.fromEntries(calcularEstadosFases(FASES, new Map(mapa)));

describe('calcularEstadosFases', () => {
  it('estudiante nuevo: solo la primera fase está desbloqueada', () => {
    expect(estados([])).toEqual({
      1: 'desbloqueada',
      2: 'bloqueada',
      3: 'bloqueada',
      4: 'bloqueada',
    });
  });

  it('completar una fase (1 reto) desbloquea la siguiente', () => {
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

  it('una fase sin retos nunca se completa, pero se desbloquea si la anterior lo está', () => {
    const resultado = estados([
      [101, aprobado],
      [102, aprobado],
      [103, aprobado],
    ]);
    expect(resultado[4]).toBe('desbloqueada');
  });

  it('usa el orden, no el id, para decidir cuál es la fase anterior', () => {
    const desordenadas: FaseParaEstado[] = [
      { id: 10, orden: 2, retoIds: [202] },
      { id: 20, orden: 1, retoIds: [201] },
    ];
    const resultado = calcularEstadosFases(
      desordenadas,
      new Map([[201, aprobado]]),
    );
    expect(resultado.get(20)).toBe('completada');
    expect(resultado.get(10)).toBe('desbloqueada');
  });

  describe('fase con varios retos', () => {
    const CON_DOS_RETOS: FaseParaEstado[] = [
      { id: 1, orden: 1, retoIds: [201, 202] },
      { id: 2, orden: 2, retoIds: [301] },
    ];
    const dosRetos = (mapa: [number, ResumenReto][]) =>
      Object.fromEntries(calcularEstadosFases(CON_DOS_RETOS, new Map(mapa)));

    it('con un solo reto aprobado de dos, la fase está en_progreso, no completada', () => {
      expect(dosRetos([[201, aprobado]])[1]).toBe('en_progreso');
    });

    it('completada solo cuando TODOS los retos de la fase están aprobados', () => {
      expect(
        dosRetos([
          [201, aprobado],
          [202, aprobado],
        ]),
      ).toEqual({ 1: 'completada', 2: 'desbloqueada' });
    });
  });
});

describe('calcularProgresoFase', () => {
  it('null si la fase no tiene retos', () => {
    expect(calcularProgresoFase([], new Map())).toBeNull();
  });

  it('0% sin intentos', () => {
    expect(calcularProgresoFase([101], new Map())).toMatchObject({
      totalRetos: 1,
      retosAprobados: 0,
      progreso: 0,
      calificacionEstrellasFase: null,
      recompensaQpFase: null,
    });
  });

  it('progreso parcial (1 de 2 retos aprobados), sin estrellas ni recompensa de fase todavía', () => {
    const resultado = calcularProgresoFase(
      [201, 202],
      new Map([
        [201, aprobado],
        [202, fallido],
      ]),
    );
    expect(resultado).toMatchObject({
      totalRetos: 2,
      retosAprobados: 1,
      progreso: 50,
      calificacionEstrellasFase: null,
      recompensaQpFase: null,
    });
  });

  it('fase completada: estrellas = promedio de la mejor marca de cada reto, recompensa = suma del QP otorgado', () => {
    const retoA = resumen({
      aprobado: true,
      mejorEstrellas: 1,
      qpGanadoTotal: 50,
    });
    const retoB = resumen({
      aprobado: true,
      mejorEstrellas: 3,
      qpGanadoTotal: 120,
    });
    const resultado = calcularProgresoFase(
      [201, 202],
      new Map([
        [201, retoA],
        [202, retoB],
      ]),
    );
    expect(resultado).toEqual({
      totalRetos: 2,
      retosAprobados: 2,
      progreso: 100,
      calificacionEstrellasFase: 2, // round((1+3)/2) = 2
      recompensaQpFase: 170, // 50 + 120
    });
  });

  it('redondea la calificación de fase al entero más cercano', () => {
    const conUnaEstrella = resumen({ aprobado: true, mejorEstrellas: 1 });
    const conTresEstrellas = resumen({ aprobado: true, mejorEstrellas: 3 });
    const otraConTres = resumen({ aprobado: true, mejorEstrellas: 3 });
    const resultado = calcularProgresoFase(
      [1, 2, 3],
      new Map([
        [1, conUnaEstrella],
        [2, conTresEstrellas],
        [3, otraConTres],
      ]),
    );
    // (1+3+3)/3 = 2.33 -> redondea a 2
    expect(resultado?.calificacionEstrellasFase).toBe(2);
  });
});

describe('resumirIntentos', () => {
  it('combina los grupos aprobado/no aprobado de un mismo reto, sumando el QP otorgado', () => {
    const resultado = resumirIntentos([
      {
        retoId: 1,
        aprobado: false,
        intentos: 2,
        maxPorcentaje: 60,
        maxEstrellas: 1,
        sumaQpGanado: 0,
      },
      {
        retoId: 1,
        aprobado: true,
        intentos: 1,
        maxPorcentaje: 80,
        maxEstrellas: 2,
        sumaQpGanado: 120,
      },
    ]);
    expect(resultado.get(1)).toEqual({
      aprobado: true,
      intentos: 3,
      mejorPorcentaje: 80,
      mejorEstrellas: 2,
      qpGanadoTotal: 120,
    });
  });
});
