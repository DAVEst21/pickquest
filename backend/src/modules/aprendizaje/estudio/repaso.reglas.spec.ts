import {
  debeOtorgarXpDeRepaso,
  posicionAlFinal,
  programarTarjeta,
  resumirAutoevaluaciones,
  tarjetasDeLaSesion,
} from './repaso.reglas';

describe('CU-09 RN-24: programarTarjeta', () => {
  it('«no lo sabía» vuelve a aparecer en la misma sesión (hoy) y no se completa', () => {
    expect(programarTarjeta('NO_LO_SABIA', '2026-11-09')).toEqual({ proximoRepaso: '2026-11-09', completada: false });
  });

  it('«dudé» vuelve al día siguiente y queda completada', () => {
    expect(programarTarjeta('DUDE', '2026-11-09')).toEqual({ proximoRepaso: '2026-11-10', completada: true });
  });

  it('«lo sabía» vuelve a los 3 días y queda completada', () => {
    expect(programarTarjeta('LO_SABIA', '2026-11-09')).toEqual({ proximoRepaso: '2026-11-12', completada: true });
  });

  it('suma días con calendario real (fin de mes y de año)', () => {
    expect(programarTarjeta('LO_SABIA', '2026-11-29').proximoRepaso).toBe('2026-12-02');
    expect(programarTarjeta('DUDE', '2026-12-31').proximoRepaso).toBe('2027-01-01');
    expect(programarTarjeta('LO_SABIA', '2028-02-27').proximoRepaso).toBe('2028-03-01');
  });
});

describe('CU-09: tarjetasDeLaSesion', () => {
  const mazo = [
    { id: 11, orden: 1 },
    { id: 12, orden: 2 },
    { id: 13, orden: 3 },
  ];

  it('un estudiante sin programación estudia todas las tarjetas (son nuevas), en orden', () => {
    expect(tarjetasDeLaSesion([...mazo].reverse(), new Map(), '2026-11-09')).toEqual([11, 12, 13]);
  });

  it('incluye las nuevas y las vencidas (≤ hoy) y deja fuera las que tocan después', () => {
    const programadas = new Map([
      [11, '2026-11-12'], // dentro de 3 días
      [12, '2026-11-09'], // vence hoy
    ]);
    expect(tarjetasDeLaSesion(mazo, programadas, '2026-11-09')).toEqual([12, 13]);
  });

  it('una tarjeta con fecha pasada también cuenta como vencida', () => {
    expect(tarjetasDeLaSesion(mazo, new Map([[11, '2026-11-01'], [12, '2026-11-20'], [13, '2026-11-20']]), '2026-11-09')).toEqual([11]);
  });

  it('si ninguna toca hoy, la sesión incluye todo el mazo', () => {
    const futuras = new Map([[11, '2026-11-12'], [12, '2026-11-10'], [13, '2026-11-12']]);
    expect(tarjetasDeLaSesion(mazo, futuras, '2026-11-09')).toEqual([11, 12, 13]);
  });

  it('un tema sin tarjetas da una sesión vacía', () => {
    expect(tarjetasDeLaSesion([], new Map(), '2026-11-09')).toEqual([]);
  });
});

describe('CU-09: cola de la sesión', () => {
  it('«no lo sabía» pasa al final: una posición después de la última', () => {
    expect(posicionAlFinal([1, 2, 3])).toBe(4);
    expect(posicionAlFinal([5, 2])).toBe(6);
    expect(posicionAlFinal([])).toBe(1);
  });
});

describe('CU-09 RN-25: XP de repaso', () => {
  it('se otorga solo si no hay otra sesión terminada ese día en el tema', () => {
    expect(debeOtorgarXpDeRepaso(0)).toBe(true);
    expect(debeOtorgarXpDeRepaso(1)).toBe(false);
    expect(debeOtorgarXpDeRepaso(3)).toBe(false);
  });
});

describe('CU-09: resumen de la sesión', () => {
  it('cuenta la primera autoevaluación de cada tarjeta', () => {
    expect(resumirAutoevaluaciones(['LO_SABIA', 'LO_SABIA', 'DUDE', 'NO_LO_SABIA', null])).toEqual({
      sabidas: 2,
      dudadas: 1,
      noSabidas: 1,
    });
  });
});
