import { mezclarDeterminista, ordenarParaIntento, semillaDeLista } from './mezcla-determinista';

describe('mezcla determinista del orden de presentación', () => {
  const lista = [1, 2, 3, 4, 5, 6];

  it('conserva los mismos elementos, sin perder ni repetir ninguno, y no modifica la lista original', () => {
    const r = ordenarParaIntento(lista, 7, 'x');
    expect([...r].sort()).toEqual(lista);
    expect(lista).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('el mismo intento y la misma lista dan siempre el mismo orden (retomar un intento, FA3)', () => {
    expect(ordenarParaIntento(lista, 41, 'partes:FUENTE')).toEqual(ordenarParaIntento(lista, 41, 'partes:FUENTE'));
  });

  it('intentos distintos dan órdenes distintos', () => {
    const ordenes = new Set(Array.from({ length: 30 }, (_, i) => ordenarParaIntento(lista, i + 1, 'x').join()));
    expect(ordenes.size).toBeGreaterThan(15);
  });

  it('listas distintas del mismo intento no usan la misma permutación', () => {
    expect(semillaDeLista(5, 'a')).not.toBe(semillaDeLista(5, 'b'));
    const ordenes = new Set(['a', 'b', 'c', 'd', 'e', 'f'].map((k) => ordenarParaIntento(lista, 5, k).join()));
    expect(ordenes.size).toBeGreaterThan(3);
  });

  it('cada elemento llega a todas las posiciones: la posición original no es una pista', () => {
    const posiciones = new Set<number>();
    for (let intento = 1; intento <= 60; intento++) {
      posiciones.add(ordenarParaIntento(['correcta', 'a', 'b', 'c'], intento, 'x').indexOf('correcta'));
    }
    expect([...posiciones].sort()).toEqual([0, 1, 2, 3]);
  });

  it('maneja listas vacías y de un elemento', () => {
    expect(mezclarDeterminista([], 3)).toEqual([]);
    expect(mezclarDeterminista(['solo'], 3)).toEqual(['solo']);
  });
});
