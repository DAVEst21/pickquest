import { LineaTiempoSeed } from './tipos';

/**
 * CU-08 (fase 1, reto 1). Proyecto en cascada de 5 fases + 3 actividades.
 *
 * Plan de referencia (semanas desde 0):
 *   Análisis 0-2 · Entorno 2-4 · Diseño 2-5 · Capacitación 5-7 · Plan de
 *   pruebas 5-7 · Construcción 5-10 · Pruebas 10-13 · Despliegue 13-14.
 * En secuencia pura (sin paralelismo) el proyecto dura 20 semanas; la fecha
 * límite es de 15, así que solo se cumple poniendo en paralelo las
 * actividades que no dependen entre sí con las fases.
 */
export const LINEA_TIEMPO: LineaTiempoSeed = {
  titulo: 'Planifica el lanzamiento de Mercadito Escolar',
  objetivo:
    'Acomoda fases y actividades en un cronograma de semanas, respeta sus dependencias y termina antes de la fecha límite.',
  contexto:
    'Tu equipo desarrollará "Mercadito Escolar", una tienda en línea para que los estudiantes de la preparatoria compren útiles y uniformes. ' +
    'El director exige tenerla funcionando antes de que inicie el siguiente ciclo escolar, dentro de 15 semanas. ' +
    'El proyecto sigue el modelo en cascada: cada fase empieza cuando termina la anterior. Además hay tres actividades de apoyo que no son una fase, ' +
    'pero que deben terminar antes de que otros bloques puedan empezar. Coloca cada bloque en la semana en que debe iniciar, ' +
    'ten en cuenta qué necesita cada uno para poder comenzar y asocia cada entregable con la fase que lo produce.',
  recompensaXp: 150,
  recompensaQp: 100,
  modelo: 'CASCADA',
  duracionMaximaSemanas: 15,
  bloques: [
    { clave: 'analisis', tipo: 'FASE', nombre: 'Análisis de requisitos', duracionSemanas: 2, inicioReferencia: 0 },
    { clave: 'diseno', tipo: 'FASE', nombre: 'Diseño del sistema', duracionSemanas: 3, inicioReferencia: 2 },
    { clave: 'construccion', tipo: 'FASE', nombre: 'Construcción (programación)', duracionSemanas: 5, inicioReferencia: 5 },
    { clave: 'pruebas', tipo: 'FASE', nombre: 'Pruebas del sistema', duracionSemanas: 3, inicioReferencia: 10 },
    { clave: 'despliegue', tipo: 'FASE', nombre: 'Despliegue en producción', duracionSemanas: 1, inicioReferencia: 13 },
    { clave: 'entorno', tipo: 'ACTIVIDAD', nombre: 'Preparar el entorno de desarrollo y el repositorio', duracionSemanas: 2, inicioReferencia: 2 },
    { clave: 'plan-pruebas', tipo: 'ACTIVIDAD', nombre: 'Escribir el plan y los casos de prueba', duracionSemanas: 2, inicioReferencia: 5 },
    { clave: 'capacitacion', tipo: 'ACTIVIDAD', nombre: 'Preparar la capacitación del personal', duracionSemanas: 2, inicioReferencia: 5 },
  ],
  dependencias: [
    { bloque: 'diseno', requiere: 'analisis' },
    { bloque: 'construccion', requiere: 'diseno' },
    { bloque: 'pruebas', requiere: 'construccion' },
    { bloque: 'despliegue', requiere: 'pruebas' },
    { bloque: 'entorno', requiere: 'analisis' },
    { bloque: 'construccion', requiere: 'entorno' },
    { bloque: 'plan-pruebas', requiere: 'diseno' },
    { bloque: 'pruebas', requiere: 'plan-pruebas' },
    { bloque: 'capacitacion', requiere: 'diseno' },
    { bloque: 'despliegue', requiere: 'capacitacion' },
  ],
  entregables: [
    { nombre: 'Documento de requisitos (SRS)', fase: 'analisis' },
    { nombre: 'Documento de diseño y arquitectura', fase: 'diseno' },
    { nombre: 'Código fuente de la tienda en línea', fase: 'construccion' },
    { nombre: 'Reporte de resultados de pruebas', fase: 'pruebas' },
    { nombre: 'Sistema en producción con su manual de usuario', fase: 'despliegue' },
  ],
};
