import { INestApplication } from '@nestjs/common';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { auth, borrarEstudiantes, crearApp, EstudiantePrueba, http, nuevoEstudiante } from './ayudas-e2e';

jest.setTimeout(120000);

/** CU-12 Comprar objetos en la tienda con puntos de recompensa (RF-15, RN-10, RN-11, RN-28). */
describe('CU-12: tienda (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const creados: number[] = [];
  const objetos: Record<string, { id: number; costoQP: number }> = {};

  /** Estudiante nuevo, sin objetos, con `qp` puntos. */
  const comprador = async (qp: number): Promise<EstudiantePrueba> => {
    const e = await nuevoEstudiante(app, prisma, 0);
    creados.push(e.id);
    await prisma.estudiante.update({ where: { id: e.id }, data: { qpTotal: qp } });
    return e;
  };
  const tienda = (e: EstudiantePrueba) => http(app).get('/tienda').set(auth(e));
  const comprar = (e: EstudiantePrueba, objetoId: number, cantidad: number) =>
    http(app).post('/tienda/compras').set(auth(e)).send({ objetoId, cantidad });
  const equipar = (e: EstudiantePrueba, objetoId: number, reemplazaObjetoId?: number) =>
    http(app).post(`/inventario/${objetoId}/equipar`).set(auth(e)).send(reemplazaObjetoId ? { reemplazaObjetoId } : {});
  const estado = async (e: EstudiantePrueba) => ({
    qp: (await prisma.estudiante.findUniqueOrThrow({ where: { id: e.id } })).qpTotal,
    inventario: await prisma.inventarioObjeto.findMany({ where: { estudianteId: e.id }, orderBy: { objetoId: 'asc' } }),
    compras: await prisma.compraObjeto.count({ where: { estudianteId: e.id } }),
  });

  beforeAll(async () => {
    ({ app, prisma } = await crearApp());
    for (const o of await prisma.objeto.findMany()) objetos[o.nombre] = { id: o.id, costoQP: o.costoQP };
  });
  afterAll(async () => {
    await borrarEstudiantes(prisma, creados);
    await app.close();
  });

  it('el catálogo muestra precio, efecto, rareza, tipo, dónde se usa, el saldo y las unidades que ya tiene', async () => {
    const e = await comprador(500);
    const res = await tienda(e).expect(200);
    expect(res.body.saldoQP).toBe(500);
    expect(res.body.maxUnidadesPorObjeto).toBe(5);
    expect(res.body.maxEquipados).toBe(2);
    const tipos = new Set(res.body.catalogo.map((o: { tipo: string }) => o.tipo));
    expect(tipos).toEqual(new Set(['POCION', 'PERGAMINO', 'RELIQUIA']));
    for (const o of res.body.catalogo) {
      expect(o).toMatchObject({
        nombre: expect.any(String),
        costoQP: expect.any(Number),
        efecto: expect.any(String),
        rareza: expect.any(String),
        dondeSeUsa: expect.any(String),
        unidades: 0,
        equipado: false,
      });
    }
    const pocion = res.body.catalogo.find((o: { nombre: string }) => o.nombre === 'Poción de Sabiduría');
    expect(pocion.dondeSeUsa).toBe('Cualquier reto');
    const pergamino = res.body.catalogo.find((o: { nombre: string }) => o.nombre === 'Pergamino de Claridad');
    expect(pergamino.dondeSeUsa).toMatch(/Elicitación/);
    // las pociones y reliquias sirven en cualquier reto; los pergaminos son más baratos que la reliquia
    expect(pergamino.costoQP).toBeLessThan(objetos['Reliquia del Arquitecto'].costoQP);
  });

  it('el detalle de un objeto lista los retos en los que puede usarse', async () => {
    const e = await comprador(0);
    const pocion = await http(app).get(`/tienda/objetos/${objetos['Poción de Sabiduría'].id}`).set(auth(e)).expect(200);
    expect(pocion.body.retos.length).toBe(await prisma.reto.count());
    const claridad = await http(app).get(`/tienda/objetos/${objetos['Pergamino de Claridad'].id}`).set(auth(e)).expect(200);
    expect(claridad.body.retos.length).toBe(await prisma.reto.count({ where: { fase: { tema: 'ELICITACION' } } }));
    await http(app).get('/tienda/objetos/99999999').set(auth(e)).expect(404);
  });

  it('flujo normal: compra, descuenta los QP, suma unidades, registra la compra y se equipa', async () => {
    const e = await comprador(200);
    const pocion = objetos['Poción de Sabiduría'];
    const res = await comprar(e, pocion.id, 2).expect(201);
    expect(res.body).toMatchObject({ cantidad: 2, qpPagados: pocion.costoQP * 2, saldoQP: 200 - pocion.costoQP * 2, unidades: 2, equipado: false });
    const despues = await estado(e);
    expect(despues.qp).toBe(200 - pocion.costoQP * 2);
    expect(despues.inventario).toHaveLength(1);
    expect(despues.inventario[0]).toMatchObject({ cantidad: 2, equipado: false });
    expect(despues.compras).toBe(1);

    const eq = await equipar(e, pocion.id).expect(200);
    expect(eq.body.find((o: { objetoId: number }) => o.objetoId === pocion.id)).toMatchObject({ equipado: true, cantidad: 2 });
    // ya equipada, volver a comprar suma unidades sin quitarla del cinto
    await comprar(e, pocion.id, 1).expect(201);
    const final = await estado(e);
    expect(final.inventario[0]).toMatchObject({ cantidad: 3, equipado: true });
  });

  it('FE1: saldo insuficiente indica cuántos QP faltan y no cambia saldo, inventario ni compras (RN-11)', async () => {
    const e = await comprador(80);
    const reliquia = objetos['Reliquia del Arquitecto'];
    const antes = await estado(e);
    const res = await comprar(e, reliquia.id, 1).expect(400);
    expect(res.body.qpFaltantes).toBe(reliquia.costoQP - 80);
    expect(res.body.message).toMatch(/Te faltan/);
    expect(await estado(e)).toEqual(antes);
  });

  it('FE2: el máximo de 5 unidades se respeta y el rechazo no cambia nada (RN-28)', async () => {
    const e = await comprador(2000);
    const pocion = objetos['Poción de Sabiduría'];
    await comprar(e, pocion.id, 3).expect(201);
    const antes = await estado(e);
    const res = await comprar(e, pocion.id, 3).expect(400);
    expect(res.body).toMatchObject({ limite: 5, unidadesActuales: 3, disponibles: 2 });
    expect(await estado(e)).toEqual(antes);
    await comprar(e, pocion.id, 2).expect(201); // justo hasta 5
    const lleno = await comprar(e, pocion.id, 1).expect(400);
    expect(lleno.body.message).toMatch(/máximo de 5/);
    expect((await estado(e)).inventario[0].cantidad).toBe(5);
  });

  it('valida la cantidad (≥ 1, entera) y el objeto', async () => {
    const e = await comprador(500);
    await comprar(e, objetos['Poción de Sabiduría'].id, 0).expect(400);
    await comprar(e, objetos['Poción de Sabiduría'].id, -2).expect(400);
    await comprar(e, objetos['Poción de Sabiduría'].id, 1.5).expect(400);
    await comprar(e, 99999999, 1).expect(404);
    expect((await estado(e)).compras).toBe(0);
  });

  it('FA1: comprar sin equipar deja el objeto en el inventario', async () => {
    const e = await comprador(100);
    await comprar(e, objetos['Pergamino de Claridad'].id, 1).expect(201);
    const inv = await http(app).get('/inventario').set(auth(e)).expect(200);
    expect(inv.body).toHaveLength(1);
    expect(inv.body[0]).toMatchObject({ nombre: 'Pergamino de Claridad', equipado: false, cantidad: 1 });
    const equipados = await http(app).get('/inventario/equipados').set(auth(e)).expect(200);
    expect(equipados.body).toEqual([]);
  });

  it('FA2: con el cinto lleno responde 409 con los equipados y el reemplazo regresa el objeto al inventario (RN-10)', async () => {
    const e = await comprador(1000);
    const [pocion, claridad, ciclo] = [objetos['Poción de Sabiduría'], objetos['Pergamino de Claridad'], objetos['Pergamino del Ciclo de Vida']];
    for (const o of [pocion, claridad, ciclo]) await comprar(e, o.id, 1).expect(201);
    await equipar(e, pocion.id).expect(200);
    await equipar(e, claridad.id).expect(200);

    const lleno = await equipar(e, ciclo.id).expect(409);
    expect(lleno.body.equipados).toHaveLength(2);
    expect(lleno.body.equipados.map((o: { objetoId: number }) => o.objetoId).sort()).toEqual([pocion.id, claridad.id].sort());
    // sigue lleno: nada cambió
    expect((await http(app).get('/inventario/equipados').set(auth(e)).expect(200)).body).toHaveLength(2);

    await equipar(e, ciclo.id, 99999999).expect(400); // reemplazo que no está equipado
    const ok = await equipar(e, ciclo.id, claridad.id).expect(200);
    const porId = new Map(ok.body.map((o: { objetoId: number; equipado: boolean }) => [o.objetoId, o.equipado]));
    expect(porId.get(ciclo.id)).toBe(true);
    expect(porId.get(claridad.id)).toBe(false); // regresó al inventario
    expect(porId.get(pocion.id)).toBe(true);
    expect(ok.body.filter((o: { equipado: boolean }) => o.equipado)).toHaveLength(2);
  });

  it('no se puede equipar lo que no se tiene y se puede desequipar', async () => {
    const e = await comprador(100);
    await equipar(e, objetos['Poción de Sabiduría'].id).expect(400);
    await comprar(e, objetos['Poción de Sabiduría'].id, 1).expect(201);
    await equipar(e, objetos['Poción de Sabiduría'].id).expect(200);
    await http(app).post(`/inventario/${objetos['Poción de Sabiduría'].id}/desequipar`).set(auth(e)).expect(200);
    expect((await http(app).get('/inventario/equipados').set(auth(e)).expect(200)).body).toEqual([]);
  });

  it('dos compras simultáneas no gastan más QP de los que hay (RNF-RE-04)', async () => {
    const e = await comprador(100);
    const pocion = objetos['Poción de Sabiduría']; // 50 QP: alcanza para 2
    const respuestas = await Promise.all([1, 2, 3].map(() => comprar(e, pocion.id, 1)));
    const exitosas = respuestas.filter((r) => r.status === 201).length;
    expect(exitosas).toBe(2);
    const despues = await estado(e);
    expect(despues.qp).toBe(0);
    expect(despues.inventario[0].cantidad).toBe(2);
    expect(despues.compras).toBe(2);
  });

  it('el inventario y la tienda son de cada estudiante (RNF-SE-04)', async () => {
    const a = await comprador(100);
    const b = await comprador(100);
    await comprar(a, objetos['Poción de Sabiduría'].id, 1).expect(201);
    expect((await http(app).get('/inventario').set(auth(b)).expect(200)).body).toEqual([]);
    expect((await tienda(b).expect(200)).body.saldoQP).toBe(100);
    await http(app).get('/tienda').expect(401);
  });
});
