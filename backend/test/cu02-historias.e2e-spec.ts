import { INestApplication } from '@nestjs/common';
import { PrismaService } from '../src/common/prisma/prisma.service';
import {
  auth,
  borrarEstudiantes,
  crearApp,
  EstudiantePrueba,
  http,
  iniciarIntento,
  nuevoEstudiante,
  resolver,
  retosEnOrden,
  idPocion,
} from './ayudas-e2e';

jest.setTimeout(60000);

describe('CU-02: armado de historias', () => {
  let app: INestApplication,
    db: PrismaService,
    reto: any,
    casillas: any[],
    piezas: any[];
  const alumnos: number[] = [];
  const nuevo = async () => {
    const e = await nuevoEstudiante(app, db);
    alumnos.push(e.id);
    return e;
  };
  const preparar = async (e: EstudiantePrueba) => {
    for (const r of await retosEnOrden(db)) {
      if (r.id === reto.id) break;
      const i = await iniciarIntento(app, e, r.id);
      await resolver(app, db, e, i);
      await http(app)
        .post(`/intentos/${i.intentoId}/enviar`)
        .set(auth(e))
        .expect(200);
    }
    return iniciarIntento(app, e, reto.id);
  };
  const guardar = (e: EstudiantePrueba, id: number, colocaciones: object[]) =>
    http(app)
      .put(`/intentos/${id}/borrador`)
      .set(auth(e))
      .send({ colocaciones });
  const perfectas = () =>
    casillas.map((c) => ({ casillaId: c.id, piezaId: c.piezaCorrectaId }));
  beforeAll(async () => {
    ({ app, prisma: db } = await crearApp());
    reto = await db.reto.findFirstOrThrow({
      where: { mecanica: 'ARMADO_PIEZAS' },
    });
    casillas = await db.casillaHistoria.findMany({
      where: { historia: { retoId: reto.id } },
      orderBy: { id: 'asc' },
    });
    piezas = await db.piezaHistoria.findMany({ where: { retoId: reto.id } });
  });
  afterAll(async () => {
    await borrarEstudiantes(db, alumnos);
    await app.close();
  });
  it('publica 3 historias y 24 piezas sin referencia, permite guardar parcialmente y rechaza envío incompleto', async () => {
    const e = await nuevo(),
      i = await preparar(e);
    expect(i.contenido.historias).toHaveLength(3);
    expect(i.contenido.piezas).toHaveLength(24);
    expect(JSON.stringify(i.contenido)).not.toMatch(
      /piezaCorrecta|esDistractor|referencias/,
    );
    await guardar(e, i.intentoId, perfectas().slice(0, 1)).expect(200);
    await http(app)
      .post(`/intentos/${i.intentoId}/enviar`)
      .set(auth(e))
      .expect(400);
    const res = await http(app)
      .get(`/intentos/${i.intentoId}`)
      .set(auth(e))
      .expect(200);
    expect(res.body.borrador.colocaciones).toEqual(perfectas().slice(0, 1));
  });
  it('rechaza tipos, IDs ajenos y piezas duplicadas sin perder el borrador', async () => {
    const e = await nuevo(),
      i = await preparar(e),
      primera = perfectas()[0];
    await guardar(e, i.intentoId, [primera]).expect(200);
    await guardar(e, i.intentoId, [
      {
        casillaId: casillas[0].id,
        piezaId: piezas.find((p) => p.tipo !== casillas[0].tipo).id,
      },
    ]).expect(400);
    await guardar(e, i.intentoId, [
      { casillaId: 9999999, piezaId: primera.piezaId },
    ]).expect(400);
    const otra = casillas.find(
      (c) => c.id !== casillas[0].id && c.tipo === casillas[0].tipo,
    );
    await guardar(e, i.intentoId, [
      primera,
      { casillaId: otra.id, piezaId: primera.piezaId },
    ]).expect(400);
    const res = await http(app)
      .get(`/intentos/${i.intentoId}`)
      .set(auth(e))
      .expect(200);
    expect(res.body.borrador.colocaciones).toEqual([primera]);
  });
  it('guarda ayuda relacional, retira exactamente 2 distractores y no permite reutilizarlos; límite 2 estrellas', async () => {
    const e = await nuevo(),
      i = await preparar(e);
    const ruta = `/intentos/${i.intentoId}`;
    const ayuda = await http(app)
      .post(ruta + '/ayuda')
      .set(auth(e))
      .send({ objetoId: await idPocion(db) })
      .expect(200);
    expect(ayuda.body.pista.piezaIds).toHaveLength(2);
    const consultado = await http(app).get(ruta).set(auth(e)).expect(200);
    expect(consultado.body.pista).toEqual(ayuda.body.pista);
    const retirada = piezas.find((p) => p.id === ayuda.body.pista.piezaIds[0]);
    await guardar(e, i.intentoId, [
      {
        casillaId: casillas.find((c) => c.tipo === retirada.tipo).id,
        piezaId: retirada.id,
      },
    ]).expect(400);
    await http(app)
      .post(ruta + '/ayuda')
      .set(auth(e))
      .send({ objetoId: await idPocion(db) })
      .expect(409);
    await guardar(e, i.intentoId, perfectas()).expect(200);
    const res = await http(app)
      .post(ruta + '/enviar')
      .set(auth(e))
      .expect(200);
    expect(res.body.resultado).toMatchObject({
      porcentaje: 100,
      calificacionEstrellas: 2,
      usoAyuda: true,
    });
  });
  it('si faltan dos distractores disponibles revierte el consumo y la marca de ayuda', async () => {
    const e = await nuevo(),
      i = await preparar(e);
    const distractores = piezas.filter(
      (p) => !casillas.some((c) => c.piezaCorrectaId === p.id),
    );
    await guardar(
      e,
      i.intentoId,
      distractores
        .slice(0, 5)
        .map((p) => ({
          casillaId: casillas.find((c) => c.tipo === p.tipo).id,
          piezaId: p.id,
        })),
    ).expect(200);
    const objetoId = await idPocion(db);
    const antes = await db.inventarioObjeto.findUniqueOrThrow({
      where: { estudianteId_objetoId: { estudianteId: e.id, objetoId } },
    });
    await http(app)
      .post(`/intentos/${i.intentoId}/ayuda`)
      .set(auth(e))
      .send({ objetoId })
      .expect(400);
    const despues = await db.inventarioObjeto.findUniqueOrThrow({
      where: { estudianteId_objetoId: { estudianteId: e.id, objetoId } },
    });
    expect(despues.cantidad).toBe(antes.cantidad);
    expect(await db.usoAyuda.count({ where: { intentoId: i.intentoId } })).toBe(
      0,
    );
  });
  it('concurrencia de ayuda consume una sola unidad y guarda las dos referencias', async () => {
    const e = await nuevo(),
      i = await preparar(e),
      objetoId = await idPocion(db);
    const res = await Promise.all(
      [1, 2].map(() =>
        http(app)
          .post(`/intentos/${i.intentoId}/ayuda`)
          .set(auth(e))
          .send({ objetoId }),
      ),
    );
    expect(res.map((r) => r.status).sort()).toEqual([200, 409]);
    expect(
      await db.distractorRetirado.count({
        where: { usoAyuda: { intentoId: i.intentoId } },
      }),
    ).toBe(2);
    expect(
      (
        await db.inventarioObjeto.findUniqueOrThrow({
          where: { estudianteId_objetoId: { estudianteId: e.id, objetoId } },
        })
      ).cantidad,
    ).toBe(2);
  });
  it('envío concurrente idempotente y reintento conservan recompensas y mejor nota', async () => {
    const e = await nuevo(),
      i = await preparar(e);
    await guardar(e, i.intentoId, perfectas()).expect(200);
    const antes = await db.estudiante.findUniqueOrThrow({
      where: { id: e.id },
    });
    const res = await Promise.all(
      [1, 2].map(() =>
        http(app).post(`/intentos/${i.intentoId}/enviar`).set(auth(e)),
      ),
    );
    expect(
      res.every((r) => r.status === 200 && r.body.resultado.porcentaje === 100),
    ).toBe(true);
    const despues = await db.estudiante.findUniqueOrThrow({
      where: { id: e.id },
    });
    expect(despues.xpTotal - antes.xpTotal).toBe(200);
    expect(despues.qpTotal - antes.qpTotal).toBe(120);
    const otro = await iniciarIntento(app, e, reto.id);
    await resolver(app, db, e, otro, 'malo');
    const repetido = await http(app)
      .post(`/intentos/${otro.intentoId}/enviar`)
      .set(auth(e))
      .expect(200);
    expect(repetido.body.resultado.xpGanado).toBe(0);
    const tablon = await http(app)
      .get(`/fases/${reto.faseId}`)
      .set(auth(e))
      .expect(200);
    expect(
      tablon.body.retos.find((r: any) => r.id === reto.id).mejorPorcentaje,
    ).toBe(100);
  });
  it('respeta bloqueos, propietario y cierre del intento', async () => {
    const e = await nuevo();
    await http(app).post(`/retos/${reto.id}/intentos`).set(auth(e)).expect(403);
    const i = await preparar(e),
      ajeno = await nuevo();
    await http(app)
      .get(`/intentos/${i.intentoId}`)
      .set(auth(ajeno))
      .expect(404);
    await guardar(ajeno, i.intentoId, perfectas()).expect(404);
    await guardar(e, i.intentoId, perfectas()).expect(200);
    await http(app)
      .post(`/intentos/${i.intentoId}/enviar`)
      .set(auth(e))
      .expect(200);
    await guardar(e, i.intentoId, []).expect(409);
  });
});
