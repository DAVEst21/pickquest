import { sumarDias } from '../../../common/fechas/dia-calendario';

/**
 * CU-09 Repaso con tarjetas (RF-12). Reglas puras de la repetición espaciada.
 *
 * RN-24: «no lo sabía» vuelve a aparecer en la misma sesión; «dudé», al día
 * siguiente; «lo sabía», a los 3 días.
 * RN-25: completar la sesión de un tema otorga 10 XP una vez por día y por tema, sin QP.
 */
export type AutoevaluacionTarjeta = 'LO_SABIA' | 'DUDE' | 'NO_LO_SABIA';

export const XP_REPASO = 10;
export const DIAS_LO_SABIA = 3;
export const DIAS_DUDE = 1;

export interface ProgramacionTarjeta {
  /** Día calendario MX («AAAA-MM-DD») en que vuelve a tocar. */
  proximoRepaso: string;
  /** false: la tarjeta sigue en la cola de la sesión y pasa al final (RN-24). */
  completada: boolean;
}

/** RN-24: qué pasa con una tarjeta según la autoevaluación (`hoy` es un día calendario MX). */
export function programarTarjeta(autoevaluacion: AutoevaluacionTarjeta, hoy: string): ProgramacionTarjeta {
  switch (autoevaluacion) {
    case 'NO_LO_SABIA':
      return { proximoRepaso: hoy, completada: false };
    case 'DUDE':
      return { proximoRepaso: sumarDias(hoy, DIAS_DUDE), completada: true };
    case 'LO_SABIA':
      return { proximoRepaso: sumarDias(hoy, DIAS_LO_SABIA), completada: true };
  }
}

/**
 * Tarjetas de la sesión de hoy: las nuevas (sin programación) y las vencidas
 * (`proximoRepaso ≤ hoy`). Si ninguna toca hoy, la sesión incluye todo el mazo.
 */
export function tarjetasDeLaSesion(
  tarjetas: { id: number; orden: number }[],
  proximoRepasoPorTarjeta: Map<number, string>,
  hoy: string,
): number[] {
  const ordenadas = [...tarjetas].sort((a, b) => a.orden - b.orden);
  const quetocan = ordenadas.filter((t) => {
    const proximo = proximoRepasoPorTarjeta.get(t.id);
    return proximo === undefined || proximo <= hoy;
  });
  return (quetocan.length > 0 ? quetocan : ordenadas).map((t) => t.id);
}

/** Posición con la que una tarjeta pasa al final de la cola. */
export function posicionAlFinal(posiciones: number[]): number {
  return posiciones.length === 0 ? 1 : Math.max(...posiciones) + 1;
}

/**
 * RN-25: la XP solo se otorga si es la primera sesión terminada de ese tema en el
 * día calendario MX (`sesionesTerminadasHoy` no cuenta la que se acaba de terminar).
 */
export function debeOtorgarXpDeRepaso(sesionesTerminadasHoy: number): boolean {
  return sesionesTerminadasHoy === 0;
}

export interface ResumenAutoevaluaciones {
  sabidas: number;
  dudadas: number;
  noSabidas: number;
}

/** Resumen de la sesión según cómo se evaluó cada tarjeta la primera vez que apareció. */
export function resumirAutoevaluaciones(primeras: (AutoevaluacionTarjeta | null)[]): ResumenAutoevaluaciones {
  return {
    sabidas: primeras.filter((a) => a === 'LO_SABIA').length,
    dudadas: primeras.filter((a) => a === 'DUDE').length,
    noSabidas: primeras.filter((a) => a === 'NO_LO_SABIA').length,
  };
}
