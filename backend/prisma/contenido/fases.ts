import { TemaFase } from '@prisma/client';

export interface FaseSeed {
  orden: number;
  nombre: string;
  tema: TemaFase;
  dificultad: string;
  descripcion: string;
  apoyo: { contenidoTeorico: string; ejemplos: string; glosario: string };
}

export const FASES: FaseSeed[] = [
  {
    orden: 1,
    nombre: 'Ciclo de vida del software',
    tema: 'CICLO_VIDA',
    dificultad: 'Básica',
    descripcion:
      'Antes de escribir una sola línea de código, todo proyecto decide cómo se organiza el trabajo. Aquí aprenderás las etapas del ciclo de vida del software, qué necesita cada una para poder empezar y cómo planificarlas en el tiempo.',
    apoyo: {
      contenidoTeorico:
        'El ciclo de vida del software es el conjunto de etapas por las que pasa un sistema: análisis de requisitos, diseño, construcción, pruebas y despliegue.\n' +
        'En el modelo en cascada cada fase empieza cuando termina la anterior; otros modelos (incremental, ágil) repiten o traslapan las etapas.\n' +
        'Además de las fases hay actividades de apoyo (preparar el entorno, escribir casos de prueba, capacitar) que tienen dependencias propias.',
      ejemplos:
        'Una dependencia "fin a inicio": las pruebas no pueden empezar antes de que termine la construcción.\n' +
        'Dos bloques sin dependencia entre sí se pueden ejecutar en paralelo y acortar el proyecto.',
      glosario:
        'Entregable: producto concreto que genera una fase (un documento, el código, un reporte).\n' +
        'Dependencia: relación que obliga a que un bloque termine antes de que otro empiece.\n' +
        'Ruta crítica: la cadena de bloques dependientes que determina la duración mínima del proyecto.',
    },
  },
  {
    orden: 2,
    nombre: 'Elicitación de requerimientos',
    tema: 'ELICITACION',
    dificultad: 'Intermedia',
    descripcion:
      'Los buenos sistemas empiezan escuchando. Descubre qué necesita realmente un cliente conversando con él y aprende a decidir qué se construye primero cuando no alcanza el tiempo.',
    apoyo: {
      contenidoTeorico:
        'La elicitación es el proceso de descubrir, junto con los interesados (stakeholders), lo que el sistema debe hacer y cómo debe comportarse.\n' +
        'Técnicas comunes: entrevista, cuestionario, observación y taller. La entrevista funciona bien con pocas personas clave; el cuestionario, con muchas; la observación, cuando la gente no sabe explicar lo que hace.\n' +
        "La priorización MoSCoW clasifica los requerimientos en Must (imprescindible), Should (importante), Could (deseable) y Won't (no en esta versión).",
      ejemplos:
        'Requerimiento funcional: "El sistema permite cobrar con tarjeta."\n' +
        'Requerimiento no funcional: "El pedido aparece en cocina en menos de 3 segundos."\n' +
        'Pregunta productiva: "¿Qué pasa cuando hay muchos clientes a la vez?" Pregunta improductiva: "¿De qué color le gustaría?"',
      glosario:
        'Stakeholder: persona con interés en el sistema (dueño, usuario, cliente).\n' +
        'RF / RNF: requerimiento funcional (qué hace) / no funcional (qué tan bien lo hace).\n' +
        'Capacidad: cantidad de esfuerzo que el equipo puede construir en una versión.',
    },
  },
  {
    orden: 3,
    nombre: 'Atributos de calidad',
    tema: 'ATRIBUTOS_CALIDAD',
    dificultad: 'Avanzada',
    descripcion:
      'Un sistema puede funcionar y aun así ser inseguro, lento o confuso. Aprende a detectar fallas de calidad con la norma ISO/IEC 25010 y a repartir recursos limitados entre atributos que compiten entre sí.',
    apoyo: {
      contenidoTeorico:
        'La norma ISO/IEC 25010 define las características de calidad de un producto de software: adecuación funcional, eficiencia de desempeño, compatibilidad, usabilidad, fiabilidad, seguridad, mantenibilidad y portabilidad.\n' +
        'Los atributos suelen entrar en conflicto (trade-offs): más seguridad suele costar rapidez o comodidad, y optimizar mucho el rendimiento puede dificultar el mantenimiento.',
      ejemplos:
        'Contraseña visible en pantalla: seguridad.\n' +
        'Botón que no da retroalimentación: usabilidad.\n' +
        'Consulta que tarda 12 segundos: eficiencia de desempeño.\n' +
        'La aplicación se cierra sola: fiabilidad.',
      glosario:
        'Trade-off: ganar en un atributo a cambio de perder en otro.\n' +
        'Restricción obligatoria: valor mínimo de un atributo que el cliente exige.\n' +
        'Eficiencia de desempeño: tiempos de respuesta y uso de recursos.',
    },
  },
];
