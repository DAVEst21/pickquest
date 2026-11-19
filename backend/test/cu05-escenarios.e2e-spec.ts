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
} from './ayudas-e2e';
import { aprobarAnteriores, darObjeto, retoPorMecanica } from './ayudas-sprint3';

jest.setTimeout(180000);

/** CU-05 Simulador de escenarios de calidad (RF-08, RN-20, RN-31). */
describe('CU-05: simulador de escenarios de calidad (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let reto: { id: number };
  const creados: number[] = [];

  const preparar = async (pociones = 3): Promise<{ e: EstudiantePrueba; intento: any }> => {
    const e = await nuevoEstudiante(app, prisma, pociones);
    creados.push(e.id);
    await aprobarAnteriores(app, prisma, e, reto.id);
    return { e, intento: await iniciarIntento(app, e, reto.id) };
  };
  const guardar = (e: EstudiantePrueba, id: number, cuerpo: object) =>
    http(app).put(`/intentos/${id}/borrador`).set(auth(e)).send(cuerpo);
  const simular = (e: EstudiantePrueba, id: number) =>
    http(app).post(`/intentos/${id}/escenario/simular`).set(auth(e));
  const enviar = (e: EstudiantePrueba, id: number) => http(app).post(`/intentos/${id}/enviar`).set(auth(e));
  /** Lo que el cliente puede guardar del borrador (sin las simulaciones, que las lleva el servidor). */
  const guardable = (b: any) => ({ elecciones: b.elecciones, valor: b.valor, unidadId: b.unidadId, carga: b.carga });

  beforeAll(async () => {
    ({ app, prisma } = await crearApp());
    reto = await retoPorMecanica(prisma, 'SIMULADOR_ESCENARIOS');
  });
  afterAll(async () => {
    await borrarEstudiantes(prisma, creados);
    await app.close();
  });

  it('publica el escenario sin respuestas correctas, sin rango aceptable y sin el modelo de la simulación (RNF-SE-02)', async () => {
    const { intento } = await preparar();
    const texto = JSON.stringify(intento.contenido);
    expect(intento.contenido.partes).toHaveLength(5);
    expect(intento.contenido.partes[0].opciones.length).toBeGreaterThanOrEqual(3);
    expect(texto).not.toMatch(/"correcta"|Aceptable|simBase|simPendiente|unidadCorrecta/);
    expect(intento.contenido.limiteSimulaciones).toBe(5);
    expect(intento.borrador.simulaciones).toEqual([]);
  });

  it('FE1: no simula ni envía con partes vacías o la medida incompleta (400 con las faltantes)', async () => {
    const { e, intento } = await preparar();
    const sim = await simular(e, intento.intentoId).expect(400);
    expect(sim.body.faltantes.length).toBe(8); // 5 partes + valor + unidad + carga
    const env = await enviar(e, intento.intentoId).expect(400);
    expect(env.body.faltantes.length).toBe(8);
    expect(await prisma.simulacionEscenario.count({ where: { intentoId: intento.intentoId } })).toBe(0);
  });

  it('flujo normal: simula, ajusta y repite; la simulación responde en menos de 3 s (RNF-PE-03) y se registra', async () => {
    const { e, intento } = await preparar();
    await resolver(app, prisma, e, intento, 'perfecto');
    const t0 = Date.now();
    const s1 = await simular(e, intento.intentoId).expect(200);
    expect(Date.now() - t0).toBeLessThan(3000);
    expect(s1.body).toMatchObject({ numero: 1, cumple: true, restantes: 4 });
    expect(s1.body.valorApp).toBeCloseTo(0.8 + 0.0008 * 2000, 2);
    expect(s1.body.curva.length).toBeGreaterThan(5);
    // ajusta la carga (más usuarios) y vuelve a simular: ya no se cumple
    const escenario = await prisma.escenarioCalidad.findUniqueOrThrow({ where: { retoId: reto.id } });
    const borrador = (await http(app).get(`/intentos/${intento.intentoId}`).set(auth(e)).expect(200)).body.borrador;
    await guardar(e, intento.intentoId, { ...guardable(borrador), carga: escenario.cargaMaxSlider }).expect(200);
    const s2 = await simular(e, intento.intentoId).expect(200);
    expect(s2.body).toMatchObject({ numero: 2, cumple: false, restantes: 3 });
    expect(await prisma.simulacionEscenario.count({ where: { intentoId: intento.intentoId } })).toBe(2);
  });

  it('FE2: la sexta simulación responde 409 y pide enviar el escenario', async () => {
    const { e, intento } = await preparar();
    await resolver(app, prisma, e, intento, 'perfecto');
    for (let n = 1; n <= 5; n++) await simular(e, intento.intentoId).expect(200);
    const sexta = await simular(e, intento.intentoId).expect(409);
    expect(sexta.body.message).toMatch(/envía el escenario/);
    expect(await prisma.simulacionEscenario.count({ where: { intentoId: intento.intentoId } })).toBe(5);
    await enviar(e, intento.intentoId).expect(200); // aún se puede enviar
  });

  it('RN-20: un escenario perfecto da 100 % y uno completamente equivocado 0 %', async () => {
    const perfecto = await preparar();
    await resolver(app, prisma, perfecto.e, perfecto.intento, 'perfecto');
    const ok = await enviar(perfecto.e, perfecto.intento.intentoId).expect(200);
    expect(ok.body.resultado).toMatchObject({ porcentaje: 100, aprobado: true, calificacionEstrellas: 3 });

    const malo = await preparar();
    await resolver(app, prisma, malo.e, malo.intento, 'malo');
    const cero = await enviar(malo.e, malo.intento.intentoId).expect(200);
    expect(cero.body.resultado).toMatchObject({ porcentaje: 0, aprobado: false, xpGanado: 0 });
  });

  it('RN-20: 3 partes correctas con la medida en rango = 76 % (no aprobado)', async () => {
    const { e, intento } = await preparar();
    await resolver(app, prisma, e, intento, 'perfecto');
    const opciones = await prisma.opcionParteEscenario.findMany({ where: { retoId: reto.id } });
    const borrador = (await http(app).get(`/intentos/${intento.intentoId}`).set(auth(e)).expect(200)).body.borrador;
    const equivocar = ['ENTORNO', 'RESPUESTA'];
    const elecciones = borrador.elecciones.map((el: { parte: string }) =>
      equivocar.includes(el.parte)
        ? { parte: el.parte, opcionId: opciones.find((o) => o.parte === el.parte && !o.correcta)!.id }
        : el,
    );
    await guardar(e, intento.intentoId, { ...guardable(borrador), elecciones }).expect(200);
    const res = await enviar(e, intento.intentoId).expect(200);
    expect(res.body.resultado).toMatchObject({ porcentaje: 76, aprobado: false });
  });

  it('RN-31: el resultado señala las partes incorrectas, pero la referencia solo llega al aprobar o al 3.º intento', async () => {
    const { e, intento } = await preparar();
    await resolver(app, prisma, e, intento, 'malo');
    const primero = (await enviar(e, intento.intentoId).expect(200)).body.retroalimentacion;
    expect(primero.referenciaCompleta).toBe(false);
    expect(primero.partes.every((p: { acertada: boolean }) => p.acertada === false)).toBe(true);
    expect(primero.medida.dentroDelRango).toBe(false);
    expect(JSON.stringify(primero)).not.toMatch(/"correcta"|rangoAceptable|valorMin|cargaMin/);
    for (let n = 2; n <= 3; n++) {
      const i = await iniciarIntento(app, e, reto.id);
      await resolver(app, prisma, e, i, 'malo');
      const r = (await enviar(e, i.intentoId).expect(200)).body.retroalimentacion;
      if (n === 3) {
        expect(r.referenciaCompleta).toBe(true);
        expect(r.partes[0].correcta).toEqual(expect.any(String));
        expect(r.rangoAceptable).toMatchObject({ valorMin: 2, valorMax: 3, unidad: 'segundos' });
      } else {
        expect(r.referenciaCompleta).toBe(false);
      }
    }
  });

  it('FA2: la ayuda muestra el rango aceptable y marca el intento (máx. 2 estrellas)', async () => {
    const { e, intento } = await preparar();
    const ayuda = await http(app)
      .post(`/intentos/${intento.intentoId}/ayuda`)
      .set(auth(e))
      .send({ objetoId: (await prisma.objeto.findUniqueOrThrow({ where: { nombre: 'Poción de Sabiduría' } })).id })
      .expect(200);
    expect(ayuda.body.pista).toMatchObject({
      tipo: 'RANGO_ESCENARIO',
      valorMin: 2,
      valorMax: 3,
      unidad: 'segundos',
      cargaMin: 1500,
      cargaMax: 2500,
    });
    await resolver(app, prisma, e, intento, 'perfecto');
    const res = await enviar(e, intento.intentoId).expect(200);
    expect(res.body.resultado).toMatchObject({ porcentaje: 100, usoAyuda: true, calificacionEstrellas: 2 });
  });

  it('FA3: al retomar el intento se conservan las elecciones, la medida, las simulaciones y la pista', async () => {
    const { e, intento } = await preparar();
    await darObjeto(prisma, e.id, 'Poción de Sabiduría', 3);
    await resolver(app, prisma, e, intento, 'perfecto');
    await simular(e, intento.intentoId).expect(200);
    const objeto = await prisma.objeto.findUniqueOrThrow({ where: { nombre: 'Poción de Sabiduría' } });
    const ayuda = await http(app)
      .post(`/intentos/${intento.intentoId}/ayuda`)
      .set(auth(e))
      .send({ objetoId: objeto.id })
      .expect(200);
    const retomado = await iniciarIntento(app, e, reto.id);
    expect(retomado.intentoId).toBe(intento.intentoId);
    expect(retomado.borrador.elecciones).toHaveLength(5);
    expect(retomado.borrador.simulaciones).toHaveLength(1);
    expect(retomado.borrador.simulacionesRestantes).toBe(4);
    expect(retomado.borrador.carga).toBe(2000);
    expect(retomado.pista).toEqual(ayuda.body.pista);
  });

  it('rechaza opciones de otra parte, unidades ajenas y valores fuera del deslizador sin perder el avance', async () => {
    const { e, intento } = await preparar();
    const opciones = await prisma.opcionParteEscenario.findMany({ where: { retoId: reto.id } });
    const fuente = opciones.find((o) => o.parte === 'FUENTE')!;
    const estimulo = opciones.find((o) => o.parte === 'ESTIMULO')!;
    await guardar(e, intento.intentoId, { elecciones: [{ parte: 'FUENTE', opcionId: fuente.id }] }).expect(200);
    await guardar(e, intento.intentoId, { elecciones: [{ parte: 'FUENTE', opcionId: estimulo.id }] }).expect(400);
    await guardar(e, intento.intentoId, { elecciones: [], unidadId: 99999999 }).expect(400);
    await guardar(e, intento.intentoId, { elecciones: [], valor: 99 }).expect(400);
    await guardar(e, intento.intentoId, { elecciones: [], carga: 999999 }).expect(400);
    const res = await http(app).get(`/intentos/${intento.intentoId}`).set(auth(e)).expect(200);
    expect(res.body.borrador.elecciones).toEqual([{ parte: 'FUENTE', opcionId: fuente.id }]);
  });

  it('un estudiante no puede simular el intento de otro (404)', async () => {
    const { intento } = await preparar();
    const otro = await nuevoEstudiante(app, prisma);
    creados.push(otro.id);
    await simular(otro, intento.intentoId).expect(404);
  });
});
