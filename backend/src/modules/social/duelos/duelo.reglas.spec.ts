import {
  calcularExpiracion,
  decidirGanador,
  haExpirado,
  limiteDePendientes,
  porcentajeDeRonda,
  temasEnComun,
  xpDelDuelo,
} from './duelo.reglas';

describe('CU-13 RN-14: decidirGanador', () => {
  it('gana el mayor porcentaje', () => {
    expect(decidirGanador({ porcentaje: 80, segundosTotales: 60 }, { porcentaje: 60, segundosTotales: 10 })).toEqual({
      empate: false,
      ganador: 'A',
    });
    expect(decidirGanador({ porcentaje: 20, segundosTotales: 5 }, { porcentaje: 40, segundosTotales: 90 })).toEqual({
      empate: false,
      ganador: 'B',
    });
  });

  it('con el mismo porcentaje gana quien usó menos tiempo', () => {
    expect(decidirGanador({ porcentaje: 60, segundosTotales: 41.5 }, { porcentaje: 60, segundosTotales: 38.2 })).toEqual({
      empate: false,
      ganador: 'B',
    });
    expect(decidirGanador({ porcentaje: 100, segundosTotales: 12 }, { porcentaje: 100, segundosTotales: 30 })).toEqual({
      empate: false,
      ganador: 'A',
    });
  });

  it('FA2: mismo porcentaje y mismo tiempo es empate exacto', () => {
    expect(decidirGanador({ porcentaje: 60, segundosTotales: 33.25 }, { porcentaje: 60, segundosTotales: 33.25 })).toEqual({
      empate: true,
      ganador: null,
    });
  });

  it('el tiempo se compara con dos decimales', () => {
    expect(decidirGanador({ porcentaje: 60, segundosTotales: 10.001 }, { porcentaje: 60, segundosTotales: 10.004 })).toEqual({
      empate: true,
      ganador: null,
    });
  });

  it('dos rondas sin aciertos y con el tiempo agotado empatan', () => {
    expect(decidirGanador({ porcentaje: 0, segundosTotales: 100 }, { porcentaje: 0, segundosTotales: 100 }).empate).toBe(true);
  });
});

describe('CU-13 RN-14: xpDelDuelo (sin QP)', () => {
  it('el ganador recibe 50 y el perdedor 20', () => {
    expect(xpDelDuelo({ empate: false, ganador: 'A' })).toEqual({ a: 50, b: 20 });
    expect(xpDelDuelo({ empate: false, ganador: 'B' })).toEqual({ a: 20, b: 50 });
  });

  it('el empate exacto da 30 a cada uno', () => {
    expect(xpDelDuelo({ empate: true, ganador: null })).toEqual({ a: 30, b: 30 });
  });
});

describe('CU-13 RN-15: expiración y límite de pendientes', () => {
  const creado = new Date('2026-11-09T18:00:00.000Z');

  it('un duelo expira 48 horas después de crearse', () => {
    expect(calcularExpiracion(creado).toISOString()).toBe('2026-11-11T18:00:00.000Z');
  });

  it('antes y justo en el límite no ha expirado; después sí', () => {
    const expira = calcularExpiracion(creado);
    expect(haExpirado(expira, new Date('2026-11-11T17:59:59.000Z'))).toBe(false);
    expect(haExpirado(expira, new Date('2026-11-11T18:00:00.000Z'))).toBe(false);
    expect(haExpirado(expira, new Date('2026-11-11T18:00:01.000Z'))).toBe(true);
  });

  it('FE2: con 3 duelos pendientes ya no se pueden crear más, ni como retador ni como retado', () => {
    expect(limiteDePendientes(2, 2)).toBeNull();
    expect(limiteDePendientes(3, 0)).toBe('RETADOR');
    expect(limiteDePendientes(0, 3)).toBe('RETADO');
    expect(limiteDePendientes(5, 5)).toBe('RETADOR');
  });
});

describe('CU-13: utilidades', () => {
  it('el porcentaje de una ronda de 5 preguntas', () => {
    expect([0, 1, 2, 3, 4, 5].map((n) => porcentajeDeRonda(n))).toEqual([0, 20, 40, 60, 80, 100]);
  });

  it('temas en común conserva el orden propio', () => {
    expect(temasEnComun(['A', 'B', 'C'], ['C', 'A'])).toEqual(['A', 'C']);
    expect(temasEnComun(['A'], ['B'])).toEqual([]);
  });
});
