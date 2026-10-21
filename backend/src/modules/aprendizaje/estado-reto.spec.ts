import { calcularEstadoReto } from './estado-fases';

describe('RF-18 estado de un reto en el tablón', () => {
  it('BLOQUEADO: fase bloqueada o falta aprobar un reto anterior (RN-01, RN-08)', () => {
    expect(calcularEstadoReto(true, false, false)).toBe('BLOQUEADO');
  });

  it('DISPONIBLE: desbloqueado, sin intentos pendientes ni aprobación', () => {
    expect(calcularEstadoReto(false, false, false)).toBe('DISPONIBLE');
  });

  it('EN_CURSO: hay un intento sin enviar', () => {
    expect(calcularEstadoReto(false, false, true)).toBe('EN_CURSO');
  });

  it('APROBADO: tiene un intento calificado y aprobado', () => {
    expect(calcularEstadoReto(false, true, false)).toBe('APROBADO');
  });

  it('un reto aprobado que se está reintentando figura EN_CURSO (FA1)', () => {
    expect(calcularEstadoReto(false, true, true)).toBe('EN_CURSO');
  });

  it('BLOQUEADO tiene prioridad sobre todo lo demás', () => {
    expect(calcularEstadoReto(true, true, true)).toBe('BLOQUEADO');
  });
});
