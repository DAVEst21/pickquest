import { INestApplication } from '@nestjs/common';
import { TemaFase } from '@prisma/client';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { auth, borrarEstudiantes, crearApp, EstudiantePrueba, http, jugarReto, nuevoEstudiante, retosEnOrden } from './ayudas-e2e';

jest.setTimeout(180000);

/** CU-10 Obtener un plan de estudio respondiendo un diagnóstico (RF-13, RN-26, RN-27). */
describe('CU-10: diagnóstico y plan de estudio (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const creados: number[] = [];
  const TEMAS: TemaFase[] = ['CICLO_VIDA', 'ELICITACION', 'ATRIBUTOS_CALIDAD'];

  const nuevo = async (pociones = 0) => {
    const e = await nuevoEstudiante(app, prisma, pociones);
    creados.push(e.id);
    return e;
  };
  const iniciar = (e: EstudiantePrueba) => http(app).post('/plan/diagnosticos').set(auth(e));
  const enviar = (e: EstudiantePrueba, diagnosticoId: number, respuestas: unknown) =>
    http(app).post(`/plan/diagnosticos/${diagnosticoId}/respuestas`).set(auth(e)).send({ respuestas });
  const aceptar = (e: EstudiantePrueba, planId: number, actividadIds: number[]) =>
    http(app).post(`/plan/${planId}/aceptar`).set(auth(e)).send({ actividadIds });
  const activo = (e: EstudiantePrueba) => http(app).get('/plan/activo').set(auth(e));

  /**
   * Respuestas del diagnóstico con exactamente `aciertos[tema]` aciertos por tema. La opción correcta se
   * busca en la base (el endpoint nunca la envía).
   */
  async function respuestasCon(
    preguntas: { preguntaId: number; opciones: { opcionId: number }[] }[],
    aciertos: Record<TemaFase, number>,
  ) {
    const restante = { ...aciertos };
    const respuestas: { preguntaId: number; opcionId: number }[] = [];
    for (const p of preguntas) {
      const pregunta = await prisma.preguntaBanco.findUniqueOrThrow({
        where: { id: p.preguntaId },
        include: { opciones: true },
      });
      const correcta = pregunta.opciones.find((o) => o.correcta)!;
      const incorrecta = pregunta.opciones.find((o) => !o.correcta)!;
      if (restante[pregunta.tema] > 0) {
        restante[pregunta.tema]--;
        respuestas.push({ preguntaId: p.preguntaId, opcionId: correcta.id });
      } else {
        respuestas.push({ preguntaId: p.preguntaId, opcionId: incorrecta.id });
      }
    }
    return respuestas;
  }

  async function diagnostico(e: EstudiantePrueba, aciertos: Record<TemaFase, number>) {
    const inicio = (await iniciar(e).expect(201)).body;
    const respuestas = await respuestasCon(inicio.preguntas, aciertos);
    const fin = (await enviar(e, inicio.diagnosticoId, respuestas).expect(200)).body;
    return { inicio, fin };
  }

  beforeAll(async () => {
    ({ app, prisma } = await crearApp());
  });
  afterAll(async () => {
    await borrarEstudiantes(prisma, creados);
    await app.close();
  });

  it('exige autenticación', async () => {
    await http(app).post('/plan/diagnosticos').expect(401);
    await http(app).get('/plan/activo').expect(401);
  });

  it('el diagnóstico tiene 9 preguntas, 3 por tema, con 4 opciones y sin revelar la correcta', async () => {
    const e = await nuevo();
    const res = (await iniciar(e).expect(201)).body;
    expect(res.preguntas).toHaveLength(9);
    const claves = JSON.stringify(res);
    expect(claves).not.toMatch(/"correcta"\s*:/);
    expect(claves).not.toMatch(/"explicacion"\s*:/);
    for (const p of res.preguntas) {
      expect(p.opciones).toHaveLength(4);
      expect(Object.keys(p.opciones[0]).sort()).toEqual(['opcionId', 'texto']);
    }
    const temas = await prisma.preguntaBanco.findMany({
      where: { id: { in: res.preguntas.map((p: { preguntaId: number }) => p.preguntaId) } },
      select: { tema: true },
    });
    for (const tema of TEMAS) expect(temas.filter((t) => t.tema === tema)).toHaveLength(3);
  });

  it('dos diagnósticos del mismo estudiante no repiten siempre las mismas preguntas (selección al azar)', async () => {
    const e = await nuevo();
    const conjuntos = new Set<string>();
    for (let i = 0; i < 4; i++) {
      const res = (await iniciar(e).expect(201)).body;
      conjuntos.add(res.preguntas.map((p: { preguntaId: number }) => p.preguntaId).sort((a: number, b: number) => a - b).join(','));
    }
    expect(conjuntos.size).toBeGreaterThan(1);
  });

  it('FE1: terminar con preguntas sin responder lista las pendientes y no genera plan ni cambia el anterior', async () => {
    const e = await nuevo();
    const inicio = (await iniciar(e).expect(201)).body;
    const todas = await respuestasCon(inicio.preguntas, { CICLO_VIDA: 3, ELICITACION: 3, ATRIBUTOS_CALIDAD: 3 });
    const faltantes = [todas[2].preguntaId, todas[7].preguntaId];
    const parciales = todas.filter((r) => !faltantes.includes(r.preguntaId));

    const res = await enviar(e, inicio.diagnosticoId, parciales).expect(400);
    expect(res.body.message).toBe('Faltan 2 preguntas por responder');
    expect([...res.body.pendientes].sort()).toEqual([...faltantes].sort());
    expect(await prisma.planEstudio.count({ where: { estudianteId: e.id } })).toBe(0);
    expect(await prisma.respuestaDiagnostico.count({ where: { diagnosticoId: inicio.diagnosticoId } })).toBe(0);
    expect((await prisma.diagnostico.findUniqueOrThrow({ where: { id: inicio.diagnosticoId } })).terminadoEn).toBeNull();
    expect((await activo(e).expect(200)).body.plan).toBeNull();

    // sin ninguna respuesta tampoco se califica
    const vacio = await enviar(e, inicio.diagnosticoId, []).expect(400);
    expect(vacio.body.pendientes).toHaveLength(9);
    // y se puede completar después
    await enviar(e, inicio.diagnosticoId, todas).expect(200);
  });

  it('valida respuestas inventadas: pregunta ajena, opción de otra pregunta o pregunta repetida', async () => {
    const e = await nuevo();
    const inicio = (await iniciar(e).expect(201)).body;
    const buenas = await respuestasCon(inicio.preguntas, { CICLO_VIDA: 3, ELICITACION: 3, ATRIBUTOS_CALIDAD: 3 });
    const ajena = await prisma.preguntaBanco.findFirstOrThrow({
      where: { id: { notIn: inicio.preguntas.map((p: { preguntaId: number }) => p.preguntaId) } },
      include: { opciones: true },
    });
    await enviar(e, inicio.diagnosticoId, [...buenas.slice(1), { preguntaId: ajena.id, opcionId: ajena.opciones[0].id }]).expect(400);
    await enviar(e, inicio.diagnosticoId, [{ ...buenas[0], opcionId: ajena.opciones[0].id }, ...buenas.slice(1)]).expect(400);
    await enviar(e, inicio.diagnosticoId, [...buenas, buenas[0]]).expect(400);
    await enviar(e, inicio.diagnosticoId, 'no es una lista').expect(400);
    expect(await prisma.respuestaDiagnostico.count({ where: { diagnosticoId: inicio.diagnosticoId } })).toBe(0);
  });

  it('flujo normal: califica por tema (aciertos ÷ 3), guarda el dominio y propone un plan con temas débiles primero (RN-26, RN-27)', async () => {
    const e = await nuevo();
    // en un estudiante nuevo solo la fase 1 está abierta
    const { fin } = await diagnostico(e, { CICLO_VIDA: 2, ELICITACION: 0, ATRIBUTOS_CALIDAD: 3 });
    const resultado = (tema: string) => fin.resultados.find((r: { tema: string }) => r.tema === tema);
    expect(resultado('CICLO_VIDA')).toMatchObject({ aciertos: 2, preguntas: 3, porcentaje: 67, dominio: 67, debil: true });
    expect(resultado('ELICITACION')).toMatchObject({ aciertos: 0, porcentaje: 0, dominio: 0, debil: true });
    expect(resultado('ATRIBUTOS_CALIDAD')).toMatchObject({ aciertos: 3, porcentaje: 100, dominio: 100, debil: false });

    const dominios = await prisma.dominioTema.findMany({ where: { estudianteId: e.id } });
    expect(Object.fromEntries(dominios.map((d) => [d.tema, d.porcentaje]))).toEqual({
      CICLO_VIDA: 67,
      ELICITACION: 0,
      ATRIBUTOS_CALIDAD: 100,
    });

    // revisión: ahora sí se informa qué era correcto y por qué
    expect(fin.revision).toHaveLength(9);
    expect(fin.revision.filter((r: { correcta: boolean }) => r.correcta)).toHaveLength(5);
    expect(fin.revision[0]).toMatchObject({ opcionCorrectaId: expect.any(Number), explicacion: expect.any(String) });

    // plan PROPUESTO: el único tema débil con fase abierta es Ciclo de vida (Elicitación está bloqueada)
    expect(fin.plan).toMatchObject({ estado: 'PROPUESTO', esPlanMejora: false, aceptadoEn: null });
    expect(fin.plan.actividades[0]).toMatchObject({ tipo: 'REPASO', tema: 'CICLO_VIDA', hecha: false });
    for (const a of fin.plan.actividades) {
      expect(a.motivo.length).toBeGreaterThan(15);
      expect(a.faseId).toEqual(expect.any(Number));
      expect(a.orden).toBeGreaterThan(0);
    }
    expect(fin.plan.actividades.some((a: { tema: string }) => a.tema === 'ELICITACION')).toBe(false);
    // aún no hay plan activo: solo está propuesto
    expect((await activo(e).expect(200)).body.plan).toBeNull();
    // el diagnóstico terminado no se puede volver a enviar
    await enviar(e, fin.diagnosticoId, []).expect(409);
  });

  it('los temas débiles se ordenan de menor a mayor dominio (RN-27) con repaso antes que sus retos', async () => {
    const e = await nuevo();
    // abre las 3 fases para que los tres temas tengan actividades
    await prisma.intentoReto.createMany({
      data: (await retosEnOrden(prisma)).map((r) => ({
        estudianteId: e.id,
        retoId: r.id,
        estado: 'CALIFICADO' as const,
        porcentaje: 80,
        calificacionEstrellas: 1,
        aprobado: true,
        calificadoEn: new Date(),
      })),
    });
    // dominio = 50 % diagnóstico + 50 % retos (80): 0 aciertos → 40, 1 → 56.5 → 57, 2 → 73.5 → 74
    const { fin } = await diagnostico(e, { CICLO_VIDA: 2, ELICITACION: 0, ATRIBUTOS_CALIDAD: 1 });
    expect(fin.resultados.map((r: { tema: string; dominio: number }) => [r.tema, r.dominio])).toEqual([
      ['CICLO_VIDA', 74],
      ['ELICITACION', 40],
      ['ATRIBUTOS_CALIDAD', 57],
    ]);
    const repasos = fin.plan.actividades.filter((a: { tipo: string }) => a.tipo === 'REPASO').map((a: { tema: string }) => a.tema);
    expect(repasos).toEqual(['ELICITACION', 'ATRIBUTOS_CALIDAD', 'CICLO_VIDA']);
    // los retos aprobados con 80 % ya no son necesarios (RN-27): solo repasos
    expect(fin.plan.actividades.every((a: { tipo: string }) => a.tipo === 'REPASO')).toBe(true);
  });

  it('FE2: sin temas débiles propone un plan de mejora con retos de menos de 3 estrellas y duelos sugeridos', async () => {
    const e = await nuevo();
    const retos = await retosEnOrden(prisma);
    const expediente = retos.find((r) => r.mecanica === 'EXPEDIENTE_PROYECTO')!;
    // aprobado al 100 % pero con ayuda: solo 2 estrellas (RN-04)
    await prisma.intentoReto.create({
      data: { estudianteId: e.id, retoId: expediente.id, estado: 'CALIFICADO', porcentaje: 100, calificacionEstrellas: 2, aprobado: true, usoAyuda: true, calificadoEn: new Date() },
    });
    const { fin } = await diagnostico(e, { CICLO_VIDA: 3, ELICITACION: 3, ATRIBUTOS_CALIDAD: 3 });
    expect(fin.resultados.every((r: { debil: boolean }) => !r.debil)).toBe(true);
    expect(fin.plan.esPlanMejora).toBe(true);
    const tipos = fin.plan.actividades.map((a: { tipo: string; retoId: number | null }) => `${a.tipo}${a.retoId ? `:${a.retoId}` : ''}`);
    expect(tipos).toContain(`RETO:${expediente.id}`);
    expect(tipos).toContain('DUELO');
    expect(fin.plan.actividades.find((a: { tipo: string }) => a.tipo === 'RETO').motivo).toMatch(/2 de 3 estrellas/);
  });

  it('FA1: al aceptar se pueden quitar y reordenar actividades; solo se aceptan las del plan propuesto', async () => {
    const e = await nuevo();
    await prisma.intentoReto.create({
      data: { estudianteId: e.id, retoId: (await retosEnOrden(prisma))[0].id, estado: 'CALIFICADO', porcentaje: 0, calificacionEstrellas: 0, aprobado: false, calificadoEn: new Date() },
    });
    const { fin } = await diagnostico(e, { CICLO_VIDA: 0, ELICITACION: 0, ATRIBUTOS_CALIDAD: 0 });
    const ids: number[] = fin.plan.actividades.map((a: { actividadId: number }) => a.actividadId);
    expect(ids.length).toBeGreaterThanOrEqual(2);

    await aceptar(e, fin.plan.planId, []).expect(400);
    await aceptar(e, fin.plan.planId, [ids[0], ids[0]]).expect(400);
    await aceptar(e, fin.plan.planId, [ids[0], 99999999]).expect(400);
    expect((await activo(e).expect(200)).body.plan).toBeNull();

    const elegidas = [...ids].reverse().slice(0, ids.length - 1); // quita una y cambia el orden
    const aceptado = (await aceptar(e, fin.plan.planId, elegidas).expect(200)).body;
    expect(aceptado.estado).toBe('ACTIVO');
    expect(aceptado.aceptadoEn).not.toBeNull();
    expect(aceptado.actividades.map((a: { actividadId: number }) => a.actividadId)).toEqual(elegidas);
    expect(aceptado.actividades.map((a: { orden: number }) => a.orden)).toEqual(elegidas.map((_, i) => i + 1));
    expect((await activo(e).expect(200)).body.plan.planId).toBe(fin.plan.planId);
    // un plan ya aceptado no se vuelve a aceptar
    await aceptar(e, fin.plan.planId, elegidas).expect(409);
  });

  it('FA2: el plan nuevo reemplaza al activo solo al aceptarlo', async () => {
    const e = await nuevo();
    const primero = (await diagnostico(e, { CICLO_VIDA: 1, ELICITACION: 1, ATRIBUTOS_CALIDAD: 1 })).fin.plan;
    const idsPrimero = primero.actividades.map((a: { actividadId: number }) => a.actividadId);
    await aceptar(e, primero.planId, idsPrimero).expect(200);

    // nuevo diagnóstico: el plan activo no cambia mientras el nuevo es solo una propuesta
    const segundo = (await diagnostico(e, { CICLO_VIDA: 3, ELICITACION: 0, ATRIBUTOS_CALIDAD: 0 })).fin.plan;
    expect(segundo.estado).toBe('PROPUESTO');
    expect((await activo(e).expect(200)).body.plan.planId).toBe(primero.planId);
    expect((await prisma.planEstudio.findUniqueOrThrow({ where: { id: primero.planId } })).estado).toBe('ACTIVO');

    // al aceptar, el anterior pasa a REEMPLAZADO y queda un solo plan activo
    await aceptar(e, segundo.planId, segundo.actividades.map((a: { actividadId: number }) => a.actividadId)).expect(200);
    expect((await prisma.planEstudio.findUniqueOrThrow({ where: { id: primero.planId } })).estado).toBe('REEMPLAZADO');
    expect((await activo(e).expect(200)).body.plan.planId).toBe(segundo.planId);
    expect(await prisma.planEstudio.count({ where: { estudianteId: e.id, estado: 'ACTIVO' } })).toBe(1);
  });

  it('una propuesta abandonada no cambia el plan activo ni el dominio ya calculado (postcondición de falla)', async () => {
    const e = await nuevo();
    const primero = (await diagnostico(e, { CICLO_VIDA: 1, ELICITACION: 1, ATRIBUTOS_CALIDAD: 1 })).fin.plan;
    await aceptar(e, primero.planId, primero.actividades.map((a: { actividadId: number }) => a.actividadId)).expect(200);
    const antes = await prisma.dominioTema.findMany({ where: { estudianteId: e.id }, orderBy: { tema: 'asc' } });
    await iniciar(e).expect(201); // inicia otro diagnóstico y no lo termina
    expect((await activo(e).expect(200)).body.plan.planId).toBe(primero.planId);
    expect(await prisma.dominioTema.findMany({ where: { estudianteId: e.id }, orderBy: { tema: 'asc' } })).toEqual(antes);
  });

  it('el avance del plan se calcula al consultar: repaso terminado y reto aprobado después de aceptar', async () => {
    const e = await nuevo();
    const { fin } = await diagnostico(e, { CICLO_VIDA: 0, ELICITACION: 0, ATRIBUTOS_CALIDAD: 0 });
    const ids = fin.plan.actividades.map((a: { actividadId: number }) => a.actividadId);
    const plan = (await aceptar(e, fin.plan.planId, ids).expect(200)).body;
    expect(plan.avance).toMatchObject({ hechas: 0, total: ids.length, porcentaje: 0 });

    // hacer el repaso de Ciclo de vida
    const faseId = plan.actividades.find((a: { tipo: string }) => a.tipo === 'REPASO').faseId;
    let sesion = (await http(app).post(`/estudio/temas/${faseId}/sesiones`).set(auth(e)).expect(201)).body;
    while (sesion.tarjetaActual) {
      sesion = (
        await http(app)
          .post(`/estudio/sesiones/${sesion.sesionId}/tarjetas/${sesion.tarjetaActual.tarjetaId}`)
          .set(auth(e))
          .send({ autoevaluacion: 'LO_SABIA' })
          .expect(200)
      ).body;
    }
    let consultado = (await activo(e).expect(200)).body.plan;
    expect(consultado.actividades.find((a: { tipo: string }) => a.tipo === 'REPASO').hecha).toBe(true);
    expect(consultado.avance.hechas).toBe(1);

    // aprobar el reto recomendado
    const reto = consultado.actividades.find((a: { tipo: string }) => a.tipo === 'RETO');
    await jugarReto(app, prisma, e, reto.retoId);
    consultado = (await activo(e).expect(200)).body.plan;
    expect(consultado.actividades.find((a: { retoId: number | null }) => a.retoId === reto.retoId).hecha).toBe(true);
    expect(consultado.avance.hechas).toBe(2);
    expect(consultado.avance.porcentaje).toBe(Math.round((2 / ids.length) * 100));
  });

  it('un reto aprobado antes de aceptar el plan no cuenta como hecho', async () => {
    const e = await nuevo();
    const { fin } = await diagnostico(e, { CICLO_VIDA: 0, ELICITACION: 0, ATRIBUTOS_CALIDAD: 0 });
    const reto = fin.plan.actividades.find((a: { tipo: string }) => a.tipo === 'RETO');
    // aprobado entre la propuesta y la aceptación
    await jugarReto(app, prisma, e, reto.retoId);
    await new Promise((r) => setTimeout(r, 20));
    const plan = (await aceptar(e, fin.plan.planId, fin.plan.actividades.map((a: { actividadId: number }) => a.actividadId)).expect(200)).body;
    expect(plan.actividades.find((a: { retoId: number | null }) => a.retoId === reto.retoId).hecha).toBe(false);
  });

  it('un plan o diagnóstico ajeno responde 404 y no se puede aceptar ni responder', async () => {
    const dueno = await nuevo();
    const otro = await nuevo();
    const inicio = (await iniciar(dueno).expect(201)).body;
    await http(app).get(`/plan/diagnosticos/${inicio.diagnosticoId}`).set(auth(otro)).expect(404);
    const respuestas = await respuestasCon(inicio.preguntas, { CICLO_VIDA: 3, ELICITACION: 3, ATRIBUTOS_CALIDAD: 3 });
    await enviar(otro, inicio.diagnosticoId, respuestas).expect(404);
    const fin = (await enviar(dueno, inicio.diagnosticoId, respuestas).expect(200)).body;
    await http(app).get(`/plan/${fin.plan.planId}`).set(auth(otro)).expect(404);
    await aceptar(otro, fin.plan.planId, [fin.plan.actividades[0].actividadId]).expect(404);
    expect((await prisma.planEstudio.findUniqueOrThrow({ where: { id: fin.plan.planId } })).estado).toBe('PROPUESTO');
  });

  it('el último diagnóstico es el que cuenta para el dominio (RN-26)', async () => {
    const e = await nuevo();
    await diagnostico(e, { CICLO_VIDA: 0, ELICITACION: 0, ATRIBUTOS_CALIDAD: 0 });
    await new Promise((r) => setTimeout(r, 20));
    await diagnostico(e, { CICLO_VIDA: 3, ELICITACION: 3, ATRIBUTOS_CALIDAD: 3 });
    const dominios = await prisma.dominioTema.findMany({ where: { estudianteId: e.id } });
    expect(dominios.map((d) => d.porcentaje)).toEqual([100, 100, 100]);
  });
});
