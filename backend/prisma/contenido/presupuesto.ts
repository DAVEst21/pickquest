import { PresupuestoSeed } from './tipos';

/**
 * CU-06 (fase 3, reto 2). Plataforma de pagos de una cooperativa estudiantil.
 *
 * Reparto de referencia: Seguridad 8, Usabilidad 6, Eficiencia 4,
 * Mantenibilidad 2 (suma 20). Medidores resultantes:
 *   Seguridad      = 30 + 5·8                    = 70  (mín. 70)
 *   Usabilidad     = 40 + 5·6 − 1.0·8            = 62  (mín. 60)
 *   Eficiencia     = 40 + 4·4 − 1.5·8 + 0.5·2    = 45  (mín. 40)
 *   Mantenibilidad = 30 + 4·2 − 1.0·4            = 34
 * Cumple las 3 restricciones obligatorias. Con un reparto parejo (5, 5, 5, 5)
 * Seguridad solo llega a 55 y se incumple.
 */
export const PRESUPUESTO: PresupuestoSeed = {
  titulo: 'Equilibra la plataforma de pagos',
  objetivo:
    'Reparte 20 puntos de presupuesto entre cuatro atributos de calidad, cumple las exigencias del cliente y justifica tu decisión.',
  contexto:
    'La Cooperativa Estudiantil lanzará una plataforma para pagar cuotas y comprar en línea. Tienes 20 puntos de presupuesto (horas de trabajo del equipo) ' +
    'para invertir en cuatro atributos de calidad. Cada punto mejora el atributo donde lo pones, pero algunos atributos compiten entre sí: ' +
    'por ejemplo, reforzar la seguridad agrega pasos y cifrado que vuelven más lento y menos cómodo el sistema. ' +
    'La junta de la cooperativa fijó exigencias obligatorias: Seguridad de al menos 70, Usabilidad de al menos 60 y Eficiencia de desempeño de al menos 40. ' +
    'Observa cómo se mueven los medidores mientras repartes y elige la justificación que mejor explique tu decisión.',
  recompensaXp: 300,
  recompensaQp: 220,
  presupuesto: 20,
  atributos: [
    { atributo: 'SEGURIDAD', valorBase: 30, ganancia: 5, minimoObligatorio: 70, asignacionReferencia: 8 },
    { atributo: 'USABILIDAD', valorBase: 40, ganancia: 5, minimoObligatorio: 60, asignacionReferencia: 6 },
    { atributo: 'EFICIENCIA_DESEMPENO', valorBase: 40, ganancia: 4, minimoObligatorio: 40, asignacionReferencia: 4 },
    { atributo: 'MANTENIBILIDAD', valorBase: 30, ganancia: 4, asignacionReferencia: 2 },
  ],
  efectos: [
    { origen: 'SEGURIDAD', destino: 'EFICIENCIA_DESEMPENO', factor: -1.5 },
    { origen: 'SEGURIDAD', destino: 'USABILIDAD', factor: -1 },
    { origen: 'EFICIENCIA_DESEMPENO', destino: 'MANTENIBILIDAD', factor: -1 },
    { origen: 'MANTENIBILIDAD', destino: 'EFICIENCIA_DESEMPENO', factor: 0.5 },
  ],
  justificaciones: [
    {
      texto:
        'Prioricé Seguridad y Usabilidad porque son las que exige la junta y porque un pago inseguro o confuso hace que los usuarios abandonen; acepté que la Mantenibilidad quede más baja y la reforzaremos en una versión posterior.',
      correcta: true,
    },
    {
      texto:
        'Repartí los puntos por igual entre los cuatro atributos para que ninguno quede descuidado, ya que todos son igual de importantes.',
      correcta: false,
    },
    {
      texto:
        'Puse casi todo en Eficiencia de desempeño, porque un sistema muy rápido compensa cualquier carencia en los demás atributos.',
      correcta: false,
    },
  ],
};
