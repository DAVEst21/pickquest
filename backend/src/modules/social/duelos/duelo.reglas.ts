/**
 * CU-13 Duelos (RF-16). Reglas puras.
 *
 * RN-14: la ronda tiene 5 preguntas del tema con 20 s por pregunta; ambos resuelven la misma ronda.
 * Gana quien obtiene el mayor porcentaje y, en empate, quien usó menos tiempo. El ganador recibe
 * 50 XP, el perdedor 20 XP y, con empate exacto, cada uno 30 XP. Los duelos no otorgan QP.
 * RN-15: solo se puede retar sobre un tema desbloqueado para ambos; un duelo expira a las 48 horas
 * y cada estudiante puede tener como máximo 3 duelos pendientes.
 */
export const PREGUNTAS_POR_DUELO = 5;
export const XP_GANADOR = 50;
export const XP_PERDEDOR = 20;
export const XP_EMPATE = 30;
export const HORAS_PARA_RESPONDER = 48;
export const MAX_DUELOS_PENDIENTES = 3;

export interface ResultadoParticipante {
  /** 0-100. */
  porcentaje: number;
  /** Suma de los segundos usados por pregunta. */
  segundosTotales: number;
}

export type Veredicto = { empate: true; ganador: null } | { empate: false; ganador: 'A' | 'B' };

/** Gana el mayor porcentaje; con el mismo porcentaje, el menor tiempo total; si todo es igual, empate. */
export function decidirGanador(a: ResultadoParticipante, b: ResultadoParticipante): Veredicto {
  if (a.porcentaje !== b.porcentaje) return { empate: false, ganador: a.porcentaje > b.porcentaje ? 'A' : 'B' };
  // Los tiempos se comparan con dos decimales, igual que se guardan.
  const ta = Math.round(a.segundosTotales * 100);
  const tb = Math.round(b.segundosTotales * 100);
  if (ta !== tb) return { empate: false, ganador: ta < tb ? 'A' : 'B' };
  return { empate: true, ganador: null };
}

/** XP de cada participante según el veredicto (RN-14); nunca hay QP. */
export function xpDelDuelo(veredicto: Veredicto): { a: number; b: number } {
  if (veredicto.empate) return { a: XP_EMPATE, b: XP_EMPATE };
  return veredicto.ganador === 'A' ? { a: XP_GANADOR, b: XP_PERDEDOR } : { a: XP_PERDEDOR, b: XP_GANADOR };
}

/** Momento en que expira un duelo creado en `creadoEn` (48 horas). */
export function calcularExpiracion(creadoEn: Date): Date {
  return new Date(creadoEn.getTime() + HORAS_PARA_RESPONDER * 3600 * 1000);
}

export function haExpirado(expiraEn: Date, ahora: Date): boolean {
  return ahora.getTime() > expiraEn.getTime();
}

/** FE2: ¿alguno de los dos ya tiene el máximo de duelos pendientes? Devuelve quién, o null si se puede crear. */
export function limiteDePendientes(pendientesRetador: number, pendientesRetado: number): 'RETADOR' | 'RETADO' | null {
  if (pendientesRetador >= MAX_DUELOS_PENDIENTES) return 'RETADOR';
  if (pendientesRetado >= MAX_DUELOS_PENDIENTES) return 'RETADO';
  return null;
}

/** Porcentaje de una ronda: aciertos entre las preguntas. */
export function porcentajeDeRonda(aciertos: number, preguntas = PREGUNTAS_POR_DUELO): number {
  return Math.round((aciertos / preguntas) * 100);
}

/** Temas desbloqueados para ambos estudiantes (RN-15). */
export function temasEnComun<T>(propios: T[], delRival: T[]): T[] {
  const rival = new Set(delRival);
  return propios.filter((t) => rival.has(t));
}
