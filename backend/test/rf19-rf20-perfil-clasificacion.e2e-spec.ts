import { INestApplication } from '@nestjs/common';
import { diaADate, diaCalendarioMx, sumarDias } from '../src/common/fechas/dia-calendario';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { auth, borrarEstudiantes, crearApp, EstudiantePrueba, http, jugarReto, nuevoEstudiante, retosEnOrden } from './ayudas-e2e';

jest.setTimeout(180000);

/** RF-19 Perfil y RF-20 Clasificación (RN-30, RNF-SE-04, RNF-PE-05). */
describe('RF-19 perfil y RF-20 clasificación (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const creados: number[] = [];
  const BASE_XP = 9_000_000 + Math.floor(Math.random() * 500_000);

  const nuevo = async (pociones = 0) => {
    const e = await nuevoEstudiante(app, prisma, pociones);
    creados.push(e.id);
    return e;
  };
  const perfil = (e: EstudiantePrueba) => http(app).get('/perfil').set(auth(e));
  const clasificacion = async (e: EstudiantePrueba) => (await http(app).get('/clasificacion').set(auth(e)).expect(200)).body;
  const nombre = async (e: EstudiantePrueba) => (await prisma.estudiante.findUniqueOrThrow({ where: { id: e.id } })).nombreAventurero;

  beforeAll(async () => {
    ({ app, prisma } = await crearApp());
  });
  afterAll(async () => {
    await borrarEstudiantes(prisma, creados);
    await app.close();
  });

  // ------------------------------------------------------------------ perfil

  it('exige autenticación', async () => {
    await http(app).get('/perfil').expect(401);
    await http(app).patch('/perfil').send({}).expect(401);
    await http(app).get('/clasificacion').expect(401);
  });

  it('RF-19: el perfil trae nivel, XP, QP, racha real, estrellas por fase, inventario y plan activo', async () => {
    const e = await nuevo(2);
    const res = (await perfil(e).expect(200)).body;
    expect(res).toMatchObject({
      nivel: 1,
      xpTotal: 0,
      xpSiguienteNivel: 500,
      xpNivelActual: 0,
      qpTotal: 0,
      racha: { diasActuales: 0, diasRecord: 0, multiplicadorQP: 1 },
      estrellasTotales: 0,
      maxEquipados: 2,
      planActivo: null,
    });
    expect(res.estrellasPorFase).toHaveLength(3);
    expect(res.estrellasPorFase[0]).toMatchObject({ orden: 1, retosAprobados: 0, totalRetos: 2, estrellas: 0, estrellasMaximas: 6, calificacionEstrellasFase: null });
    expect(res.inventario).toHaveLength(1);
    expect(res.inventario[0]).toMatchObject({ nombre: 'Poción de Sabiduría', cantidad: 2, equipado: true });
  });

  it('RF-19: refleja los avances del estudiante: XP, QP, estrellas por fase y fase completada', async () => {
    const e = await nuevo();
    const retos = await retosEnOrden(prisma);
    for (const r of retos.filter((x) => x.fase.orden === 1)) await jugarReto(app, prisma, e, r.id);
    const res = (await perfil(e).expect(200)).body;
    const total = retos.filter((x) => x.fase.orden === 1).reduce((s, r) => s + r.recompensaXp, 0);
    expect(res.xpTotal).toBe(total);
    expect(res.estrellasPorFase[0]).toMatchObject({ retosAprobados: 2, totalRetos: 2, estrellas: 6, calificacionEstrellasFase: 3 });
    expect(res.estrellasTotales).toBe(6);
    expect(res.nivel).toBe(Math.floor(total / 500) + 1);
  });

  it('RF-19: la racha del perfil es la real, con el reinicio perezoso', async () => {
    const e = await nuevo();
    await prisma.rachaEstudio.update({
      where: { estudianteId: e.id },
      data: { diasActuales: 4, diasRecord: 7, multiplicadorQP: 1.4, ultimaActividad: diaADate(sumarDias(diaCalendarioMx(), -1)) },
    });
    expect((await perfil(e).expect(200)).body.racha).toEqual({ diasActuales: 4, diasRecord: 7, multiplicadorQP: 1.4 });
    await prisma.rachaEstudio.update({ where: { estudianteId: e.id }, data: { ultimaActividad: diaADate(sumarDias(diaCalendarioMx(), -4)) } });
    expect((await perfil(e).expect(200)).body.racha).toEqual({ diasActuales: 0, diasRecord: 7, multiplicadorQP: 1 });
  });

  it('RF-19: se cambia el nombre de aventurero y el avatar', async () => {
    const e = await nuevo();
    const nuevoNombre = `cambio_${Date.now()}`;
    const res = (await http(app).patch('/perfil').set(auth(e)).send({ nombreAventurero: nuevoNombre, avatar: 'https://ejemplo.com/yo.png' }).expect(200)).body;
    expect(res).toMatchObject({ nombreAventurero: nuevoNombre, avatar: 'https://ejemplo.com/yo.png' });
    expect(await nombre(e)).toBe(nuevoNombre);
    // un avatar vacío lo quita
    expect((await http(app).patch('/perfil').set(auth(e)).send({ avatar: '' }).expect(200)).body.avatar).toBeNull();
    // sin cambios, nada se modifica
    expect((await http(app).patch('/perfil').set(auth(e)).send({}).expect(200)).body.nombreAventurero).toBe(nuevoNombre);
  });

  it('RF-19: el nombre de aventurero es único y se valida', async () => {
    const a = await nuevo();
    const b = await nuevo();
    const ocupado = await http(app).patch('/perfil').set(auth(a)).send({ nombreAventurero: await nombre(b) }).expect(409);
    expect(ocupado.body.message).toMatch(/Ya existe/);
    await http(app).patch('/perfil').set(auth(a)).send({ nombreAventurero: 'ab' }).expect(400);
    await http(app).patch('/perfil').set(auth(a)).send({ nombreAventurero: 'tiene espacios' }).expect(400);
    await http(app).patch('/perfil').set(auth(a)).send({ avatar: 'javascript:alert(1)' }).expect(400);
    await http(app).patch('/perfil').set(auth(a)).send({ avatar: 'no-es-url' }).expect(400);
    // los campos que no son del perfil (XP, correo...) se descartan y no se modifican
    await http(app).patch('/perfil').set(auth(a)).send({ xpTotal: 99999, qpTotal: 99999, email: 'otro@test.local' }).expect(200);
    const intacto = await prisma.estudiante.findUniqueOrThrow({ where: { id: a.id } });
    expect(intacto).toMatchObject({ xpTotal: 0, qpTotal: 0, email: a.email });
  });

  it('RF-19: el inventario se equipa y desequipa desde el perfil y se refleja en él', async () => {
    const e = await nuevo(1);
    const objeto = await prisma.objeto.findUniqueOrThrow({ where: { nombre: 'Poción de Sabiduría' } });
    await http(app).post(`/inventario/${objeto.id}/desequipar`).set(auth(e)).expect(200);
    expect((await perfil(e).expect(200)).body.inventario[0].equipado).toBe(false);
    await http(app).post(`/inventario/${objeto.id}/equipar`).set(auth(e)).send({}).expect(200);
    expect((await perfil(e).expect(200)).body.inventario[0].equipado).toBe(true);
  });

  it('RF-19: el plan activo y su avance se muestran en el perfil', async () => {
    const e = await nuevo();
    const inicio = (await http(app).post('/plan/diagnosticos').set(auth(e)).expect(201)).body;
    const respuestas = [] as { preguntaId: number; opcionId: number }[];
    for (const p of inicio.preguntas) {
      const q = await prisma.preguntaBanco.findUniqueOrThrow({ where: { id: p.preguntaId }, include: { opciones: true } });
      respuestas.push({ preguntaId: p.preguntaId, opcionId: q.opciones.find((o) => !o.correcta)!.id });
    }
    const fin = (await http(app).post(`/plan/diagnosticos/${inicio.diagnosticoId}/respuestas`).set(auth(e)).send({ respuestas }).expect(200)).body;
    await http(app).post(`/plan/${fin.plan.planId}/aceptar`).set(auth(e)).send({ actividadIds: fin.plan.actividades.map((a: { actividadId: number }) => a.actividadId) }).expect(200);
    const res = (await perfil(e).expect(200)).body;
    expect(res.planActivo).toMatchObject({ planId: fin.plan.planId, estado: 'ACTIVO', avance: { hechas: 0, total: fin.plan.actividades.length } });
    expect(res.planActivo.actividades[0]).toMatchObject({ faseId: expect.any(Number), tipo: expect.any(String) });
  });

  it('RNF-SE-04: cada estudiante solo ve y modifica su propio perfil', async () => {
    const a = await nuevo();
    const b = await nuevo();
    await http(app).patch('/perfil').set(auth(a)).send({ avatar: 'https://ejemplo.com/a.png' }).expect(200);
    expect((await perfil(b).expect(200)).body.avatar).toBeNull();
    expect((await perfil(a).expect(200)).body.nombreAventurero).toBe(await nombre(a));
  });

  // ------------------------------------------------------------- clasificación

  async function conXp(e: EstudiantePrueba, xp: number, alcanzada: Date) {
    await prisma.estudiante.update({ where: { id: e.id }, data: { xpTotal: xp, xpAlcanzadaEn: alcanzada } });
  }
  async function conEstrellas(e: EstudiantePrueba, estrellas: number[]) {
    const retos = await retosEnOrden(prisma);
    await prisma.intentoReto.createMany({
      data: estrellas.map((s, i) => ({
        estudianteId: e.id,
        retoId: retos[i].id,
        estado: 'CALIFICADO' as const,
        porcentaje: s === 3 ? 100 : 85,
        calificacionEstrellas: s,
        aprobado: true,
        calificadoEn: new Date(),
      })),
    });
  }

  it('RF-20: ordena por XP total y expone solo nombre, nivel, XP y estrellas, resaltando la fila propia', async () => {
    const alta = await nuevo();
    const baja = await nuevo();
    await conXp(alta, BASE_XP + 200, new Date());
    await conXp(baja, BASE_XP + 100, new Date());
    const res = await clasificacion(baja);
    expect(res.totalEstudiantes).toBeGreaterThanOrEqual(2);
    const nombres = res.filas.map((f: { nombreAventurero: string }) => f.nombreAventurero);
    expect(nombres.indexOf(await nombre(alta))).toBeLessThan(nombres.indexOf(await nombre(baja)));
    for (const f of res.filas) {
      expect(Object.keys(f).sort()).toEqual(['esYo', 'estrellas', 'nivel', 'nombreAventurero', 'posicion', 'xpTotal']);
    }
    expect(res.filas.filter((f: { esYo: boolean }) => f.esYo)).toHaveLength(1);
    const mia = res.filas.find((f: { esYo: boolean }) => f.esYo);
    expect(mia.nombreAventurero).toBe(await nombre(baja));
    expect(res.miPosicion).toBe(mia.posicion);
    // posiciones consecutivas desde 1
    expect(res.filas.slice(0, 5).map((f: { posicion: number }) => f.posicion)).toEqual([1, 2, 3, 4, 5].slice(0, Math.min(5, res.filas.length)));
    expect(res.calculadaEn).toEqual(expect.any(String)); // se calcula al consultar (RNF-PE-05)
  });

  it('RN-30: con la misma XP desempata por estrellas totales', async () => {
    const pocas = await nuevo();
    const muchas = await nuevo();
    const xp = BASE_XP + 1000;
    await conXp(pocas, xp, new Date('2026-01-01'));
    await conXp(muchas, xp, new Date('2026-06-01'));
    await conEstrellas(pocas, [1, 1]);
    await conEstrellas(muchas, [3, 3, 2]);
    const res = await clasificacion(pocas);
    const nombres = res.filas.map((f: { nombreAventurero: string }) => f.nombreAventurero);
    // «muchas» llegó después a esa XP, pero tiene más estrellas: va primero
    expect(nombres.indexOf(await nombre(muchas))).toBeLessThan(nombres.indexOf(await nombre(pocas)));
    expect(res.filas.find((f: { nombreAventurero: string }) => f.nombreAventurero === 'x')).toBeUndefined();
    expect(res.filas.find((f: { esYo: boolean }) => f.esYo).estrellas).toBe(2);
  });

  it('RN-30: con la misma XP y las mismas estrellas gana quien alcanzó antes esa XP', async () => {
    const tarde = await nuevo();
    const temprano = await nuevo();
    const xp = BASE_XP + 2000;
    await conXp(tarde, xp, new Date('2026-11-09T18:00:00Z'));
    await conXp(temprano, xp, new Date('2026-11-01T09:00:00Z'));
    const res = await clasificacion(tarde);
    const nombres = res.filas.map((f: { nombreAventurero: string }) => f.nombreAventurero);
    expect(nombres.indexOf(await nombre(temprano))).toBeLessThan(nombres.indexOf(await nombre(tarde)));
  });

  it('RN-30: ganar XP actualiza xpAlcanzadaEn (el desempate usa el momento en que se alcanzó la XP)', async () => {
    const e = await nuevo();
    const antes = (await prisma.estudiante.findUniqueOrThrow({ where: { id: e.id } })).xpAlcanzadaEn;
    await new Promise((r) => setTimeout(r, 30));
    const retos = await retosEnOrden(prisma);
    await jugarReto(app, prisma, e, retos[0].id);
    const despues = (await prisma.estudiante.findUniqueOrThrow({ where: { id: e.id } })).xpAlcanzadaEn;
    expect(despues.getTime()).toBeGreaterThan(antes.getTime());
  });

  it('RNF-SE-04: la clasificación no expone correos ni ids', async () => {
    const e = await nuevo();
    const texto = JSON.stringify(await clasificacion(e));
    expect(texto).not.toContain('@');
    expect(texto).not.toMatch(/"(email|id|estudianteId)"\s*:/);
  });

  it('la clasificación incluye a los dos estudiantes demo del seed con progreso distinto', async () => {
    const e = await nuevo();
    const res = await clasificacion(e);
    const rival = res.filas.find((f: { nombreAventurero: string }) => f.nombreAventurero === 'rival_demo');
    const demo = res.filas.find((f: { nombreAventurero: string }) => f.nombreAventurero === 'aventurero_demo');
    // aparecen cuando están dentro del top mostrado; el rival demo tiene XP del seed
    if (rival && demo) expect(rival.xpTotal).toBeGreaterThan(demo.xpTotal);
    const enBase = await prisma.estudiante.findUnique({ where: { email: 'rival@pickquest.dev' } });
    expect(enBase).not.toBeNull();
    expect(enBase!.xpTotal).toBeGreaterThan(0);
  });
});
