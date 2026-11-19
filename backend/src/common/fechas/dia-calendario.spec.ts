import {
  diaAnterior,
  diaCalendarioMx,
  dateADia,
  diaADate,
  segundosHastaMedianoche,
  sumarDias,
} from './dia-calendario';

// México del centro: UTC-6 todo el año (sin horario de verano desde 2022).
describe('diaCalendarioMx (RN-12, RN-13, RN-25)', () => {
  it('23:59:59 MX sigue siendo el mismo día y 00:00:00 MX ya es el siguiente', () => {
    expect(diaCalendarioMx(new Date('2026-11-10T05:59:59.000Z'))).toBe('2026-11-09');
    expect(diaCalendarioMx(new Date('2026-11-10T06:00:00.000Z'))).toBe('2026-11-10');
  });

  it('las 18:00 MX (00:00 UTC del día siguiente) todavía son del día de México', () => {
    expect(diaCalendarioMx(new Date('2026-11-10T00:00:00.000Z'))).toBe('2026-11-09');
    expect(diaCalendarioMx(new Date('2026-11-10T05:00:00.000Z'))).toBe('2026-11-09');
  });

  it('cambia de mes y de año a medianoche MX', () => {
    expect(diaCalendarioMx(new Date('2026-12-31T05:59:59.999Z'))).toBe('2026-12-30');
    expect(diaCalendarioMx(new Date('2027-01-01T05:59:59.999Z'))).toBe('2026-12-31');
    expect(diaCalendarioMx(new Date('2027-01-01T06:00:00.000Z'))).toBe('2027-01-01');
  });

  it('no depende de la hora del servidor: el mismo instante da el mismo día', () => {
    const instante = new Date('2026-07-01T03:30:00.000Z');
    expect(diaCalendarioMx(instante)).toBe('2026-06-30');
  });
});

describe('aritmética de días', () => {
  it('suma y resta días a través de meses, años y febrero bisiesto', () => {
    expect(sumarDias('2026-11-30', 1)).toBe('2026-12-01');
    expect(sumarDias('2026-12-31', 1)).toBe('2027-01-01');
    expect(diaAnterior('2027-01-01')).toBe('2026-12-31');
    expect(sumarDias('2028-02-28', 1)).toBe('2028-02-29');
    expect(sumarDias('2026-11-09', 3)).toBe('2026-11-12');
  });

  it('convierte de ida y vuelta con las columnas de fecha', () => {
    expect(dateADia(diaADate('2026-11-09'))).toBe('2026-11-09');
  });
});

describe('segundosHastaMedianoche', () => {
  it('a las 23:59:50 MX faltan 10 segundos', () => {
    expect(segundosHastaMedianoche(new Date('2026-11-10T05:59:50.000Z'))).toBe(10);
  });
  it('a las 00:00:00 MX faltan 24 horas', () => {
    expect(segundosHastaMedianoche(new Date('2026-11-10T06:00:00.000Z'))).toBe(86400);
  });
});
