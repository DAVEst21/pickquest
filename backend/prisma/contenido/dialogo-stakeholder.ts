import { DialogoSeed } from './tipos';

/**
 * CU-01 (fase 2, reto 1). Don Ramón, dueño de la cafetería "La Esquina".
 *
 * 6 requerimientos ocultos (R4, R5 y R6 son no funcionales) y 10 nodos.
 * Jugando perfecto se descubren los 6 en 11 turnos (hay 12): hay que moverse
 * entre temas (N1 → tema → pregunta que revela → ...) y cada pregunta
 * improductiva cuesta un turno y 5 puntos.
 */
export const DIALOGO: DialogoSeed = {
  titulo: 'Entrevista con Don Ramón',
  objetivo:
    'Descubre, conversando con el dueño de una cafetería, los 6 requerimientos que necesita su sistema de pedidos.',
  contexto:
    'Don Ramón es el dueño de la cafetería "La Esquina" y el único que conoce todo el negocio: cocina, cobro, compras y meseros. ' +
    'Quiere un sistema para dejar de perder pedidos en horas de mucha clientela, pero no sabe explicar con claridad qué necesita. ' +
    'Tienes un rato con él, a solas, para conversar. Primero elige la técnica de elicitación que mejor se adapta a este caso y luego ' +
    'hazle preguntas. Cada turno cuenta: cuando se acaben, la entrevista termina. Anota en tu libreta los requerimientos que vayas descubriendo ' +
    'y evita las preguntas que no aportan información útil.',
  recompensaXp: 200,
  recompensaQp: 120,
  stakeholder: {
    nombre: 'Don Ramón',
    rol: 'Dueño de la cafetería "La Esquina"',
    retrato: 'cafetero',
    tecnicaCorrecta: 'ENTREVISTA',
    turnosMaximos: 12,
  },
  requerimientos: [
    {
      codigo: 'R1',
      descripcion:
        'El mesero debe poder capturar el pedido de cada mesa en una tablet y que llegue automáticamente a la cocina.',
    },
    {
      codigo: 'R2',
      descripcion:
        'El sistema debe descontar del inventario los ingredientes de cada platillo vendido y avisar cuando alguno esté por acabarse.',
    },
    {
      codigo: 'R3',
      descripcion:
        'El sistema debe permitir cobrar en efectivo, con tarjeta o por transferencia, y dividir una cuenta entre varios comensales.',
    },
    {
      codigo: 'R4',
      descripcion:
        'Un pedido nuevo debe aparecer en la pantalla de la cocina en menos de 3 segundos (requisito de desempeño).',
    },
    {
      codigo: 'R5',
      descripcion:
        'Un mesero nuevo debe poder aprender a usar el sistema en menos de 15 minutos (requisito de usabilidad).',
    },
    {
      codigo: 'R6',
      descripcion:
        'El sistema debe seguir tomando pedidos aunque se caiga el internet y sincronizarlos al volver la conexión (requisito de disponibilidad).',
    },
  ],
  nodos: [
    {
      clave: 'N1',
      inicial: true,
      intervencion:
        'Pase, pase, joven. La cafetería es mi vida, pero los sábados me vuelvo loco y acabo perdiendo plata. ¿Qué quiere saber?',
      opciones: [
        {
          pregunta: '¿Cómo se toman hoy los pedidos en la cafetería?',
          respuesta: 'Ah, ahí sí hay tela que cortar. Le cuento cómo trabajamos con los pedidos.',
          productiva: true,
          siguiente: 'N2',
        },
        {
          pregunta: '¿Qué pasa en las horas en que hay más clientes?',
          respuesta: 'Uf, eso es lo que más me quita el sueño. Déjeme explicarle.',
          productiva: true,
          siguiente: 'N3',
        },
        {
          pregunta: '¿Cómo controla los ingredientes que se gastan?',
          respuesta: 'Esa es otra historia, joven. Siéntese que le cuento.',
          productiva: true,
          siguiente: 'N4',
        },
        {
          pregunta: '¿Quiénes son sus clientes habituales?',
          respuesta: 'Muchos son estudiantes y gente de las oficinas de la cuadra.',
          productiva: true,
          siguiente: 'N9',
        },
        {
          pregunta: '¿De qué color quiere que sea la aplicación?',
          respuesta: 'Pues... azul, supongo. Pero eso no es lo que me quita el sueño, joven.',
          productiva: false,
        },
      ],
    },
    {
      clave: 'N2',
      intervencion:
        'Los meseros anotan los pedidos en una libreta y corren a la cocina. Los sábados se pierden hojas y se equivocan los platillos.',
      opciones: [
        {
          pregunta: '¿Cómo le gustaría que llegara el pedido a la cocina?',
          respuesta:
            'Lo ideal sería que el mesero lo apunte en una tablet, ahí mismo en la mesa, y que le aparezca directo al cocinero sin tener que correr.',
          productiva: true,
          revela: 'R1',
          siguiente: 'N2',
        },
        {
          pregunta: '¿Qué tan rápido tendría que aprender a usarlo un mesero nuevo?',
          respuesta:
            'Mucho: aquí los meseros rotan y a veces entra uno nuevo el mismo sábado. Si no lo aprende en unos 15 minutos, no sirve.',
          productiva: true,
          revela: 'R5',
          siguiente: 'N2',
        },
        {
          pregunta: '¿Cuánto tarda la cocina en enterarse de un pedido?',
          respuesta: 'Depende. Pase a la cocina y le cuento lo que pasa allá.',
          productiva: true,
          siguiente: 'N5',
        },
        {
          pregunta: '¿Cuántos meseros trabajan en cada turno?',
          respuesta: 'Le cuento cómo está el equipo.',
          productiva: true,
          siguiente: 'N8',
        },
        {
          pregunta: '¿Y si mejor los meseros memorizan los pedidos?',
          respuesta: 'Ja, ja. Ya lo intentamos y fue peor. Los clientes piden de todo.',
          productiva: false,
        },
      ],
    },
    {
      clave: 'N3',
      intervencion:
        'Cuando hay mucha gente, el cobro es un caos: unos pagan con tarjeta, otros en efectivo, y los grupos grandes quieren dividir la cuenta.',
      opciones: [
        {
          pregunta: '¿Qué formas de pago necesita aceptar y cómo se divide la cuenta?',
          respuesta:
            'Efectivo, tarjeta y transferencia, las tres. Y que se pueda partir la cuenta entre los comensales sin sacar la calculadora.',
          productiva: true,
          revela: 'R3',
          siguiente: 'N3',
        },
        {
          pregunta: '¿Qué pasa con el cobro si falla el internet del local?',
          respuesta: 'Uy, eso nos ha pasado. Le cuento.',
          productiva: true,
          siguiente: 'N6',
        },
        {
          pregunta: '¿Cuántas mesas tiene la cafetería?',
          respuesta: 'Tengo doce mesas y la barra con seis lugares.',
          productiva: true,
          siguiente: 'N3',
        },
        {
          pregunta: '¿Qué opina de los sistemas de pago de las cadenas famosas?',
          respuesta: 'No sé, yo nunca he trabajado en una cadena. Eso no me ayuda mucho.',
          productiva: false,
        },
      ],
    },
    {
      clave: 'N4',
      intervencion:
        'Cada fin de semana reviso lo que sobra y lo que falta, pero siempre me quedo sin algún ingrediente justo en el peor momento.',
      opciones: [
        {
          pregunta: '¿Cómo le gustaría enterarse de que un ingrediente se está acabando?',
          respuesta:
            'Que el sistema reste solito lo que se gasta en cada platillo que vendo y me avise cuando quede poco de algo, antes de que se acabe.',
          productiva: true,
          revela: 'R2',
          siguiente: 'N4',
        },
        {
          pregunta: '¿Quién hace las compras de los ingredientes?',
          respuesta: 'Yo mismo, cada lunes.',
          productiva: true,
          siguiente: 'N7',
        },
        {
          pregunta: '¿Qué ingredientes se le acaban más rápido?',
          respuesta: 'La leche, el café molido y el pan. Siempre esos tres.',
          productiva: true,
          siguiente: 'N4',
        },
        {
          pregunta: '¿Ha pensado en abrir otra sucursal?',
          respuesta: 'Algún día, pero primero quiero arreglar esta.',
          productiva: false,
        },
      ],
    },
    {
      clave: 'N5',
      intervencion:
        'En la cocina el cocinero necesita ver el pedido al momento. Si tarda en enterarse, la comida sale fría y el cliente se enoja.',
      opciones: [
        {
          pregunta: '¿Qué tan rápido necesita ver un pedido nuevo en la cocina?',
          respuesta:
            'Casi al instante. Si pasan más de unos 3 segundos desde que el mesero lo manda, ya me parece lento; con 10 pedidos a la vez se desordena todo.',
          productiva: true,
          revela: 'R4',
        },
        {
          pregunta: '¿Cuántos cocineros trabajan por turno?',
          respuesta: 'Dos, y un ayudante los sábados.',
          productiva: true,
          siguiente: 'N5',
        },
        {
          pregunta: '¿No prefiere que la cocina siga con papelitos impresos?',
          respuesta: 'Los papelitos son justo el problema, joven. Se mojan y se pierden.',
          productiva: false,
        },
      ],
    },
    {
      clave: 'N6',
      intervencion:
        'El internet del local se cae seguido, sobre todo cuando llueve. Ya perdimos ventas por eso.',
      opciones: [
        {
          pregunta: '¿Podría el sistema seguir funcionando aunque no haya internet?',
          respuesta:
            'Eso sería lo máximo: que siga tomando pedidos aunque se caiga el internet y que ya cuando regrese mande todo lo pendiente.',
          productiva: true,
          revela: 'R6',
        },
        {
          pregunta: '¿Cuántas veces a la semana se cae el internet?',
          respuesta: 'Unas tres o cuatro, casi siempre en la tarde.',
          productiva: true,
          siguiente: 'N6',
        },
        {
          pregunta: '¿Ha pensado en cambiar de compañía de internet?',
          respuesta: 'Ya cambié dos veces y es lo mismo. Eso no es lo que quiero resolver.',
          productiva: false,
        },
      ],
    },
    {
      clave: 'N7',
      intervencion:
        'Compro todos los lunes al mismo proveedor, pero los precios cambian y a veces compro de más o de menos.',
      opciones: [
        {
          pregunta: '¿Qué necesita ver antes de hacerle el pedido a su proveedor?',
          respuesta:
            'Cuánto me queda de cada cosa y cuánto gasté. Si el sistema descuenta el inventario con cada venta y me avisa cuando algo está por acabarse, compro bien.',
          productiva: true,
          revela: 'R2',
        },
        {
          pregunta: '¿Cada cuánto le cambia los precios su proveedor?',
          respuesta: 'Más o menos cada mes.',
          productiva: true,
          siguiente: 'N7',
        },
        {
          pregunta: '¿Por qué no compra con otro proveedor más barato?',
          respuesta: 'Porque este me fía. Pero eso no tiene que ver con el sistema.',
          productiva: false,
        },
      ],
    },
    {
      clave: 'N8',
      intervencion:
        'Somos cuatro meseros por turno, pero los sábados llegamos a ocho. Entran y salen todo el tiempo.',
      opciones: [
        {
          pregunta: '¿Cuánto tiempo puede dedicar un mesero nuevo a aprender el sistema?',
          respuesta:
            'Muy poco: unos 15 minutos antes de empezar su turno, no más. Tiene que ser fácil, que casi se explique solo.',
          productiva: true,
          revela: 'R5',
        },
        {
          pregunta: '¿Qué dispositivos tienen hoy los meseros?',
          respuesta: 'Casi todos traen celular, pero no quiero depender de los suyos.',
          productiva: true,
          siguiente: 'N8',
        },
        {
          pregunta: '¿Cree que sus meseros son lentos?',
          respuesta: 'No, son muy trabajadores. Lo que falla es el sistema de papel.',
          productiva: false,
        },
      ],
    },
    {
      clave: 'N9',
      intervencion:
        'Vienen muchos estudiantes y oficinistas. Al mediodía y los sábados por la noche se llena el local.',
      opciones: [
        {
          pregunta: '¿A qué horas se llena más el local?',
          respuesta: 'De una a tres de la tarde y los sábados por la noche. Ahí es donde más pierdo.',
          productiva: true,
          siguiente: 'N10',
        },
        {
          pregunta: '¿Qué les piden los clientes que hoy no pueden tener?',
          respuesta: 'Pagar con tarjeta sin esperar y que no se equivoquen sus pedidos.',
          productiva: true,
          siguiente: 'N9',
        },
        {
          pregunta: '¿Piensa hacer promociones en redes sociales?',
          respuesta: 'Tal vez más adelante. Primero quiero que los pedidos salgan bien.',
          productiva: false,
        },
      ],
    },
    {
      clave: 'N10',
      intervencion:
        'En esos horarios entran diez o más pedidos al mismo tiempo y la cocina se vuelve un desorden.',
      opciones: [
        {
          pregunta: '¿Qué necesita la cocina cuando entran tantos pedidos a la vez?',
          respuesta:
            'Verlos todos juntos y al instante, en una pantalla; si un pedido tarda más de unos 3 segundos en aparecer, ya se me enredó la cocina.',
          productiva: true,
          revela: 'R4',
        },
        {
          pregunta: '¿Qué día vende menos?',
          respuesta: 'Los martes, casi nadie viene.',
          productiva: true,
          siguiente: 'N10',
        },
        {
          pregunta: '¿Piensa cerrar más temprano esos días?',
          respuesta: 'No, ¿cómo se le ocurre? Si es cuando más vendo.',
          productiva: false,
        },
      ],
    },
  ],
};
