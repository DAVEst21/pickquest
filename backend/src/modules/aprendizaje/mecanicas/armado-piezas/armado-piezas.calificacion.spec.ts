import { calificarHistorias } from './armado-piezas.calificacion';
describe('RN-17: historias de usuario', () => {
  const casillas = Array.from({ length: 18 }, (_, i) => ({
    id: i + 1,
    piezaCorrectaId: i + 101,
  }));
  const respuesta = (n: number) =>
    casillas
      .slice(0, n)
      .map((c) => ({ casillaId: c.id, piezaId: c.piezaCorrectaId }));
  it.each([
    [0, 0],
    [14, 77],
    [15, 83],
    [16, 88],
    [17, 94],
    [18, 100],
  ])('%i aciertos sobre 18 producen %i%%', (n, porcentaje) => {
    expect(calificarHistorias(casillas, respuesta(n))).toBe(porcentaje);
  });
  it('no cuenta piezas correctas en otra casilla', () => {
    expect(
      calificarHistorias(
        casillas,
        casillas.map((c, i) => ({
          casillaId: c.id,
          piezaId: casillas[(i + 1) % 18].piezaCorrectaId,
        })),
      ),
    ).toBe(0);
  });
  it('no divide entre cero', () => expect(calificarHistorias([], [])).toBe(0));
});
