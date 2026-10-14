import type { EstadoFase, EstadoReto, Fase, Mecanica, TemaFase } from '../../types';

/**
 * Presentación de las fases. Los textos narrativos (descripción) viven en la
 * base de datos (Fase.descripcion); aquí solo quedan etiquetas e íconos,
 * indexados por tema, que son decoración de la interfaz.
 */
export const ETIQUETA_TEMA: Record<TemaFase, string> = {
  CICLO_VIDA: 'Ciclo de vida',
  ELICITACION: 'Elicitación',
  ATRIBUTOS_CALIDAD: 'Atributos de calidad',
};

const ICONO_TEMA: Record<TemaFase, string> = {
  CICLO_VIDA: 'event_note',
  ELICITACION: 'contactless',
  ATRIBUTOS_CALIDAD: 'verified',
};

export const ETIQUETA_ESTADO: Record<EstadoFase, string> = {
  completada: 'Completada',
  en_progreso: 'En progreso',
  desbloqueada: 'Disponible',
  bloqueada: 'Bloqueada',
};

export const ETIQUETA_ESTADO_RETO: Record<EstadoReto, string> = {
  BLOQUEADO: 'Bloqueado',
  DISPONIBLE: 'Disponible',
  EN_CURSO: 'En curso',
  APROBADO: 'Aprobado',
};

export const MECANICA: Record<Mecanica, { nombre: string; icono: string; caso: string }> = {
  DIALOGO_STAKEHOLDER: { nombre: 'Diálogo con stakeholder', icono: 'forum', caso: 'CU-01' },
  ARMADO_PIEZAS: { nombre: 'Armado de piezas', icono: 'extension', caso: 'CU-02' },
  TABLERO_MOSCOW: { nombre: 'Tablero MoSCoW', icono: 'view_kanban', caso: 'CU-03' },
  INSPECCION_SISTEMA: { nombre: 'Inspección de un sistema', icono: 'bug_report', caso: 'CU-04' },
  SIMULADOR_ESCENARIOS: { nombre: 'Simulador de escenarios', icono: 'science', caso: 'CU-05' },
  REPARTO_PRESUPUESTO: { nombre: 'Reparto de presupuesto', icono: 'tune', caso: 'CU-06' },
  EXPEDIENTE_PROYECTO: { nombre: 'Expediente de proyecto', icono: 'folder_open', caso: 'CU-07' },
  LINEA_TIEMPO: { nombre: 'Línea de tiempo', icono: 'timeline', caso: 'CU-08' },
};

export function iconoFase(fase: Pick<Fase, 'tema'>): string {
  return ICONO_TEMA[fase.tema];
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
