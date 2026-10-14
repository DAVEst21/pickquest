import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { configurarApp } from '../src/app.setup';
import { PrismaService } from '../src/common/prisma/prisma.service';

/** Utilidades compartidas por las pruebas e2e del Sprint 2. Requieren la base migrada y con el seed cargado. */

export interface EstudiantePrueba {
  id: number;
  token: string;
  email: string;
}

export async function crearApp(): Promise<{ app: INestApplication; prisma: PrismaService }> {
  const modulo = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = modulo.createNestApplication();
  configurarApp(app);
  await app.init();
  return { app, prisma: app.get(PrismaService) };
}

export const http = (app: INestApplication) => request(app.getHttpServer());
export const auth = (e: EstudiantePrueba) => ({ Authorization: `Bearer ${e.token}` });

let contador = 0;

/** Registra un estudiante por la API y le da `pociones` Pociones de Sabiduría EQUIPADAS. */
export async function nuevoEstudiante(
  app: INestApplication,
  prisma: PrismaService,
  pociones = 3,
): Promise<EstudiantePrueba> {
  const sufijo = `${Date.now()}_${contador++}`;
  const email = `e2e_${sufijo}@test.local`;
  const res = await http(app)
    .post('/auth/registro')
    .send({ email, password: 'contrasena-e2e', nombreAventurero: `e2e_${sufijo}` })
    .expect(201);
  const estudiante = { id: res.body.estudiante.id as number, token: res.body.accessToken as string, email };
  if (pociones > 0) {
    const pocion = await prisma.objeto.findUniqueOrThrow({ where: { nombre: 'Poción de Sabiduría' } });
    await prisma.inventarioObjeto.create({
      data: { estudianteId: estudiante.id, objetoId: pocion.id, cantidad: pociones, equipado: true },
    });
  }
  return estudiante;
}

export async function borrarEstudiantes(prisma: PrismaService, ids: number[]) {
  // Los intentos y sus respuestas se borran en cascada con el estudiante.
  await prisma.estudiante.deleteMany({ where: { id: { in: ids } } });
}

export async function idPocion(prisma: PrismaService): Promise<number> {
  return (await prisma.objeto.findUniqueOrThrow({ where: { nombre: 'Poción de Sabiduría' } })).id;
}

/** Retos del seed en el orden en que se resuelven. */
export async function retosEnOrden(prisma: PrismaService) {
  return prisma.reto.findMany({
    orderBy: [{ fase: { orden: 'asc' } }, { orden: 'asc' }],
    include: { fase: true },
  });
}

/** Preguntas del diálogo, en el orden con que se descubren los 6 requerimientos en 11 turnos. */
export const PLAN_DIALOGO_PERFECTO = [
  '¿Cómo se toman hoy los pedidos en la cafetería?',
  '¿Cómo le gustaría que llegara el pedido a la cocina?',
  '¿Qué tan rápido tendría que aprender a usarlo un mesero nuevo?',
  '¿Cuánto tarda la cocina en enterarse de un pedido?',
  '¿Qué tan rápido necesita ver un pedido nuevo en la cocina?',
  '¿Qué pasa en las horas en que hay más clientes?',
  '¿Qué formas de pago necesita aceptar y cómo se divide la cuenta?',
  '¿Qué pasa con el cobro si falla el internet del local?',
  '¿Podría el sistema seguir funcionando aunque no haya internet?',
  '¿Cómo controla los ingredientes que se gastan?',
  '¿Cómo le gustaría enterarse de que un ingrediente se está acabando?',
];

export async function opcionPorPregunta(prisma: PrismaService, retoId: number, pregunta: string) {
  return prisma.opcionDialogo.findFirstOrThrow({ where: { pregunta, nodo: { retoId } } });
}

export async function iniciarIntento(app: INestApplication, e: EstudiantePrueba, retoId: number) {
  const res = await http(app).post(`/retos/${retoId}/intentos`).set(auth(e)).expect(201);
  return res.body;
}

/**
 * Deja el intento en curso con una respuesta completa. `perfecto` = la
 * solución de referencia (100%); `malo` = una respuesta completa pero
 * claramente reprobatoria.
 */
export async function resolver(
  app: INestApplication,
  prisma: PrismaService,
  e: EstudiantePrueba,
  intento: { intentoId: number; reto: { id: number; mecanica: string } },
  modo: 'perfecto' | 'malo' = 'perfecto',
): Promise<void> {
  const retoId = intento.reto.id;
  const base = `/intentos/${intento.intentoId}`;
  const guardar = (cuerpo: object) => http(app).put(`${base}/borrador`).set(auth(e)).send(cuerpo).expect(200);

  switch (intento.reto.mecanica) {
    case 'LINEA_TIEMPO': {
      const bloques = await prisma.bloquePlan.findMany({ where: { retoId } });
      const entregables = await prisma.entregablePlan.findMany({ where: { retoId } });
      const primeraFase = bloques.find((b) => b.tipo === 'FASE')!;
      await guardar(
        modo === 'perfecto'
          ? {
              posiciones: bloques.map((b) => ({ bloqueId: b.id, inicioSemana: b.inicioReferencia })),
              asociaciones: entregables.map((x) => ({ entregableId: x.id, faseBloqueId: x.faseCorrectaId })),
            }
          : {
              posiciones: bloques.map((b) => ({ bloqueId: b.id, inicioSemana: 0 })),
              asociaciones: entregables.map((x) => ({ entregableId: x.id, faseBloqueId: primeraFase.id })),
            },
      );
      return;
    }
    case 'TABLERO_MOSCOW': {
      const tarjetas = await prisma.tarjetaRequerimiento.findMany({ where: { retoId } });
      await guardar({
        tarjetas: tarjetas.map((t) =>
          modo === 'perfecto'
            ? {
                tarjetaId: t.id,
                columna: t.columnaCorrecta,
                tipo: t.tipoCorrecto,
                ordenMust: t.ordenMustReferencia,
              }
            : { tarjetaId: t.id, columna: 'WONT', tipo: 'FUNCIONAL' },
        ),
      });
      return;
    }
    case 'INSPECCION_SISTEMA': {
      const elementos = await prisma.elementoPantalla.findMany({
        where: { pantalla: { retoId } },
        include: { falla: true },
      });
      const marcas =
        modo === 'perfecto'
          ? elementos.filter((x) => x.falla).map((x) => ({ elementoId: x.id, atributo: x.falla!.atributo }))
          : elementos.filter((x) => !x.falla).slice(0, 3).map((x) => ({ elementoId: x.id, atributo: 'USABILIDAD' }));
      await guardar({ marcas });
      return;
    }
    case 'REPARTO_PRESUPUESTO': {
      const atributos = await prisma.atributoEscenario.findMany({ where: { retoId } });
      const justificaciones = await prisma.opcionJustificacion.findMany({ where: { retoId } });
      const elegida = justificaciones.find((j) => j.correcta === (modo === 'perfecto'))!;
      await guardar({
        asignaciones: atributos.map((a) => ({
          atributoEscenarioId: a.id,
          puntos: modo === 'perfecto' ? a.asignacionReferencia : 5,
        })),
        justificacionId: elegida.id,
      });
      return;
    }
    case 'DIALOGO_STAKEHOLDER': {
      const stakeholder = await prisma.stakeholder.findUniqueOrThrow({ where: { retoId } });
      await http(app)
        .post(`${base}/dialogo/tecnica`)
        .set(auth(e))
        .send({ tecnica: modo === 'perfecto' ? stakeholder.tecnicaCorrecta : 'CUESTIONARIO' })
        .expect(200);
      const plan = modo === 'perfecto' ? PLAN_DIALOGO_PERFECTO : ['¿De qué color quiere que sea la aplicación?'];
      for (const pregunta of plan) {
        const opcion = await opcionPorPregunta(prisma, retoId, pregunta);
        await http(app)
          .post(`${base}/dialogo/turnos`)
          .set(auth(e))
          .send({ opcionId: opcion.id })
          .expect(200);
      }
      return;
    }
    default:
      throw new Error(`Mecánica sin resolver en la prueba: ${intento.reto.mecanica}`);
  }
}

/** Inicia, resuelve y envía un reto; devuelve la respuesta de /enviar. */
export async function jugarReto(
  app: INestApplication,
  prisma: PrismaService,
  e: EstudiantePrueba,
  retoId: number,
  modo: 'perfecto' | 'malo' = 'perfecto',
  conAyuda = false,
) {
  const intento = await iniciarIntento(app, e, retoId);
  await resolver(app, prisma, e, intento, modo);
  if (conAyuda) {
    await http(app)
      .post(`/intentos/${intento.intentoId}/ayuda`)
      .set(auth(e))
      .send({ objetoId: await idPocion(prisma) })
      .expect(200);
  }
  const res = await http(app).post(`/intentos/${intento.intentoId}/enviar`).set(auth(e)).expect(200);
  return res.body;
}

/** Aprueba (100%) todos los retos de las fases indicadas, en orden. */
export async function aprobarFases(
  app: INestApplication,
  prisma: PrismaService,
  e: EstudiantePrueba,
  hastaFaseOrden: number,
) {
  for (const reto of await retosEnOrden(prisma)) {
    if (reto.fase.orden > hastaFaseOrden) break;
    await jugarReto(app, prisma, e, reto.id);
  }
}

/** Todas las claves (recursivamente) de un objeto JSON. */
export function clavesDe(valor: unknown, acumulado = new Set<string>()): Set<string> {
  if (Array.isArray(valor)) valor.forEach((v) => clavesDe(v, acumulado));
  else if (valor && typeof valor === 'object') {
    for (const [clave, v] of Object.entries(valor)) {
      acumulado.add(clave);
      clavesDe(v, acumulado);
    }
  }
  return acumulado;
}
