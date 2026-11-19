import { ParteEscenario } from '@prisma/client';
import { RetoBase } from './tipos';

/**
 * CU-05 Simulador de escenarios de calidad (RF-08, RN-20). Fase 3, reto 2.
 *
 * Modelo de la app ficticia: tiempo(carga) = 0.8 + 0.0008 × carga (segundos).
 *   con 1 500 usuarios → 2.0 s · con 2 000 → 2.4 s · con 2 500 → 2.8 s · con 5 000 → 4.8 s.
 * Rango aceptable (RN-20): valor entre 2 y 3 segundos con 1 500 a 2 500 usuarios.
 * Es alcanzable: con 2 000 usuarios y un máximo de 3 s la app responde en 2.4 s y el
 * escenario se cumple; con 3 000 usuarios (3.2 s) ya no.
 */
export interface EscenarioCalidadSeed extends RetoBase {
  necesidadVaga: string;
  contextoApp: string;
  nombreMetrica: string;
  nombreCarga: string;
  unidades: string[];
  unidadCorrecta: string;
  valorMinSlider: number;
  valorMaxSlider: number;
  pasoSlider: number;
  cargaMinSlider: number;
  cargaMaxSlider: number;
  pasoCarga: number;
  valorMinAceptable: number;
  valorMaxAceptable: number;
  cargaMinAceptable: number;
  cargaMaxAceptable: number;
  simBase: number;
  simPendiente: number;
  partes: Record<ParteEscenario, { texto: string; correcta?: boolean }[]>;
}

export const ESCENARIO_CALIDAD: EscenarioCalidadSeed = {
  titulo: 'Calibra el escenario de Compras Express',
  objetivo:
    'Convierte la necesidad «la app tiene que ser rápida» en un escenario de calidad medible y compruébalo en un simulador.',
  contexto:
    'Compras Express es una app de compras para celulares. La dirección pidió: «La app tiene que ser rápida en temporada alta». ' +
    'Esa frase no se puede probar. Escribe un escenario de calidad de seis partes: elige quién provoca la situación (fuente), qué ocurre (estímulo), ' +
    'qué parte del sistema se ve afectada (artefacto), en qué condiciones está (entorno) y qué debe hacer el sistema (respuesta). ' +
    'Después define la medida de respuesta: cuánto tiempo, en qué unidad y con cuántos usuarios al mismo tiempo. ' +
    'Puedes ejecutar hasta 5 simulaciones para ver cómo se comporta la app, y luego enviar tu escenario.',
  recompensaXp: 280,
  recompensaQp: 200,
  necesidadVaga: 'La app tiene que ser rápida en temporada alta.',
  contextoApp:
    'Compras Express: catálogo, carrito y pago desde el celular. En temporada alta (Buen Fin y diciembre) llegan miles de compradores al mismo tiempo.',
  nombreMetrica: 'Tiempo de respuesta',
  nombreCarga: 'usuarios concurrentes',
  unidades: ['segundos', 'milisegundos', 'minutos', 'pedidos por hora'],
  unidadCorrecta: 'segundos',
  valorMinSlider: 0.5,
  valorMaxSlider: 10,
  pasoSlider: 0.5,
  cargaMinSlider: 100,
  cargaMaxSlider: 5000,
  pasoCarga: 100,
  valorMinAceptable: 2,
  valorMaxAceptable: 3,
  cargaMinAceptable: 1500,
  cargaMaxAceptable: 2500,
  simBase: 0.8,
  simPendiente: 0.0008,
  partes: {
    FUENTE: [
      { texto: 'Compradores que usan la app desde su celular', correcta: true },
      { texto: 'Un administrador de la base de datos' },
      { texto: 'Un atacante que intenta robar contraseñas' },
      { texto: 'El equipo que diseña el logotipo' },
    ],
    ESTIMULO: [
      { texto: 'Hacen pedidos y pagos al mismo tiempo', correcta: true },
      { texto: 'Piden cambiar el color de los botones' },
      { texto: 'Intentan entrar con una contraseña incorrecta' },
      { texto: 'Cambian el idioma de la aplicación' },
    ],
    ARTEFACTO: [
      { texto: 'El servicio de pedidos y pagos de la app', correcta: true },
      { texto: 'El manual de usuario en PDF' },
      { texto: 'La red wifi de la oficina' },
      { texto: 'La página de «Quiénes somos»' },
    ],
    ENTORNO: [
      { texto: 'Operación normal en temporada alta, con mucha demanda', correcta: true },
      { texto: 'Mantenimiento programado de madrugada, sin usuarios' },
      { texto: 'Un servidor apagado por una falla total' },
      { texto: 'Una computadora de desarrollo con un solo usuario' },
    ],
    RESPUESTA: [
      { texto: 'El sistema procesa cada pedido y confirma la compra', correcta: true },
      { texto: 'El sistema cierra la sesión del comprador' },
      { texto: 'El sistema pide que vuelva a intentarlo mañana' },
      { texto: 'El sistema guarda el pedido sin confirmarlo' },
    ],
  },
};
