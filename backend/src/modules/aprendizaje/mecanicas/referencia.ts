import { Db } from './tipos';

/** RN-31: intentos calificados no aprobados que habilitan la solución de referencia. */
export const INTENTOS_NO_APROBADOS_PARA_REFERENCIA = 3;

/**
 * RN-31 (CU-01 a CU-08): la solución de referencia (respuesta correcta y su
 * explicación) se muestra cuando el intento queda aprobado o cuando el
 * estudiante acumula 3 o más intentos calificados no aprobados en ese reto.
 * Mientras no se cumpla ninguna de las dos, el resultado solo señala errores.
 *
 * Función única: todas las mecánicas pasan por aquí (RNF-SE-02).
 */
export async function puedeVerReferencia(
  db: Db,
  estudianteId: number,
  retoId: number,
  intento: { aprobado: boolean },
): Promise<boolean> {
  if (intento.aprobado) return true;
  const noAprobados = await db.intentoReto.count({
    where: { estudianteId, retoId, estado: 'CALIFICADO', aprobado: false },
  });
  return noAprobados >= INTENTOS_NO_APROBADOS_PARA_REFERENCIA;
}
