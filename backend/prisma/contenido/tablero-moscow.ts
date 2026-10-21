import { MoscowSeed } from './tipos';

/**
 * CU-03 (fase 2, reto 2). Prioriza los requerimientos de la cafetería
 * "La Esquina" para su primera versión.
 *
 * Capacidad de MUST = 20 puntos. MUST de referencia = 18 puntos (4 tarjetas).
 * Hay una tarjeta muy atractiva (programa de puntos, 8 pts) y otra útil
 * (inventario, 5 pts) que, si se meten a MUST, rebasan la capacidad.
 */
export const MOSCOW: MoscowSeed = {
  titulo: 'Prioriza el sistema de La Esquina',
  objetivo:
    'Clasifica 10 requerimientos en MUST, SHOULD, COULD y WONT sin pasarte de la capacidad, y ordena los imprescindibles.',
  contexto:
    'Ya conversaste con Don Ramón y tienes la lista de lo que le gustaría tener en el sistema de la cafetería. ' +
    'El equipo solo puede construir 20 puntos de esfuerzo para la primera versión, así que no todo puede ser imprescindible. ' +
    'Pasa cada tarjeta a la columna que le corresponde (MUST: sin esto el sistema no sirve; SHOULD: importante pero no vital; ' +
    'COULD: deseable si sobra tiempo; WONT: no se hará en esta versión), indica si es un requerimiento funcional (RF) o no funcional (RNF) ' +
    'y ordena las tarjetas de MUST de la más urgente a la menos urgente. Los puntos de MUST no pueden pasar de la capacidad.',
  recompensaXp: 220,
  recompensaQp: 150,
  capacidad: 20,
  tarjetas: [
    {
      texto: 'Los meseros toman el pedido en una tablet y llega directo a la cocina',
      puntos: 5,
      columnaCorrecta: 'MUST',
      tipoCorrecto: 'FUNCIONAL',
      ordenMustReferencia: 1,
    },
    {
      texto: 'Cobrar la cuenta en efectivo y con tarjeta',
      puntos: 5,
      columnaCorrecta: 'MUST',
      tipoCorrecto: 'FUNCIONAL',
      ordenMustReferencia: 2,
    },
    {
      texto: 'Poder seguir tomando pedidos aunque se caiga el internet',
      puntos: 5,
      columnaCorrecta: 'MUST',
      tipoCorrecto: 'NO_FUNCIONAL',
      ordenMustReferencia: 3,
    },
    {
      texto: 'El pedido aparece en la pantalla de la cocina en menos de 3 segundos',
      puntos: 3,
      columnaCorrecta: 'MUST',
      tipoCorrecto: 'NO_FUNCIONAL',
      ordenMustReferencia: 4,
    },
    {
      texto: 'Descontar ingredientes del inventario y avisar cuando se estén acabando',
      puntos: 5,
      columnaCorrecta: 'SHOULD',
      tipoCorrecto: 'FUNCIONAL',
    },
    {
      texto: 'Dividir la cuenta entre varios comensales',
      puntos: 3,
      columnaCorrecta: 'SHOULD',
      tipoCorrecto: 'FUNCIONAL',
    },
    {
      texto: 'Un mesero nuevo aprende a usar el sistema en menos de 15 minutos',
      puntos: 2,
      columnaCorrecta: 'SHOULD',
      tipoCorrecto: 'NO_FUNCIONAL',
    },
    {
      texto: 'Programa de puntos y recompensas para clientes frecuentes',
      puntos: 8,
      columnaCorrecta: 'COULD',
      tipoCorrecto: 'FUNCIONAL',
    },
    {
      texto: 'Reporte semanal de ventas con gráficas de colores',
      puntos: 5,
      columnaCorrecta: 'COULD',
      tipoCorrecto: 'FUNCIONAL',
    },
    {
      texto: 'Aplicación móvil para que los clientes pidan desde su casa',
      puntos: 13,
      columnaCorrecta: 'WONT',
      tipoCorrecto: 'FUNCIONAL',
    },
  ],
};
