/**
 * Orden de presentación que no revela la respuesta correcta.
 *
 * El contenido del seed guarda las opciones con su `orden`, y en varios retos la
 * correcta quedó siempre en la misma posición. Para que la posición no sea una
 * pista, cada intento ve las opciones mezcladas. La mezcla es determinista: sale
 * del id del intento y de una clave de la lista, así que al retomar el intento
 * (FA3) o recargar la pantalla se obtiene exactamente el mismo orden, sin
 * guardar nada en la base.
 */

/** Hash de 32 bits (FNV-1a) de una cadena. */
function hash32(texto: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Generador pseudoaleatorio de 32 bits (mulberry32): misma semilla, misma secuencia. */
function generador(semilla: number): () => number {
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Semilla de una lista: el intento y el nombre de la lista (una mezcla distinta por lista). */
export function semillaDeLista(intentoId: number, clave: string): number {
  return hash32(`${intentoId}:${clave}`);
}

/** Copia de `items` en un orden pseudoaleatorio que solo depende de la semilla (Fisher-Yates). */
export function mezclarDeterminista<T>(items: readonly T[], semilla: number): T[] {
  const copia = [...items];
  const azar = generador(semilla);
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(azar() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

/** Atajo: mezcla `items` para este intento y esta lista. */
export function ordenarParaIntento<T>(items: readonly T[], intentoId: number, clave: string): T[] {
  return mezclarDeterminista(items, semillaDeLista(intentoId, clave));
}
