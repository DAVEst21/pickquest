import { porcentajeEntero } from '../calificacion.util';
export function calificarHistorias(
  casillas: { id: number; piezaCorrectaId: number }[],
  colocaciones: { casillaId: number; piezaId: number }[],
): number {
  const elegidas = new Map(colocaciones.map((c) => [c.casillaId, c.piezaId]));
  return porcentajeEntero(
    casillas.filter((c) => elegidas.get(c.id) === c.piezaCorrectaId).length *
      100,
    casillas.length,
  );
}
