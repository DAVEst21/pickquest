import type { Estudiante, Fase, IntentoReto, Reto } from '../types';
import { ESTUDIANTE_MOCK, FASES_MOCK, INTENTO_FALLIDO_MOCK, RETO_FASE_3 } from './mocks/data';

const delay = (ms = 400) => new Promise((resolve) => setTimeout(resolve, ms));

// In-memory store for attempts so user can inspect their attempt in CU-04
const intentosStore = new Map<number, IntentoReto>([
  [204, INTENTO_FALLIDO_MOCK],
]);

export interface PayloadIntento {
  respuesta: {
    clasificaciones?: Record<number, string>; // reqId -> 'seguridad' | 'desempeno' | 'usabilidad'
    tradeoff?: string; // 'A' | 'B'
  };
  usoAyuda: boolean;
}

/**
 * Obtener listado de todas las fases del mapa SDLC (CU-01)
 */
export async function getFases(): Promise<Fase[]> {
  await delay(350);
  return [...FASES_MOCK];
}

/**
 * Obtener detalle de una fase y su reto asociado (CU-02)
 */
export async function getFaseDetalle(faseId: number): Promise<{ fase: Fase; reto: Reto }> {
  await delay(350);
  const fase = FASES_MOCK.find((f) => f.id === Number(faseId)) || FASES_MOCK[2];
  const reto = {
    ...RETO_FASE_3,
    faseId: fase.id,
    titulo: `Fase 0${fase.id}: ${fase.nombre}`,
  };
  return { fase, reto };
}

/**
 * Enviar resolución de un reto (CU-03)
 */
export async function enviarIntento(
  faseId: number,
  retoId: number,
  payload: PayloadIntento
): Promise<IntentoReto> {
  await delay(700);

  const { respuesta, usoAyuda } = payload;
  const clasificaciones = respuesta.clasificaciones || {};
  const tradeoff = respuesta.tradeoff;

  // Evaluación
  const req1Correcto = clasificaciones[1] === 'seguridad';
  const req2Correcto = clasificaciones[2] === 'desempeno';
  const req3Correcto = clasificaciones[3] === 'usabilidad';
  const tradeoffCorrecto = tradeoff === 'A';

  let aciertos = 0;
  if (req1Correcto) aciertos++;
  if (req2Correcto) aciertos++;
  if (req3Correcto) aciertos++;
  if (tradeoffCorrecto) aciertos += 2; // Ponderado

  // Total 5 unidades de evaluación
  const porcentaje = Math.round((aciertos / 5) * 100);
  const aprobado = porcentaje >= 80;

  const intentoId = Date.now();
  const nuevoIntento: IntentoReto = {
    id: intentoId,
    retoId: Number(retoId),
    faseId: Number(faseId),
    calificacionEstrellas: aprobado ? (porcentaje === 100 ? 3 : 2) : (porcentaje >= 50 ? 1 : 0),
    porcentaje,
    xpGanado: aprobado ? 350 : 0,
    qpGanado: aprobado ? 180 : 0,
    aprobado,
    usoAyuda,
    desgloseHitos: [
      {
        id: 'hito-1',
        nombre: 'Elicitación de Requisitos del Sistema',
        descripcion: req1Correcto
          ? 'Identificación de actores y requerimientos de seguridad con precisión estricta.'
          : 'Falla al relacionar mecanismos criptográficos con el atributo de seguridad.',
        puntos: req1Correcto ? 35 : 0,
        superado: req1Correcto,
      },
      {
        id: 'hito-2',
        nombre: 'Clasificación Estándar ISO 25010',
        descripcion: req2Correcto && req3Correcto
          ? 'Clasificación correcta de latencia (Desempeño) y experiencia biométrica (Usabilidad).'
          : 'Confusión detectada entre requisitos de Rendimiento y Usabilidad/Fiabilidad.',
        puntos: req2Correcto && req3Correcto ? 32 : (req2Correcto || req3Correcto ? 16 : 0),
        superado: req2Correcto && req3Correcto,
      },
      {
        id: 'hito-3',
        nombre: 'Análisis de Trade-offs y Factibilidad',
        descripcion: tradeoffCorrecto
          ? 'Balance adecuado: Offloading criptográfico con Envoy sidecar / TLS termination.'
          : 'Riesgo crítico: Deshabilitar mTLS viola cumplimiento bancario PCI-DSS.',
        puntos: tradeoffCorrecto ? 33 : 0,
        superado: tradeoffCorrecto,
      },
    ],
  };

  intentosStore.set(intentoId, nuevoIntento);
  return nuevoIntento;
}

/**
 * Obtener intento por ID (CU-04)
 */
export async function getIntento(intentoId: number): Promise<IntentoReto> {
  await delay(350);
  const intento = intentosStore.get(Number(intentoId));
  if (!intento) {
    return {
      ...INTENTO_FALLIDO_MOCK,
      id: Number(intentoId),
    };
  }
  return intento;
}

/**
 * Obtener perfil del estudiante autenticado
 */
export async function getEstudiante(): Promise<Estudiante> {
  await delay(250);
  return { ...ESTUDIANTE_MOCK };
}
