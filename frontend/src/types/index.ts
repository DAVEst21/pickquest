// Tipos del contrato con el backend (ver Swagger en <VITE_API_URL>/docs).

/** RN-03: mínimo aprobatorio global para todos los retos. */
export const UMBRAL_APROBACION = 80;

export type TemaFase = 'CICLO_VIDA' | 'ELICITACION' | 'ATRIBUTOS_CALIDAD';

export type EstadoFase = 'bloqueada' | 'desbloqueada' | 'en_progreso' | 'completada';

export type EstadoReto = 'BLOQUEADO' | 'DISPONIBLE' | 'EN_CURSO' | 'APROBADO';

export type Mecanica =
  | 'DIALOGO_STAKEHOLDER'
  | 'ARMADO_PIEZAS'
  | 'TABLERO_MOSCOW'
  | 'INSPECCION_SISTEMA'
  | 'SIMULADOR_ESCENARIOS'
  | 'REPARTO_PRESUPUESTO'
  | 'EXPEDIENTE_PROYECTO'
  | 'LINEA_TIEMPO';

export type TecnicaElicitacion = 'ENTREVISTA' | 'CUESTIONARIO' | 'OBSERVACION' | 'TALLER';
export type ColumnaMoscow = 'MUST' | 'SHOULD' | 'COULD' | 'WONT';
export type TipoRequerimiento = 'FUNCIONAL' | 'NO_FUNCIONAL';
export type AtributoCalidad =
  | 'ADECUACION_FUNCIONAL'
  | 'EFICIENCIA_DESEMPENO'
  | 'COMPATIBILIDAD'
  | 'USABILIDAD'
  | 'FIABILIDAD'
  | 'SEGURIDAD'
  | 'MANTENIBILIDAD'
  | 'PORTABILIDAD';
export type TipoBloque = 'FASE' | 'ACTIVIDAD';
export type TipoElementoPantalla = 'TITULO' | 'TEXTO' | 'CAMPO' | 'BOTON' | 'IMAGEN' | 'MENSAJE' | 'LISTA';

/** GET /fases: el estado viene calculado por el backend para el estudiante autenticado. */
export interface Fase {
  id: number;
  nombre: string;
  tema: TemaFase;
  dificultad: string;
  orden: number;
  /** Descripción narrativa; vive en la base de datos. */
  descripcion: string;
  estado: EstadoFase;
  /** El "reto actual" de la fase: el siguiente sin aprobar, o el último si ya se aprobaron todos. */
  retoId: number | null;
  intentosRealizados: number;
  mejorPorcentaje: number | null;
  mejorCalificacionEstrellas: number | null; // 0-3
  totalRetos: number;
  retosAprobados: number;
  /** % de la fase completado (0-100). */
  progreso: number | null;
  /** Promedio de la mejor marca de cada reto, redondeado. Solo si la fase está completada. */
  calificacionEstrellasFase: number | null;
  /** Suma del QP realmente otorgado por cada reto. Solo si la fase está completada. */
  recompensaQpFase: number | null;
}

export interface ContenidoApoyo {
  id: number;
  contenidoTeorico: string;
  ejemplos: string;
  glosario: string;
}

/** Un reto en el tablón de su fase. */
export interface RetoTablon {
  id: number;
  orden: number;
  titulo: string;
  objetivo: string;
  mecanica: Mecanica;
  recompensaXp: number;
  /** Ya con el multiplicador de racha vigente: coincide con lo que se otorga (RN-02). */
  recompensaQp: number;
  estado: EstadoReto;
  mejorPorcentaje: number | null;
  mejorCalificacionEstrellas: number | null;
}

/** GET /fases/:faseId */
export interface FaseTablon {
  fase: Fase;
  retos: RetoTablon[];
  contenidosApoyo: ContenidoApoyo[];
}

// ---------------------------------------------------------------------
// Intentos
// ---------------------------------------------------------------------

export interface RetoIntento {
  id: number;
  orden: number;
  titulo: string;
  objetivo: string;
  contexto: string;
  mecanica: Mecanica;
  recompensaXp: number;
  recompensaQp: number;
}

export interface FaseIntento {
  id: number;
  nombre: string;
  orden: number;
  totalRetos: number;
}

/** POST /retos/:id/intentos y GET /intentos/:id mientras está EN_CURSO. */
export interface IntentoEnCurso<C = unknown, B = unknown> {
  estado: 'EN_CURSO';
  intentoId: number;
  reto: RetoIntento;
  fase: FaseIntento;
  contenido: C;
  borrador: B;
  ayudaUsada: boolean;
  /** Pista de la ayuda ya usada en este intento (el servidor la guarda); null si no usó ayuda. */
  pista: Pista | null;
  contenidosApoyo: ContenidoApoyo[];
  creadoEn: string;
  actualizadoEn: string;
}

export interface ResultadoIntento {
  id: number;
  retoId: number;
  faseId: number;
  porcentaje: number;
  calificacionEstrellas: number; // 0-3
  aprobado: boolean;
  xpGanado: number;
  qpGanado: number;
  usoAyuda: boolean;
  creadoEn: string;
  calificadoEn: string;
}

/** POST /intentos/:id/enviar y GET /intentos/:id calificado. */
export interface IntentoCalificado {
  estado: 'CALIFICADO';
  intentoId: number;
  reto: RetoIntento;
  fase: FaseIntento;
  resultado: ResultadoIntento;
  retroalimentacion: Retroalimentacion;
  contenidosApoyo: ContenidoApoyo[];
}

export type Intento = IntentoEnCurso | IntentoCalificado;

export interface BorradorGuardado {
  actualizadoEn: string;
}

export interface ObjetoEquipado {
  objetoId: number;
  nombre: string;
  tipo: string;
  efecto: string;
  rareza: string;
  cantidad: number;
}

export interface Libreta {
  codigo: string;
  descripcion: string;
}

// ---------------------------------------------------------------------
// Contenido público, borrador y pista de cada mecánica
// ---------------------------------------------------------------------

// CU-08 Línea de tiempo
export interface BloqueContenido {
  id: number;
  tipo: TipoBloque;
  nombre: string;
  duracionSemanas: number;
}
export interface ContenidoLineaTiempo {
  modelo: string;
  duracionMaximaSemanas: number;
  bloques: BloqueContenido[];
  entregables: { id: number; nombre: string }[];
}
export interface BorradorLineaTiempo {
  posiciones: { bloqueId: number; inicioSemana: number }[];
  asociaciones: { entregableId: number; faseBloqueId: number }[];
}
export interface PistaDependencia {
  tipo: 'DEPENDENCIA';
  bloqueId: number | null;
  requiereId: number | null;
}

// CU-03 Tablero MoSCoW
export interface TarjetaContenido {
  id: number;
  orden: number;
  texto: string;
  puntos: number;
}
export interface ContenidoMoscow {
  capacidad: number;
  tarjetas: TarjetaContenido[];
}
export interface BorradorMoscow {
  tarjetas: {
    tarjetaId: number;
    columna: ColumnaMoscow | null;
    tipo: TipoRequerimiento | null;
    ordenMust: number | null;
  }[];
}
export interface PistaColumna {
  tipo: 'COLUMNA_TARJETA';
  tarjetaId: number | null;
  columna: ColumnaMoscow | null;
}

// CU-04 Inspección
export interface ElementoContenido {
  id: number;
  orden: number;
  tipo: TipoElementoPantalla;
  etiqueta: string;
  contenido: string | null;
  variante: string | null;
}
export interface PantallaContenido {
  id: number;
  orden: number;
  titulo: string;
  elementos: ElementoContenido[];
}
export interface ContenidoInspeccion {
  nombreAplicacion: string;
  maxMarcas: number;
  atributos: AtributoCalidad[];
  pantallas: PantallaContenido[];
}
export interface BorradorInspeccion {
  marcas: { elementoId: number; atributo: AtributoCalidad | null }[];
}
export interface PistaPantalla {
  tipo: 'PANTALLA';
  pantallaId: number | null;
}

// CU-06 Reparto de presupuesto
export interface AtributoEscenarioContenido {
  id: number;
  atributo: AtributoCalidad;
  valorBase: number;
  ganancia: number;
  minimoObligatorio: number | null;
}
export interface ContenidoPresupuesto {
  presupuesto: number;
  atributos: AtributoEscenarioContenido[];
  efectos: { origenId: number; destinoId: number; factor: number }[];
  justificaciones: { id: number; texto: string }[];
}
export interface BorradorPresupuesto {
  asignaciones: { atributoEscenarioId: number; puntos: number }[];
  justificacionId: number | null;
}
export interface PistaRestriccion {
  tipo: 'RESTRICCION';
  atributoEscenarioId: number | null;
  minimo: number | null;
}

// CU-01 Diálogo con stakeholder
export interface ContenidoDialogo {
  stakeholder: { nombre: string; rol: string; retrato: string };
  turnosMaximos: number;
  totalRequerimientos: number;
  tecnicas: TecnicaElicitacion[];
}
export interface TurnoDialogo {
  numero: number;
  pregunta: string;
  respuesta: string;
  requerimiento: Libreta | null;
}
/** Estado del diálogo que conduce el servidor (borrador de CU-01). */
export interface EstadoDialogo {
  tecnicaElegida: TecnicaElicitacion | null;
  turnosMaximos: number;
  turnosRestantes: number;
  turnos: TurnoDialogo[];
  libreta: Libreta[];
  nodoActual: { intervencion: string; opciones: { id: number; pregunta: string }[] } | null;
}
export interface PistaOpcionDialogo {
  tipo: 'OPCION_DIALOGO';
  opcionId: number | null;
}

export type Pista = PistaDependencia | PistaColumna | PistaPantalla | PistaRestriccion | PistaOpcionDialogo;

/** POST /intentos/:id/ayuda */
export interface AyudaAplicada {
  intentoId: number;
  objetoId: number;
  pista: Pista;
}

// ---------------------------------------------------------------------
// Retroalimentación de cada mecánica
// ---------------------------------------------------------------------

/**
 * Los campos marcados «solo aprobado» (la respuesta de referencia) únicamente
 * llegan cuando el intento quedó aprobado (`referenciaCompleta`): un intento
 * no aprobado recibe solo lo que está mal.
 */
export interface RetroLineaTiempo {
  mecanica: 'LINEA_TIEMPO';
  referenciaCompleta: boolean;
  finCalculado: number;
  duracionMaximaSemanas: number;
  dentroDelPlazo: boolean;
  dependenciasIncumplidas: { bloque: string; requiere: string }[];
  entregablesMalAsociados: { entregable: string; faseElegida: string | null; faseCorrecta?: string }[];
  /** solo aprobado */
  planReferencia?: {
    bloqueId: number;
    nombre: string;
    tipo: TipoBloque;
    inicio: number;
    duracionSemanas: number;
    inicioElegido: number | null;
  }[];
  /** solo aprobado */
  finReferencia?: number;
}

export interface RetroMoscow {
  mecanica: 'TABLERO_MOSCOW';
  referenciaCompleta: boolean;
  capacidad: number;
  tarjetas: {
    tarjetaId: number;
    texto: string;
    puntos: number;
    columnaElegida: ColumnaMoscow | null;
    tipoElegido: TipoRequerimiento | null;
    /** solo aprobado */
    columnaCorrecta?: ColumnaMoscow;
    /** solo aprobado */
    tipoCorrecto?: TipoRequerimiento;
    columnaAcertada: boolean;
    tipoAcertado: boolean;
  }[];
  /** solo aprobado */
  ordenMustReferencia?: { tarjetaId: number; texto: string; orden: number }[];
  ordenMustConcordantes: number;
  ordenMustPares: number;
}

export interface RetroInspeccion {
  mecanica: 'INSPECCION_SISTEMA';
  referenciaCompleta: boolean;
  encontradas: {
    elementoId: number;
    etiqueta: string;
    pantalla: string;
    /** solo aprobado */
    atributoCorrecto?: AtributoCalidad;
    atributoElegido: AtributoCalidad | null;
    atributoAcertado: boolean;
    /** solo aprobado */
    explicacion?: string;
  }[];
  /** Cuántas fallas faltaron (sin decir cuáles); solo en intentos no aprobados. */
  fallasNoEncontradas?: number;
  /** solo aprobado */
  noEncontradas?: {
    elementoId: number;
    etiqueta: string;
    pantallaId: number;
    pantalla: string;
    atributoCorrecto: AtributoCalidad;
    explicacion: string;
  }[];
  marcasSinFalla: { elementoId: number; etiqueta: string; pantalla: string }[];
}

export interface RetroPresupuesto {
  mecanica: 'REPARTO_PRESUPUESTO';
  referenciaCompleta: boolean;
  presupuesto: number;
  atributos: {
    atributoEscenarioId: number;
    atributo: AtributoCalidad;
    asignado: number;
    /** solo aprobado */
    referencia?: number;
    medidor: number;
    /** solo aprobado */
    medidorReferencia?: number;
    minimo: number | null;
    cumple: boolean | null;
  }[];
  restriccionesCumplidas: number;
  restriccionesTotales: number;
  justificacionElegida: { id: number; texto: string } | null;
  /** solo aprobado */
  justificacionCorrecta?: { id: number; texto: string } | null;
  justificacionAcertada: boolean;
}

export interface RetroDialogo {
  mecanica: 'DIALOGO_STAKEHOLDER';
  referenciaCompleta: boolean;
  tecnicaElegida: TecnicaElicitacion | null;
  /** solo aprobado */
  tecnicaCorrecta?: TecnicaElicitacion;
  /** solo en intentos no aprobados */
  tecnicaAcertada?: boolean;
  descubiertos: Libreta[];
  /** solo aprobado */
  noDescubiertos?: Libreta[];
  /** solo en intentos no aprobados */
  noDescubiertosCantidad?: number;
  preguntasImproductivas: number;
  turnosUsados: number;
  turnosMaximos: number;
}

export type Retroalimentacion =
  | RetroLineaTiempo
  | RetroMoscow
  | RetroInspeccion
  | RetroPresupuesto
  | RetroDialogo;

// ---------------------------------------------------------------------
// Perfil y sesión
// ---------------------------------------------------------------------

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
