import { combinarDominio, promedioMejoresCalificaciones } from './dominio';

describe('RN-26: combinarDominio', () => {
  it('con diagnóstico y retos: 50 % cada uno', () => {
    expect(combinarDominio(60, 100)).toBe(80);
    expect(combinarDominio(0, 100)).toBe(50);
    expect(combinarDominio(100, 100)).toBe(100);
  });

  it('redondea al entero más cercano', () => {
    expect(combinarDominio(67, 80)).toBe(74); // 73.5
    expect(combinarDominio(33, 50)).toBe(42); // 41.5
  });

  it('sin retos del tema: el resultado del diagnóstico', () => {
    expect(combinarDominio(67, null)).toBe(67);
  });

  it('sin diagnóstico: el promedio de los retos', () => {
    expect(combinarDominio(null, 85.4)).toBe(85);
  });

  it('sin nada: 0', () => {
    expect(combinarDominio(null, null)).toBe(0);
  });
});

describe('RN-26: promedioMejoresCalificaciones', () => {
  it('promedia las mejores calificaciones de los retos', () => {
    expect(promedioMejoresCalificaciones([100, 80, 90])).toBe(90);
  });

  it('sin retos calificados es null (no 0), para no bajar el dominio', () => {
    expect(promedioMejoresCalificaciones([])).toBeNull();
  });
});
