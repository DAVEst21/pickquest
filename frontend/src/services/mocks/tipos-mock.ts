// Tipos de la versión simulada (antes de conectar el backend). Solo los usa
// mocks/data.ts, que se conserva como referencia y no participa en ningún
// flujo real. Incluyen campos todavía pendientes de confirmar con el equipo
// (rúbrica de objetivos/hitos, itemGarantizado, rangoMaestria, titulo).

export type TemaFase = 'ELICITACION' | 'ATRIBUTOS_CALIDAD' | 'CODIGO_PRUEBAS';

export type EstadoFase = 'bloqueada' | 'desbloqueada' | 'en_progreso' | 'completada';

export interface Fase {
  id: number;
  nombre: string;
  tema: TemaFase;
  dificultad: string;
  orden: number;
  estado: EstadoFase;
  descripcionNarrativa?: string;
  subtitulo?: string;
  sprint?: string;
  progreso?: number;
  calificacionEstrellas?: number;
  recompensaQp?: number;
  recompensaXp?: number;
  bloqueoRazon?: string;
  icono?: string;
  esBoss?: boolean;
}

export interface ObjetivoMision {
  id: string;
  texto: string;
  descripcion: string;
  tag: string;
  requerido?: boolean;
  umbral?: number;
}

export interface ItemGarantizado {
  nombre: string;
  tipo: string;
  descripcion: string;
}

export interface RecompensasFase {
  xp: number;
  qp: number;
  itemGarantizado?: ItemGarantizado;
  rangoMaestria?: string;
}

export interface Reto {
  id: number;
  faseId: number;
  criteriosAceptacion: string;
  calificacionMinima: number;
  titulo?: string;
  subtitulo?: string;
  escenario?: string;
  tiempoSugerido?: string;
  objetivos?: ObjetivoMision[];
  recompensas?: RecompensasFase;
}

export interface HitoDesglose {
  id: string;
  nombre: string;
  descripcion: string;
  puntos: number;
  superado: boolean;
}

export interface IntentoReto {
  id: number;
  retoId: number;
  faseId: number;
  calificacionEstrellas: number;
  porcentaje: number;
  xpGanado: number;
  qpGanado: number;
  aprobado: boolean;
  usoAyuda: boolean;
  desgloseHitos?: HitoDesglose[];
}

export interface Estudiante {
  nivel: number;
  xpTotal: number;
  xpSiguienteNivel: number;
  qpTotal: number;
  racha: {
    diasActuales: number;
  };
  titulo?: string;
  avatarUrl?: string;
}
