import { porcentajeEntero } from '../calificacion.util';

/**
 * CU-01 Diálogo con stakeholder (RF-04, RN-16). Funciones puras.
 *
 * RN-16: (técnica correcta ? 20 : 0)
 *      + 80 × (requerimientos descubiertos ÷ requerimientos ocultos)
 *      − 5 × preguntas improductivas
 * acotado entre 0 y 100 y truncado.
 */

export interface EntradaDialogo {
  tecnicaElegida: string | null;
  tecnicaCorrecta: string;
  requerimientosDescubiertos: number;
  requerimientosOcultos: number;
  preguntasImproductivas: number;
}

export function calificarDialogo(e: EntradaDialogo): number {
  const ocultos = e.requerimientosOcultos > 0 ? e.requerimientosOcultos : 1;
  const descubiertos = e.requerimientosOcultos > 0 ? e.requerimientosDescubiertos : 1;
  const tecnica = e.tecnicaElegida !== null && e.tecnicaElegida === e.tecnicaCorrecta ? 1 : 0;
  const numerador = 20 * tecnica * ocultos + 80 * descubiertos - 5 * e.preguntasImproductivas * ocultos;
  return porcentajeEntero(numerador, ocultos);
}

/** CU-01: sin técnica elegida no hay entrevista. (FE1, libreta vacía, solo pide confirmación en el cliente.) */
export function faltantesDialogo(tecnicaElegida: string | null): string[] {
  return tecnicaElegida === null ? ['Falta elegir la técnica de elicitación'] : [];
}

export interface OpcionDisponible {
  id: number;
  nodoId: number;
  orden: number;
}

/**
 * Opciones que se ofrecen en un nodo: las que aún no se eligieron en el
 * intento. Si el nodo ya no tiene ninguna, se regresa al nodo inicial; si
 * tampoco ahí quedan, no hay opciones.
 */
export function opcionesDisponibles<T extends OpcionDisponible>(
  nodoActualId: number,
  nodoInicialId: number,
  todas: T[],
  elegidas: Set<number>,
): { nodoId: number; opciones: T[] } {
  const delNodo = (nodoId: number) =>
    todas.filter((o) => o.nodoId === nodoId && !elegidas.has(o.id)).sort((a, b) => a.orden - b.orden);
  const actuales = delNodo(nodoActualId);
  if (actuales.length > 0) return { nodoId: nodoActualId, opciones: actuales };
  return { nodoId: nodoInicialId, opciones: delNodo(nodoInicialId) };
}
