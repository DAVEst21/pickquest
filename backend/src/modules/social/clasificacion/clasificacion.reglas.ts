/**
 * RF-20 Clasificación (RN-30). La tabla ordena a los estudiantes por XP total; en empate, por estrellas
 * totales (suma de las mejores estrellas de cada reto) y, si persiste, por quien alcanzó primero esa XP.
 */
export interface FilaClasificable {
  xpTotal: number;
  estrellasTotales: number;
  /** Momento en que alcanzó su XP actual (más antiguo = primero). */
  xpAlcanzadaEn: Date;
}

export function compararClasificacion(a: FilaClasificable, b: FilaClasificable): number {
  if (a.xpTotal !== b.xpTotal) return b.xpTotal - a.xpTotal;
  if (a.estrellasTotales !== b.estrellasTotales) return b.estrellasTotales - a.estrellasTotales;
  return a.xpAlcanzadaEn.getTime() - b.xpAlcanzadaEn.getTime();
}

/** Ordena sin modificar la lista original. */
export function ordenarClasificacion<T extends FilaClasificable>(filas: T[]): T[] {
  return [...filas].sort(compararClasificacion);
}

/** Suma de las mejores estrellas de cada reto: `mejoresPorReto` trae una calificación (0-3) por reto. */
export function estrellasTotales(mejoresPorReto: number[]): number {
  return mejoresPorReto.reduce((suma, e) => suma + e, 0);
}
