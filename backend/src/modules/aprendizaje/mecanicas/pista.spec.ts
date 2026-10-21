import { columnasAPista, pistaAColumnas } from './pista';
import { PistaDto } from './tipos';

describe('Persistencia relacional de la pista de la ayuda', () => {
  const pistas: PistaDto[] = [
    { tipo: 'OPCION_DIALOGO', opcionId: 7 },
    { tipo: 'PANTALLA', pantallaId: 3 },
    { tipo: 'DEPENDENCIA', bloqueId: 4, requiereId: 2 },
  ];

  it.each(pistas)('una pista %j se guarda en columnas y se reconstruye igual', (pista) => {
    expect(columnasAPista(pistaAColumnas(pista))).toEqual(pista);
  });

  it('cada tipo usa solo sus columnas y deja las demás en null', () => {
    expect(pistaAColumnas({ tipo: 'DEPENDENCIA', bloqueId: 4, requiereId: 2 })).toEqual({
      tipoPista: 'DEPENDENCIA',
      opcionId: null,
      tarjetaId: null,
      pantallaId: null,
      atributoEscenarioId: null,
      bloqueId: 4,
      requiereId: 2,
    });
  });

  it('la columna de una tarjeta y el mínimo de una restricción se obtienen del contenido, no se duplican', () => {
    const tarjeta = pistaAColumnas({ tipo: 'COLUMNA_TARJETA', tarjetaId: 9, columna: 'MUST' });
    expect(tarjeta.tarjetaId).toBe(9);
    expect(columnasAPista({ ...tarjeta, tarjeta: { columnaCorrecta: 'MUST' } })).toEqual({
      tipo: 'COLUMNA_TARJETA',
      tarjetaId: 9,
      columna: 'MUST',
    });

    const restriccion = pistaAColumnas({ tipo: 'RESTRICCION', atributoEscenarioId: 5, minimo: 70 });
    expect(columnasAPista({ ...restriccion, atributoEscenario: { minimoObligatorio: 70 } })).toEqual({
      tipo: 'RESTRICCION',
      atributoEscenarioId: 5,
      minimo: 70,
    });
  });

  it('sin ayuda o con una ayuda anterior que no guardó pista devuelve null', () => {
    expect(columnasAPista(null)).toBeNull();
    expect(columnasAPista({ ...pistaAColumnas({ tipo: 'PANTALLA', pantallaId: 1 }), tipoPista: null })).toBeNull();
  });

  it('una mecánica sin elemento que señalar (ids null) se conserva como pista vacía', () => {
    expect(columnasAPista(pistaAColumnas({ tipo: 'PANTALLA', pantallaId: null }))).toEqual({
      tipo: 'PANTALLA',
      pantallaId: null,
    });
  });
});
