import { paresConcordantes, porcentajeEntero } from '../calificacion.util';

/**
 * CU-08 Línea de tiempo (RF-11, RN-23). Funciones puras: no tocan la base de datos.
 *
 * RN-23: 40 × concordancia del orden de las fases
 *      + 30 × (dependencias respetadas ÷ total)
 *      + 20 × (entregables bien asociados ÷ total)
 *      + 10 × (fin ≤ fecha límite ? 1 : 0)
 */

export interface BloqueEval {
  id: number;
  tipo: 'FASE' | 'ACTIVIDAD';
  nombre: string;
  duracionSemanas: number;
  inicioReferencia: number;
}
export interface DependenciaEval {
  bloqueId: number;
  requiereId: number;
}
export interface EntregableEval {
  id: number;
  nombre: string;
  faseCorrectaId: number;
}
export interface EntradaLineaTiempo {
  bloques: BloqueEval[];
  dependencias: DependenciaEval[];
  entregables: EntregableEval[];
  /** bloqueId → semana de inicio (desde 0) que eligió el estudiante. */
  inicios: Map<number, number>;
  /** entregableId → bloqueId de la FASE con la que lo asoció. */
  asociaciones: Map<number, number>;
  duracionMaximaSemanas: number;
}
export interface DetalleLineaTiempo {
  /** Pares de FASES cuyo orden por inicio coincide con el de referencia. */
  paresConcordantes: number;
  paresTotales: number;
  dependenciasRespetadas: number;
  dependenciasIncumplidas: DependenciaEval[];
  entregablesBien: number;
  entregablesMal: EntregableEval[];
  /** Semana en que termina el último bloque: máx(inicio + duración). */
  fin: number;
  dentroDelPlazo: boolean;
}

/** máx(inicio + duración) de los bloques ya colocados. */
export function finDelPlan(
  bloques: Pick<BloqueEval, 'id' | 'duracionSemanas'>[],
  inicios: Map<number, number>,
): number {
  let fin = 0;
  for (const b of bloques) {
    const inicio = inicios.get(b.id);
    if (inicio !== undefined) fin = Math.max(fin, inicio + b.duracionSemanas);
  }
  return fin;
}

export function evaluarLineaTiempo(e: EntradaLineaTiempo): DetalleLineaTiempo {
  const porId = new Map(e.bloques.map((b) => [b.id, b]));
  const inicio = (id: number) => e.inicios.get(id) ?? 0;

  const fases = e.bloques.filter((b) => b.tipo === 'FASE');
  const { concordantes, pares } = paresConcordantes(
    fases.map((f) => ({ a: inicio(f.id), b: f.inicioReferencia })),
  );

  const incumplidas = e.dependencias.filter((d) => {
    const bloque = porId.get(d.bloqueId);
    const requerido = porId.get(d.requiereId);
    if (!bloque || !requerido) return true;
    return !(inicio(bloque.id) >= inicio(requerido.id) + requerido.duracionSemanas);
  });

  const mal = e.entregables.filter(
    (en) => e.asociaciones.get(en.id) !== en.faseCorrectaId,
  );

  const fin = finDelPlan(e.bloques, e.inicios);
  return {
    paresConcordantes: concordantes,
    paresTotales: pares,
    dependenciasRespetadas: e.dependencias.length - incumplidas.length,
    dependenciasIncumplidas: incumplidas,
    entregablesBien: e.entregables.length - mal.length,
    entregablesMal: mal,
    fin,
    dentroDelPlazo: fin <= e.duracionMaximaSemanas,
  };
}

/**
 * RN-23 como fracción exacta (ver porcentajeEntero). Si un componente no
 * tiene elementos (sin pares de fases, sin dependencias o sin entregables) se
 * considera cumplido por completo.
 */
export function porcentajeLineaTiempo(
  d: DetalleLineaTiempo,
  totales: { dependencias: number; entregables: number },
): number {
  const pares = d.paresTotales > 0 ? d.paresTotales : 1;
  const concordantes = d.paresTotales > 0 ? d.paresConcordantes : 1;
  const deps = totales.dependencias > 0 ? totales.dependencias : 1;
  const depsOk = totales.dependencias > 0 ? d.dependenciasRespetadas : 1;
  const ents = totales.entregables > 0 ? totales.entregables : 1;
  const entsOk = totales.entregables > 0 ? d.entregablesBien : 1;

  const numerador =
    40 * concordantes * deps * ents +
    30 * depsOk * pares * ents +
    20 * entsOk * pares * deps +
    10 * (d.dentroDelPlazo ? 1 : 0) * pares * deps * ents;
  return porcentajeEntero(numerador, pares * deps * ents);
}

export function calificarLineaTiempo(e: EntradaLineaTiempo): number {
  return porcentajeLineaTiempo(evaluarLineaTiempo(e), {
    dependencias: e.dependencias.length,
    entregables: e.entregables.length,
  });
}

/** CU-08 FE1: bloques sin colocar o entregables sin asociar. (FE2, rebasar la fecha límite, solo avisa en el cliente.) */
export function faltantesLineaTiempo(
  bloques: Pick<BloqueEval, 'id' | 'nombre'>[],
  inicios: Map<number, number>,
  entregables: Pick<EntregableEval, 'id' | 'nombre'>[],
  asociaciones: Map<number, number>,
): string[] {
  return [
    ...bloques
      .filter((b) => !inicios.has(b.id))
      .map((b) => `Falta colocar el bloque "${b.nombre}" en la línea de tiempo`),
    ...entregables
      .filter((e) => !asociaciones.has(e.id))
      .map((e) => `Falta asociar el entregable "${e.nombre}" con una fase`),
  ];
}
