/**
 * Seed del Sprint 2: 3 fases y 6 retos, uno por mecánica implementada
 * (CU-08, CU-01, CU-03, CU-04 y CU-06). El contenido de cada reto vive en
 * tablas relacionales (ver prisma/contenido/*.ts), no en JSON.
 *
 * Es idempotente: se puede ejecutar varias veces sin duplicar datos.
 *  - Fases, retos, objetos y estudiante demo se actualizan por clave natural.
 *  - El contenido de un reto se reescribe completo, EXCEPTO si el reto ya
 *    tiene intentos (las respuestas de los estudiantes referencian el
 *    contenido y no se deben invalidar): en ese caso se conserva y se avisa.
 *
 * El contenido de los retos de opción múltiple del Sprint 1 está archivado
 * en prisma/contenido-archivado/ (no se usa aquí).
 */
import { Mecanica, Prisma, PrismaClient, TipoObjeto } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { calcularNivel } from '../src/modules/progreso/nivel';
import { crearHistorias, HISTORIAS } from './contenido/historias-usuario';
import { DIALOGO } from './contenido/dialogo-stakeholder';
import { FASES } from './contenido/fases';
import { INSPECCION } from './contenido/inspeccion';
import { LINEA_TIEMPO } from './contenido/linea-tiempo';
import { MOSCOW } from './contenido/tablero-moscow';
import { PRESUPUESTO } from './contenido/presupuesto';
import { RetoBase } from './contenido/tipos';

const prisma = new PrismaClient();
type Tx = Prisma.TransactionClient;

interface RetoDefinicion {
  faseOrden: number;
  orden: number;
  mecanica: Mecanica;
  base: RetoBase;
  crearContenido: (tx: Tx, retoId: number) => Promise<void>;
}

const RETOS: RetoDefinicion[] = [
  { faseOrden: 1, orden: 1, mecanica: 'LINEA_TIEMPO', base: LINEA_TIEMPO, crearContenido: crearLineaTiempo },
  { faseOrden: 2, orden: 1, mecanica: 'DIALOGO_STAKEHOLDER', base: DIALOGO, crearContenido: crearDialogo },
  { faseOrden: 2, orden: 2, mecanica: 'ARMADO_PIEZAS', base: HISTORIAS, crearContenido: crearHistorias },
  { faseOrden: 2, orden: 3, mecanica: 'TABLERO_MOSCOW', base: MOSCOW, crearContenido: crearMoscow },
  { faseOrden: 3, orden: 1, mecanica: 'INSPECCION_SISTEMA', base: INSPECCION, crearContenido: crearInspeccion },
  { faseOrden: 3, orden: 2, mecanica: 'REPARTO_PRESUPUESTO', base: PRESUPUESTO, crearContenido: crearPresupuesto },
];

const OBJETOS_SEED = [
  {
    nombre: 'Poción de Sabiduría',
    tipo: 'POCION' as TipoObjeto,
    costoQP: 50,
    efecto: 'Revela una pista contextual sobre el reto.',
    rareza: 'Común',
  },
  {
    nombre: 'Pergamino de Claridad',
    tipo: 'PERGAMINO' as TipoObjeto,
    costoQP: 100,
    efecto: 'Descarta una opción de respuesta incorrecta.',
    rareza: 'Rara',
  },
  {
    nombre: 'Reliquia del Arquitecto',
    tipo: 'RELIQUIA' as TipoObjeto,
    costoQP: 300,
    efecto: 'Otorga un 50% extra de XP en el reto actual.',
    rareza: 'Épica',
  },
];

const DEMO = {
  email: 'demo@pickquest.dev',
  password: 'pickquest123',
  nombreAventurero: 'aventurero_demo',
  avatar:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuAkK1BCQ8uGfm-oL05s5RyoOMILULmuhtykUluqRc6SeaYtNxAeZ6CjcKfWiev__MjOaHVUvHYGN6QnGKkuJwCaIA0_4Zihc1pI32IKqSSiN8PajarzaqNy-qacQnYF_ge64QGn508tpjeK3XYAYlMf3tSI053ZuLimtZf9VySuiyaGCZfRw38emwEPMwTRPSH2FtcrGSz93xx1vi4NYNRKYZA0qPEsFmy7oNgFY-G6xbXwSsNt9SLt',
};

// ---------------------------------------------------------------------
// Contenido por mecánica
// ---------------------------------------------------------------------

/** Borra el contenido de un reto (en el orden que respetan las claves foráneas). */
async function borrarContenido(tx: Tx, retoId: number) {
  await tx.historiaUsuario.deleteMany({ where: { retoId } });
  await tx.piezaHistoria.deleteMany({ where: { retoId } });
  await tx.opcionDialogo.deleteMany({ where: { nodo: { retoId } } });
  await tx.nodoDialogo.deleteMany({ where: { retoId } });
  await tx.requerimientoOculto.deleteMany({ where: { retoId } });
  await tx.stakeholder.deleteMany({ where: { retoId } });
  await tx.tarjetaRequerimiento.deleteMany({ where: { retoId } });
  await tx.tableroPriorizacion.deleteMany({ where: { retoId } });
  await tx.pantallaSimulada.deleteMany({ where: { retoId } }); // cascada: elementos y fallas
  await tx.sistemaInspeccion.deleteMany({ where: { retoId } });
  await tx.atributoEscenario.deleteMany({ where: { retoId } }); // cascada: efectos cruzados
  await tx.opcionJustificacion.deleteMany({ where: { retoId } });
  await tx.escenarioPresupuesto.deleteMany({ where: { retoId } });
  await tx.entregablePlan.deleteMany({ where: { retoId } });
  await tx.bloquePlan.deleteMany({ where: { retoId } }); // cascada: dependencias
  await tx.planProyecto.deleteMany({ where: { retoId } });
}

/** CU-08 */
async function crearLineaTiempo(tx: Tx, retoId: number) {
  const c = LINEA_TIEMPO;
  await tx.planProyecto.create({
    data: { retoId, modelo: c.modelo, duracionMaximaSemanas: c.duracionMaximaSemanas },
  });
  const idPorClave = new Map<string, number>();
  for (const b of c.bloques) {
    const { id } = await tx.bloquePlan.create({
      data: {
        retoId,
        tipo: b.tipo,
        nombre: b.nombre,
        duracionSemanas: b.duracionSemanas,
        inicioReferencia: b.inicioReferencia,
      },
    });
    idPorClave.set(b.clave, id);
  }
  await tx.dependenciaBloque.createMany({
    data: c.dependencias.map((d) => ({
      bloqueId: idPorClave.get(d.bloque)!,
      requiereId: idPorClave.get(d.requiere)!,
    })),
  });
  await tx.entregablePlan.createMany({
    data: c.entregables.map((e) => ({
      retoId,
      nombre: e.nombre,
      faseCorrectaId: idPorClave.get(e.fase)!,
    })),
  });
}

/** CU-01 */
async function crearDialogo(tx: Tx, retoId: number) {
  const c = DIALOGO;
  await tx.stakeholder.create({ data: { retoId, ...c.stakeholder } });
  const reqPorCodigo = new Map<string, number>();
  for (const r of c.requerimientos) {
    const { id } = await tx.requerimientoOculto.create({ data: { retoId, ...r } });
    reqPorCodigo.set(r.codigo, id);
  }
  const nodoPorClave = new Map<string, number>();
  for (const n of c.nodos) {
    const { id } = await tx.nodoDialogo.create({
      data: { retoId, intervencion: n.intervencion, esInicial: n.inicial ?? false },
    });
    nodoPorClave.set(n.clave, id);
  }
  for (const n of c.nodos) {
    let orden = 1;
    for (const o of n.opciones) {
      await tx.opcionDialogo.create({
        data: {
          nodoId: nodoPorClave.get(n.clave)!,
          orden: orden++,
          pregunta: o.pregunta,
          respuestaStakeholder: o.respuesta,
          productiva: o.productiva,
          requerimientoId: o.revela ? reqPorCodigo.get(o.revela)! : null,
          siguienteNodoId: o.siguiente ? nodoPorClave.get(o.siguiente)! : null,
        },
      });
    }
  }
}

/** CU-03 */
async function crearMoscow(tx: Tx, retoId: number) {
  await tx.tableroPriorizacion.create({ data: { retoId, capacidad: MOSCOW.capacidad } });
  await tx.tarjetaRequerimiento.createMany({
    data: MOSCOW.tarjetas.map((t, i) => ({
      retoId,
      orden: i + 1,
      texto: t.texto,
      puntos: t.puntos,
      columnaCorrecta: t.columnaCorrecta,
      tipoCorrecto: t.tipoCorrecto,
      ordenMustReferencia: t.ordenMustReferencia ?? null,
    })),
  });
}

/** CU-04 */
async function crearInspeccion(tx: Tx, retoId: number) {
  await tx.sistemaInspeccion.create({
    data: { retoId, nombreAplicacion: INSPECCION.nombreAplicacion, maxMarcas: INSPECCION.maxMarcas },
  });
  let ordenPantalla = 1;
  for (const p of INSPECCION.pantallas) {
    const pantalla = await tx.pantallaSimulada.create({
      data: { retoId, orden: ordenPantalla++, titulo: p.titulo },
    });
    let ordenElemento = 1;
    for (const e of p.elementos) {
      await tx.elementoPantalla.create({
        data: {
          pantallaId: pantalla.id,
          orden: ordenElemento++,
          tipo: e.tipo,
          etiqueta: e.etiqueta,
          contenido: e.contenido ?? null,
          variante: e.variante ?? null,
          falla: e.falla ? { create: e.falla } : undefined,
        },
      });
    }
  }
}

/** CU-06 */
async function crearPresupuesto(tx: Tx, retoId: number) {
  await tx.escenarioPresupuesto.create({ data: { retoId, presupuesto: PRESUPUESTO.presupuesto } });
  const idPorAtributo = new Map<string, number>();
  for (const a of PRESUPUESTO.atributos) {
    const { id } = await tx.atributoEscenario.create({
      data: {
        retoId,
        atributo: a.atributo,
        valorBase: a.valorBase,
        ganancia: new Prisma.Decimal(a.ganancia),
        minimoObligatorio: a.minimoObligatorio ?? null,
        asignacionReferencia: a.asignacionReferencia,
      },
    });
    idPorAtributo.set(a.atributo, id);
  }
  await tx.efectoCruzado.createMany({
    data: PRESUPUESTO.efectos.map((e) => ({
      origenId: idPorAtributo.get(e.origen)!,
      destinoId: idPorAtributo.get(e.destino)!,
      factor: new Prisma.Decimal(e.factor),
    })),
  });
  let orden = 1;
  for (const j of PRESUPUESTO.justificaciones) {
    await tx.opcionJustificacion.create({
      data: { retoId, orden: orden++, texto: j.texto, correcta: j.correcta },
    });
  }
}

// ---------------------------------------------------------------------

async function main() {
  const fasePorOrden = new Map<number, number>();
  for (const fase of FASES) {
    const { apoyo, ...datos } = fase;
    const { id } = await prisma.fase.upsert({
      where: { orden: fase.orden },
      update: datos,
      create: datos,
    });
    fasePorOrden.set(fase.orden, id);
    await prisma.contenidoApoyo.upsert({
      where: { faseId: id },
      update: apoyo,
      create: { faseId: id, ...apoyo },
    });
  }

  const objetosPorNombre = new Map<string, number>();
  for (const obj of OBJETOS_SEED) {
    const registro = await prisma.objeto.upsert({
      where: { nombre: obj.nombre },
      update: {
        tipo: obj.tipo,
        costoQP: obj.costoQP,
        efecto: obj.efecto,
        rareza: obj.rareza,
      },
      create: obj,
    });
    objetosPorNombre.set(obj.nombre, registro.id);
  }

  for (const def of RETOS) {
    const faseId = fasePorOrden.get(def.faseOrden)!;
    const datos = {
      mecanica: def.mecanica,
      titulo: def.base.titulo,
      objetivo: def.base.objetivo,
      contexto: def.base.contexto,
      recompensaXp: def.base.recompensaXp,
      recompensaQp: def.base.recompensaQp,
    };
    const existente = await prisma.reto.findUnique({ where: { faseId_orden: { faseId, orden: def.orden } } });
    if (existente && existente.mecanica !== def.mecanica) {
      throw new Error(`La posición ${faseId}/${def.orden} pertenece a ${existente.mecanica}; aplica las migraciones antes de cargar el seed`);
    }
    const reto = await prisma.reto.upsert({
      where: { faseId_orden: { faseId, orden: def.orden } },
      update: datos,
      create: { faseId, orden: def.orden, ...datos },
    });
    const intentos = await prisma.intentoReto.count({ where: { retoId: reto.id } });
    if (intentos > 0) {
      console.log(
        `Reto ${reto.id} (${def.mecanica}): tiene ${intentos} intento(s); el contenido NO se reescribe. ` +
          'Se conserva el contenido para no invalidar el historial.',
      );
      continue;
    }
    await prisma.$transaction(
      async (tx) => {
        await borrarContenido(tx, reto.id);
        await def.crearContenido(tx, reto.id);
      },
      { timeout: 30000 },
    );
  }

  // Estudiante demo. Arranca como cualquier estudiante nuevo (sin intentos),
  // con 3 pociones EQUIPADAS: la ayuda solo puede usar objetos equipados (RN-10).
  const demo = await prisma.estudiante.upsert({
    where: { email: DEMO.email },
    update: {},
    create: {
      email: DEMO.email,
      passwordHash: await bcrypt.hash(DEMO.password, 12),
      nombreAventurero: DEMO.nombreAventurero,
      avatar: DEMO.avatar,
      nivel: calcularNivel(0).nivel,
      xpTotal: 0,
      qpTotal: 0,
      racha: {
        create: { diasActuales: 0, diasRecord: 0, multiplicadorQP: 1.0 },
      },
    },
  });

  const pocionId = objetosPorNombre.get('Poción de Sabiduría');
  if (pocionId) {
    await prisma.inventarioObjeto.upsert({
      where: {
        estudianteId_objetoId: { estudianteId: demo.id, objetoId: pocionId },
      },
      update: { equipado: true },
      create: {
        estudianteId: demo.id,
        objetoId: pocionId,
        cantidad: 3,
        equipado: true,
      },
    });
  }

  const [fases, retos, objetos, estudiantes, intentos] = await Promise.all([
    prisma.fase.count(),
    prisma.reto.count(),
    prisma.objeto.count(),
    prisma.estudiante.count(),
    prisma.intentoReto.count(),
  ]);
  console.log(
    `Seed listo: ${fases} fases, ${retos} retos, ${objetos} objetos, ${estudiantes} estudiantes, ${intentos} intentos. ` +
      `Usuario demo: ${DEMO.email} / ${DEMO.password}`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
