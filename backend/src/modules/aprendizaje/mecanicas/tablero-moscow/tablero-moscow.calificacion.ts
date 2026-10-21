import { paresConcordantes, porcentajeEntero } from '../calificacion.util';

/**
 * CU-03 Tablero MoSCoW (RF-06, RN-18). Funciones puras.
 *
 * RN-18: 50 × (tarjetas en su columna correcta ÷ total)
 *      + 30 × (tarjetas con su tipo correcto ÷ total)
 *      + 20 × concordancia del orden de MUST
 */

export type Columna = 'MUST' | 'SHOULD' | 'COULD' | 'WONT';
export type TipoReq = 'FUNCIONAL' | 'NO_FUNCIONAL';

export interface TarjetaEval {
  id: number;
  texto: string;
  puntos: number;
  columnaCorrecta: Columna;
  tipoCorrecto: TipoReq;
  ordenMustReferencia: number | null;
  /** Respuesta del estudiante (null = sin clasificar). */
  columna: Columna | null;
  tipo: TipoReq | null;
  ordenMust: number | null;
}

export interface ConcordanciaMust {
  concordantes: number;
  pares: number;
}

/**
 * Concordancia del orden de MUST: de las tarjetas cuya columna de referencia
 * es MUST y que el estudiante también puso en MUST, se forman todos los pares
 * y se cuenta cuántos conservan el mismo orden relativo que
 * `ordenMustReferencia`. Con menos de 2 tarjetas así no hay pares: la
 * concordancia vale 1 si el estudiante puso en MUST exactamente las de
 * referencia, y 0 en otro caso.
 */
export function concordanciaOrdenMust(tarjetas: TarjetaEval[]): ConcordanciaMust {
  const comunes = tarjetas.filter(
    (t) => t.columnaCorrecta === 'MUST' && t.columna === 'MUST',
  );
  if (comunes.length >= 2) {
    return paresConcordantes(
      comunes.map((t) => ({
        a: t.ordenMust ?? Number.MAX_SAFE_INTEGER,
        b: t.ordenMustReferencia ?? 0,
      })),
    );
  }
  const mustReferencia = tarjetas.filter((t) => t.columnaCorrecta === 'MUST').length;
  const mustElegidas = tarjetas.filter((t) => t.columna === 'MUST').length;
  const exacto = comunes.length === mustReferencia && comunes.length === mustElegidas;
  return { concordantes: exacto ? 1 : 0, pares: 1 };
}

export function calificarMoscow(tarjetas: TarjetaEval[]): number {
  const total = tarjetas.length;
  if (total === 0) return 0;
  const enColumna = tarjetas.filter((t) => t.columna === t.columnaCorrecta).length;
  const conTipo = tarjetas.filter((t) => t.tipo === t.tipoCorrecto).length;
  const { concordantes, pares } = concordanciaOrdenMust(tarjetas);
  const numerador = 50 * enColumna * pares + 30 * conTipo * pares + 20 * concordantes * total;
  return porcentajeEntero(numerador, total * pares);
}

/** Suma de puntos de las tarjetas colocadas en MUST. */
export function puntosEnMust(tarjetas: Pick<TarjetaEval, 'columna' | 'puntos'>[]): number {
  return tarjetas.filter((t) => t.columna === 'MUST').reduce((s, t) => s + t.puntos, 0);
}

/** CU-03 FE1 (tarjetas sin columna o sin tipo) y FE2 (MUST por encima de la capacidad). */
export function faltantesMoscow(
  tarjetas: Pick<TarjetaEval, 'texto' | 'puntos' | 'columna' | 'tipo'>[],
  capacidad: number,
): string[] {
  const faltantes: string[] = [];
  for (const t of tarjetas) {
    if (t.columna === null) faltantes.push(`Falta colocar en una columna: "${t.texto}"`);
    if (t.tipo === null) faltantes.push(`Falta indicar si es RF o RNF: "${t.texto}"`);
  }
  const usada = puntosEnMust(tarjetas);
  if (usada > capacidad) {
    faltantes.push(`Los puntos de MUST (${usada}) superan la capacidad permitida (${capacidad})`);
  }
  return faltantes;
}
