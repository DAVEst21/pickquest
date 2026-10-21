import {
  AtributoCalidad,
  ColumnaMoscow,
  ModeloCicloVida,
  TecnicaElicitacion,
  TipoBloque,
  TipoElementoPantalla,
  TipoRequerimiento,
} from '@prisma/client';

/** Datos comunes de un reto; el contenido propio de la mecánica va aparte. */
export interface RetoBase {
  titulo: string;
  objetivo: string;
  contexto: string;
  recompensaXp: number;
  recompensaQp: number;
}

// ---------- CU-01 ----------
export interface OpcionDialogoSeed {
  pregunta: string;
  respuesta: string;
  productiva: boolean;
  /** `codigo` del requerimiento que revela. */
  revela?: string;
  /** `clave` del nodo al que lleva; sin valor = se regresa al nodo inicial. */
  siguiente?: string;
}
export interface NodoDialogoSeed {
  clave: string;
  inicial?: boolean;
  intervencion: string;
  opciones: OpcionDialogoSeed[];
}
export interface DialogoSeed extends RetoBase {
  stakeholder: {
    nombre: string;
    rol: string;
    retrato: string;
    tecnicaCorrecta: TecnicaElicitacion;
    turnosMaximos: number;
  };
  requerimientos: { codigo: string; descripcion: string }[];
  nodos: NodoDialogoSeed[];
}

// ---------- CU-03 ----------
export interface TarjetaSeed {
  texto: string;
  puntos: number;
  columnaCorrecta: ColumnaMoscow;
  tipoCorrecto: TipoRequerimiento;
  ordenMustReferencia?: number;
}
export interface MoscowSeed extends RetoBase {
  capacidad: number;
  tarjetas: TarjetaSeed[];
}

// ---------- CU-04 ----------
export interface ElementoSeed {
  tipo: TipoElementoPantalla;
  etiqueta: string;
  contenido?: string;
  variante?: string;
  falla?: { atributo: AtributoCalidad; explicacion: string };
}
export interface InspeccionSeed extends RetoBase {
  nombreAplicacion: string;
  maxMarcas: number;
  pantallas: { titulo: string; elementos: ElementoSeed[] }[];
}

// ---------- CU-06 ----------
export interface AtributoEscenarioSeed {
  atributo: AtributoCalidad;
  valorBase: number;
  ganancia: number;
  minimoObligatorio?: number;
  asignacionReferencia: number;
}
export interface PresupuestoSeed extends RetoBase {
  presupuesto: number;
  atributos: AtributoEscenarioSeed[];
  efectos: { origen: AtributoCalidad; destino: AtributoCalidad; factor: number }[];
  justificaciones: { texto: string; correcta: boolean }[];
}

// ---------- CU-08 ----------
export interface BloqueSeed {
  clave: string;
  tipo: TipoBloque;
  nombre: string;
  duracionSemanas: number;
  inicioReferencia: number;
}
export interface LineaTiempoSeed extends RetoBase {
  modelo: ModeloCicloVida;
  duracionMaximaSemanas: number;
  bloques: BloqueSeed[];
  /** `bloque` no puede empezar antes de que termine `requiere` (claves de bloque). */
  dependencias: { bloque: string; requiere: string }[];
  entregables: { nombre: string; fase: string }[];
}
