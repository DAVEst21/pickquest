import {
  calificarDialogo,
  EntradaDialogo,
  faltantesDialogo,
  opcionesDisponibles,
} from './dialogo-stakeholder.calificacion';

const base: EntradaDialogo = {
  tecnicaElegida: 'ENTREVISTA',
  tecnicaCorrecta: 'ENTREVISTA',
  requerimientosDescubiertos: 6,
  requerimientosOcultos: 6,
  preguntasImproductivas: 0,
};

describe('CU-01 RN-16 calificación del diálogo con el stakeholder', () => {
  it('técnica correcta y los 6 requerimientos sin preguntas improductivas: 100', () => {
    expect(calificarDialogo(base)).toBe(100);
  });

  it('técnica incorrecta y nada descubierto: 0', () => {
    expect(
      calificarDialogo({ ...base, tecnicaElegida: 'CUESTIONARIO', requerimientosDescubiertos: 0 }),
    ).toBe(0);
  });

  it('solo la técnica correcta suma 20', () => {
    expect(calificarDialogo({ ...base, requerimientosDescubiertos: 0 })).toBe(20);
  });

  it('sin técnica elegida no suma los 20', () => {
    expect(calificarDialogo({ ...base, tecnicaElegida: null })).toBe(80);
  });

  it('intermedio a mano: 20 + 80·4/6 = 73.33 → 73', () => {
    expect(calificarDialogo({ ...base, requerimientosDescubiertos: 4 })).toBe(73);
  });

  it('cada pregunta improductiva resta 5: 73.33 − 10 = 63.33 → 63', () => {
    expect(
      calificarDialogo({ ...base, requerimientosDescubiertos: 4, preguntasImproductivas: 2 }),
    ).toBe(63);
  });

  it('se acota en 0: 0 − 15 → 0', () => {
    expect(
      calificarDialogo({
        ...base,
        tecnicaElegida: 'TALLER',
        requerimientosDescubiertos: 0,
        preguntasImproductivas: 3,
      }),
    ).toBe(0);
  });

  it('se acota en 100 aunque no haya improductivas que compensen', () => {
    expect(calificarDialogo({ ...base, requerimientosDescubiertos: 6 })).toBeLessThanOrEqual(100);
  });
});

describe('CU-01: faltantes y opciones disponibles', () => {
  it('sin técnica no se puede enviar', () => {
    expect(faltantesDialogo(null)).toHaveLength(1);
    expect(faltantesDialogo('ENTREVISTA')).toEqual([]);
  });

  const opciones = [
    { id: 1, nodoId: 10, orden: 2 },
    { id: 2, nodoId: 10, orden: 1 },
    { id: 3, nodoId: 20, orden: 1 },
  ];

  it('las opciones ya elegidas no vuelven a ofrecerse y se ordenan', () => {
    const r = opcionesDisponibles(10, 10, opciones, new Set([2]));
    expect(r.nodoId).toBe(10);
    expect(r.opciones.map((o) => o.id)).toEqual([1]);
  });

  it('si el nodo se agotó se regresa al nodo inicial', () => {
    const r = opcionesDisponibles(20, 10, opciones, new Set([3]));
    expect(r.nodoId).toBe(10);
    expect(r.opciones.map((o) => o.id)).toEqual([2, 1]);
  });

  it('si tampoco quedan en el inicial no hay opciones', () => {
    expect(opcionesDisponibles(20, 10, opciones, new Set([1, 2, 3])).opciones).toEqual([]);
  });
});
