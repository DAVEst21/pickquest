import {
  alcanzaRacha,
  multiplicadorPorRacha,
  rachaTrasRetoDiario,
  rachaVigente,
  recompensaRetoDiario,
} from './racha';

describe('RN-13: multiplicadorPorRacha (1 + 0.1 por día, máximo 2.0)', () => {
  it.each([
    [0, 1],
    [1, 1.1],
    [3, 1.3],
    [7, 1.7],
    [10, 2],
    [15, 2],
    [100, 2],
  ])('%i días de racha → ×%s', (dias, esperado) => {
    expect(multiplicadorPorRacha(dias)).toBe(esperado);
  });

  it('no produce errores de punto flotante (1 + 0.1 × 3 = 1.3)', () => {
    expect(multiplicadorPorRacha(3)).toBe(1.3);
    expect(multiplicadorPorRacha(6)).toBe(1.6);
  });

  it('días negativos no bajan de 1', () => {
    expect(multiplicadorPorRacha(-4)).toBe(1);
  });
});

describe('RN-13: reinicio perezoso de la racha', () => {
  const racha = (dias: number, ultimo: string | null) => ({ dias, record: 9, ultimoDiaLogrado: ultimo });

  it('se conserva si el último día logrado fue hoy o ayer', () => {
    expect(rachaVigente(racha(4, '2026-11-09'), '2026-11-09').dias).toBe(4);
    expect(rachaVigente(racha(4, '2026-11-08'), '2026-11-09').dias).toBe(4);
  });

  it('vuelve a 0 si pasó un día calendario completo sin lograrlo', () => {
    expect(rachaVigente(racha(4, '2026-11-07'), '2026-11-09').dias).toBe(0);
    expect(rachaVigente(racha(4, '2026-10-01'), '2026-11-09').dias).toBe(0);
  });

  it('sin ningún día logrado vale 0', () => {
    expect(rachaVigente(racha(3, null), '2026-11-09').dias).toBe(0);
  });

  it('conserva el récord al reiniciarse', () => {
    expect(rachaVigente(racha(4, '2026-11-01'), '2026-11-09').record).toBe(9);
  });

  it('cruza correctamente el fin de mes y de año', () => {
    expect(rachaVigente(racha(2, '2026-12-31'), '2027-01-01').dias).toBe(2);
    expect(rachaVigente(racha(2, '2026-12-30'), '2027-01-01').dias).toBe(0);
  });
});

describe('RN-13: alcanzaRacha (≥ 50 %)', () => {
  it('5 de 10 ya cuenta', () => {
    expect(alcanzaRacha(5)).toBe(true);
    expect(alcanzaRacha(10)).toBe(true);
  });
  it('4 de 10 no', () => {
    expect(alcanzaRacha(4)).toBe(false);
    expect(alcanzaRacha(0)).toBe(false);
  });
});

describe('RN-13: rachaTrasRetoDiario', () => {
  const racha = (dias: number, ultimo: string | null, record = dias) => ({ dias, record, ultimoDiaLogrado: ultimo });

  it('el primer día con ≥ 50 % inicia la racha en 1', () => {
    expect(rachaTrasRetoDiario(racha(0, null), '2026-11-09', 6)).toEqual({ dias: 1, record: 1, ultimoDiaLogrado: '2026-11-09' });
  });

  it('un día consecutivo suma 1 y actualiza el récord', () => {
    expect(rachaTrasRetoDiario(racha(3, '2026-11-08', 3), '2026-11-09', 5)).toEqual({
      dias: 4,
      record: 4,
      ultimoDiaLogrado: '2026-11-09',
    });
  });

  it('el récord anterior se conserva si la racha actual es menor', () => {
    expect(rachaTrasRetoDiario(racha(1, '2026-11-08', 12), '2026-11-09', 9).record).toBe(12);
  });

  it('saltarse un día reinicia la racha en 1, no en 0', () => {
    expect(rachaTrasRetoDiario(racha(6, '2026-11-06'), '2026-11-09', 8)).toMatchObject({ dias: 1, ultimoDiaLogrado: '2026-11-09' });
  });

  it('con menos de 50 % la racha no aumenta ni cambia el último día', () => {
    expect(rachaTrasRetoDiario(racha(3, '2026-11-08'), '2026-11-09', 4)).toEqual({
      dias: 3,
      record: 3,
      ultimoDiaLogrado: '2026-11-08',
    });
  });

  it('con menos de 50 % después de saltarse un día, la racha caducada queda en 0', () => {
    expect(rachaTrasRetoDiario(racha(5, '2026-11-05'), '2026-11-09', 2).dias).toBe(0);
  });

  it('un reto cerrado después se rige por su propio día, no por el de hoy', () => {
    // la racha de 5 terminó ayer (2026-11-08); el reto sin cerrar es del 09 y se cierra el 10
    expect(rachaTrasRetoDiario(racha(5, '2026-11-08'), '2026-11-09', 7)).toMatchObject({ dias: 6, ultimoDiaLogrado: '2026-11-09' });
  });

  it('el mismo día no suma dos veces', () => {
    expect(rachaTrasRetoDiario(racha(2, '2026-11-09'), '2026-11-09', 10).dias).toBe(2);
  });
});

describe('RN-29: recompensaRetoDiario', () => {
  it('2 XP y 5 QP por acierto sin racha', () => {
    expect(recompensaRetoDiario(7, 1)).toEqual({ xp: 14, qpBase: 35, qp: 35 });
  });

  it('los QP se multiplican por el multiplicador de racha y se redondean', () => {
    expect(recompensaRetoDiario(10, 1.5)).toEqual({ xp: 20, qpBase: 50, qp: 75 });
    expect(recompensaRetoDiario(7, 1.3)).toEqual({ xp: 14, qpBase: 35, qp: 46 }); // 45.5 → 46
  });

  it('la XP nunca se multiplica', () => {
    expect(recompensaRetoDiario(10, 2).xp).toBe(20);
  });

  it('sin aciertos no hay recompensa', () => {
    expect(recompensaRetoDiario(0, 1.9)).toEqual({ xp: 0, qpBase: 0, qp: 0 });
  });
});
