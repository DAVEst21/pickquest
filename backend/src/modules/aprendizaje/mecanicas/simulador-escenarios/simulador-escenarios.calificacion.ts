import { ParteEscenario } from '@prisma/client';
import { porcentajeEntero } from '../calificacion.util';

/**
 * CU-05 Simulador de escenarios de calidad (RF-08, RN-20). Funciones puras.
 *
 * RN-20: 12 × (partes cualitativas correctas, de 5)
 *      + 40 × (medida de respuesta dentro del rango aceptable ? 1 : 0)
 * Se permiten como máximo 5 simulaciones por intento.
 */

export const PARTES_ESCENARIO: ParteEscenario[] = ['FUENTE', 'ESTIMULO', 'ARTEFACTO', 'ENTORNO', 'RESPUESTA'];

export const NOMBRE_PARTE: Record<ParteEscenario, string> = {
  FUENTE: 'fuente',
  ESTIMULO: 'estímulo',
  ARTEFACTO: 'artefacto',
  ENTORNO: 'entorno',
  RESPUESTA: 'respuesta',
};

/** RN-20: máximo de simulaciones por intento. */
export const LIMITE_SIMULACIONES = 5;

/** Redondea a 2 decimales (los valores del deslizador y de la simulación tienen 2). */
export const redondear2 = (n: number): number => Math.round(n * 100) / 100;

export interface MedidaEscenario {
  valor: number | null;
  unidadId: number | null;
  carga: number | null;
}

export interface RangoAceptable {
  valorMin: number;
  valorMax: number;
  cargaMin: number;
  cargaMax: number;
}

/** Qué falta para poder simular o enviar (FE1): partes vacías o medida incompleta. */
export function faltantesEscenario(
  partesElegidas: ReadonlySet<ParteEscenario>,
  medida: MedidaEscenario,
): string[] {
  const faltantes: string[] = [];
  for (const parte of PARTES_ESCENARIO) {
    if (!partesElegidas.has(parte)) faltantes.push(`Falta elegir la ${NOMBRE_PARTE[parte]} del escenario`);
  }
  if (medida.valor === null) faltantes.push('Falta definir el valor de la medida de respuesta');
  if (medida.unidadId === null) faltantes.push('Falta elegir la unidad de la medida de respuesta');
  if (medida.carga === null) faltantes.push('Falta definir la condición de carga de la medida de respuesta');
  return faltantes;
}

/** Comportamiento de la aplicación ficticia: valorApp(carga) = base + pendiente × carga. */
export function valorDeLaApp(base: number, pendiente: number, carga: number): number {
  return redondear2(base + pendiente * carga);
}

/** El escenario se cumple si la app responde dentro del valor definido y la unidad es la correcta. */
export function escenarioSeCumple(valorApp: number, valor: number, unidadCorrecta: boolean): boolean {
  return unidadCorrecta && valorApp <= valor;
}

/** La medida está dentro del rango aceptable del caso (RN-20): unidad, valor y carga. */
export function medidaDentroDelRango(
  medida: MedidaEscenario,
  unidadCorrecta: boolean,
  rango: RangoAceptable,
): boolean {
  if (medida.valor === null || medida.carga === null) return false;
  const valor = redondear2(medida.valor);
  return (
    unidadCorrecta &&
    valor >= rango.valorMin &&
    valor <= rango.valorMax &&
    medida.carga >= rango.cargaMin &&
    medida.carga <= rango.cargaMax
  );
}

/** RN-20 con numeradores enteros: 12 por parte correcta + 40 por la medida; se trunca y se acota. */
export function calificarEscenario(partesCorrectas: number, medidaEnRango: boolean): number {
  return porcentajeEntero(12 * partesCorrectas + (medidaEnRango ? 40 : 0), 1);
}
