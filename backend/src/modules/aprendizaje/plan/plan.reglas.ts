import { TemaFase } from '@prisma/client';

/**
 * CU-10 Diagnóstico y plan de estudio (RF-13). Reglas puras.
 *
 * RN-26: el dominio de un tema lo calcula `calcularDominio` (progreso/dominio.ts).
 * RN-27: un tema es débil si su dominio es menor a 80 %; el plan prioriza los de menor dominio.
 */
export const UMBRAL_TEMA_DEBIL = 80;
export const PREGUNTAS_POR_TEMA = 3;

export const TEMAS_DIAGNOSTICO: TemaFase[] = ['CICLO_VIDA', 'ELICITACION', 'ATRIBUTOS_CALIDAD'];

export interface RetoParaPlan {
  id: number;
  orden: number;
  titulo: string;
  /** Se puede iniciar ahora (su fase está desbloqueada y los retos anteriores de la fase están aprobados). */
  desbloqueado: boolean;
  aprobado: boolean;
  /** Mejor calificación (0-100) en un intento calificado; null si nunca lo ha calificado. */
  mejorPorcentaje: number | null;
  mejorEstrellas: number | null;
}

export interface TemaParaPlan {
  tema: TemaFase;
  nombre: string;
  faseOrden: number;
  faseDesbloqueada: boolean;
  dominio: number;
  retos: RetoParaPlan[];
}

export interface ActividadGenerada {
  tipo: 'RETO' | 'REPASO' | 'DUELO';
  tema: TemaFase;
  retoId: number | null;
  motivo: string;
}

export interface PlanGenerado {
  esPlanMejora: boolean;
  actividades: ActividadGenerada[];
}

export function esTemaDebil(dominio: number): boolean {
  return dominio < UMBRAL_TEMA_DEBIL;
}

/**
 * Plan de estudio (RN-27). Por cada tema débil, de menor a mayor dominio:
 *  1. un repaso del tema, si su fase está desbloqueada;
 *  2. un reto por cada reto desbloqueado de esa fase que no esté aprobado o cuya mejor calificación sea < 80.
 * Sin temas débiles (FE2) —o si los débiles no tienen nada que hacer todavía—, un plan de mejora:
 * un reto por cada reto aprobado con menos de 3 estrellas y un duelo por cada tema desbloqueado.
 */
export function generarPlan(temas: TemaParaPlan[]): PlanGenerado {
  const debiles = temas
    .filter((t) => esTemaDebil(t.dominio))
    .sort((a, b) => a.dominio - b.dominio || a.faseOrden - b.faseOrden);

  const actividades: ActividadGenerada[] = [];
  for (const t of debiles) {
    if (t.faseDesbloqueada) {
      actividades.push({
        tipo: 'REPASO',
        tema: t.tema,
        retoId: null,
        motivo: `Tu dominio de ${t.nombre} es ${t.dominio} %: repasa el material y las tarjetas del tema`,
      });
    }
    for (const reto of [...t.retos].sort((a, b) => a.orden - b.orden)) {
      if (!reto.desbloqueado) continue;
      if (reto.aprobado && (reto.mejorPorcentaje ?? 0) >= UMBRAL_TEMA_DEBIL) continue;
      actividades.push({
        tipo: 'RETO',
        tema: t.tema,
        retoId: reto.id,
        motivo: reto.mejorPorcentaje === null
          ? `Tu dominio de ${t.nombre} es ${t.dominio} %: todavía no completas «${reto.titulo}»`
          : `Tu mejor calificación en «${reto.titulo}» es ${reto.mejorPorcentaje} %: mejórala para subir tu dominio de ${t.nombre}`,
      });
    }
  }
  if (actividades.length > 0) return { esPlanMejora: false, actividades };

  return { esPlanMejora: true, actividades: actividadesDeMejora(temas) };
}

/** FE2: retos aprobados con menos de 3 estrellas y un duelo sugerido por tema desbloqueado. */
export function actividadesDeMejora(temas: TemaParaPlan[]): ActividadGenerada[] {
  const ordenados = [...temas].sort((a, b) => a.faseOrden - b.faseOrden);
  const actividades: ActividadGenerada[] = [];
  for (const t of ordenados) {
    for (const reto of [...t.retos].sort((a, b) => a.orden - b.orden)) {
      if (reto.aprobado && (reto.mejorEstrellas ?? 0) < 3) {
        actividades.push({
          tipo: 'RETO',
          tema: t.tema,
          retoId: reto.id,
          motivo: `Obtuviste ${reto.mejorEstrellas ?? 0} de 3 estrellas en «${reto.titulo}»: repítelo para conseguir las 3`,
        });
      }
    }
  }
  for (const t of ordenados) {
    if (t.faseDesbloqueada) {
      actividades.push({
        tipo: 'DUELO',
        tema: t.tema,
        retoId: null,
        motivo: `Tu dominio de ${t.nombre} es ${t.dominio} %: ponlo a prueba retando a otro estudiante`,
      });
    }
  }
  return actividades;
}

/** Porcentaje del tema: aciertos entre las preguntas del tema, redondeado (aciertos ÷ 3 × 100). */
export function porcentajeDeTema(aciertos: number, preguntas: number): number {
  return preguntas === 0 ? 0 : Math.round((aciertos / preguntas) * 100);
}

/** Preguntas del diagnóstico que el estudiante no ha respondido (FE1). */
export function preguntasPendientes(preguntaIds: number[], respondidas: number[]): number[] {
  const hechas = new Set(respondidas);
  return preguntaIds.filter((id) => !hechas.has(id));
}

/** Escoge `cantidad` elementos al azar sin repetir; `aleatorio` es inyectable para pruebas. */
export function elegirAlAzar<T>(elementos: T[], cantidad: number, aleatorio: () => number = Math.random): T[] {
  const copia = [...elementos];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(aleatorio() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia.slice(0, cantidad);
}

/**
 * FA1: las actividades aceptadas deben ser del plan propuesto, sin repetirse; se pueden quitar y
 * reordenar. Devuelve el motivo del rechazo, o null si la lista es válida.
 */
export function validarAjuste(idsDelPlan: number[], idsElegidos: number[]): string | null {
  if (idsElegidos.length === 0) return 'Conserva al menos una actividad en tu plan';
  if (new Set(idsElegidos).size !== idsElegidos.length) return 'Una actividad no puede repetirse en el plan';
  const validos = new Set(idsDelPlan);
  if (idsElegidos.some((id) => !validos.has(id))) return 'Solo puedes elegir actividades de este plan';
  return null;
}
