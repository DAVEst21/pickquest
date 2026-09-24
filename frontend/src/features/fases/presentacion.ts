import type { EstadoFase, Fase, TemaFase } from '../../types';

/**
 * Textos e iconos de presentación de cada fase. El backend todavía no guarda
 * subtítulo, descripción narrativa ni icono de una Fase, así que viven aquí
 * (copiados de la versión simulada), indexados por Fase.orden y con respaldo
 * por tema. Es solo presentación: estado, reto y recompensas vienen del backend.
 */
export interface PresentacionFase {
  icono: string;
  subtitulo: string;
  descripcion: string;
}

const POR_ORDEN: Record<number, PresentacionFase> = {
  1: {
    icono: 'event_note',
    subtitulo: 'Sprint 0 · Alcance y Épicas',
    descripcion: 'Definición de épicas, estimación y planificación inicial del backlog.',
  },
  2: {
    icono: 'contactless',
    subtitulo: 'User Stories & Criterios',
    descripcion: 'Elicitación de requerimientos funcionales y criterios de aceptación Gherkin.',
  },
  3: {
    icono: 'account_tree',
    subtitulo: 'Tácticas de Disponibilidad & C4',
    descripcion:
      'La fortaleza digital del Reino experimenta latencia crítica y vulnerabilidades en sus accesos perimetrales. Evalúa los compromisos del sistema, equilibra los requisitos no funcionales y redacta el plano arquitectónico definitivo antes del despliegue masivo.',
  },
  4: {
    icono: 'architecture',
    subtitulo: 'Diagramas de Clase & Esquemas',
    descripcion: 'Modelado orientado a objetos, esquemas relacionales y patrones GoF.',
  },
  5: {
    icono: 'code',
    subtitulo: 'Clean Code & Repositorio',
    descripcion: 'Codificación estructurada siguiendo principios SOLID y Clean Architecture.',
  },
  6: {
    icono: 'rule',
    subtitulo: 'Unit, E2E & Mutaciones',
    descripcion: 'Estrategias de testing piramidal, pruebas de mutación y análisis estático.',
  },
  7: {
    icono: 'rocket_launch',
    subtitulo: 'Pipeline CI/CD a Producción',
    descripcion: 'Orquestación de contenedores, despliegue Blue/Green y monitoreo con Prometheus.',
  },
};

export const ETIQUETA_TEMA: Record<TemaFase, string> = {
  ELICITACION: 'Elicitación',
  ATRIBUTOS_CALIDAD: 'Atributos de Calidad',
  CODIGO_PRUEBAS: 'Código y Pruebas',
};

const ICONO_TEMA: Record<TemaFase, string> = {
  ELICITACION: 'contactless',
  ATRIBUTOS_CALIDAD: 'account_tree',
  CODIGO_PRUEBAS: 'code',
};

export const ETIQUETA_ESTADO: Record<EstadoFase, string> = {
  completada: 'Completada',
  en_progreso: 'En progreso',
  desbloqueada: 'Disponible',
  bloqueada: 'Bloqueada',
};

export function presentacionFase(fase: Pick<Fase, 'orden' | 'tema'>): PresentacionFase {
  return (
    POR_ORDEN[fase.orden] ?? {
      icono: ICONO_TEMA[fase.tema],
      subtitulo: ETIQUETA_TEMA[fase.tema],
      descripcion: '',
    }
  );
}

/** "Fase 03" */
export function etiquetaFase(orden: number): string {
  return `Fase ${String(orden).padStart(2, '0')}`;
}

/**
 * Fase donde está el estudiante: la primera en progreso o, si no hay, la
 * primera disponible. null si todas están completadas o bloqueadas.
 */
export function buscarFaseActiva(fases: Fase[] | undefined): Fase | null {
  if (!fases) return null;
  return fases.find((f) => f.estado === 'en_progreso') ?? fases.find((f) => f.estado === 'desbloqueada') ?? null;
}

/** Umbral de aprobación en porcentaje entero (soporta escala 0-100 como 80 o fracción 0-1 como 0.8). */
export function umbralPorcentaje(calificacionMinima: number): number {
  if (calificacionMinima > 1) {
    return Math.round(calificacionMinima);
  }
  return Math.round(calificacionMinima * 100);
}
