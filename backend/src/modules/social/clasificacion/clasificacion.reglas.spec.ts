import { estrellasTotales, ordenarClasificacion } from './clasificacion.reglas';

const fila = (nombre: string, xpTotal: number, estrellas: number, alcanzada: string) => ({
  nombre,
  xpTotal,
  estrellasTotales: estrellas,
  xpAlcanzadaEn: new Date(alcanzada),
});

describe('RN-30: ordenarClasificacion', () => {
  it('ordena por XP total, de mayor a menor', () => {
    const orden = ordenarClasificacion([
      fila('a', 100, 9, '2026-11-01'),
      fila('b', 300, 0, '2026-11-02'),
      fila('c', 200, 5, '2026-11-03'),
    ]);
    expect(orden.map((f) => f.nombre)).toEqual(['b', 'c', 'a']);
  });

  it('con la misma XP desempata por estrellas totales', () => {
    const orden = ordenarClasificacion([
      fila('a', 300, 4, '2026-11-01'),
      fila('b', 300, 7, '2026-11-05'),
      fila('c', 300, 5, '2026-11-02'),
    ]);
    expect(orden.map((f) => f.nombre)).toEqual(['b', 'c', 'a']);
  });

  it('con la misma XP y las mismas estrellas gana quien alcanzó antes esa XP', () => {
    const orden = ordenarClasificacion([
      fila('tarde', 300, 5, '2026-11-09T18:00:00Z'),
      fila('temprano', 300, 5, '2026-11-02T09:00:00Z'),
    ]);
    expect(orden.map((f) => f.nombre)).toEqual(['temprano', 'tarde']);
  });

  it('la XP pesa más que las estrellas', () => {
    const orden = ordenarClasificacion([fila('muchas', 100, 24, '2026-11-01'), fila('xp', 101, 0, '2026-11-09')]);
    expect(orden[0].nombre).toBe('xp');
  });

  it('no modifica la lista original', () => {
    const original = [fila('a', 1, 0, '2026-11-01'), fila('b', 2, 0, '2026-11-01')];
    ordenarClasificacion(original);
    expect(original.map((f) => f.nombre)).toEqual(['a', 'b']);
  });

  it('una lista vacía da una clasificación vacía', () => {
    expect(ordenarClasificacion([])).toEqual([]);
  });
});

describe('RN-30: estrellasTotales', () => {
  it('suma las mejores estrellas de cada reto', () => {
    expect(estrellasTotales([3, 2, 0, 1])).toBe(6);
    expect(estrellasTotales([])).toBe(0);
  });
});
