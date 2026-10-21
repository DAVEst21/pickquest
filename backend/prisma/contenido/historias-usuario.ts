import { Prisma, TipoPiezaHistoria } from '@prisma/client';

export const HISTORIAS = {
  titulo: 'Historias para La Esquina',
  objetivo:
    'Construye tres historias de usuario y sus criterios de aceptación a partir de las necesidades de la cafetería.',
  contexto:
    'La cafetería La Esquina necesita registrar pedidos por mesa, cobrar cuentas y avisar sobre ingredientes escasos. Construye cada historia con Como / Quiero / Para y su criterio Dado / Cuando / Entonces. Hay piezas distractoras: no todas pertenecen al caso.',
  recompensaXp: 200,
  recompensaQp: 120,
};
export const TIPOS_HISTORIA: TipoPiezaHistoria[] = [
  'ROL',
  'FUNCIONALIDAD',
  'BENEFICIO',
  'DADO',
  'CUANDO',
  'ENTONCES',
];
const HISTORIAS_SEED = [
  {
    necesidad:
      'El mesero necesita capturar pedidos por mesa y enviarlos a cocina para evitar pedidos extraviados.',
    piezas: [
      'mesero',
      'registrar el pedido de una mesa',
      'evitar que se pierdan pedidos',
      'una mesa con clientes y un mesero autenticado',
      'el mesero confirma los productos del pedido',
      'el pedido queda asociado a la mesa y aparece en cocina',
    ],
  },
  {
    necesidad:
      'La cajera necesita cobrar la cuenta y registrar el pago para cerrar cada venta correctamente.',
    piezas: [
      'cajera',
      'registrar el pago de una cuenta',
      'cerrar la venta con un comprobante',
      'una cuenta abierta con su importe calculado',
      'la cajera confirma un pago válido',
      'la cuenta queda pagada y se genera su comprobante',
    ],
  },
  {
    necesidad:
      'El encargado necesita recibir avisos de ingredientes con existencias bajas para comprarlos a tiempo.',
    piezas: [
      'encargado de inventario',
      'recibir avisos de ingredientes escasos',
      'reponer ingredientes antes de que se agoten',
      'un ingrediente con un mínimo de existencias configurado',
      'las existencias del ingrediente caen por debajo del mínimo',
      'el sistema muestra un aviso de reposición al encargado',
    ],
  },
];
const DISTRACTORES = [
  'piloto de avión',
  'reservar vuelos internacionales',
  'acumular millas de viajero',
  'un aeropuerto con vuelos disponibles',
  'el pasajero selecciona un destino',
  'se emite un pase de abordar',
];

/** Banco mezclado: ni los IDs ni el orden público agrupan la referencia por historia. */
export async function crearHistorias(
  tx: Prisma.TransactionClient,
  retoId: number,
) {
  const entradas = HISTORIAS_SEED.flatMap((h, historia) =>
    h.piezas.map((texto, tipo) => ({ texto, tipo, historia })),
  );
  entradas.push(
    ...DISTRACTORES.map((texto, tipo) => ({ texto, tipo, historia: -1 })),
  );
  const mezcladas = entradas
    .map((e, i) => ({ ...e, mezcla: (i * 13 + 7) % 24 }))
    .sort((a, b) => a.mezcla - b.mezcla);
  const ids = new Map<string, number>();
  for (const [orden, e] of mezcladas.entries()) {
    const pieza = await tx.piezaHistoria.create({
      data: {
        retoId,
        tipo: TIPOS_HISTORIA[e.tipo],
        texto: e.texto,
        orden: orden + 1,
      },
    });
    ids.set(`${e.historia}/${e.tipo}`, pieza.id);
  }
  for (const [indice, h] of HISTORIAS_SEED.entries()) {
    await tx.historiaUsuario.create({
      data: {
        retoId,
        orden: indice + 1,
        necesidad: h.necesidad,
        casillas: {
          create: TIPOS_HISTORIA.map((tipo, i) => ({
            tipo,
            piezaCorrectaId: ids.get(`${indice}/${i}`)!,
          })),
        },
      },
    });
  }
}
