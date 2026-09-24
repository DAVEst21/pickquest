// Tipos del contrato con el backend (ver Swagger en <VITE_API_URL>/docs).

export type TemaFase = 'ELICITACION' | 'ATRIBUTOS_CALIDAD' | 'CODIGO_PRUEBAS';

export type EstadoFase = 'bloqueada' | 'desbloqueada' | 'en_progreso' | 'completada';

/** GET /fases: el estado viene calculado por el backend para el estudiante autenticado. */
export interface Fase {
  id: number;
  nombre: string;
  tema: TemaFase;
  dificultad: string;
  orden: number;
  estado: EstadoFase;
  /** El "reto actual" de la fase (Fase 4): el siguiente sin aprobar, o el último si ya se aprobaron todos. */
  retoId: number | null;
  intentosRealizados: number;
  mejorPorcentaje: number | null;
  mejorCalificacionEstrellas: number | null; // 0-3

  /** Cantidad de retos que tiene la fase (0 si todavía no se le cargó ninguno). */
  totalRetos: number;
  /** Cuántos de esos retos ya tiene al menos un intento aprobado. */
  retosAprobados: number;
  /** % de la fase completado (0-100). null si la fase no tiene retos todavía. */
  progreso: number | null;
  /** Promedio de la mejor marca de cada reto, redondeado. Solo si la fase está completada. */
  calificacionEstrellasFase: number | null;
  /** Suma del QP realmente otorgado por cada reto. Solo si la fase está completada. */
  recompensaQpFase: number | null;
}

export interface Reto {
  id: number;
  faseId: number;
  /** Posición de este reto dentro del recorrido secuencial de su fase (1, 2, 3...). */
  orden: number;
  criteriosAceptacion: string;
  calificacionMinima: number; // fracción 0-1 (0.8 = 80%)
  recompensaXp: number;
  recompensaQp: number;
  /** Identificadores de las preguntas que evalúa el backend. */
  preguntas: string[];
}

export interface ContenidoApoyo {
  id: number;
  contenidoTeorico: string;
  ejemplos: string;
  glosario: string;
}

/** GET /fases/:faseId */
export interface FaseDetalle {
  fase: Fase;
  reto: Reto | null;
  contenidosApoyo: ContenidoApoyo[];
}

export interface RespuestaPregunta {
  preguntaId: string;
  respuesta: string;
}

/** POST /retos/:retoId/intentos y GET /intentos/:intentoId */
export interface IntentoReto {
  id: number;
  retoId: number;
  faseId: number;
  porcentaje: number; // 0-100
  calificacionEstrellas: number; // 0-3
  aprobado: boolean;
  xpGanado: number;
  qpGanado: number;
  usoAyuda: boolean;
  createdAt: string;
}

/** POST /retos/:retoId/ayuda */
export interface AyudaRegistrada {
  retoId: number;
  ayudasPendientes: number;
}

export interface Racha {
  diasActuales: number;
  diasRecord: number;
  multiplicadorQP: number;
}

/** GET /auth/perfil */
export interface PerfilEstudiante {
  id: number;
  email: string;
  nombreAventurero: string;
  avatar: string | null;
  nivel: number;
  xpTotal: number;
  xpSiguienteNivel: number;
  qpTotal: number;
  racha: Racha | null;
}

/** POST /auth/login y POST /auth/registro */
export interface Sesion {
  accessToken: string;
  estudiante: PerfilEstudiante;
}

export interface Credenciales {
  email: string;
  password: string;
}

export interface DatosRegistro extends Credenciales {
  nombreAventurero: string;
}
