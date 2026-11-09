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
import { aprobarAnteriores, retoPorMecanica } from './ayudas-sprint3';

jest.setTimeout(180000);

/** CU-07 Elegir el ciclo de vida investigando el expediente de un proyecto (RF-10, RN-22, RN-31). */
describe('CU-07: expediente del proyecto (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let reto: { id: number };
  let fragmentos: any[];
  const creados: number[] = [];

  const preparar = async (): Promise<{ e: EstudiantePrueba; intento: any }> => {
    const e = await nuevoEstudiante(app, prisma);
    creados.push(e.id);
    await aprobarAnteriores(app, prisma, e, reto.id); // es el primer reto: no hay anteriores
    return { e, intento: await iniciarIntento(app, e, reto.id) };
  };
  const guardar = (e: EstudiantePrueba, id: number, cuerpo: object) =>
    http(app).put(`/intentos/${id}/borrador`).set(auth(e)).send(cuerpo);
  const enviar = (e: EstudiantePrueba, id: number) => http(app).post(`/intentos/${id}/enviar`).set(auth(e));
  const relevantes = () => fragmentos.filter((f) => f.caracteristicaCorrectaId !== null);
  const irrelevantes = () => fragmentos.filter((f) => f.caracteristicaCorrectaId === null);

  beforeAll(async () => {
    ({ app, prisma } = await crearApp());
    reto = await retoPorMecanica(prisma, 'EXPEDIENTE_PROYECTO');
    fragmentos = await prisma.fragmentoDocumento.findMany({
      where: { documento: { retoId: reto.id } },
      orderBy: [{ documento: { orden: 'asc' } }, { orden: 'asc' }],
    });
  });
  afterAll(async () => {
    await borrarEstudiantes(prisma, creados);
    await app.close();
  });

  it('el seed cumple la especificación: 4 documentos, ≥6 relevantes (≥4 de respaldo), ≥5 irrelevantes y 6 características', async () => {
    const docs = await prisma.documentoExpediente.findMany({ where: { retoId: reto.id }, include: { fragmentos: true } });
    expect(docs).toHaveLength(4);
    docs.forEach((d) => {
      expect(d.fragmentos.length).toBeGreaterThanOrEqual(4);
      expect(d.fragmentos.length).toBeLessThanOrEqual(6);
    });
    expect(relevantes().length).toBeGreaterThanOrEqual(6);
    expect(relevantes().filter((f) => f.respaldaModelo).length).toBeGreaterThanOrEqual(4);
    expect(irrelevantes().length).toBeGreaterThanOrEqual(5);
    expect(await prisma.caracteristicaProyecto.count({ where: { retoId: reto.id } })).toBe(6);
  });

  it('es el primer reto de la fase 1 y la línea de tiempo quedó en la posición 2 (RN-08)', async () => {
    const retos = await prisma.reto.findMany({ where: { fase: { orden: 1 } }, orderBy: { orden: 'asc' } });
    expect(retos.map((r) => r.mecanica)).toEqual(['EXPEDIENTE_PROYECTO', 'LINEA_TIEMPO']);
  });

  it('publica documentos y características sin la referencia (RNF-SE-02)', async () => {
    const { intento } = await preparar();
    const texto = JSON.stringify(intento.contenido);
    expect(intento.contenido.documentos).toHaveLength(4);
    expect(intento.contenido.caracteristicas).toHaveLength(6);
    expect(intento.contenido.modelos).toHaveLength(6);
    expect(texto).not.toMatch(/caracteristicaCorrecta|respaldaModelo|modeloCorrecto|explicacion/);
  });

  it('FE1: no envía sin modelo, con menos de 2 vínculos o con evidencias sin característica', async () => {
    const { e, intento } = await preparar();
    const vacio = await enviar(e, intento.intentoId).expect(400);
    expect(vacio.body.faltantes.join(' ')).toMatch(/modelo/);
    expect(vacio.body.faltantes.join(' ')).toMatch(/al menos 2 evidencias/);

    const [a, b] = relevantes();
    await guardar(e, intento.intentoId, {
      evidencias: [{ fragmentoId: a.id, caracteristicaId: a.caracteristicaCorrectaId }],
      modelo: 'AGIL',
      vinculos: [a.id],
    }).expect(200);
    const uno = await enviar(e, intento.intentoId).expect(400);
    expect(uno.body.faltantes).toEqual(['Debes vincular al menos 2 evidencias al modelo elegido']);

    await guardar(e, intento.intentoId, {
      evidencias: [
        { fragmentoId: a.id, caracteristicaId: a.caracteristicaCorrectaId },
        { fragmentoId: b.id },
      ],
      modelo: 'AGIL',
      vinculos: [a.id, b.id],
    }).expect(200);
    const sinCar = await enviar(e, intento.intentoId).expect(400);
    expect(sinCar.body.faltantes).toHaveLength(1);
    expect(sinCar.body.faltantes[0]).toMatch(/característica/);
  });

  it('FE2: una evidencia duplicada se rechaza y no se duplica', async () => {
    const { e, intento } = await preparar();
    const [a] = relevantes();
    await guardar(e, intento.intentoId, {
      evidencias: [{ fragmentoId: a.id, caracteristicaId: a.caracteristicaCorrectaId }],
      vinculos: [],
    }).expect(200);
    const dup = await guardar(e, intento.intentoId, {
      evidencias: [
        { fragmentoId: a.id, caracteristicaId: a.caracteristicaCorrectaId },
        { fragmentoId: a.id },
      ],
      vinculos: [],
    }).expect(400);
    expect(dup.body.message).toMatch(/ya fue agregada/);
    const guardado = (await http(app).get(`/intentos/${intento.intentoId}`).set(auth(e)).expect(200)).body.borrador;
    expect(guardado.evidencias).toHaveLength(1);
    expect(await prisma.evidenciaSeleccionada.count({ where: { intentoId: intento.intentoId } })).toBe(1);
  });

  it('rechaza fragmentos ajenos, características ajenas y vínculos a evidencias que no están en el tablero', async () => {
    const { e, intento } = await preparar();
    const [a, b] = relevantes();
    await guardar(e, intento.intentoId, { evidencias: [{ fragmentoId: 99999999 }], vinculos: [] }).expect(400);
    await guardar(e, intento.intentoId, {
      evidencias: [{ fragmentoId: a.id, caracteristicaId: 99999999 }],
      vinculos: [],
    }).expect(400);
    await guardar(e, intento.intentoId, {
      evidencias: [{ fragmentoId: a.id }],
      vinculos: [b.id],
    }).expect(400);
  });

  it('RN-22: una investigación perfecta da 100 % y una equivocada 0 % (las irrelevantes restan)', async () => {
    const perfecto = await preparar();
    await resolver(app, prisma, perfecto.e, perfecto.intento, 'perfecto');
    const ok = await enviar(perfecto.e, perfecto.intento.intentoId).expect(200);
    expect(ok.body.resultado).toMatchObject({ porcentaje: 100, aprobado: true, calificacionEstrellas: 3 });

    const malo = await preparar();
    await resolver(app, prisma, malo.e, malo.intento, 'malo');
    const cero = await enviar(malo.e, malo.intento.intentoId).expect(200);
    expect(cero.body.resultado).toMatchObject({ porcentaje: 0, aprobado: false, xpGanado: 0 });
  });

  it('RN-22: el modelo correcto sin evidencias relevantes con 2 vínculos de respaldo = 76 %', async () => {
    const { e, intento } = await preparar();
    const expediente = await prisma.expediente.findUniqueOrThrow({ where: { retoId: reto.id } });
    const [a, b] = relevantes().filter((f) => f.respaldaModelo);
    await guardar(e, intento.intentoId, {
      evidencias: [
        { fragmentoId: a.id, caracteristicaId: a.caracteristicaCorrectaId },
        { fragmentoId: b.id, caracteristicaId: b.caracteristicaCorrectaId },
      ],
      modelo: expediente.modeloCorrecto,
      vinculos: [a.id, b.id],
    }).expect(200);
    // 50 + 30 × 2/10 + 20 × 2/2 = 76
    const res = await enviar(e, intento.intentoId).expect(200);
    expect(res.body.resultado.porcentaje).toBe(76);
    expect(res.body.resultado.aprobado).toBe(false);
  });

  it('RN-31: las evidencias irrelevantes y el modelo incorrecto se señalan, pero la referencia espera', async () => {
    const { e, intento } = await preparar();
    await resolver(app, prisma, e, intento, 'malo');
    const primero = (await enviar(e, intento.intentoId).expect(200)).body.retroalimentacion;
    expect(primero.referenciaCompleta).toBe(false);
    expect(primero.modeloAcertado).toBe(false);
    expect(primero.evidencias.every((ev: { relevante: boolean }) => ev.relevante === false)).toBe(true);
    expect(JSON.stringify(primero)).not.toMatch(/modeloCorrecto|explicacion|fragmentosRelevantes|caracteristicaCorrecta/);
    for (let n = 2; n <= 3; n++) {
      const i = await iniciarIntento(app, e, reto.id);
      await resolver(app, prisma, e, i, 'malo');
      const r = (await enviar(e, i.intentoId).expect(200)).body.retroalimentacion;
      if (n === 3) {
        expect(r.referenciaCompleta).toBe(true);
        expect(r.modeloCorrecto).toBe('AGIL');
        expect(r.explicacion).toEqual(expect.any(String));
        expect(r.fragmentosRelevantes.length).toBeGreaterThanOrEqual(6);
      } else {
        expect(r.referenciaCompleta).toBe(false);
      }
    }
  });

  it('FA2: la ayuda resalta un documento con una evidencia relevante aún no seleccionada', async () => {
    const { e, intento } = await preparar();
    const objeto = await prisma.objeto.findUniqueOrThrow({ where: { nombre: 'Poción de Sabiduría' } });
    const ayuda = await http(app)
      .post(`/intentos/${intento.intentoId}/ayuda`)
      .set(auth(e))
      .send({ objetoId: objeto.id })
      .expect(200);
    expect(ayuda.body.pista.tipo).toBe('DOCUMENTO');
    const documento = await prisma.documentoExpediente.findUniqueOrThrow({
      where: { id: ayuda.body.pista.documentoId },
      include: { fragmentos: true },
    });
    expect(documento.fragmentos.some((f) => f.caracteristicaCorrectaId !== null)).toBe(true);
    // la pista sobrevive a recargar (FA3) y limita las estrellas (RN-04)
    const retomado = await iniciarIntento(app, e, reto.id);
    expect(retomado.pista).toEqual(ayuda.body.pista);
    await resolver(app, prisma, e, retomado, 'perfecto');
    const res = await enviar(e, retomado.intentoId).expect(200);
    expect(res.body.resultado).toMatchObject({ porcentaje: 100, usoAyuda: true, calificacionEstrellas: 2 });
  });

  it('FA3: el avance parcial (evidencias, modelo y vínculos) se conserva al retomar el intento', async () => {
    const { e, intento } = await preparar();
    const [a, b] = relevantes();
    await guardar(e, intento.intentoId, {
      evidencias: [
        { fragmentoId: a.id, caracteristicaId: a.caracteristicaCorrectaId },
        { fragmentoId: b.id },
      ],
      modelo: 'INCREMENTAL',
      vinculos: [a.id],
    }).expect(200);
    const retomado = await iniciarIntento(app, e, reto.id);
    expect(retomado.intentoId).toBe(intento.intentoId);
    expect(retomado.borrador.modelo).toBe('INCREMENTAL');
    expect(retomado.borrador.evidencias).toHaveLength(2);
    expect(retomado.borrador.vinculos).toEqual([a.id]);
  });
});
