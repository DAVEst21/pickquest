import { TemaFase } from '@prisma/client';

/**
 * CU-09 Material de estudio y tarjetas por tema (RF-12). Un tema por fase.
 * Contenido real en español para estudiantes de ingeniería de software.
 */
export interface MaterialSeed {
  explicacion: string;
  ejemplos: { titulo: string; texto: string }[];
  glosario: { termino: string; definicion: string }[];
  tarjetas: { frente: string; reverso: string }[];
}

export const MATERIAL_POR_TEMA: Record<TemaFase, MaterialSeed> = {
  // ------------------------------------------------------------------
  CICLO_VIDA: {
    explicacion:
      'El ciclo de vida del software describe las etapas por las que pasa un sistema desde que alguien lo necesita hasta que se retira: análisis de requisitos, diseño, construcción, pruebas, despliegue y mantenimiento. Un modelo de ciclo de vida decide cómo se ordenan y se repiten esas etapas.\n\n' +
      'En el modelo en cascada cada etapa empieza cuando termina la anterior y produce un entregable que la siguiente necesita. Funciona bien cuando los requisitos son estables y se conocen desde el principio, pero corregir un error de requisitos en la etapa de pruebas es caro. Los modelos incremental e iterativo entregan el sistema en partes: cada incremento pasa por todas las etapas y el cliente lo prueba pronto. El modelo en espiral agrega el análisis de riesgos en cada vuelta. Los enfoques ágiles, como Scrum, trabajan en ciclos cortos (sprints) con entregas frecuentes y aceptan que los requisitos cambien.\n\n' +
      'Para planificar un proyecto se descompone el trabajo en actividades y se establecen dependencias entre ellas. La dependencia más común es «fin a inicio»: la actividad B no puede empezar hasta que A termina. Las actividades sin dependencia entre sí pueden ejecutarse en paralelo. La secuencia más larga de actividades dependientes es la ruta crítica: si una de ellas se retrasa, todo el proyecto se retrasa.\n\n' +
      'Elegir el modelo adecuado depende de las características del proyecto: qué tan claros y estables son los requisitos, el tamaño del equipo, el nivel de riesgo, si el cliente puede participar con frecuencia y si existen restricciones regulatorias que exigen documentación formal.',
    ejemplos: [
      {
        titulo: 'Sistema de nómina con requisitos regulados',
        texto:
          'Una empresa debe calcular la nómina conforme a una ley que no cambiará durante el proyecto. Los requisitos están completos y firmados, y la auditoría exige documentos de cada etapa. El modelo en cascada encaja: el análisis produce la especificación, el diseño la usa y cada entregable queda documentado.',
      },
      {
        titulo: 'Aplicación móvil para una startup',
        texto:
          'Una startup no sabe qué funciones valorarán los usuarios. Entrega cada dos semanas una versión usable y ajusta el siguiente sprint con lo que aprendió. Un enfoque ágil o incremental le permite cambiar de rumbo sin rehacer un plan de meses.',
      },
      {
        titulo: 'Sistema de control médico con riesgos altos',
        texto:
          'Un dispositivo que dosifica medicamentos tiene riesgos graves si falla. El equipo usa el modelo en espiral: en cada vuelta analiza riesgos, construye un prototipo del componente más peligroso y lo evalúa antes de seguir.',
      },
      {
        titulo: 'Dependencias en un cronograma',
        texto:
          'Las pruebas de integración no pueden empezar hasta que termine la construcción (fin a inicio). En cambio, «redactar el manual de usuario» y «preparar el servidor de producción» no dependen entre sí y se hacen a la vez, lo que acorta el proyecto.',
      },
    ],
    glosario: [
      { termino: 'Ciclo de vida del software', definicion: 'Conjunto de etapas por las que pasa un sistema, desde su concepción hasta su retiro.' },
      { termino: 'Modelo en cascada', definicion: 'Modelo secuencial en el que cada etapa comienza cuando termina la anterior y no se regresa fácilmente.' },
      { termino: 'Modelo incremental', definicion: 'Modelo que entrega el sistema en partes funcionales sucesivas, cada una con sus propias etapas.' },
      { termino: 'Modelo en espiral', definicion: 'Modelo iterativo que incorpora el análisis de riesgos al inicio de cada vuelta.' },
      { termino: 'Desarrollo ágil', definicion: 'Enfoque de ciclos cortos, entregas frecuentes y colaboración continua con el cliente, que acepta cambios en los requisitos.' },
      { termino: 'Entregable', definicion: 'Producto concreto que genera una actividad o fase: un documento, el código, un reporte de pruebas.' },
      { termino: 'Dependencia', definicion: 'Relación que obliga a que una actividad termine (o empiece) antes de que otra pueda empezar.' },
      { termino: 'Ruta crítica', definicion: 'Secuencia más larga de actividades dependientes; define la duración mínima del proyecto.' },
      { termino: 'Hito', definicion: 'Punto de control del proyecto, sin duración propia, que marca la conclusión de un logro importante.' },
      { termino: 'Iteración', definicion: 'Ciclo corto de trabajo que produce una versión revisable del producto.' },
    ],
    tarjetas: [
      { frente: '¿Qué es el ciclo de vida del software?', reverso: 'El conjunto de etapas por las que pasa un sistema, desde que se necesita hasta que se retira: requisitos, diseño, construcción, pruebas, despliegue y mantenimiento.' },
      { frente: '¿Cuándo conviene el modelo en cascada?', reverso: 'Cuando los requisitos son claros, completos y estables, y se necesita documentación formal de cada etapa (por ejemplo, proyectos regulados).' },
      { frente: '¿Cuál es el principal riesgo del modelo en cascada?', reverso: 'Descubrir tarde los errores de requisitos: el cliente ve el sistema hasta el final y corregir entonces es caro.' },
      { frente: '¿En qué se diferencia el modelo incremental del de cascada?', reverso: 'El incremental entrega el sistema en partes funcionales; cada incremento pasa por todas las etapas y el cliente lo prueba antes.' },
      { frente: '¿Qué aporta el modelo en espiral?', reverso: 'El análisis de riesgos al inicio de cada vuelta, con prototipos para reducirlos antes de continuar. Es útil en proyectos de riesgo alto.' },
      { frente: '¿Qué caracteriza a los enfoques ágiles?', reverso: 'Ciclos cortos con entregas frecuentes, colaboración continua con el cliente y aceptación del cambio en los requisitos.' },
      { frente: '¿Qué significa una dependencia «fin a inicio»?', reverso: 'Que la actividad B no puede empezar hasta que la actividad A termine.' },
      { frente: '¿Qué es la ruta crítica?', reverso: 'La secuencia más larga de actividades dependientes. Si una de ellas se retrasa, todo el proyecto se retrasa.' },
      { frente: '¿Qué pasa con dos actividades sin dependencia entre sí?', reverso: 'Pueden ejecutarse en paralelo, lo que acorta la duración total del proyecto.' },
      { frente: '¿Qué es un entregable?', reverso: 'Un producto concreto que genera una actividad o fase, como un documento, el código fuente o un reporte de pruebas.' },
      { frente: '¿Qué factores influyen al elegir un modelo de ciclo de vida?', reverso: 'Estabilidad de los requisitos, tamaño del equipo, nivel de riesgo, participación del cliente y restricciones regulatorias.' },
      { frente: '¿Qué es un hito?', reverso: 'Un punto de control sin duración propia que marca la conclusión de un logro importante, como «diseño aprobado».' },
    ],
  },

  // ------------------------------------------------------------------
  ELICITACION: {
    explicacion:
      'La elicitación de requerimientos es el proceso de descubrir, con las personas involucradas, qué necesita el sistema. Quienes tienen algo en juego en el proyecto se llaman interesados o stakeholders: usuarios, clientes, patrocinadores, operadores y hasta reguladores. Casi nunca saben expresar de golpe todo lo que necesitan, por eso el analista debe preguntar, observar y confirmar.\n\n' +
      'Existen varias técnicas. La entrevista permite profundizar con una persona y detectar matices; el cuestionario alcanza a muchas personas con preguntas cerradas; la observación muestra cómo se trabaja realmente, que a veces difiere de lo que se dice; los talleres reúnen a varios interesados para llegar a acuerdos; los prototipos dan algo tangible para reaccionar; y el análisis de documentos revisa formularios, reportes y normas existentes. Cada técnica sirve más en cierta situación y conviene combinarlas.\n\n' +
      'Los requerimientos se clasifican en funcionales (lo que el sistema hace: «el sistema registrará el pedido») y no funcionales (cómo lo hace: rapidez, seguridad, usabilidad). Un buen requerimiento es claro, verificable y no ambiguo: «el sistema debe ser rápido» no se puede verificar; «la búsqueda responde en menos de 2 segundos» sí. Las historias de usuario expresan una necesidad como «Como [rol], quiero [acción], para [beneficio]» y se acompañan de criterios de aceptación que definen cuándo está terminada.\n\n' +
      'Como casi nunca alcanza el tiempo para construir todo, los requerimientos se priorizan. El método MoSCoW los separa en Must have (indispensables), Should have (importantes), Could have (deseables) y Won\'t have (no se harán por ahora). Priorizar con el cliente evita gastar el presupuesto en funciones de poco valor.',
    ejemplos: [
      {
        titulo: 'Entrevista a la dueña de una cafetería',
        texto:
          'La analista pregunta: «¿Cómo se toman hoy los pedidos?». La dueña explica que los anota en papel y que a veces se pierden. De una sola pregunta abierta surgen dos requerimientos: registrar pedidos y no perderlos. Las preguntas abiertas descubren necesidades que el entrevistado no habría mencionado por sí mismo.',
      },
      {
        titulo: 'La observación contradice a la entrevista',
        texto:
          'Un supervisor dice que revisa el inventario una vez por semana. Al observarlo, el analista nota que consulta el almacén varias veces al día. La observación revela un requerimiento de consulta rápida que la entrevista no mostró.',
      },
      {
        titulo: 'Un requerimiento ambiguo y su versión verificable',
        texto:
          'Ambiguo: «El sistema debe ser fácil de usar». Verificable: «Un empleado nuevo debe completar el registro de un pedido en menos de 3 minutos sin capacitación». La segunda versión se puede medir y probar.',
      },
      {
        titulo: 'Historia de usuario con criterios de aceptación',
        texto:
          'Como cliente, quiero recibir un aviso cuando mi pedido esté listo, para recogerlo sin esperar. Criterios: el aviso llega en menos de un minuto; indica el número de pedido; no se envía dos veces.',
      },
      {
        titulo: 'Priorización con MoSCoW',
        texto:
          'En una tienda en línea: pagar con tarjeta es Must; filtrar productos por precio es Should; recomendaciones personalizadas es Could; integrar redes sociales es Won\'t por ahora. El equipo construye primero lo indispensable.',
      },
    ],
    glosario: [
      { termino: 'Elicitación', definicion: 'Proceso de descubrir y obtener los requerimientos junto con los interesados.' },
      { termino: 'Stakeholder', definicion: 'Persona o grupo con interés en el sistema o afectado por él: usuarios, clientes, patrocinadores, operadores.' },
      { termino: 'Requerimiento funcional', definicion: 'Descripción de lo que el sistema debe hacer, como registrar un pedido o emitir un reporte.' },
      { termino: 'Requerimiento no funcional', definicion: 'Restricción sobre cómo opera el sistema: rendimiento, seguridad, usabilidad, disponibilidad.' },
      { termino: 'Entrevista', definicion: 'Técnica de conversación guiada con un interesado para profundizar en sus necesidades.' },
      { termino: 'Observación', definicion: 'Técnica que consiste en ver cómo se realiza el trabajo en su entorno real.' },
      { termino: 'Prototipo', definicion: 'Versión preliminar y parcial del sistema usada para obtener retroalimentación temprana.' },
      { termino: 'Historia de usuario', definicion: 'Descripción breve de una necesidad con la forma «Como [rol], quiero [acción], para [beneficio]».' },
      { termino: 'Criterio de aceptación', definicion: 'Condición verificable que debe cumplirse para considerar terminada una historia o requerimiento.' },
      { termino: 'MoSCoW', definicion: 'Método de priorización que clasifica en Must, Should, Could y Won\'t have.' },
    ],
    tarjetas: [
      { frente: '¿Qué es la elicitación de requerimientos?', reverso: 'El proceso de descubrir y obtener, junto con los interesados, lo que el sistema necesita hacer y cómo debe comportarse.' },
      { frente: '¿Quién es un stakeholder?', reverso: 'Cualquier persona o grupo con interés en el sistema o afectado por él: usuarios, clientes, patrocinadores, operadores, reguladores.' },
      { frente: '¿Cuándo es mejor una entrevista que un cuestionario?', reverso: 'Cuando se necesita profundizar y detectar matices con pocas personas clave. El cuestionario sirve para consultar a muchas con preguntas cerradas.' },
      { frente: '¿Qué ventaja tiene la observación como técnica?', reverso: 'Muestra cómo se trabaja realmente, que a veces difiere de lo que las personas dicen que hacen.' },
      { frente: '¿Qué diferencia hay entre un requerimiento funcional y uno no funcional?', reverso: 'El funcional dice qué hace el sistema; el no funcional dice cómo lo hace (rendimiento, seguridad, usabilidad...).' },
      { frente: '¿Por qué «el sistema debe ser rápido» es un mal requerimiento?', reverso: 'Es ambiguo y no se puede verificar. Debe expresarse con una medida, por ejemplo: «la búsqueda responde en menos de 2 segundos».' },
      { frente: '¿Cuál es la estructura de una historia de usuario?', reverso: 'Como [rol], quiero [acción], para [beneficio].' },
      { frente: '¿Para qué sirven los criterios de aceptación?', reverso: 'Para definir, de forma verificable, cuándo una historia está terminada y cumple lo que el usuario espera.' },
      { frente: '¿Qué significan las letras de MoSCoW?', reverso: 'Must have (indispensable), Should have (importante), Could have (deseable) y Won\'t have (no se hará por ahora).' },
      { frente: '¿Por qué se priorizan los requerimientos?', reverso: 'Porque casi nunca hay tiempo ni presupuesto para construir todo; priorizar asegura invertir primero en lo de mayor valor.' },
      { frente: '¿Qué aporta un prototipo en la elicitación?', reverso: 'Algo tangible sobre lo cual los interesados reaccionan, lo que saca a la luz requerimientos que no habrían descrito con palabras.' },
      { frente: '¿Por qué conviene usar preguntas abiertas en una entrevista?', reverso: 'Porque invitan a explicar con detalle y descubren necesidades que el entrevistado no mencionaría ante una pregunta de sí o no.' },
    ],
  },

  // ------------------------------------------------------------------
  ATRIBUTOS_CALIDAD: {
    explicacion:
      'Los atributos de calidad describen qué tan bien un sistema cumple sus funciones, más allá de qué funciones tiene. Dos sistemas pueden ofrecer lo mismo y ser muy distintos en rapidez, seguridad o facilidad de cambio. El estándar ISO/IEC 25010 organiza la calidad del producto en características como adecuación funcional, eficiencia de desempeño, compatibilidad, usabilidad, fiabilidad, seguridad, mantenibilidad y portabilidad.\n\n' +
      'Un atributo de calidad solo es útil si se puede verificar. Por eso se expresa como un escenario de calidad, con seis partes: la fuente del estímulo (quién o qué lo origina), el estímulo (lo que ocurre), el entorno (en qué condiciones), el artefacto (qué parte del sistema se ve afectada), la respuesta (qué debe hacer el sistema) y la medida de la respuesta (cómo se comprueba). Por ejemplo: «Con 500 usuarios conectados (entorno), un usuario solicita su historial (estímulo); el sistema lo muestra (respuesta) en menos de 2 segundos (medida)».\n\n' +
      'Los atributos suelen entrar en conflicto. Cifrar toda la información mejora la seguridad pero puede restar rendimiento; agregar capas de abstracción mejora la mantenibilidad pero puede complicar la depuración. Los arquitectos negocian estos compromisos (trade-offs) según las prioridades del negocio, y las tácticas son decisiones de diseño concretas que favorecen un atributo: usar una caché mejora el desempeño, replicar servidores mejora la disponibilidad, separar módulos mejora la mantenibilidad.\n\n' +
      'La calidad se verifica con inspecciones, pruebas y mediciones. En una inspección se revisa el sistema contra una lista de criterios para encontrar fallas, y cada hallazgo se asocia al atributo afectado, de modo que el equipo sabe qué atributo está en riesgo y cuánto invertir en corregirlo.',
    ejemplos: [
      {
        titulo: 'Escenario de desempeño bien formulado',
        texto:
          'Fuente: un cliente de la tienda. Estímulo: busca un producto. Entorno: hora pico con 1,000 usuarios conectados. Artefacto: el buscador. Respuesta: devuelve los resultados. Medida: en menos de 2 segundos para el 95 % de las búsquedas.',
      },
      {
        titulo: 'Seguridad contra rendimiento',
        texto:
          'Un banco cifra cada campo de cada transacción. La seguridad mejora, pero cada operación tarda más. El equipo decide cifrar solo los datos sensibles y usar un canal seguro para el resto: un compromiso entre dos atributos.',
      },
      {
        titulo: 'Una táctica de disponibilidad',
        texto:
          'Una tienda en línea replica su servidor de pedidos. Si el principal falla, el servidor réplica atiende las solicitudes sin que el cliente lo note. La replicación es una táctica que favorece la disponibilidad.',
      },
      {
        titulo: 'Un hallazgo de inspección y su atributo',
        texto:
          'Al inspeccionar una pantalla, el equipo encuentra que los mensajes de error dicen «Error 500» sin explicación. Se asocia a usabilidad: el usuario no sabe cómo corregir el problema.',
      },
    ],
    glosario: [
      { termino: 'Atributo de calidad', definicion: 'Propiedad que describe qué tan bien el sistema cumple sus funciones, como rendimiento, seguridad o usabilidad.' },
      { termino: 'ISO/IEC 25010', definicion: 'Estándar que define el modelo de calidad del producto de software y sus características.' },
      { termino: 'Escenario de calidad', definicion: 'Descripción verificable de un atributo con fuente, estímulo, entorno, artefacto, respuesta y medida.' },
      { termino: 'Desempeño', definicion: 'Capacidad del sistema para responder con rapidez y usar bien sus recursos.' },
      { termino: 'Disponibilidad', definicion: 'Proporción del tiempo en que el sistema está operativo y listo para usarse.' },
      { termino: 'Seguridad', definicion: 'Protección de la información y de las funciones contra accesos o usos no autorizados.' },
      { termino: 'Usabilidad', definicion: 'Facilidad con la que los usuarios aprenden y usan el sistema para lograr sus objetivos.' },
      { termino: 'Mantenibilidad', definicion: 'Facilidad con la que el sistema puede corregirse, modificarse o ampliarse.' },
      { termino: 'Trade-off', definicion: 'Compromiso entre atributos que se afectan mutuamente: mejorar uno puede empeorar otro.' },
      { termino: 'Táctica arquitectónica', definicion: 'Decisión de diseño concreta que favorece un atributo de calidad, como una caché o la replicación.' },
    ],
    tarjetas: [
      { frente: '¿Qué es un atributo de calidad?', reverso: 'Una propiedad que describe qué tan bien cumple el sistema sus funciones, como rendimiento, seguridad, usabilidad o mantenibilidad.' },
      { frente: '¿Qué es ISO/IEC 25010?', reverso: 'El estándar que define el modelo de calidad del producto de software y organiza sus características principales.' },
      { frente: '¿Cuáles son las seis partes de un escenario de calidad?', reverso: 'Fuente, estímulo, entorno, artefacto, respuesta y medida de la respuesta.' },
      { frente: '¿Por qué un escenario de calidad incluye una medida?', reverso: 'Para que el atributo se pueda verificar: sin una medida («en menos de 2 segundos»), no hay forma de saber si se cumple.' },
      { frente: '¿Qué atributo describe la rapidez de respuesta del sistema?', reverso: 'El desempeño (eficiencia de desempeño).' },
      { frente: '¿Qué mide la disponibilidad?', reverso: 'La proporción del tiempo en que el sistema está operativo y listo para usarse.' },
      { frente: '¿Qué es un trade-off entre atributos?', reverso: 'Un compromiso en el que mejorar un atributo puede empeorar otro, por ejemplo más seguridad con menos rendimiento.' },
      { frente: '¿Qué es una táctica arquitectónica?', reverso: 'Una decisión de diseño concreta que favorece un atributo, como usar una caché para mejorar el desempeño.' },
      { frente: '¿Qué táctica favorece la disponibilidad?', reverso: 'La replicación de componentes: si uno falla, otro atiende las solicitudes sin que el usuario lo note.' },
      { frente: '¿Qué atributo se ve afectado por mensajes de error sin explicación?', reverso: 'La usabilidad: el usuario no entiende qué ocurrió ni cómo corregirlo.' },
      { frente: '¿Qué atributo facilita corregir o ampliar el sistema?', reverso: 'La mantenibilidad: qué tan fácil es modificar el sistema sin introducir nuevos errores.' },
      { frente: '¿Para qué sirve inspeccionar un sistema?', reverso: 'Para encontrar fallas contra criterios definidos y asociar cada hallazgo al atributo de calidad que pone en riesgo.' },
    ],
  },
};
