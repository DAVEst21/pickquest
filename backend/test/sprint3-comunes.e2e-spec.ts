import { INestApplication } from '@nestjs/common';
import { PrismaService } from '../src/common/prisma/prisma.service';
import {
  auth,
  borrarEstudiantes,
  crearApp,
  EstudiantePrueba,
  http,
  iniciarIntento,
  jugarReto,
  nuevoEstudiante,
  resolver,
} from './ayudas-e2e';
import { aprobarAnteriores, darObjeto, retoPorMecanica } from './ayudas-sprint3';

jest.setTimeout(180000);

/** Sprint 3, ajustes comunes a los retos: RN-31, pista persistente y objetos aplicables (RN-10). */
describe('Sprint 3: ajustes comunes (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const creados: number[] = [];
  const estudiante = async (pociones = 3) => {
    const e = await nuevoEstudiante(app, prisma, pociones);
    creados.push(e.id);
    return e;
  };

  beforeAll(async () => {
    ({ app, prisma } = await crearApp());
  });
  afterAll(async () => {
    await borrarEstudiantes(prisma, creados);
    await app.close();
  });

  /** Envía un intento malo y devuelve la respuesta de /enviar. */
  async function intentoMalo(e: EstudiantePrueba, retoId: number) {
    const i = await iniciarIntento(app, e, retoId);
    await resolver(app, prisma, e, i, 'malo');
    const res = await http(app).post(`/intentos/${i.intentoId}/enviar`).set(auth(e)).expect(200);
    expect(res.body.resultado.aprobado).toBe(false);
    return res.body;
  }

  describe('RN-31: la referencia no viaja antes de aprobar ni de 3 intentos no aprobados', () => {
    it('CU-03: sin referencia en los intentos 1 y 2; con referencia en el 3.º no aprobado', async () => {
      const reto = await retoPorMecanica(prisma, 'TABLERO_MOSCOW');
      const e = await estudiante();
      await aprobarAnteriores(app, prisma, e, reto.id);
      for (let n = 1; n <= 2; n++) {
        const r = (await intentoMalo(e, reto.id)).retroalimentacion;
        expect(r.referenciaCompleta).toBe(false);
        expect(r.ordenMustReferencia).toBeUndefined();
        expect(r.tarjetas[0].columnaCorrecta).toBeUndefined();
        expect(r.tarjetas[0].columnaAcertada).toBeDefined(); // lo que está mal sí se señala
      }
      const tercero = (await intentoMalo(e, reto.id)).retroalimentacion;
      expect(tercero.referenciaCompleta).toBe(true);
      expect(tercero.ordenMustReferencia.length).toBeGreaterThan(0);
      expect(tercero.tarjetas[0].columnaCorrecta).toBeDefined();
    });

    it('CU-02: la pieza correcta de cada casilla solo llega con 3 intentos no aprobados o al aprobar', async () => {
      const reto = await retoPorMecanica(prisma, 'ARMADO_PIEZAS');
      const e = await estudiante();
      await aprobarAnteriores(app, prisma, e, reto.id);
      const primero = (await intentoMalo(e, reto.id)).retroalimentacion;
      expect(JSON.stringify(primero)).not.toContain('piezaCorrecta');
      expect(primero.historias[0].casillas.some((c: { acertada: boolean }) => !c.acertada)).toBe(true);
      await intentoMalo(e, reto.id);
      const tercero = (await intentoMalo(e, reto.id)).retroalimentacion;
      expect(tercero.referenciaCompleta).toBe(true);
      expect(tercero.historias[0].casillas[0].piezaCorrecta).toEqual(expect.any(String));
      // un intento aprobado también la recibe
      const aprobado = await jugarReto(app, prisma, e, reto.id);
      expect(aprobado.retroalimentacion.historias[0].casillas[0].piezaCorrecta).toEqual(expect.any(String));
    });

    it('consultar de nuevo un intento no aprobado tampoco filtra la referencia', async () => {
      const reto = await retoPorMecanica(prisma, 'TABLERO_MOSCOW');
      const e = await estudiante();
      await aprobarAnteriores(app, prisma, e, reto.id);
      const res = await intentoMalo(e, reto.id);
      const consulta = await http(app).get(`/intentos/${res.intentoId}`).set(auth(e)).expect(200);
      expect(consulta.body.retroalimentacion.ordenMustReferencia).toBeUndefined();
    });
  });

  describe('Objetos aplicables por reto (RN-10, FA2 paso 2)', () => {
    it('el cinto de un reto solo ofrece los objetos aplicables y el servidor rechaza los demás', async () => {
      const reto = await retoPorMecanica(prisma, 'DIALOGO_STAKEHOLDER'); // fase de Elicitación
      const e = await estudiante(1);
      const claridad = await darObjeto(prisma, e.id, 'Pergamino de Claridad', 2); // Elicitación
      const cicloVida = await darObjeto(prisma, e.id, 'Pergamino del Ciclo de Vida', 2); // Ciclo de vida
      await aprobarAnteriores(app, prisma, e, reto.id);

      const aplicables = await http(app).get(`/inventario/equipados?retoId=${reto.id}`).set(auth(e)).expect(200);
      const nombres = aplicables.body.map((o: { nombre: string }) => o.nombre);
      expect(nombres).toContain('Poción de Sabiduría');
      expect(nombres).toContain('Pergamino de Claridad');
      expect(nombres).not.toContain('Pergamino del Ciclo de Vida');
      const todos = await http(app).get('/inventario/equipados').set(auth(e)).expect(200);
      expect(todos.body).toHaveLength(3);

      const i = await iniciarIntento(app, e, reto.id);
      const rechazo = await http(app)
        .post(`/intentos/${i.intentoId}/ayuda`)
        .set(auth(e))
        .send({ objetoId: cicloVida.id })
        .expect(400);
      expect(rechazo.body.message).toMatch(/no se puede usar en este reto/);
      // el rechazo no consumió ni marcó nada
      const inv = await prisma.inventarioObjeto.findUniqueOrThrow({
        where: { estudianteId_objetoId: { estudianteId: e.id, objetoId: cicloVida.id } },
      });
      expect(inv.cantidad).toBe(2);
      await http(app).post(`/intentos/${i.intentoId}/ayuda`).set(auth(e)).send({ objetoId: claridad.id }).expect(200);
    });
  });

  describe('La pista de una ayuda se conserva al retomar el intento (FA2 + FA3)', () => {
    it('GET /intentos/:id y POST /retos/:id/intentos devuelven la misma pista', async () => {
      const reto = await retoPorMecanica(prisma, 'TABLERO_MOSCOW');
      const e = await estudiante();
      await aprobarAnteriores(app, prisma, e, reto.id);
      const i = await iniciarIntento(app, e, reto.id);
      const pocion = await darObjeto(prisma, e.id, 'Poción de Sabiduría', 3);
      const ayuda = await http(app)
        .post(`/intentos/${i.intentoId}/ayuda`)
        .set(auth(e))
        .send({ objetoId: pocion.id })
        .expect(200);
      const consulta = await http(app).get(`/intentos/${i.intentoId}`).set(auth(e)).expect(200);
      expect(consulta.body.pista).toEqual(ayuda.body.pista);
      const retomado = await iniciarIntento(app, e, reto.id);
      expect(retomado.intentoId).toBe(i.intentoId);
      expect(retomado.pista).toEqual(ayuda.body.pista);
      expect(retomado.ayudaUsada).toBe(true);
    });
  });
});
