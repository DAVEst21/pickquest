import { TemaFase } from '@prisma/client';

/**
 * Banco de preguntas (CU-10 diagnóstico, CU-11 reto diario y CU-13 duelos).
 * Cada pregunta tiene 4 opciones, una sola correcta, y una explicación.
 * `correcta` es el índice (0-3) de la opción correcta.
 */
export interface PreguntaSeed {
  tema: TemaFase;
  enunciado: string;
  opciones: [string, string, string, string];
  correcta: 0 | 1 | 2 | 3;
  explicacion: string;
}

export const BANCO_PREGUNTAS: PreguntaSeed[] = [
  // ---------------------------------------------------------------- CICLO_VIDA
  {
    tema: 'CICLO_VIDA',
    enunciado: '¿Cuál es la característica principal del modelo en cascada?',
    opciones: [
      'Se entregan versiones funcionales cada dos semanas.',
      'Cada etapa comienza cuando termina la anterior.',
      'Se analizan los riesgos con prototipos en cada vuelta.',
      'Todas las etapas se ejecutan al mismo tiempo.',
    ],
    correcta: 1,
    explicacion: 'En cascada las etapas son secuenciales: análisis, diseño, construcción y pruebas se hacen una tras otra, y cada una produce el entregable que la siguiente necesita.',
  },
  {
    tema: 'CICLO_VIDA',
    enunciado: '¿Qué modelo de ciclo de vida incorpora el análisis de riesgos al inicio de cada vuelta?',
    opciones: ['Cascada', 'Incremental', 'Espiral', 'Modelo en V'],
    correcta: 2,
    explicacion: 'El modelo en espiral repite vueltas en las que primero se identifican y reducen los riesgos, por ejemplo con prototipos, antes de construir.',
  },
  {
    tema: 'CICLO_VIDA',
    enunciado: 'Una startup no sabe qué funciones valorarán sus usuarios y puede reunirse con ellos cada semana. ¿Qué enfoque le conviene?',
    opciones: [
      'Cascada con toda la especificación al inicio.',
      'Un enfoque ágil con entregas frecuentes.',
      'Esperar a tener todos los requisitos firmados.',
      'Construir todo el sistema y probarlo al final.',
    ],
    correcta: 1,
    explicacion: 'Cuando los requisitos son inciertos y el cliente participa, los ciclos cortos permiten aprender de cada entrega y ajustar el rumbo.',
  },
  {
    tema: 'CICLO_VIDA',
    enunciado: 'En un cronograma, una dependencia «fin a inicio» entre A y B significa que:',
    opciones: [
      'A y B deben empezar el mismo día.',
      'B puede empezar antes de que A termine.',
      'B no puede empezar hasta que A termine.',
      'A y B deben terminar el mismo día.',
    ],
    correcta: 2,
    explicacion: 'Fin a inicio es la dependencia más común: la actividad sucesora espera a que termine la predecesora.',
  },
  {
    tema: 'CICLO_VIDA',
    enunciado: '¿Qué es la ruta crítica de un proyecto?',
    opciones: [
      'La secuencia más larga de actividades dependientes, que define la duración mínima del proyecto.',
      'La lista de los riesgos más graves del proyecto.',
      'El conjunto de actividades más caras.',
      'El camino que sigue el cliente para aprobar los entregables.',
    ],
    correcta: 0,
    explicacion: 'Si una actividad de la ruta crítica se retrasa, todo el proyecto se retrasa, porque no tiene holgura.',
  },
  {
    tema: 'CICLO_VIDA',
    enunciado: 'Dos actividades que no dependen una de la otra pueden:',
    opciones: [
      'Ejecutarse en paralelo para acortar el proyecto.',
      'Ejecutarse solo una después de la otra.',
      'Eliminarse del cronograma.',
      'Ejecutarse únicamente si hay un hito entre ellas.',
    ],
    correcta: 0,
    explicacion: 'Sin dependencia entre ellas, nada obliga a un orden; hacerlas en paralelo reduce la duración total.',
  },
  {
    tema: 'CICLO_VIDA',
    enunciado: '¿Qué es un entregable?',
    opciones: [
      'Una reunión de seguimiento con el cliente.',
      'Un riesgo que ya se materializó.',
      'Un producto concreto que genera una actividad, como un documento o el código.',
      'La fecha límite de una fase.',
    ],
    correcta: 2,
    explicacion: 'Los entregables son resultados verificables: una especificación, un diseño, el código fuente, un reporte de pruebas.',
  },
  {
    tema: 'CICLO_VIDA',
    enunciado: '¿Cuál es el principal riesgo del modelo en cascada?',
    opciones: [
      'Que el equipo se organice en demasiadas reuniones.',
      'Que no se pueda documentar el sistema.',
      'Que haya demasiadas versiones del producto.',
      'Descubrir tarde los errores de requisitos, cuando corregirlos es caro.',
    ],
    correcta: 3,
    explicacion: 'El cliente ve el sistema casi al final; si los requisitos estaban mal entendidos, el costo de corregir crece mucho.',
  },
  {
    tema: 'CICLO_VIDA',
    enunciado: '¿En qué etapa se produce la especificación de requisitos?',
    opciones: ['Despliegue', 'Análisis de requisitos', 'Mantenimiento', 'Pruebas'],
    correcta: 1,
    explicacion: 'El análisis de requisitos define qué debe hacer el sistema y deja como entregable la especificación.',
  },
  {
    tema: 'CICLO_VIDA',
    enunciado: '¿Qué es un hito en la planificación de un proyecto?',
    opciones: [
      'Una actividad de varias semanas.',
      'Un punto de control sin duración propia que marca un logro importante.',
      'El responsable de una actividad.',
      'Un error detectado durante las pruebas.',
    ],
    correcta: 1,
    explicacion: 'Un hito, como «diseño aprobado», no consume tiempo: señala que se alcanzó algo relevante.',
  },
  {
    tema: 'CICLO_VIDA',
    enunciado: '¿Qué distingue al modelo incremental?',
    opciones: [
      'Entrega el sistema completo en una sola fecha.',
      'No incluye pruebas.',
      'Entrega el sistema en partes funcionales sucesivas.',
      'Solo se usa para mantenimiento.',
    ],
    correcta: 2,
    explicacion: 'Cada incremento agrega funciones utilizables, así el cliente prueba el producto antes de que esté terminado.',
  },
  {
    tema: 'CICLO_VIDA',
    enunciado: '¿Qué ocurre en la etapa de mantenimiento?',
    opciones: [
      'Se redactan los requisitos iniciales.',
      'Se corrigen errores y se agregan mejoras después de la entrega.',
      'Se elige el modelo de ciclo de vida.',
      'Se descarta el sistema sin conservar datos.',
    ],
    correcta: 1,
    explicacion: 'El mantenimiento es la etapa más larga del ciclo de vida: corrección, adaptación y mejora del sistema ya en uso.',
  },
  {
    tema: 'CICLO_VIDA',
    enunciado: '¿Qué verifican las pruebas de integración?',
    opciones: [
      'Que cada línea de código esté comentada.',
      'Que el cliente esté satisfecho con el precio.',
      'Que el manual esté impreso.',
      'Que los módulos funcionen correctamente al trabajar juntos.',
    ],
    correcta: 3,
    explicacion: 'Después de probar cada módulo por separado, la integración comprueba que sus interfaces y su colaboración funcionen.',
  },
  {
    tema: 'CICLO_VIDA',
    enunciado: 'Un sistema de nómina con requisitos estables, una ley que no cambiará y auditorías documentales. ¿Qué modelo encaja mejor?',
    opciones: ['Cascada', 'Ágil sin documentación', 'Prototipado desechable', 'Ninguno: no necesita ciclo de vida'],
    correcta: 0,
    explicacion: 'Con requisitos conocidos y documentación obligatoria, un modelo secuencial y bien documentado es adecuado.',
  },
  {
    tema: 'CICLO_VIDA',
    enunciado: '¿Qué es una iteración?',
    opciones: [
      'Una auditoría final del proyecto.',
      'Un retraso en el cronograma.',
      'Un documento de requisitos.',
      'Un ciclo corto de trabajo que produce una versión revisable del producto.',
    ],
    correcta: 3,
    explicacion: 'Las iteraciones repiten el ciclo de análisis, construcción y prueba en pequeño para aprender y mejorar el producto.',
  },

  // --------------------------------------------------------------- ELICITACION
  {
    tema: 'ELICITACION',
    enunciado: '¿Quién es un stakeholder de un sistema?',
    opciones: [
      'Solo el programador que lo construye.',
      'Cualquier persona o grupo con interés en el sistema o afectado por él.',
      'Únicamente el cliente que paga.',
      'El servidor donde se instala.',
    ],
    correcta: 1,
    explicacion: 'Los stakeholders incluyen usuarios, clientes, patrocinadores, operadores y reguladores, no solo quien paga.',
  },
  {
    tema: 'ELICITACION',
    enunciado: '¿Qué técnica de elicitación muestra cómo se trabaja realmente, aunque difiera de lo que las personas dicen?',
    opciones: ['Cuestionario', 'Observación', 'Lluvia de ideas', 'Análisis de costos'],
    correcta: 1,
    explicacion: 'Observar el trabajo en su entorno revela pasos y problemas que el entrevistado no menciona o da por sabidos.',
  },
  {
    tema: 'ELICITACION',
    enunciado: '¿Cuándo es más útil un cuestionario que una entrevista?',
    opciones: [
      'Cuando se necesita profundizar con una sola persona.',
      'Cuando se quiere consultar a muchas personas con preguntas cerradas.',
      'Cuando no existen interesados.',
      'Cuando se quiere ver un prototipo.',
    ],
    correcta: 1,
    explicacion: 'El cuestionario alcanza a muchas personas con poco esfuerzo, pero permite menos profundidad que una conversación.',
  },
  {
    tema: 'ELICITACION',
    enunciado: '¿Cuál de las siguientes es un requerimiento no funcional?',
    opciones: [
      'El sistema permitirá registrar pedidos.',
      'El sistema enviará un correo al cliente.',
      'El sistema calculará el total de la compra.',
      'La página principal debe cargar en menos de 3 segundos.',
    ],
    correcta: 3,
    explicacion: 'Un requerimiento no funcional describe cómo opera el sistema (aquí, rendimiento), no una función concreta.',
  },
  {
    tema: 'ELICITACION',
    enunciado: '¿Cuál de las siguientes es un requerimiento funcional?',
    opciones: [
      'El sistema permitirá a la cajera registrar un pedido.',
      'El sistema debe ser seguro.',
      'El sistema estará disponible el 99 % del tiempo.',
      'El sistema debe ser fácil de aprender.',
    ],
    correcta: 0,
    explicacion: 'Los requerimientos funcionales dicen qué hace el sistema: registrar, calcular, consultar, notificar.',
  },
  {
    tema: 'ELICITACION',
    enunciado: '¿Por qué «el sistema debe ser amigable» es un mal requerimiento?',
    opciones: [
      'Porque es demasiado largo.',
      'Porque menciona al usuario.',
      'Porque es ambiguo y no se puede verificar.',
      'Porque describe una función.',
    ],
    correcta: 2,
    explicacion: 'Un buen requerimiento es claro y verificable; «amigable» significa cosas distintas para cada persona y no tiene una medida.',
  },
  {
    tema: 'ELICITACION',
    enunciado: '¿Cuál es la estructura habitual de una historia de usuario?',
    opciones: [
      'Si ocurre X, entonces el sistema falla.',
      'Título, autor y fecha de entrega.',
      'Como [rol], quiero [acción], para [beneficio].',
      'Fuente, estímulo, entorno y medida.',
    ],
    correcta: 2,
    explicacion: 'La plantilla expresa quién necesita algo, qué necesita y para qué, lo que ayuda a conversar sobre el valor.',
  },
  {
    tema: 'ELICITACION',
    enunciado: '¿Para qué sirven los criterios de aceptación de una historia?',
    opciones: [
      'Para asignar un responsable.',
      'Para estimar el costo en dinero.',
      'Para decorar el tablero de tareas.',
      'Para definir de forma verificable cuándo la historia está terminada.',
    ],
    correcta: 3,
    explicacion: 'Los criterios convierten la expectativa en condiciones comprobables que el equipo y el cliente acuerdan antes de construir.',
  },
  {
    tema: 'ELICITACION',
    enunciado: 'En MoSCoW, ¿qué significa «Must have»?',
    opciones: [
      'Requerimiento indispensable: sin él el sistema no cumple su propósito.',
      'Requerimiento deseable si sobra tiempo.',
      'Requerimiento que ya fue descartado.',
      'Requerimiento que solo importa al equipo técnico.',
    ],
    correcta: 0,
    explicacion: 'Los Must have son lo mínimo que el sistema debe entregar para ser útil; se construyen primero.',
  },
  {
    tema: 'ELICITACION',
    enunciado: 'En MoSCoW, ¿qué significa «Won\'t have»?',
    opciones: [
      'Que el requerimiento es el más importante.',
      'Que el requerimiento no se hará por ahora, aunque pueda considerarse después.',
      'Que el requerimiento tiene un error.',
      'Que el requerimiento ya está terminado.',
    ],
    correcta: 1,
    explicacion: 'Declarar lo que queda fuera por ahora evita expectativas falsas y protege el alcance del proyecto.',
  },
  {
    tema: 'ELICITACION',
    enunciado: '¿Qué aporta un prototipo durante la elicitación?',
    opciones: [
      'Reemplaza la necesidad de hablar con los usuarios.',
      'Algo tangible sobre lo que los interesados reaccionan y revelan nuevas necesidades.',
      'La versión final del sistema.',
      'El plan de pruebas completo.',
    ],
    correcta: 1,
    explicacion: 'Reaccionar a algo visible es más fácil que describir con palabras lo que se necesita.',
  },
  {
    tema: 'ELICITACION',
    enunciado: '¿Cuál es una buena pregunta abierta para una entrevista?',
    opciones: [
      '¿Usan hoja de cálculo, sí o no?',
      '¿Está de acuerdo con que el sistema sea rápido?',
      '¿Cómo se registran hoy los pedidos y qué problemas tiene ese proceso?',
      '¿Verdad que el proceso actual funciona bien?',
    ],
    correcta: 2,
    explicacion: 'Las preguntas abiertas invitan a explicar con detalle; las cerradas o sugestivas limitan o inducen la respuesta.',
  },
  {
    tema: 'ELICITACION',
    enunciado: '¿Para qué se organiza un taller de requisitos?',
    opciones: [
      'Para reunir a varios interesados y llegar a acuerdos entre sus necesidades.',
      'Para capacitar al equipo en programación.',
      'Para entregar el producto final.',
      'Para medir el rendimiento del servidor.',
    ],
    correcta: 0,
    explicacion: 'Un taller permite discutir en grupo, resolver contradicciones y priorizar con todos presentes.',
  },
  {
    tema: 'ELICITACION',
    enunciado: '¿Qué significa que un requerimiento sea verificable?',
    opciones: [
      'Que aparece en el contrato.',
      'Que está escrito en mayúsculas.',
      'Que lo propuso el cliente.',
      'Que se puede comprobar con una prueba o una medida concreta.',
    ],
    correcta: 3,
    explicacion: 'Si no hay forma de comprobarlo, no se puede saber si se cumplió; por eso se expresan con medidas.',
  },
  {
    tema: 'ELICITACION',
    enunciado: '¿Por qué se priorizan los requerimientos?',
    opciones: [
      'Porque el tiempo y el presupuesto no alcanzan casi nunca para construir todo.',
      'Porque los requerimientos menos importantes se escriben mal.',
      'Porque así se evita hablar con el cliente.',
      'Porque lo exige el lenguaje de programación.',
    ],
    correcta: 0,
    explicacion: 'Priorizar asegura que los recursos limitados se inviertan primero en lo que más valor aporta.',
  },

  // --------------------------------------------------------- ATRIBUTOS_CALIDAD
  {
    tema: 'ATRIBUTOS_CALIDAD',
    enunciado: '¿Qué es un atributo de calidad?',
    opciones: [
      'Una función específica del sistema.',
      'Una propiedad que describe qué tan bien el sistema cumple sus funciones.',
      'Un tipo de lenguaje de programación.',
      'El nombre del equipo desarrollador.',
    ],
    correcta: 1,
    explicacion: 'Rendimiento, seguridad o usabilidad no son funciones: son cualidades con las que el sistema realiza sus funciones.',
  },
  {
    tema: 'ATRIBUTOS_CALIDAD',
    enunciado: '¿Qué define el estándar ISO/IEC 25010?',
    opciones: [
      'El modelo de calidad del producto de software y sus características.',
      'El formato de los contratos de desarrollo.',
      'Los lenguajes de programación permitidos.',
      'El precio de las licencias.',
    ],
    correcta: 0,
    explicacion: 'ISO/IEC 25010 organiza la calidad en características como desempeño, usabilidad, seguridad y mantenibilidad.',
  },
  {
    tema: 'ATRIBUTOS_CALIDAD',
    enunciado: '¿Cuál de estos elementos NO forma parte de un escenario de calidad?',
    opciones: [
      'La fuente del estímulo.',
      'La medida de la respuesta.',
      'El artefacto afectado.',
      'El costo total del proyecto.',
    ],
    correcta: 3,
    explicacion: 'Un escenario tiene fuente, estímulo, entorno, artefacto, respuesta y medida de la respuesta; el costo no es una de sus partes.',
  },
  {
    tema: 'ATRIBUTOS_CALIDAD',
    enunciado: '¿Qué atributo describe la rapidez con la que el sistema responde?',
    opciones: ['Portabilidad', 'Usabilidad', 'Desempeño', 'Mantenibilidad'],
    correcta: 2,
    explicacion: 'El desempeño (eficiencia de desempeño) mide tiempos de respuesta, capacidad y uso de recursos.',
  },
  {
    tema: 'ATRIBUTOS_CALIDAD',
    enunciado: '¿Qué mide la disponibilidad de un sistema?',
    opciones: [
      'La cantidad de funciones que ofrece.',
      'El número de desarrolladores.',
      'La proporción del tiempo en que está operativo y listo para usarse.',
      'El tamaño del código fuente.',
    ],
    correcta: 2,
    explicacion: 'Una disponibilidad del 99.9 % significa que el sistema está fuera de servicio muy poco tiempo al año.',
  },
  {
    tema: 'ATRIBUTOS_CALIDAD',
    enunciado: 'Usar una caché para evitar repetir consultas lentas es una táctica que favorece principalmente:',
    opciones: ['El desempeño', 'La seguridad', 'La portabilidad', 'La accesibilidad'],
    correcta: 0,
    explicacion: 'La caché guarda resultados ya calculados, lo que reduce los tiempos de respuesta.',
  },
  {
    tema: 'ATRIBUTOS_CALIDAD',
    enunciado: 'Replicar un servidor para que otro atienda si el principal falla favorece principalmente:',
    opciones: ['La usabilidad', 'La disponibilidad', 'La mantenibilidad', 'La compatibilidad visual'],
    correcta: 1,
    explicacion: 'La replicación es una táctica de disponibilidad: el servicio continúa aunque falle un componente.',
  },
  {
    tema: 'ATRIBUTOS_CALIDAD',
    enunciado: 'Cifrar todos los datos mejora la seguridad, pero puede hacer más lentas las operaciones. Esto es un ejemplo de:',
    opciones: ['Una dependencia fin a inicio', 'Un requerimiento funcional', 'Un compromiso (trade-off) entre atributos', 'Un hito'],
    correcta: 2,
    explicacion: 'Mejorar un atributo puede afectar otro; el arquitecto decide el equilibrio según las prioridades del negocio.',
  },
  {
    tema: 'ATRIBUTOS_CALIDAD',
    enunciado: '¿Qué describe la mantenibilidad?',
    opciones: [
      'Qué tan bonito se ve el sistema.',
      'Cuántos usuarios soporta a la vez.',
      'Qué tan fácil es corregir, modificar o ampliar el sistema.',
      'Cuánto cuesta la licencia.',
    ],
    correcta: 2,
    explicacion: 'Un sistema mantenible se puede cambiar sin introducir nuevos errores y con poco esfuerzo.',
  },
  {
    tema: 'ATRIBUTOS_CALIDAD',
    enunciado: 'Un mensaje de error que dice solo «Error 500», sin explicar cómo corregir el problema, afecta principalmente a:',
    opciones: ['La portabilidad', 'El desempeño', 'La disponibilidad', 'La usabilidad'],
    correcta: 3,
    explicacion: 'La usabilidad incluye ayudar al usuario a recuperarse de los errores con mensajes comprensibles.',
  },
  {
    tema: 'ATRIBUTOS_CALIDAD',
    enunciado: 'Exigir inicio de sesión y cifrar las contraseñas son decisiones que favorecen:',
    opciones: ['La seguridad', 'La portabilidad', 'El desempeño', 'La mantenibilidad'],
    correcta: 0,
    explicacion: 'La autenticación y el cifrado protegen el acceso y la confidencialidad de la información.',
  },
  {
    tema: 'ATRIBUTOS_CALIDAD',
    enunciado: '¿Cuál de estos es un escenario de calidad bien formulado?',
    opciones: [
      'El sistema debe ser rápido.',
      'Con 1,000 usuarios conectados, una búsqueda devuelve resultados en menos de 2 segundos.',
      'La búsqueda debería funcionar bien casi siempre.',
      'El buscador es lo más importante del sistema.',
    ],
    correcta: 1,
    explicacion: 'Tiene entorno (1,000 usuarios), estímulo (una búsqueda), respuesta (devuelve resultados) y medida (menos de 2 segundos).',
  },
  {
    tema: 'ATRIBUTOS_CALIDAD',
    enunciado: '¿Qué describe la portabilidad?',
    opciones: [
      'La facilidad de trasladar el sistema a otro entorno, como otro sistema operativo.',
      'La velocidad de la red.',
      'El número de reportes que genera.',
      'La seguridad de las contraseñas.',
    ],
    correcta: 0,
    explicacion: 'Un sistema portable se instala y funciona en distintos entornos con pocos cambios.',
  },
  {
    tema: 'ATRIBUTOS_CALIDAD',
    enunciado: 'Que el sistema continúe operando correctamente aunque ocurra una falla en un componente es una característica de:',
    opciones: ['Usabilidad', 'Compatibilidad', 'Portabilidad', 'Fiabilidad'],
    correcta: 3,
    explicacion: 'La fiabilidad incluye la tolerancia a fallos y la capacidad de recuperarse de ellos.',
  },
  {
    tema: 'ATRIBUTOS_CALIDAD',
    enunciado: '¿Para qué sirve inspeccionar un sistema con criterios de calidad?',
    opciones: [
      'Para borrar los errores sin revisarlos.',
      'Para aumentar el número de usuarios.',
      'Para cambiar el lenguaje de programación.',
      'Para encontrar fallas y asociar cada hallazgo al atributo que pone en riesgo.',
    ],
    correcta: 3,
    explicacion: 'Relacionar cada falla con un atributo permite decidir qué corregir primero y cuánto invertir.',
  },
];
