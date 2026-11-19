import { llegoATiempo, segundosRestantes, segundosUsados, SEGUNDOS_POR_PREGUNTA } from './tiempo-pregunta';

const base = new Date('2026-11-09T18:00:00.000Z');
const despues = (segundos: number) => new Date(base.getTime() + segundos * 1000);

describe('RNF-SE-05: llegoATiempo (20 s + 1 s de tolerancia)', () => {
  it('una respuesta inmediata llega a tiempo', () => {
    expect(llegoATiempo(base, despues(0))).toBe(true);
    expect(llegoATiempo(base, despues(5.3))).toBe(true);
  });

  it('a los 20 s exactos llega a tiempo', () => {
    expect(llegoATiempo(base, despues(20))).toBe(true);
  });

  it('entre 20 s y 21 s la tolerancia de red todavía la acepta', () => {
    expect(llegoATiempo(base, despues(20.9))).toBe(true);
    expect(llegoATiempo(base, despues(21))).toBe(true);
  });

  it('después de 21 s ya no llega a tiempo', () => {
    expect(llegoATiempo(base, despues(21.001))).toBe(false);
    expect(llegoATiempo(base, despues(22))).toBe(false);
    expect(llegoATiempo(base, despues(300))).toBe(false);
  });
});

describe('segundosRestantes', () => {
  it('al entregar quedan 20 s y baja con el tiempo', () => {
    expect(segundosRestantes(base, base)).toBe(SEGUNDOS_POR_PREGUNTA);
    expect(segundosRestantes(base, despues(7.5))).toBe(12.5);
  });

  it('nunca es negativo, aunque la tolerancia aún acepte la respuesta', () => {
    expect(segundosRestantes(base, despues(20.5))).toBe(0);
    expect(segundosRestantes(base, despues(90))).toBe(0);
  });
});

describe('segundosUsados (desempate de duelos)', () => {
  it('son los segundos hasta responder', () => {
    expect(segundosUsados(base, despues(8.25))).toBe(8.25);
  });

  it('si se agotó el tiempo o no respondió son 20', () => {
    expect(segundosUsados(base, null)).toBe(20);
    expect(segundosUsados(base, despues(20.8))).toBe(20);
    expect(segundosUsados(base, despues(60))).toBe(20);
  });

  it('nunca es negativo', () => {
    expect(segundosUsados(base, despues(-1))).toBe(0);
  });
});
