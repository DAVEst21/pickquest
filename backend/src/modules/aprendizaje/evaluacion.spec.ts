import { Prisma } from '@prisma/client';
import {
  evaluarRespuestas,
  parsearClave,
  PreguntaClave,
  RespuestaInvalidaError,
} from './evaluacion';

const CLAVE: PreguntaClave[] = [
  { preguntaId: 'req-1', correcta: 'seguridad', peso: 1 },
  { preguntaId: 'req-2', correcta: 'desempeno', peso: 1 },
  { preguntaId: 'req-3', correcta: 'usabilidad', peso: 1 },
  { preguntaId: 'tradeoff', correcta: 'A', peso: 2 },
];
const MINIMA = new Prisma.Decimal('0.80');

const responder = (valores: Record<string, string>) =>
  Object.entries(valores).map(([preguntaId, respuesta]) => ({
    preguntaId,
    respuesta,
  }));

describe('evaluarRespuestas', () => {
  it('todo correcto: 100%, 3 estrellas, aprobado', () => {
    const resultado = evaluarRespuestas(
      CLAVE,
      responder({
        'req-1': 'seguridad',
        'req-2': 'desempeno',
        'req-3': 'usabilidad',
        tradeoff: 'A',
      }),
      MINIMA,
    );
    expect(resultado).toEqual({
      porcentaje: 100,
      calificacionEstrellas: 3,
      aprobado: true,
    });
  });

  it('justo en el umbral (80%): aprobado con 2 estrellas', () => {
    const resultado = evaluarRespuestas(
      CLAVE,
      responder({
        'req-1': 'seguridad',
        'req-2': 'desempeno',
        'req-3': 'seguridad',
        tradeoff: 'A',
      }),
      MINIMA,
    );
    expect(resultado).toEqual({
      porcentaje: 80,
      calificacionEstrellas: 2,
      aprobado: true,
    });
  });

  it('por debajo del umbral y >= 50%: no aprobado, 1 estrella', () => {
    const resultado = evaluarRespuestas(
      CLAVE,
      responder({
        'req-1': 'seguridad',
        'req-2': 'desempeno',
        'req-3': 'usabilidad',
        tradeoff: 'B',
      }),
      MINIMA,
    );
    expect(resultado).toEqual({
      porcentaje: 60,
      calificacionEstrellas: 1,
      aprobado: false,
    });
  });

  it('preguntas sin responder cuentan como incorrectas', () => {
    const resultado = evaluarRespuestas(
      CLAVE,
      responder({ 'req-1': 'seguridad' }),
      MINIMA,
    );
    expect(resultado).toEqual({
      porcentaje: 20,
      calificacionEstrellas: 0,
      aprobado: false,
    });
  });

  it('decide la aprobación con porcentaje vs calificacionMinima, no con estrellas', () => {
    const clave: PreguntaClave[] = [
      { preguntaId: 'a', correcta: 'x', peso: 1 },
      { preguntaId: 'b', correcta: 'x', peso: 1 },
    ];
    const resultado = evaluarRespuestas(
      clave,
      responder({ a: 'x', b: 'no' }),
      new Prisma.Decimal('0.50'),
    );
    expect(resultado.porcentaje).toBe(50);
    expect(resultado.aprobado).toBe(true);
  });

  it('trunca el porcentaje en lugar de redondearlo hacia arriba', () => {
    const clave: PreguntaClave[] = [
      { preguntaId: 'a', correcta: 'x', peso: 1 },
      { preguntaId: 'b', correcta: 'x', peso: 1 },
      { preguntaId: 'c', correcta: 'x', peso: 1 },
    ];
    const resultado = evaluarRespuestas(
      clave,
      responder({ a: 'x', b: 'x', c: 'no' }),
      new Prisma.Decimal('0.67'),
    );
    expect(resultado.porcentaje).toBe(66);
    expect(resultado.aprobado).toBe(false);
  });

  it('rechaza preguntas que no existen en el reto', () => {
    expect(() =>
      evaluarRespuestas(CLAVE, responder({ inventada: 'x' }), MINIMA),
    ).toThrow(RespuestaInvalidaError);
  });
});

describe('parsearClave', () => {
  it('acepta una clave bien formada', () => {
    expect(parsearClave(CLAVE)).toEqual(CLAVE);
  });

  it.each([null, [], [{ preguntaId: 'a', correcta: 'x', peso: 0 }], {}])(
    'rechaza una clave mal formada: %p',
    (valor) => {
      expect(() => parsearClave(valor)).toThrow();
    },
  );
});
