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
}

export interface FaseParaEstado {
  id: number;
  orden: number;
  retoId: number | null;
}

/** Fila de IntentoReto agrupada por (retoId, aprobado). */
export interface GrupoIntentos {
  retoId: number;
  aprobado: boolean;
  intentos: number;
  maxPorcentaje: number | null;
  maxEstrellas: number | null;
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
    };
    resumen.set(grupo.retoId, {
      aprobado: actual.aprobado || grupo.aprobado,
      intentos: actual.intentos + grupo.intentos,
      mejorPorcentaje: maximo(actual.mejorPorcentaje, grupo.maxPorcentaje),
      mejorEstrellas: maximo(actual.mejorEstrellas, grupo.maxEstrellas),
    });
  }
  return resumen;
}

/**
 * Estado de cada fase para un estudiante (Corrección a del modelo):
 * - completada: existe un IntentoReto aprobado del estudiante para el reto de la fase.
 * - desbloqueada: la fase anterior (por orden) está completada; la primera
 *   fase siempre lo está.
 * - bloqueada: en cualquier otro caso.
 * en_progreso es un caso particular de desbloqueada: ya hay intentos, pero
 * ninguno aprobado (así lo distingue el mapa del frontend).
 */
export function calcularEstadosFases(
  fases: FaseParaEstado[],
  resumenPorReto: Map<number, ResumenReto>,
): Map<number, EstadoFase> {
  const estados = new Map<number, EstadoFase>();
  const ordenadas = [...fases].sort((a, b) => a.orden - b.orden);
  let anteriorCompletada = true;

  for (const fase of ordenadas) {
    const resumen =
      fase.retoId === null ? undefined : resumenPorReto.get(fase.retoId);
    let estado: EstadoFase;
    if (resumen?.aprobado) {
      estado = 'completada';
    } else if (anteriorCompletada) {
      estado = resumen && resumen.intentos > 0 ? 'en_progreso' : 'desbloqueada';
    } else {
      estado = 'bloqueada';
    }
    estados.set(fase.id, estado);
    anteriorCompletada = estado === 'completada';
  }
  return estados;
}

function maximo(a: number | null, b: number | null): number | null {
  if (a === null) return b;
  if (b === null) return a;
  return Math.max(a, b);
}
