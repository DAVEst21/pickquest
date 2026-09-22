import type { Estudiante, Fase, IntentoReto, Reto } from '../../types';

export const FASES_MOCK: Fase[] = [
  {
    id: 1,
    nombre: 'Planificación',
    subtitulo: 'Sprint 0 · Alcance y Épicas',
    tema: 'ELICITACION',
    dificultad: 'Básica',
    orden: 1,
    estado: 'completada',
    progreso: 100,
    calificacionEstrellas: 3,
    icono: 'event_note',
    descripcionNarrativa: 'Definición de épicas, estimación y planificación inicial del backlog.',
  },
  {
    id: 2,
    nombre: 'Elicitación Req.',
    subtitulo: 'User Stories & Criterios',
    tema: 'ELICITACION',
    dificultad: 'Básica',
    orden: 2,
    estado: 'completada',
    progreso: 100,
    calificacionEstrellas: 3,
    recompensaQp: 250,
    icono: 'contactless',
    descripcionNarrativa: 'Elicitación de requerimientos funcionales y criterios de aceptación Gherkin.',
  },
  {
    id: 3,
    nombre: 'Calidad & Arquitectura',
    subtitulo: 'Tácticas de Disponibilidad & C4',
    sprint: 'Sprint 1 · En Ejecución',
    tema: 'ATRIBUTOS_CALIDAD',
    dificultad: 'Intermedia',
    orden: 3,
    estado: 'en_progreso',
    progreso: 65,
    recompensaQp: 400,
    recompensaXp: 650,
    icono: 'account_tree',
    descripcionNarrativa:
      'La fortaleza digital del Reino experimenta latencia crítica y vulnerabilidades en sus accesos perimetrales. Evalúa los compromisos del sistema, equilibra los requisitos no funcionales y redacta el plano arquitectónico definitivo antes del despliegue masivo.',
  },
  {
    id: 4,
    nombre: 'Diseño Detallado',
    subtitulo: 'Diagramas de Clase & Esquemas',
    tema: 'ATRIBUTOS_CALIDAD',
    dificultad: 'Intermedia',
    orden: 4,
    estado: 'desbloqueada',
    progreso: 0,
    icono: 'architecture',
    descripcionNarrativa: 'Modelado orientado a objetos, esquemas relacionales y patrones GoF.',
  },
  {
    id: 5,
    nombre: 'Implementación',
    subtitulo: 'Clean Code & Repositorio',
    tema: 'CODIGO_PRUEBAS',
    dificultad: 'Avanzada',
    orden: 5,
    estado: 'bloqueada',
    bloqueoRazon: 'RN-01: Requiere fase anterior',
    icono: 'code',
    descripcionNarrativa: 'Codificación estructurada siguiendo principios SOLID y Clean Architecture.',
  },
  {
    id: 6,
    nombre: 'Pruebas & Val.',
    subtitulo: 'Unit, E2E & Mutaciones',
    tema: 'CODIGO_PRUEBAS',
    dificultad: 'Avanzada',
    orden: 6,
    estado: 'bloqueada',
    bloqueoRazon: 'RN-01: Requiere fase anterior',
    icono: 'rule',
    descripcionNarrativa: 'Estrategias de testing piramidal, pruebas de mutación y análisis estático.',
  },
  {
    id: 7,
    nombre: 'Despliegue',
    subtitulo: 'Pipeline CI/CD a Producción',
    tema: 'CODIGO_PRUEBAS',
    dificultad: 'Boss Raid',
    orden: 7,
    estado: 'bloqueada',
    esBoss: true,
    bloqueoRazon: 'RN-01: Requiere fase anterior',
    icono: 'rocket_launch',
    descripcionNarrativa: 'Orquestación de contenedores, despliegue Blue/Green y monitoreo con Prometheus.',
  },
];

export const RETO_FASE_3: Reto = {
  id: 204,
  faseId: 3,
  criteriosAceptacion: '80% de precisión en trade-offs arquitectónicos y clasificación ISO 25010 (RN-03)',
  calificacionMinima: 0.8,
  titulo: 'Fase 03: Atributos de Calidad y Arquitectura',
  subtitulo: 'Reto: Resolución de Trade-offs y Clasificación ISO 25010',
  tiempoSugerido: '15 min',
  escenario:
    '“El sistema bancario necesita alta disponibilidad y cifrado de extremo a extremo, pero tiene restricciones severas de latencia (<120ms p99).”',
  objetivos: [
    {
      id: 'obj-1',
      texto: 'Identificar atributos no funcionales según ISO 25010',
      tag: 'Núcleo',
      descripcion:
        'Categorizar anomalías en Seguridad (autenticación mTLS), Rendimiento (p99 < 200ms) y Usabilidad para el panel de operadores.',
      requerido: true,
    },
    {
      id: 'obj-2',
      texto: 'Analizar el dilema de trade-off arquitectónico',
      tag: 'Toma de Decisión',
      descripcion:
        'Resolver el conflicto entre Alta Disponibilidad distribuida (Consistencia eventual) vs. Cero Tolerancia a Pérdida Financiera (ACID estricto).',
      requerido: true,
    },
    {
      id: 'obj-3',
      texto: 'Alcanzar una precisión mínima del 80% (RN-03)',
      tag: 'Umbral Crítico',
      descripcion:
        'Requisito mandatorio para desbloquear la fase posterior de CI/CD automatizado y acreditar el botín completo sin penalizaciones de XP.',
      requerido: true,
      umbral: 80,
    },
  ],
  recompensas: {
    xp: 350,
    qp: 120,
    itemGarantizado: {
      nombre: 'Pergamino de Refactorización',
      tipo: 'Ítem Consumible de Inventario',
      descripcion:
        'Permite resetear una decisión errónea en una prueba de pipeline o corregir una respuesta en exámenes de boss sin penalizar vida (HP).',
    },
    rangoMaestria: 'Hasta 3 Estrellas de prestigio',
  },
};

export const INTENTO_FALLIDO_MOCK: IntentoReto = {
  id: 204,
  retoId: 204,
  faseId: 3,
  calificacionEstrellas: 1,
  porcentaje: 68,
  xpGanado: 0,
  qpGanado: 0,
  aprobado: false,
  usoAyuda: false,
  desgloseHitos: [
    {
      id: 'hito-1',
      nombre: 'Elicitación de Requisitos del Sistema',
      descripcion: 'Identificación de actores y casos de uso con precisión estricta.',
      puntos: 35,
      superado: true,
    },
    {
      id: 'hito-2',
      nombre: 'Clasificación Estándar ISO 25010',
      descripcion: 'Confusión detectada entre requisitos de Rendimiento y Fiabilidad.',
      puntos: 0,
      superado: false,
    },
    {
      id: 'hito-3',
      nombre: 'Análisis de Trade-offs y Factibilidad',
      descripcion: 'Balance balanceado entre coste de almacenamiento y latencia de red.',
      puntos: 33,
      superado: true,
    },
  ],
};

export const ESTUDIANTE_MOCK: Estudiante = {
  nivel: 5,
  xpTotal: 750,
  xpSiguienteNivel: 1000,
  qpTotal: 1420,
  racha: {
    diasActuales: 4,
  },
  titulo: 'Aprendiz',
  avatarUrl:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuAkK1BCQ8uGfm-oL05s5RyoOMILULmuhtykUluqRc6SeaYtNxAeZ6CjcKfWiev__MjOaHVUvHYGN6QnGKkuJwCaIA0_4Zihc1pI32IKqSSiN8PajarzaqNy-qacQnYF_ge64QGn508tpjeK3XYAYlMf3tSI053ZuLimtZf9VySuiyaGCZfRw38emwEPMwTRPSH2FtcrGSz93xx1vi4NYNRKYZA0qPEsFmy7oNgFY-G6xbXwSsNt9SLt',
};
