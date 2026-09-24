export const ESTADOS_FASE = [
  'bloqueada',
  'desbloqueada',
  'en_progreso',
  'completada',
] as const;

export type EstadoFase = (typeof ESTADOS_FASE)[number];

/** Resumen del historial de un estudiante sobre un reto. */
export interface ResumenReto {
  aprobado: boolean;
  intentos: number;
  mejorPorcentaje: number | null;
  mejorEstrellas: number | null;
  /**
   * Suma de qpGanado en todos los intentos del estudiante para este reto.
   * Como solo la primera aprobación otorga QP, esto equivale exactamente al
   * QP que realmente se le acreditó por este reto (0 si no lo ha aprobado).
   */
  qpGanadoTotal: number;
}

export interface FaseParaEstado {
  id: number;
  orden: number;
  /** Todos los retos de la fase, en cualquier orden (0 o más). */
  retoIds: number[];
}

/** Fila de IntentoReto agrupada por (retoId, aprobado). */
export interface GrupoIntentos {
  retoId: number;
  aprobado: boolean;
  intentos: number;
  maxPorcentaje: number | null;
  maxEstrellas: number | null;
  sumaQpGanado: number;
}

/** Progreso de una fase con al menos un reto, para un estudiante. */
export interface ProgresoFase {
  totalRetos: number;
  retosAprobados: number;
  /** 0-100, redondeado a entero. */
  progreso: number;
  /** Solo cuando la fase está completada (todos sus retos aprobados). */
  calificacionEstrellasFase: number | null;
  /** Solo cuando la fase está completada; suma del QP otorgado por cada reto. */
  recompensaQpFase: number | null;
}

export function resumirIntentos(
  grupos: GrupoIntentos[],
): Map<number, ResumenReto> {
  const resumen = new Map<number, ResumenReto>();
  for (const grupo of grupos) {
    const actual = resumen.get(grupo.retoId) ?? {
      aprobado: false,
      intentos: 0,
      mejorPorcentaje: null,
      mejorEstrellas: null,
      qpGanadoTotal: 0,
    };
    resumen.set(grupo.retoId, {
      aprobado: actual.aprobado || grupo.aprobado,
      intentos: actual.intentos + grupo.intentos,
      mejorPorcentaje: maximo(actual.mejorPorcentaje, grupo.maxPorcentaje),
      mejorEstrellas: maximo(actual.mejorEstrellas, grupo.maxEstrellas),
      qpGanadoTotal: actual.qpGanadoTotal + grupo.sumaQpGanado,
    });
  }
  return resumen;
}

/**
 * Estado de cada fase para un estudiante. Una fase puede tener 0, 1 o más
 * retos (Fase 3): ya no se asume "un reto por fase".
 * - completada: la fase tiene al menos un reto Y el estudiante tiene un
 *   intento aprobado en TODOS sus retos.
 * - desbloqueada: la fase anterior (por orden) está completada, y el
 *   estudiante no tiene ningún intento todavía en los retos de esta fase
 *   (o la fase no tiene retos: "disponible, sin contenido todavía").
 * - en_progreso: desbloqueada, con al menos un intento registrado en algún
 *   reto de la fase, sin tenerlos todos aprobados aún. Una fase sin retos
 *   nunca queda en_progreso (no hay nada que intentar).
 * - bloqueada: en cualquier otro caso (la fase anterior no está completada).
 */
export function calcularEstadosFases(
  fases: FaseParaEstado[],
  resumenPorReto: Map<number, ResumenReto>,
): Map<number, EstadoFase> {
  const estados = new Map<number, EstadoFase>();
  const ordenadas = [...fases].sort((a, b) => a.orden - b.orden);
  let anteriorCompletada = true;

  for (const fase of ordenadas) {
    const resumenes = fase.retoIds.map((id) => resumenPorReto.get(id) ?? null);
    const totalRetos = fase.retoIds.length;
    const retosAprobados = resumenes.filter((r) => r?.aprobado).length;
    const intentosTotales = resumenes.reduce(
      (total, r) => total + (r?.intentos ?? 0),
      0,
    );
    const completada = totalRetos > 0 && retosAprobados === totalRetos;

    let estado: EstadoFase;
    if (completada) {
      estado = 'completada';
    } else if (anteriorCompletada) {
      estado = intentosTotales > 0 ? 'en_progreso' : 'desbloqueada';
    } else {
      estado = 'bloqueada';
    }
    estados.set(fase.id, estado);
    anteriorCompletada = estado === 'completada';
  }
  return estados;
}

/**
 * Progreso agregado de una fase con retos: % completado, y (solo si está
 * completada) su calificación en estrellas y su recompensa en QP.
 * - progreso: retos aprobados / total de retos, redondeado a entero.
 * - calificacionEstrellasFase: promedio de la MEJOR MARCA HISTÓRICA
 *   (mejorEstrellas) de cada reto, redondeado al entero más cercano.
 * - recompensaQpFase: suma del QP realmente otorgado por cada reto (solo la
 *   primera aprobación de cada uno otorga QP, así que sumar qpGanadoTotal de
 *   cada reto da exactamente lo que se le acreditó al estudiante por la fase).
 * Devuelve null si la fase no tiene retos (no hay nada que calcular).
 */
export function calcularProgresoFase(
  retoIds: number[],
  resumenPorReto: Map<number, ResumenReto>,
): ProgresoFase | null {
  const totalRetos = retoIds.length;
  if (totalRetos === 0) return null;

  const resumenes = retoIds.map(
    (id) =>
      resumenPorReto.get(id) ?? {
        aprobado: false,
        intentos: 0,
        mejorPorcentaje: null,
        mejorEstrellas: null,
        qpGanadoTotal: 0,
      },
  );
  const retosAprobados = resumenes.filter((r) => r.aprobado).length;
  const completada = retosAprobados === totalRetos;

  return {
    totalRetos,
    retosAprobados,
    progreso: Math.round((retosAprobados / totalRetos) * 100),
    calificacionEstrellasFase: completada
      ? Math.round(
          resumenes.reduce((total, r) => total + (r.mejorEstrellas ?? 0), 0) /
            totalRetos,
        )
      : null,
    recompensaQpFase: completada
      ? resumenes.reduce((total, r) => total + r.qpGanadoTotal, 0)
      : null,
  };
}

function maximo(a: number | null, b: number | null): number | null {
  if (a === null) return b;
  if (b === null) return a;
  return Math.max(a, b);
}
