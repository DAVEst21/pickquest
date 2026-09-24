import { Prisma } from '@prisma/client';

/** Elemento de Reto.claveRespuestas. */
export interface PreguntaClave {
  preguntaId: string;
  correcta: string;
  peso: number;
}

export interface RespuestaPregunta {
  preguntaId: string;
  respuesta: string;
}

export interface ResultadoEvaluacion {
  porcentaje: number;
  calificacionEstrellas: number;
  aprobado: boolean;
}

/** La respuesta del estudiante no corresponde a las preguntas del reto. */
export class RespuestaInvalidaError extends Error {}

/** Valida la forma de Reto.contenido (columna JSONB con claveRespuestas o array directo). */
export function parsearClave(valor: unknown): PreguntaClave[] {
  let lista = valor;
  if (valor && typeof valor === 'object' && !Array.isArray(valor)) {
    if (
      'claveRespuestas' in valor &&
      Array.isArray((valor as Record<string, unknown>).claveRespuestas)
    ) {
      lista = (valor as Record<string, unknown>).claveRespuestas;
    } else if (
      'preguntas' in valor &&
      Array.isArray((valor as Record<string, unknown>).preguntas)
    ) {
      lista = (valor as Record<string, unknown>).preguntas;
    }
  }

  const esValida =
    Array.isArray(lista) &&
    lista.length > 0 &&
    lista.every(
      (p) =>
        typeof p?.preguntaId === 'string' &&
        typeof p?.correcta === 'string' &&
        Number.isInteger(p?.peso) &&
        p.peso > 0,
    );
  if (!esValida) {
    throw new Error('Reto.contenido tiene un formato de respuestas inválido');
  }
  return lista as PreguntaClave[];
}

/**
 * Evalúa en el servidor la respuesta de un estudiante.
 * - porcentaje: puntos obtenidos / puntos posibles, truncado a entero (0-100).
 *   Se trunca para que un porcentaje mostrado como 80 nunca provenga de un 79.x.
 * - aprobado: porcentaje (como fracción) >= calificacionMinima. (Fase 1:
 *   calificacionMinima vuelve a ser siempre fracción 0.0-1.0, así que ya no
 *   hace falta detectar si venía en escala 0-100 — ver commit 9edafd1, que
 *   este cambio deja sin efecto).
 * - calificacionEstrellas (0-3): 3 si es perfecto, 2 si aprueba, 1 si alcanza
 *   al menos el 50%, 0 en otro caso (misma escala que usaba el mock del frontend).
 * Las preguntas sin responder cuentan como incorrectas.
 */
export function evaluarRespuestas(
  clave: PreguntaClave[],
  respuestas: RespuestaPregunta[],
  calificacionMinima: Prisma.Decimal,
): ResultadoEvaluacion {
  const clavePorId = new Map(clave.map((p) => [p.preguntaId, p]));
  const desconocidas = respuestas.filter((r) => !clavePorId.has(r.preguntaId));
  if (desconocidas.length > 0) {
    throw new RespuestaInvalidaError(
      `Preguntas inexistentes en este reto: ${desconocidas
        .map((r) => r.preguntaId)
        .join(', ')}`,
    );
  }

  const respuestaPorId = new Map(
    respuestas.map((r) => [r.preguntaId, r.respuesta]),
  );
  const puntosPosibles = clave.reduce((total, p) => total + p.peso, 0);
  const puntosObtenidos = clave.reduce(
    (total, p) =>
      respuestaPorId.get(p.preguntaId) === p.correcta ? total + p.peso : total,
    0,
  );

  const porcentaje = Math.floor((puntosObtenidos * 100) / puntosPosibles);
  const aprobado = new Prisma.Decimal(porcentaje)
    .div(100)
    .gte(calificacionMinima);

  let calificacionEstrellas = 0;
  if (porcentaje === 100) calificacionEstrellas = 3;
  else if (aprobado) calificacionEstrellas = 2;
  else if (porcentaje >= 50) calificacionEstrellas = 1;

  return { porcentaje, calificacionEstrellas, aprobado };
}
