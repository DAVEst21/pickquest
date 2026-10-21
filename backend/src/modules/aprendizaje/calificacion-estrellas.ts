/**
 * Calificación en estrellas por intento (RN-04/RF-05, RN-05/RF-06).
 *
 * NOTA IMPORTANTE: los umbrales de esta tabla son fijos (80/90/100), NO se
 * leen de Reto.calificacionMinima. Se confirmó que los 3 retos del seed
 * tienen calificacionMinima = 0.80 (80%), así que hoy no hay contradicción,
 * pero si en el futuro un reto se configura con un calificacionMinima
 * distinto, esta tabla lo ignorará silenciosamente: "aprobado" seguirá
 * decidiéndose por el 80% fijo de aquí, no por el umbral de ese reto.
 */
const UMBRAL_APROBACION = 80;
const UMBRAL_DOS_ESTRELLAS = 90;
const UMBRAL_TRES_ESTRELLAS = 100;

/** Tope de estrellas cuando el estudiante usó una ayuda en el intento. */
const TOPE_ESTRELLAS_CON_AYUDA = 2;

export interface CalificacionEstrellas {
  calificacionEstrellas: number;
  aprobado: boolean;
}

/**
 * - < 80%: 0 estrellas, no aprobado.
 * - 80% a 89%: 1 estrella, aprobado.
 * - 90% a 99%: 2 estrellas, aprobado.
 * - 100%: 3 estrellas, aprobado.
 * - Si usoAyuda, la calificación máxima del intento se trunca a 2 estrellas
 *   aunque el porcentaje sea 100 (RN-04/RF-05). No afecta si el reto queda
 *   aprobado: eso depende solo del porcentaje.
 */
export function calificarPorPorcentaje(
  porcentaje: number,
  usoAyuda: boolean,
): CalificacionEstrellas {
  const aprobado = porcentaje >= UMBRAL_APROBACION;
  let calificacionEstrellas = 0;
  if (porcentaje >= UMBRAL_TRES_ESTRELLAS) calificacionEstrellas = 3;
  else if (porcentaje >= UMBRAL_DOS_ESTRELLAS) calificacionEstrellas = 2;
  else if (porcentaje >= UMBRAL_APROBACION) calificacionEstrellas = 1;

  if (usoAyuda) {
    calificacionEstrellas = Math.min(
      calificacionEstrellas,
      TOPE_ESTRELLAS_CON_AYUDA,
    );
  }

  return { calificacionEstrellas, aprobado };
}
