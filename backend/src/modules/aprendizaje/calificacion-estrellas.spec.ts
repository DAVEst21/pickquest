import { calificarPorPorcentaje } from './calificacion-estrellas';

describe('calificarPorPorcentaje (RN-04/RF-05, RN-05/RF-06)', () => {
  it('menos de 80%: 0 estrellas, no aprobado', () => {
    expect(calificarPorPorcentaje(79, false)).toEqual({
      calificacionEstrellas: 0,
      aprobado: false,
    });
    expect(calificarPorPorcentaje(0, false)).toEqual({
      calificacionEstrellas: 0,
      aprobado: false,
    });
  });

  it('80% a 89% sin ayuda: 1 estrella, aprobado', () => {
    expect(calificarPorPorcentaje(80, false)).toEqual({
      calificacionEstrellas: 1,
      aprobado: true,
    });
    expect(calificarPorPorcentaje(89, false)).toEqual({
      calificacionEstrellas: 1,
      aprobado: true,
    });
  });

  it('90% a 99% sin ayuda: 2 estrellas, aprobado', () => {
    expect(calificarPorPorcentaje(90, false)).toEqual({
      calificacionEstrellas: 2,
      aprobado: true,
    });
    expect(calificarPorPorcentaje(99, false)).toEqual({
      calificacionEstrellas: 2,
      aprobado: true,
    });
  });

  it('100% sin ayuda: 3 estrellas, aprobado', () => {
    expect(calificarPorPorcentaje(100, false)).toEqual({
      calificacionEstrellas: 3,
      aprobado: true,
    });
  });

  it('100% CON ayuda: se trunca a 2 estrellas, sigue aprobado', () => {
    expect(calificarPorPorcentaje(100, true)).toEqual({
      calificacionEstrellas: 2,
      aprobado: true,
    });
  });

  it('90% con ayuda: ya estaba en 2, la ayuda no cambia nada', () => {
    expect(calificarPorPorcentaje(90, true)).toEqual({
      calificacionEstrellas: 2,
      aprobado: true,
    });
  });

  it('80% con ayuda: se queda en 1 (el tope de 2 no aplica hacia arriba)', () => {
    expect(calificarPorPorcentaje(80, true)).toEqual({
      calificacionEstrellas: 1,
      aprobado: true,
    });
  });

  it('menos de 80% con ayuda: sigue en 0 estrellas, no aprobado (la ayuda no aprueba nada)', () => {
    expect(calificarPorPorcentaje(60, true)).toEqual({
      calificacionEstrellas: 0,
      aprobado: false,
    });
  });
});
