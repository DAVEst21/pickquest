/** Una opción visible de una pregunta de opción múltiple/clasificar/emparejar. */
export interface OpcionClave {
  valor: string;
  texto: string;
}

/**
 * Elemento de Reto.claveRespuestas. Solo preguntaId/correcta/peso importan
 * para calificar; texto/opciones/parte son descriptivos (para que el
 * frontend muestre la pregunta real) y se ignoran aquí.
 */
export interface PreguntaClave {
  preguntaId: string;
  correcta: string;
  peso: number;
  texto?: string;
  opciones?: OpcionClave[];
  parte?: string;
}

export interface RespuestaPregunta {
  preguntaId: string;
  respuesta: string;
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
 * Evalúa en el servidor la respuesta de un estudiante y devuelve el
 * porcentaje de precisión (puntos obtenidos / puntos posibles, truncado a
 * entero 0-100; se trunca para que un porcentaje mostrado como 80 nunca
 * provenga de un 79.x). Las preguntas sin responder cuentan como incorrectas.
 *
 * calificacionEstrellas y aprobado NO se calculan aquí: ver
 * calificarPorPorcentaje() en calificacion-estrellas.ts (Fase 2, RN-04/RN-05),
 * que además necesita saber si se usó ayuda para aplicar la penalización.
 */
export function evaluarPorcentaje(
  clave: PreguntaClave[],
  respuestas: RespuestaPregunta[],
): number {
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

  return Math.floor((puntosObtenidos * 100) / puntosPosibles);
}
