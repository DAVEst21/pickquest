import {
  calificarEscenario,
  escenarioSeCumple,
  faltantesEscenario,
  medidaDentroDelRango,
  PARTES_ESCENARIO,
  valorDeLaApp,
} from './simulador-escenarios.calificacion';

const RANGO = { valorMin: 2, valorMax: 3, cargaMin: 1500, cargaMax: 2500 };

describe('CU-05 RN-20: calificación del escenario de calidad', () => {
  it('perfecto: 5 partes correctas y medida en rango = 100 %', () => {
    expect(calificarEscenario(5, true)).toBe(100);
  });
  it('cero: ninguna parte correcta y medida fuera de rango = 0 %', () => {
    expect(calificarEscenario(0, false)).toBe(0);
  });
  it('cada parte vale 12 % y la medida 40 % (calculado a mano)', () => {
    expect(calificarEscenario(3, false)).toBe(36);
    expect(calificarEscenario(3, true)).toBe(76);
    expect(calificarEscenario(4, true)).toBe(88);
    expect(calificarEscenario(5, false)).toBe(60);
    expect(calificarEscenario(1, true)).toBe(52);
  });
  it('solo la medida en rango sin partes correctas vale 40 %', () => {
    expect(calificarEscenario(0, true)).toBe(40);
  });
});

describe('CU-05: medida de respuesta dentro del rango aceptable', () => {
  const ok = { valor: 2.5, unidadId: 1, carga: 2000 };
  it('dentro del rango con la unidad correcta', () => {
    expect(medidaDentroDelRango(ok, true, RANGO)).toBe(true);
  });
  it('los límites del rango cuentan como dentro', () => {
    expect(medidaDentroDelRango({ ...ok, valor: 2, carga: 1500 }, true, RANGO)).toBe(true);
    expect(medidaDentroDelRango({ ...ok, valor: 3, carga: 2500 }, true, RANGO)).toBe(true);
  });
  it('fuera del rango por valor, por carga o por unidad', () => {
    expect(medidaDentroDelRango({ ...ok, valor: 1.5 }, true, RANGO)).toBe(false);
    expect(medidaDentroDelRango({ ...ok, valor: 3.5 }, true, RANGO)).toBe(false);
    expect(medidaDentroDelRango({ ...ok, carga: 1400 }, true, RANGO)).toBe(false);
    expect(medidaDentroDelRango({ ...ok, carga: 2600 }, true, RANGO)).toBe(false);
    expect(medidaDentroDelRango(ok, false, RANGO)).toBe(false);
  });
  it('una medida incompleta nunca está en rango', () => {
    expect(medidaDentroDelRango({ valor: null, unidadId: 1, carga: 2000 }, true, RANGO)).toBe(false);
    expect(medidaDentroDelRango({ valor: 2.5, unidadId: 1, carga: null }, true, RANGO)).toBe(false);
  });
});

describe('CU-05: simulación de la app ficticia (RNF-PE-03)', () => {
  it('valorApp = base + pendiente × carga, a 2 decimales', () => {
    expect(valorDeLaApp(0.8, 0.0008, 1500)).toBe(2);
    expect(valorDeLaApp(0.8, 0.0008, 2000)).toBe(2.4);
    expect(valorDeLaApp(0.8, 0.0008, 5000)).toBe(4.8);
  });
  it('el escenario se cumple si la app responde dentro del valor y la unidad es la correcta', () => {
    expect(escenarioSeCumple(2.4, 3, true)).toBe(true);
    expect(escenarioSeCumple(3, 3, true)).toBe(true);
    expect(escenarioSeCumple(3.2, 3, true)).toBe(false);
    expect(escenarioSeCumple(2.4, 3, false)).toBe(false);
  });
  it('el rango del seed es alcanzable: con la carga y el valor típicos el escenario se cumple', () => {
    expect(escenarioSeCumple(valorDeLaApp(0.8, 0.0008, 2000), 2.5, true)).toBe(true);
  });
});

describe('CU-05 FE1: faltantes para simular o enviar', () => {
  const completa = new Set(PARTES_ESCENARIO);
  it('sin faltantes cuando están las 5 partes y la medida completa', () => {
    expect(faltantesEscenario(completa, { valor: 2, unidadId: 1, carga: 100 })).toEqual([]);
  });
  it('señala cada parte vacía', () => {
    const f = faltantesEscenario(new Set(['FUENTE', 'ENTORNO']), { valor: 2, unidadId: 1, carga: 100 });
    expect(f).toHaveLength(3);
    expect(f.join(' ')).toMatch(/estímulo/);
    expect(f.join(' ')).toMatch(/artefacto/);
    expect(f.join(' ')).toMatch(/respuesta/);
  });
  it('señala la medida incompleta: valor, unidad y carga', () => {
    const f = faltantesEscenario(completa, { valor: null, unidadId: null, carga: null });
    expect(f).toHaveLength(3);
  });
  it('un valor 0 cuenta como definido (no es vacío)', () => {
    expect(faltantesEscenario(completa, { valor: 0, unidadId: 1, carga: 0 })).toEqual([]);
  });
});
