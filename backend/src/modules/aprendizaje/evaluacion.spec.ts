import {
  evaluarPorcentaje,
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

const responder = (valores: Record<string, string>) =>
  Object.entries(valores).map(([preguntaId, respuesta]) => ({
    preguntaId,
    respuesta,
  }));

describe('evaluarPorcentaje', () => {
  it('todo correcto: 100%', () => {
    expect(
      evaluarPorcentaje(
        CLAVE,
        responder({
          'req-1': 'seguridad',
          'req-2': 'desempeno',
          'req-3': 'usabilidad',
          tradeoff: 'A',
        }),
      ),
    ).toBe(100);
  });

  it('parcial: 80%', () => {
    expect(
      evaluarPorcentaje(
        CLAVE,
        responder({
          'req-1': 'seguridad',
          'req-2': 'desempeno',
          'req-3': 'seguridad',
          tradeoff: 'A',
        }),
      ),
    ).toBe(80);
  });

  it('preguntas sin responder cuentan como incorrectas', () => {
    expect(evaluarPorcentaje(CLAVE, responder({ 'req-1': 'seguridad' }))).toBe(
      20,
    );
  });

  it('trunca el porcentaje en lugar de redondearlo hacia arriba', () => {
    const clave: PreguntaClave[] = [
      { preguntaId: 'a', correcta: 'x', peso: 1 },
      { preguntaId: 'b', correcta: 'x', peso: 1 },
      { preguntaId: 'c', correcta: 'x', peso: 1 },
    ];
    expect(
      evaluarPorcentaje(clave, responder({ a: 'x', b: 'x', c: 'no' })),
    ).toBe(66);
  });

  it('rechaza preguntas que no existen en el reto', () => {
    expect(() =>
      evaluarPorcentaje(CLAVE, responder({ inventada: 'x' })),
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
