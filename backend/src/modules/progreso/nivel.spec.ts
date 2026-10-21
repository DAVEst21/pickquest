import { calcularNivel } from './nivel';

describe('calcularNivel', () => {
  it.each([
    [0, 1, 500],
    [499, 1, 500],
    [500, 2, 1000],
    [750, 2, 1000],
    [999, 2, 1000],
    [1000, 3, 1500],
    [2000, 5, 2500],
  ])('%i XP -> nivel %i (siguiente umbral %i)', (xp, nivel, siguiente) => {
    expect(calcularNivel(xp)).toEqual({ nivel, xpSiguienteNivel: siguiente });
  });

  it('coincide con la forma cerrada floor(xp / 500) + 1', () => {
    for (let xp = 0; xp <= 20_000; xp += 37) {
      const { nivel, xpSiguienteNivel } = calcularNivel(xp);
      expect(nivel).toBe(Math.floor(xp / 500) + 1);
      expect(xpSiguienteNivel).toBe(500 * nivel);
    }
  });
});
