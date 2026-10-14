import { porcentajeEntero } from '../calificacion.util';

/**
 * CU-04 Inspección de un sistema (RF-07, RN-19). Funciones puras.
 *
 * RN-19: cada falla vale 100 ÷ F. Por cada falla, si el estudiante marcó su
 * elemento obtiene el 60% de su valor, y si además eligió el atributo
 * correcto, el 40% restante. Cada marca sobre un elemento sin falla resta la
 * mitad del valor de una falla. Se acota a 0-100 y se trunca.
 *
 * Con F fallas el total es (60·encontradas + 40·conAtributo − 50·marcasSinFalla) ÷ F,
 * una fracción de enteros: así no hay errores de punto flotante.
 */

export interface FallaEval {
  elementoId: number;
  atributo: string;
}
export interface MarcaEval {
  elementoId: number;
  atributo: string | null;
}

export interface DetalleInspeccion {
  encontradas: { falla: FallaEval; marca: MarcaEval; atributoAcertado: boolean }[];
  noEncontradas: FallaEval[];
  marcasSinFalla: MarcaEval[];
}

export function evaluarInspeccion(fallas: FallaEval[], marcas: MarcaEval[]): DetalleInspeccion {
  const marcaPorElemento = new Map(marcas.map((m) => [m.elementoId, m]));
  const fallaPorElemento = new Map(fallas.map((f) => [f.elementoId, f]));
  const encontradas: DetalleInspeccion['encontradas'] = [];
  const noEncontradas: FallaEval[] = [];
  for (const falla of fallas) {
    const marca = marcaPorElemento.get(falla.elementoId);
    if (marca) {
      encontradas.push({ falla, marca, atributoAcertado: marca.atributo === falla.atributo });
    } else {
      noEncontradas.push(falla);
    }
  }
  const marcasSinFalla = marcas.filter((m) => !fallaPorElemento.has(m.elementoId));
  return { encontradas, noEncontradas, marcasSinFalla };
}

export function calificarInspeccion(fallas: FallaEval[], marcas: MarcaEval[]): number {
  if (fallas.length === 0) return 0;
  const d = evaluarInspeccion(fallas, marcas);
  const conAtributo = d.encontradas.filter((e) => e.atributoAcertado).length;
  const numerador = 60 * d.encontradas.length + 40 * conAtributo - 50 * d.marcasSinFalla.length;
  return porcentajeEntero(numerador, fallas.length);
}

/** CU-04 FE2: marcas sin atributo. (FE1, el máximo de marcas, se valida al guardar.) */
export function faltantesInspeccion(
  marcas: { elementoId: number; atributo: string | null }[],
  etiquetaDe: (elementoId: number) => string,
): string[] {
  return marcas
    .filter((m) => m.atributo === null)
    .map((m) => `La marca sobre "${etiquetaDe(m.elementoId)}" no tiene atributo de calidad`);
}

/** CU-04 FE1: no se permiten más marcas que `maxMarcas`. */
export function excedeMaxMarcas(cantidad: number, maxMarcas: number): boolean {
  return cantidad > maxMarcas;
}
