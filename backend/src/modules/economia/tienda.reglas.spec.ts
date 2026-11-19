import { decidirEquipar, evaluarCompra, MAX_UNIDADES_POR_OBJETO } from './tienda.reglas';

describe('CU-12 RN-11 y RN-28: evaluarCompra', () => {
  it('procede cuando el saldo alcanza y no se pasa del límite', () => {
    expect(evaluarCompra(200, 50, 2, 1)).toEqual({ ok: true, total: 100, saldoFinal: 100, unidadesFinales: 3 });
  });

  it('el saldo exacto alcanza', () => {
    expect(evaluarCompra(100, 50, 2, 0)).toMatchObject({ ok: true, saldoFinal: 0 });
  });

  it('FE1: saldo insuficiente indica cuántos QP faltan', () => {
    expect(evaluarCompra(60, 50, 2, 0)).toEqual({
      ok: false,
      motivo: 'SALDO_INSUFICIENTE',
      total: 100,
      qpFaltantes: 40,
    });
  });

  it('FE2: no se pasa de 5 unidades (RN-28)', () => {
    expect(evaluarCompra(1000, 50, 3, 3)).toEqual({
      ok: false,
      motivo: 'LIMITE_UNIDADES',
      limite: MAX_UNIDADES_POR_OBJETO,
      unidadesActuales: 3,
      disponibles: 2,
    });
  });

  it('llegar justo a 5 unidades sí procede', () => {
    expect(evaluarCompra(1000, 50, 2, 3)).toMatchObject({ ok: true, unidadesFinales: 5 });
  });

  it('con 5 unidades ya no se puede comprar ninguna más', () => {
    expect(evaluarCompra(1000, 50, 1, 5)).toMatchObject({ ok: false, motivo: 'LIMITE_UNIDADES', disponibles: 0 });
  });

  it('el saldo se verifica antes que el límite de unidades', () => {
    expect(evaluarCompra(10, 50, 9, 4)).toMatchObject({ ok: false, motivo: 'SALDO_INSUFICIENTE' });
  });
});

describe('CU-12 RN-10: decidirEquipar', () => {
  it('equipa directo si hay lugar en el cinto', () => {
    expect(decidirEquipar([], 1)).toEqual({ accion: 'EQUIPAR' });
    expect(decidirEquipar([2], 1)).toEqual({ accion: 'EQUIPAR' });
  });

  it('un objeto ya equipado no cambia nada', () => {
    expect(decidirEquipar([1, 2], 1)).toEqual({ accion: 'YA_EQUIPADO' });
  });

  it('FA2: con 2 equipados pide elegir cuál reemplazar', () => {
    expect(decidirEquipar([2, 3], 1)).toEqual({ accion: 'PEDIR_REEMPLAZO' });
  });

  it('FA2: reemplaza el objeto elegido', () => {
    expect(decidirEquipar([2, 3], 1, 3)).toEqual({ accion: 'REEMPLAZAR', desequipar: 3 });
  });

  it('rechaza reemplazar un objeto que no está equipado', () => {
    expect(decidirEquipar([2, 3], 1, 9)).toEqual({ accion: 'REEMPLAZO_INVALIDO' });
  });
});
