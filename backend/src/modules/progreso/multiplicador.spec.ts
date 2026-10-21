import { aplicarMultiplicador } from './multiplicador';

describe('RN-13 multiplicador de QP', () => {
  it('con multiplicador 1.00 los QP no cambian', () => {
    expect(aplicarMultiplicador(120, 1)).toBe(120);
  });

  it('redondea al entero más cercano', () => {
    expect(aplicarMultiplicador(50, 1.25)).toBe(63); // 62.5 → 63
    expect(aplicarMultiplicador(50, 1.1)).toBe(55);
    expect(aplicarMultiplicador(33, 1.5)).toBe(50); // 49.5 → 50
    expect(aplicarMultiplicador(10, 1.04)).toBe(10); // 10.4 → 10
  });

  it('con QP cero no otorga nada', () => {
    expect(aplicarMultiplicador(0, 2)).toBe(0);
  });
});
