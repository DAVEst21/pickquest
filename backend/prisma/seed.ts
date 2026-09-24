/**
 * 7 fases del plan de estudios SDLC. Fases 1, 2 y 3 tienen contenido real
 * (no de ejemplo): 3 retos cada una, en el orden que definen sus preguntas.
 * Las fases 4-7 todavía no tienen retos.
 *
 * Es idempotente: se puede ejecutar varias veces sin duplicar datos (upsert
 * por (faseId, orden) para retos, por email para el estudiante demo, etc.).
 */
import {
  ModoRespuesta,
  Prisma,
  PrismaClient,
  TemaFase,
  TipoObjeto,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { calcularNivel } from '../src/modules/progreso/nivel';

const prisma = new PrismaClient();

const FASES: {
  orden: number;
  nombre: string;
  tema: TemaFase;
  dificultad: string;
}[] = [
  {
    orden: 1,
    nombre: 'Planificación',
    tema: 'ELICITACION',
    dificultad: 'Básica',
  },
  {
    orden: 2,
    nombre: 'Elicitación Req.',
    tema: 'ELICITACION',
    dificultad: 'Básica',
  },
  {
    orden: 3,
    nombre: 'Calidad & Arquitectura',
    tema: 'ATRIBUTOS_CALIDAD',
    dificultad: 'Intermedia',
  },
  {
    orden: 4,
    nombre: 'Diseño Detallado',
    tema: 'ATRIBUTOS_CALIDAD',
    dificultad: 'Intermedia',
  },
  {
    orden: 5,
    nombre: 'Implementación',
    tema: 'CODIGO_PRUEBAS',
    dificultad: 'Avanzada',
  },
  {
    orden: 6,
    nombre: 'Pruebas & Val.',
    tema: 'CODIGO_PRUEBAS',
    dificultad: 'Avanzada',
  },
  {
    orden: 7,
    nombre: 'Despliegue',
    tema: 'CODIGO_PRUEBAS',
    dificultad: 'Boss Raid',
  },
];

/**
 * Una pregunta de un reto. Solo preguntaId/correcta/peso los usa el
 * servidor para calificar (evaluacion.ts); texto/opciones/parte son
 * descriptivos, para que el frontend pueda mostrar la pregunta real en vez
 * de un campo de texto anónimo (nunca se expone `correcta` al cliente).
 */
interface PreguntaSeed {
  preguntaId: string;
  texto: string;
  /** Si la pregunta es de opción múltiple/clasificar/emparejar: las opciones que ve el estudiante. */
  opciones?: { valor: string; texto: string }[];
  correcta: string;
  peso: number;
  /** Para retos COMPUESTO: a cuál parte pertenece la pregunta ("A", "B"...). */
  parte?: string;
}

interface RetoSeed {
  ordenFase: number;
  orden: number;
  modo: ModoRespuesta;
  criteriosAceptacion: string;
  calificacionMinima: string;
  enunciado: string;
  preguntas: PreguntaSeed[];
  recompensaXp: number;
  recompensaQp: number;
}

// Opciones reutilizadas por varias preguntas del mismo reto.
const OPCIONES_SM_L = [
  { valor: 'S', texto: 'S (pequeña)' },
  { valor: 'M', texto: 'M (mediana)' },
  { valor: 'L', texto: 'L (grande)' },
];
const OPCIONES_F_NF = [
  { valor: 'F', texto: 'Funcional' },
  { valor: 'NF', texto: 'No funcional' },
];
const OPCIONES_PASOS_PLANEACION = [
  { valor: 'vision', texto: 'Definir visión y objetivos' },
  { valor: 'epicas', texto: 'Identificar épicas principales' },
  { valor: 'historias', texto: 'Descomponer épicas en historias de usuario' },
  { valor: 'priorizar', texto: 'Priorizar el backlog' },
  { valor: 'estimar', texto: 'Estimar y planear el primer sprint' },
];
const OPCIONES_TACTICAS_DISPONIBILIDAD = [
  { valor: 'redundancia-activa', texto: 'Redundancia activa-activa' },
  { valor: 'heartbeat', texto: 'Heartbeat' },
  { valor: 'failover', texto: 'Failover' },
  { valor: 'retry-backoff', texto: 'Retry con backoff' },
  { valor: 'circuit-breaker', texto: 'Circuit breaker' },
];
const OPCIONES_NIVELES_C4 = [
  { valor: 'contexto', texto: 'Contexto' },
  { valor: 'contenedores', texto: 'Contenedores' },
  { valor: 'componentes', texto: 'Componentes' },
  { valor: 'codigo', texto: 'Código' },
];
const OPCIONES_AUDIENCIA_C4 = [
  { valor: 'stakeholders', texto: 'Stakeholders de negocio' },
  { valor: 'arquitectos', texto: 'Arquitectos / líderes técnicos' },
  { valor: 'desarrolladores', texto: 'Desarrolladores del equipo' },
  {
    valor: 'dev-revisando',
    texto: 'Desarrollador revisando una implementación',
  },
];
const OPCIONES_TECNICAS_ELICITACION = [
  { valor: 'entrevista', texto: 'Entrevista' },
  { valor: 'encuesta', texto: 'Encuesta' },
  { valor: 'prototipado', texto: 'Prototipado' },
  { valor: 'observacion', texto: 'Observación' },
];

const RETOS: RetoSeed[] = [
  // ===== FASE 1: Planificación =====
  {
    ordenFase: 1,
    orden: 1,
    modo: 'OPCION_MULTIPLE',
    criteriosAceptacion:
      'Identificar correctamente épicas, backlog, Sprint 0 e INVEST (80% de precisión).',
    calificacionMinima: '0.80',
    enunciado: 'Épicas, Historias y Alcance.',
    preguntas: [
      {
        preguntaId: 'epica',
        texto: '¿Qué es una épica?',
        correcta: 'grande-descompone',
        peso: 1,
        opciones: [
          {
            valor: 'grande-descompone',
            texto:
              'Conjunto grande de funcionalidad relacionada, muy grande para un solo sprint, que se descompone en historias de usuario',
          },
          {
            valor: 'tarea-corta',
            texto: 'Una tarea técnica de menos de un día',
          },
          { valor: 'bug', texto: 'Un bug reportado por un usuario' },
          {
            valor: 'doc-legal',
            texto: 'Un documento legal de alcance del proyecto',
          },
        ],
      },
      {
        preguntaId: 'backlog-diferencia',
        texto:
          '¿Cuál es la diferencia entre el backlog de producto y el backlog de sprint?',
        correcta: 'producto-todo-sprint-subconjunto',
        peso: 1,
        opciones: [
          { valor: 'mismo', texto: 'Son lo mismo, solo cambia el nombre' },
          {
            valor: 'producto-todo-sprint-subconjunto',
            texto:
              'El de producto contiene todo el trabajo pendiente; el de sprint es el subconjunto comprometido para el sprint actual',
          },
          {
            valor: 'cliente-equipo',
            texto: 'Uno lo define el cliente y el otro el equipo',
          },
          {
            valor: 'solo-scrum',
            texto: 'El backlog de sprint solo existe en Scrum',
          },
        ],
      },
      {
        preguntaId: 'sprint-cero',
        texto: '¿Cuál es el objetivo principal de un Sprint 0?',
        correcta: 'preparar-terreno',
        peso: 1,
        opciones: [
          {
            valor: 'entregar-mvp',
            texto: 'Entregar la primera versión funcional al cliente',
          },
          {
            valor: 'corregir-bugs',
            texto: 'Corregir los bugs reportados antes de empezar',
          },
          {
            valor: 'preparar-terreno',
            texto:
              'Preparar el terreno: definir visión, alcance inicial, arquitectura base y planear el primer sprint real',
          },
          { valor: 'desplegar', texto: 'Hacer el despliegue a producción' },
        ],
      },
      {
        preguntaId: 'invest',
        texto: 'Según INVEST, una historia de usuario debe ser:',
        correcta: 'invest-correcta',
        peso: 1,
        opciones: [
          { valor: 'detallada', texto: 'Lo más grande y detallada posible' },
          {
            valor: 'invest-correcta',
            texto:
              'Independiente, negociable, valiosa, estimable, pequeña y testeable',
          },
          {
            valor: 'solo-dev',
            texto: 'Escrita únicamente por el equipo de desarrollo',
          },
          { valor: 'tecnica', texto: 'Redactada en lenguaje técnico' },
        ],
      },
    ],
    recompensaXp: 100,
    recompensaQp: 50,
  },
  {
    ordenFase: 1,
    orden: 2,
    modo: 'DRAG_AND_DROP',
    criteriosAceptacion:
      'Ordenar correctamente los 5 pasos del proceso de planeación (80% de precisión).',
    calificacionMinima: '0.80',
    enunciado:
      'Ordena el proceso de planeación: para cada paso, elige qué corresponde en esa posición.',
    preguntas: [1, 2, 3, 4, 5].map((n) => ({
      preguntaId: `paso-${n}`,
      texto: `Paso ${n} del proceso de planeación:`,
      opciones: OPCIONES_PASOS_PLANEACION,
      correcta: OPCIONES_PASOS_PLANEACION[n - 1].valor,
      peso: 1,
    })),
    recompensaXp: 80,
    recompensaQp: 40,
  },
  {
    ordenFase: 1,
    orden: 3,
    modo: 'COMPUESTO',
    criteriosAceptacion:
      'Elegir la técnica de estimación correcta y clasificar 3 historias por tamaño (80% de precisión).',
    calificacionMinima: '0.80',
    enunciado: 'Estimar el alcance.',
    preguntas: [
      {
        preguntaId: 'tecnica-estimacion',
        parte: 'A',
        texto:
          '¿Cuál es la mejor técnica de estimación cuando se tiene poca información?',
        correcta: 'planning-poker',
        peso: 1,
        opciones: [
          {
            valor: 'horas-exactas',
            texto: 'Definir horas exactas para cada tarea',
          },
          {
            valor: 'planning-poker',
            texto: 'Planning Poker (consenso relativo del equipo)',
          },
          { valor: 'solo-lider', texto: 'Solo la opinión del líder técnico' },
          {
            valor: 'no-estimar',
            texto: 'No estimar hasta tener el 100% de la información',
          },
        ],
      },
      {
        preguntaId: 'hu-contrasena',
        parte: 'B',
        texto:
          'Clasifica por tamaño: "Como usuario quiero cambiar mi contraseña"',
        opciones: OPCIONES_SM_L,
        correcta: 'S',
        peso: 1,
      },
      {
        preguntaId: 'hu-exportar-pdf',
        parte: 'B',
        texto:
          'Clasifica por tamaño: "Como usuario quiero exportar mi historial de compras en PDF con filtros por fecha"',
        opciones: OPCIONES_SM_L,
        correcta: 'M',
        peso: 1,
      },
      {
        preguntaId: 'hu-dashboard',
        parte: 'B',
        texto:
          'Clasifica por tamaño: "Como administrador quiero un dashboard configurable con métricas en tiempo real de todos los módulos"',
        opciones: OPCIONES_SM_L,
        correcta: 'L',
        peso: 1,
      },
    ],
    recompensaXp: 120,
    recompensaQp: 60,
  },

  // ===== FASE 2: Elicitación de Requerimientos =====
  {
    ordenFase: 2,
    orden: 1,
    modo: 'OPCION_MULTIPLE',
    criteriosAceptacion:
      'Reconocer una historia de usuario bien formada, INVEST y testabilidad (80% de precisión).',
    calificacionMinima: '0.80',
    enunciado: 'Anatomía de una Historia de Usuario.',
    preguntas: [
      {
        preguntaId: 'formato-hu',
        texto:
          '¿Cuál de las siguientes es una historia de usuario bien formada?',
        correcta: 'correo-confirmacion',
        peso: 1,
        opciones: [
          {
            valor: 'correo-confirmacion',
            texto:
              'Como cliente registrado, quiero recibir un correo de confirmación al completar mi compra, para tener constancia de la transacción',
          },
          { valor: 'rapido', texto: 'El sistema debe ser rápido' },
          {
            valor: 'login-tecnico',
            texto: 'Login: usuario, contraseña, botón entrar',
          },
          { valor: 'arreglar-bug', texto: 'Arreglar el bug del carrito' },
        ],
      },
      {
        preguntaId: 'invest-small',
        texto: '¿Qué significa la "S" (Small) de INVEST?',
        correcta: 'pequena-sprint',
        peso: 1,
        opciones: [
          {
            valor: 'menos-hora',
            texto: 'Que se complete en menos de una hora',
          },
          {
            valor: 'pequena-sprint',
            texto:
              'Debe ser lo suficientemente pequeña para completarse dentro de un sprint',
          },
          {
            valor: 'menos-3-criterios',
            texto: 'Que tenga menos de 3 criterios de aceptación',
          },
          {
            valor: 'solo-tecnicas',
            texto: 'Que aplique solo a historias técnicas',
          },
        ],
      },
      {
        preguntaId: 'no-testable',
        texto: '¿Cuál de las siguientes historias de usuario NO es testeable?',
        correcta: 'experiencia-agradable',
        peso: 1,
        opciones: [
          {
            valor: 'pagina-2s',
            texto:
              'Como usuario quiero que la página cargue en menos de 2 segundos',
          },
          {
            valor: 'email-fallo-pago',
            texto: 'Como usuario quiero recibir un correo si mi pago falla',
          },
          {
            valor: 'experiencia-agradable',
            texto:
              'Como usuario quiero una experiencia agradable al navegar el sitio',
          },
          {
            valor: 'ultimas-5-compras',
            texto: 'Como usuario quiero ver mis últimas 5 compras',
          },
        ],
      },
    ],
    recompensaXp: 200,
    recompensaQp: 250,
  },
  {
    ordenFase: 2,
    orden: 2,
    modo: 'COMPUESTO',
    criteriosAceptacion:
      'Completar un criterio Gherkin y reconocer qué lo hace testeable (80% de precisión).',
    calificacionMinima: '0.80',
    enunciado: 'Criterios de Aceptación en Gherkin.',
    preguntas: [
      {
        preguntaId: 'gherkin-then',
        parte: 'A',
        texto:
          'Historia: "Como usuario quiero ver un mensaje de error si mi login falla". Dado que el usuario está en la pantalla de login, cuando ingresa credenciales inválidas y presiona "Entrar", ¿cuál es el "Then" correcto?',
        correcta: 'mensaje-generico',
        peso: 1,
        opciones: [
          {
            valor: 'mensaje-generico',
            texto:
              'El sistema muestra un mensaje de error indicando que las credenciales son incorrectas, sin especificar cuál campo falló',
          },
          {
            valor: 'campo-especifico',
            texto:
              'El sistema indica exactamente si el campo incorrecto fue el usuario o la contraseña',
          },
          {
            valor: 'bloqueo',
            texto:
              'El sistema bloquea la cuenta después del primer intento fallido',
          },
          {
            valor: 'redirige-registro',
            texto:
              'El sistema redirige automáticamente a la página de registro',
          },
        ],
      },
      {
        preguntaId: 'criterio-testeable',
        parte: 'B',
        texto: '¿Qué hace testeable a un criterio de aceptación?',
        correcta: 'resultado-observable',
        peso: 1,
        opciones: [
          {
            valor: 'resultado-observable',
            texto:
              'Que describa un resultado observable y verificable, sin ambigüedad',
          },
          { valor: 'ingles', texto: 'Que esté redactado en inglés' },
          { valor: 'aprobado-sm', texto: 'Que lo apruebe el Scrum Master' },
          { valor: 'tres-lineas', texto: 'Que tenga al menos 3 líneas' },
        ],
      },
    ],
    recompensaXp: 100,
    recompensaQp: 80,
  },
  {
    ordenFase: 2,
    orden: 3,
    modo: 'COMPUESTO',
    criteriosAceptacion:
      'Clasificar requisitos funcionales/no funcionales y emparejar técnicas de elicitación con su escenario (80% de precisión).',
    calificacionMinima: '0.80',
    enunciado: 'Funcional vs. no funcional.',
    preguntas: [
      {
        preguntaId: 'req-respuesta-2s',
        parte: 'A',
        texto: 'Clasifica: "El sistema debe responder en menos de 2 segundos"',
        opciones: OPCIONES_F_NF,
        correcta: 'NF',
        peso: 1,
      },
      {
        preguntaId: 'req-restablecer-password',
        parte: 'A',
        texto: 'Clasifica: "El usuario debe poder restablecer su contraseña"',
        opciones: OPCIONES_F_NF,
        correcta: 'F',
        peso: 1,
      },
      {
        preguntaId: 'req-10000-usuarios',
        parte: 'A',
        texto:
          'Clasifica: "El sistema debe soportar 10,000 usuarios concurrentes"',
        opciones: OPCIONES_F_NF,
        correcta: 'NF',
        peso: 1,
      },
      {
        preguntaId: 'req-exportar-pdf',
        parte: 'A',
        texto: 'Clasifica: "El administrador puede exportar reportes en PDF"',
        opciones: OPCIONES_F_NF,
        correcta: 'F',
        peso: 1,
      },
      {
        preguntaId: 'tecnica-entrevista',
        parte: 'B',
        texto:
          '¿Qué técnica de elicitación usarías para entender a fondo el flujo de un usuario clave?',
        opciones: OPCIONES_TECNICAS_ELICITACION,
        correcta: 'entrevista',
        peso: 1,
      },
      {
        preguntaId: 'tecnica-encuesta',
        parte: 'B',
        texto:
          '¿Qué técnica usarías para conocer la opinión de cientos de usuarios sobre una función nueva?',
        opciones: OPCIONES_TECNICAS_ELICITACION,
        correcta: 'encuesta',
        peso: 1,
      },
      {
        preguntaId: 'tecnica-prototipado',
        parte: 'B',
        texto:
          'El cliente no tiene claro cómo debería verse la interfaz. ¿Qué técnica usarías?',
        opciones: OPCIONES_TECNICAS_ELICITACION,
        correcta: 'prototipado',
        peso: 1,
      },
      {
        preguntaId: 'tecnica-observacion',
        parte: 'B',
        texto:
          '¿Qué técnica usarías para ver cómo trabaja realmente el usuario, sin que él lo explique?',
        opciones: OPCIONES_TECNICAS_ELICITACION,
        correcta: 'observacion',
        peso: 1,
      },
    ],
    recompensaXp: 150,
    recompensaQp: 120,
  },

  // ===== FASE 3: Calidad & Arquitectura =====
  // orden 1: reto ISO 25010 ya existente, se conserva sin cambios (RetoPage.tsx
  // tiene una interfaz propia, EjercicioIso25010.tsx, para su contenido exacto).
  {
    ordenFase: 3,
    orden: 1,
    modo: 'COMPUESTO',
    criteriosAceptacion:
      '80% de precisión en trade-offs arquitectónicos y clasificación ISO 25010',
    calificacionMinima: '0.80',
    enunciado:
      'Evalúa los atributos de calidad ISO 25010 y analiza los trade-offs de arquitectura.',
    preguntas: [
      {
        preguntaId: 'req-1',
        texto:
          'Cifrado simétrico AES-256 en reposo y rotación continua de claves bancarias.',
        correcta: 'seguridad',
        peso: 1,
      },
      {
        preguntaId: 'req-2',
        texto:
          'Respuesta bajo carga pico de 25,000 transacciones concurrentes por segundo.',
        correcta: 'desempeno',
        peso: 1,
      },
      {
        preguntaId: 'req-3',
        texto:
          'Flujo de autorización en 1-clic con biometría sin fricción cognitiva para el usuario.',
        correcta: 'usabilidad',
        peso: 1,
      },
      {
        preguntaId: 'tradeoff',
        texto:
          'Terminación TLS en Ingress Controller vs. deshabilitar cifrado este-oeste.',
        correcta: 'A',
        peso: 2,
      },
    ],
    recompensaXp: 350,
    recompensaQp: 120,
  },
  {
    ordenFase: 3,
    orden: 2,
    modo: 'DRAG_AND_DROP',
    criteriosAceptacion:
      'Emparejar cada táctica de disponibilidad con el problema que resuelve (80% de precisión).',
    calificacionMinima: '0.80',
    enunciado: 'Tácticas de Disponibilidad.',
    preguntas: [
      {
        preguntaId: 'tactica-redundancia',
        texto:
          '¿Qué táctica resuelve: varias instancias procesan simultáneamente para que si una falla, otras sigan respondiendo?',
        opciones: OPCIONES_TACTICAS_DISPONIBILIDAD,
        correcta: 'redundancia-activa',
        peso: 1,
      },
      {
        preguntaId: 'tactica-heartbeat',
        texto:
          '¿Qué táctica resuelve: detectar rápido cuando un nodo dejó de responder?',
        opciones: OPCIONES_TACTICAS_DISPONIBILIDAD,
        correcta: 'heartbeat',
        peso: 1,
      },
      {
        preguntaId: 'tactica-failover',
        texto:
          '¿Qué táctica resuelve: cambiar automáticamente a un componente de respaldo?',
        opciones: OPCIONES_TACTICAS_DISPONIBILIDAD,
        correcta: 'failover',
        peso: 1,
      },
      {
        preguntaId: 'tactica-retry',
        texto:
          '¿Qué táctica resuelve: reintentar esperando cada vez más tiempo, para no saturar un servicio degradado?',
        opciones: OPCIONES_TACTICAS_DISPONIBILIDAD,
        correcta: 'retry-backoff',
        peso: 1,
      },
      {
        preguntaId: 'tactica-circuit',
        texto:
          '¿Qué táctica resuelve: dejar de llamar a un servicio que falla repetidamente, para evitar cascada de fallos?',
        opciones: OPCIONES_TACTICAS_DISPONIBILIDAD,
        correcta: 'circuit-breaker',
        peso: 1,
      },
    ],
    recompensaXp: 120,
    recompensaQp: 70,
  },
  {
    ordenFase: 3,
    orden: 3,
    modo: 'DRAG_AND_DROP',
    criteriosAceptacion:
      'Ordenar los niveles del modelo C4 y emparejarlos con su audiencia (80% de precisión).',
    calificacionMinima: '0.80',
    enunciado: 'Niveles del Modelo C4.',
    preguntas: [
      ...OPCIONES_NIVELES_C4.map((nivel, i) => ({
        preguntaId: `posicion-${i + 1}`,
        texto: `Posición ${i + 1} del modelo C4 (del más abstracto al más detallado):`,
        opciones: OPCIONES_NIVELES_C4,
        correcta: nivel.valor,
        peso: 1,
      })),
      {
        preguntaId: 'audiencia-contexto',
        texto: '¿Cuál es la audiencia típica del nivel Contexto?',
        opciones: OPCIONES_AUDIENCIA_C4,
        correcta: 'stakeholders',
        peso: 1,
      },
      {
        preguntaId: 'audiencia-contenedores',
        texto: '¿Cuál es la audiencia típica del nivel Contenedores?',
        opciones: OPCIONES_AUDIENCIA_C4,
        correcta: 'arquitectos',
        peso: 1,
      },
      {
        preguntaId: 'audiencia-componentes',
        texto: '¿Cuál es la audiencia típica del nivel Componentes?',
        opciones: OPCIONES_AUDIENCIA_C4,
        correcta: 'desarrolladores',
        peso: 1,
      },
      {
        preguntaId: 'audiencia-codigo',
        texto: '¿Cuál es la audiencia típica del nivel Código?',
        opciones: OPCIONES_AUDIENCIA_C4,
        correcta: 'dev-revisando',
        peso: 1,
      },
    ],
    recompensaXp: 150,
    recompensaQp: 90,
  },
];

const OBJETOS_SEED = [
  {
    nombre: 'Poción de Sabiduría',
    tipo: 'POCION' as TipoObjeto,
    costoQP: 50,
    efecto: 'Revela una pista contextual sobre los requisitos del reto.',
    rareza: 'Común',
  },
  {
    nombre: 'Pergamino de Claridad',
    tipo: 'PERGAMINO' as TipoObjeto,
    costoQP: 100,
    efecto: 'Descarta una opción de respuesta incorrecta.',
    rareza: 'Rara',
  },
  {
    nombre: 'Reliquia del Arquitecto',
    tipo: 'RELIQUIA' as TipoObjeto,
    costoQP: 300,
    efecto: 'Otorga un 50% extra de XP en el reto actual.',
    rareza: 'Épica',
  },
];

// Texto de la "Guía Técnica ISO/IEC 25010" que muestra RetoPage.
const CONTENIDO_FASE_3 = {
  contenidoTeorico:
    'Los Atributos de Calidad dictan cómo el software satisface las necesidades explícitas e implícitas de las partes interesadas en condiciones operativas reales.\n' +
    'Seguridad (Confidencialidad e Integridad): capacidad de proteger la información contra accesos no autorizados, ataques de alteración y permitir el no repudio.\n' +
    'Eficiencia de Desempeño: comportamiento temporal, uso de recursos y capacidad volumétrica ante escenarios de estrés.',
  ejemplos:
    'Trade-offs clásicos: a mayor complejidad criptográfica en tránsito (mTLS con re-cifrado en capas de aplicación), mayor consumo de ciclos de reloj y latencia terminal. Se mitiga desacoplando la criptografía a nivel de proxy de infraestructura (Sidecars o Hardware Offloading).',
  glosario:
    'mTLS: TLS mutuo, ambos extremos se autentican con certificados.\n' +
    'Sidecar: proxy que se despliega junto a cada servicio y asume funciones transversales como el cifrado.\n' +
    'Hardware Offloading: delegar el trabajo criptográfico a hardware dedicado.',
};

const DEMO = {
  email: 'demo@pickquest.dev',
  password: 'pickquest123',
  nombreAventurero: 'aventurero_demo',
  avatar:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuAkK1BCQ8uGfm-oL05s5RyoOMILULmuhtykUluqRc6SeaYtNxAeZ6CjcKfWiev__MjOaHVUvHYGN6QnGKkuJwCaIA0_4Zihc1pI32IKqSSiN8PajarzaqNy-qacQnYF_ge64QGn508tpjeK3XYAYlMf3tSI053ZuLimtZf9VySuiyaGCZfRw38emwEPMwTRPSH2FtcrGSz93xx1vi4NYNRKYZA0qPEsFmy7oNgFY-G6xbXwSsNt9SLt',
};

async function main() {
  const fasePorOrden = new Map<number, number>();
  for (const fase of FASES) {
    const { id } = await prisma.fase.upsert({
      where: { orden: fase.orden },
      update: {
        nombre: fase.nombre,
        tema: fase.tema,
        dificultad: fase.dificultad,
      },
      create: fase,
    });
    fasePorOrden.set(fase.orden, id);
  }

  const objetosPorNombre = new Map<string, number>();
  for (const obj of OBJETOS_SEED) {
    const registro = await prisma.objeto.upsert({
      where: { nombre: obj.nombre },
      update: {
        tipo: obj.tipo,
        costoQP: obj.costoQP,
        efecto: obj.efecto,
        rareza: obj.rareza,
      },
      create: obj,
    });
    objetosPorNombre.set(obj.nombre, registro.id);
  }

  for (const {
    ordenFase,
    orden,
    modo,
    enunciado,
    preguntas,
    ...datos
  } of RETOS) {
    const faseId = fasePorOrden.get(ordenFase)!;
    const valores = {
      ...datos,
      orden,
      modo,
      contenido: {
        enunciado,
        claveRespuestas: preguntas,
      } as unknown as Prisma.InputJsonValue,
      calificacionMinima: new Prisma.Decimal(datos.calificacionMinima),
    };
    const existente = await prisma.reto.findFirst({ where: { faseId, orden } });
    if (existente) {
      await prisma.reto.update({ where: { id: existente.id }, data: valores });
    } else {
      await prisma.reto.create({ data: { ...valores, faseId } });
    }
  }

  const fase3 = fasePorOrden.get(3)!;
  await prisma.contenidoApoyo.upsert({
    where: { faseId: fase3 },
    update: CONTENIDO_FASE_3,
    create: { faseId: fase3, ...CONTENIDO_FASE_3 },
  });

  // Estudiante demo. Sin intentos precargados: con contenido real de varias
  // preguntas por reto, simular "ya lo aprobó" requeriría responder cada
  // pregunta de cada reto; el demo arranca igual que cualquier estudiante
  // nuevo (antes arrancaba con las fases 1 y 2 ya completadas, pero eso era
  // sobre los retos de ejemplo que este cambio reemplaza).
  const demo = await prisma.estudiante.upsert({
    where: { email: DEMO.email },
    update: {},
    create: {
      email: DEMO.email,
      passwordHash: await bcrypt.hash(DEMO.password, 12),
      nombreAventurero: DEMO.nombreAventurero,
      avatar: DEMO.avatar,
      nivel: calcularNivel(0).nivel,
      xpTotal: 0,
      qpTotal: 0,
      racha: {
        create: { diasActuales: 0, diasRecord: 0, multiplicadorQP: 1.0 },
      },
    },
  });

  const pocionId = objetosPorNombre.get('Poción de Sabiduría');
  if (pocionId) {
    await prisma.inventarioObjeto.upsert({
      where: {
        estudianteId_objetoId: { estudianteId: demo.id, objetoId: pocionId },
      },
      update: {},
      create: {
        estudianteId: demo.id,
        objetoId: pocionId,
        cantidad: 3,
        equipado: true,
      },
    });
  }

  const [fases, retos, objetos, estudiantes, intentos] = await Promise.all([
    prisma.fase.count(),
    prisma.reto.count(),
    prisma.objeto.count(),
    prisma.estudiante.count(),
    prisma.intentoReto.count(),
  ]);
  console.log(
    `Seed listo: ${fases} fases, ${retos} retos, ${objetos} objetos, ${estudiantes} estudiantes, ${intentos} intentos. ` +
      `Usuario demo: ${DEMO.email} / ${DEMO.password}`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
