import { INestApplication } from '@nestjs/common';
import { diaADate, diaCalendarioMx, sumarDias } from '../src/common/fechas/dia-calendario';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { aprobarFases, auth, borrarEstudiantes, crearApp, EstudiantePrueba, http, nuevoEstudiante } from './ayudas-e2e';

jest.setTimeout(180000);

/** CU-09 Repasar un tema con tarjetas de estudio (RF-12, RN-01, RN-24, RN-25, RN-26). */
describe('CU-09: repaso con tarjetas (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const creados: number[] = [];
  let fases: { id: number; orden: number; tema: string }[] = [];

  const nuevo = async () => {
    const e = await nuevoEstudiante(app, prisma, 0);
    creados.push(e.id);
    return e;
  };
  const fase = (orden: number) => fases.find((f) => f.orden === orden)!;
  const temas = (e: EstudiantePrueba) => http(app).get('/estudio/temas').set(auth(e));
  const material = (e: EstudiantePrueba, faseId: number) => http(app).get(`/estudio/temas/${faseId}`).set(auth(e));
  const iniciar = (e: EstudiantePrueba, faseId: number) => http(app).post(`/estudio/temas/${faseId}/sesiones`).set(auth(e));
  const evaluar = (e: EstudiantePrueba, sesionId: number, tarjetaId: number, autoevaluacion: string) =>
    http(app).post(`/estudio/sesiones/${sesionId}/tarjetas/${tarjetaId}`).set(auth(e)).send({ autoevaluacion });
  const xp = async (e: EstudiantePrueba) =>
    (await prisma.estudiante.findUniqueOrThrow({ where: { id: e.id } })).xpTotal;

  /** Termina la sesión marcando «lo sabía» en cada tarjeta que aparezca. */
  async function terminarSesion(e: EstudiantePrueba, sesion: { sesionId: number; tarjetaActual: { tarjetaId: number } | null }) {
    let actual = sesion;
    let ultima: Record<string, any> = sesion;
    while (actual.tarjetaActual) {
      ultima = (await evaluar(e, actual.sesionId, actual.tarjetaActual.tarjetaId, 'LO_SABIA').expect(200)).body;
      actual = ultima as typeof sesion;
    }
    return ultima;
  }

  beforeAll(async () => {
    ({ app, prisma } = await crearApp());
    fases = await prisma.fase.findMany({ orderBy: { orden: 'asc' }, select: { id: true, orden: true, tema: true } });
  });
  afterAll(async () => {
    await borrarEstudiantes(prisma, creados);
    await app.close();
  });

  it('exige autenticación', async () => {
    await http(app).get('/estudio/temas').expect(401);
    await http(app).post(`/estudio/temas/${fase(1).id}/sesiones`).expect(401);
  });

  it('la biblioteca lista un tema por fase con su estado, el número de tarjetas y las que tocan hoy', async () => {
    const e = await nuevo();
    const res = await temas(e).expect(200);
    expect(res.body.map((t: { orden: number }) => t.orden)).toEqual([1, 2, 3]);
    expect(res.body.map((t: { bloqueado: boolean }) => t.bloqueado)).toEqual([false, true, true]);
    for (const t of res.body) {
      expect(t.totalTarjetas).toBeGreaterThanOrEqual(10);
      expect(t.totalTarjetas).toBeLessThanOrEqual(12);
      expect(t.tarjetasParaHoy).toBe(t.totalTarjetas); // todas son nuevas
      expect(t).toMatchObject({ sesionPendiente: false, dominio: null });
    }
  });

  it('el material trae explicación, de 3 a 5 ejemplos y de 8 a 10 términos de glosario', async () => {
    const e = await nuevo();
    const res = await material(e, fase(1).id).expect(200);
    expect(res.body.explicacion.length).toBeGreaterThan(400);
    expect(res.body.ejemplos.length).toBeGreaterThanOrEqual(3);
    expect(res.body.ejemplos.length).toBeLessThanOrEqual(5);
    expect(res.body.glosario.length).toBeGreaterThanOrEqual(8);
    expect(res.body.glosario.length).toBeLessThanOrEqual(10);
    expect(res.body.glosario[0]).toEqual({ termino: expect.any(String), definicion: expect.any(String) });
  });

  it('FE1: un tema de una fase bloqueada responde 403 con el mensaje de RN-01 (material, consulta y sesión)', async () => {
    const e = await nuevo();
    const peticiones = [
      () => material(e, fase(2).id),
      () => http(app).post(`/estudio/temas/${fase(2).id}/consultas`).set(auth(e)),
      () => iniciar(e, fase(3).id),
    ];
    for (const peticion of peticiones) {
      const res = await peticion().expect(403);
      expect(res.body.message).toBe('Este tema se desbloquea al completar la fase anterior');
    }
    expect(await prisma.sesionRepaso.count({ where: { estudianteId: e.id } })).toBe(0);
    await material(e, 999999).expect(404);
  });

  it('FA1: cerrar el material sin repasar registra la consulta del tema', async () => {
    const e = await nuevo();
    expect(await prisma.consultaTema.count({ where: { estudianteId: e.id } })).toBe(0);
    await http(app).post(`/estudio/temas/${fase(1).id}/consultas`).set(auth(e)).expect(201);
    const consultas = await prisma.consultaTema.findMany({ where: { estudianteId: e.id } });
    expect(consultas).toHaveLength(1);
    expect(consultas[0].faseId).toBe(fase(1).id);
    // no se creó ninguna sesión ni se otorgó XP
    expect(await prisma.sesionRepaso.count({ where: { estudianteId: e.id } })).toBe(0);
    expect(await xp(e)).toBe(0);
  });

  it('flujo normal: voltear, autoevaluar cada tarjeta y terminar con resumen, 10 XP, sin QP y dominio (RN-24, RN-25)', async () => {
    const e = await nuevo();
    const sesion = (await iniciar(e, fase(1).id).expect(201)).body;
    expect(sesion).toMatchObject({ retomada: false, terminada: false, completadas: 0 });
    expect(sesion.total).toBe(await prisma.tarjeta.count({ where: { faseId: fase(1).id } }));
    expect(sesion.tarjetaActual).toMatchObject({ posicion: 1, frente: expect.any(String), reverso: expect.any(String) });

    const final = await terminarSesion(e, sesion);
    expect(final.terminada).toBe(true);
    expect(final.tarjetaActual).toBeNull();
    expect(final.resumen).toMatchObject({ sabidas: sesion.total, dudadas: 0, noSabidas: 0, xpOtorgada: 10 });

    const perfil = await prisma.estudiante.findUniqueOrThrow({ where: { id: e.id } });
    expect(perfil.xpTotal).toBe(10);
    expect(perfil.qpTotal).toBe(0); // RN-25: sin QP
    // RN-26: sin diagnóstico ni retos calificados, el dominio es 0 y queda guardado
    const dominio = await prisma.dominioTema.findUniqueOrThrow({
      where: { estudianteId_tema: { estudianteId: e.id, tema: 'CICLO_VIDA' } },
    });
    expect(dominio.porcentaje).toBe(0);
    expect(final.resumen.dominio).toBe(0);
    // «lo sabía» programa a 3 días
    const hoy = diaCalendarioMx();
    const progreso = await prisma.progresoTarjeta.findMany({ where: { estudianteId: e.id } });
    expect(progreso).toHaveLength(sesion.total);
    for (const p of progreso) expect(p.proximoRepaso.toISOString().slice(0, 10)).toBe(sumarDias(hoy, 3));
  });

  it('RN-24: «dudé» programa al día siguiente y «no lo sabía» manda la tarjeta al final y la deja para hoy', async () => {
    const e = await nuevo();
    const sesion = (await iniciar(e, fase(1).id).expect(201)).body;
    const primera = sesion.tarjetaActual.tarjetaId;
    const segunda = (await evaluar(e, sesion.sesionId, primera, 'NO_LO_SABIA').expect(200)).body;
    // la primera tarjeta pasó al final de la cola: la siguiente es otra y sigue pendiente
    expect(segunda.tarjetaActual.tarjetaId).not.toBe(primera);
    expect(segunda.completadas).toBe(0);
    const enSesion = await prisma.tarjetaSesion.findUniqueOrThrow({
      where: { sesionId_tarjetaId: { sesionId: sesion.sesionId, tarjetaId: primera } },
    });
    expect(enSesion).toMatchObject({ completada: false, autoevaluacion: 'NO_LO_SABIA', posicion: sesion.total + 1 });
    const hoy = diaCalendarioMx();
    const p1 = await prisma.progresoTarjeta.findUniqueOrThrow({
      where: { estudianteId_tarjetaId: { estudianteId: e.id, tarjetaId: primera } },
    });
    expect(p1.proximoRepaso.toISOString().slice(0, 10)).toBe(hoy);

    const dudada = segunda.tarjetaActual.tarjetaId;
    const tercera = (await evaluar(e, sesion.sesionId, dudada, 'DUDE').expect(200)).body;
    expect(tercera.completadas).toBe(1);
    const p2 = await prisma.progresoTarjeta.findUniqueOrThrow({
      where: { estudianteId_tarjetaId: { estudianteId: e.id, tarjetaId: dudada } },
    });
    expect(p2.proximoRepaso.toISOString().slice(0, 10)).toBe(sumarDias(hoy, 1));
  });

  it('una tarjeta «no lo sabía» vuelve a aparecer en la misma sesión y la sesión no termina hasta saberla', async () => {
    const e = await nuevo();
    let sesion = (await iniciar(e, fase(1).id).expect(201)).body;
    const dificil = sesion.tarjetaActual.tarjetaId;
    sesion = (await evaluar(e, sesion.sesionId, dificil, 'NO_LO_SABIA').expect(200)).body;
    // el resto de las tarjetas se completa
    while (sesion.tarjetaActual && sesion.tarjetaActual.tarjetaId !== dificil) {
      sesion = (await evaluar(e, sesion.sesionId, sesion.tarjetaActual.tarjetaId, 'LO_SABIA').expect(200)).body;
    }
    expect(sesion.terminada).toBe(false);
    expect(sesion.tarjetaActual.tarjetaId).toBe(dificil); // vuelve a aparecer al final
    expect(sesion.pendientes).toBe(1);
    const final = (await evaluar(e, sesion.sesionId, dificil, 'DUDE').expect(200)).body;
    expect(final.terminada).toBe(true);
    // el resumen cuenta la primera autoevaluación de cada tarjeta
    expect(final.resumen).toMatchObject({ noSabidas: 1, sabidas: final.total - 1, dudadas: 0 });
    // la programación final quedó con la última autoevaluación
    const p = await prisma.progresoTarjeta.findUniqueOrThrow({
      where: { estudianteId_tarjetaId: { estudianteId: e.id, tarjetaId: dificil } },
    });
    expect(p.ultimaAutoeval).toBe('DUDE');
  });

  it('FA2: salir a medias conserva el avance sin XP y al volver retoma la misma sesión con las pendientes', async () => {
    const e = await nuevo();
    const sesion = (await iniciar(e, fase(1).id).expect(201)).body;
    let estado = sesion;
    for (let i = 0; i < 3; i++) {
      estado = (await evaluar(e, sesion.sesionId, estado.tarjetaActual.tarjetaId, 'LO_SABIA').expect(200)).body;
    }
    expect(estado.completadas).toBe(3);
    expect(await xp(e)).toBe(0);
    expect((await temas(e).expect(200)).body[0].sesionPendiente).toBe(true);

    const retomada = (await iniciar(e, fase(1).id).expect(201)).body;
    expect(retomada).toMatchObject({ sesionId: sesion.sesionId, retomada: true, completadas: 3, terminada: false });
    expect(retomada.tarjetaActual.tarjetaId).toBe(estado.tarjetaActual.tarjetaId);
    expect(await prisma.sesionRepaso.count({ where: { estudianteId: e.id } })).toBe(1);
    const consultada = (await http(app).get(`/estudio/sesiones/${sesion.sesionId}`).set(auth(e)).expect(200)).body;
    expect(consultada.completadas).toBe(3);

    const final = await terminarSesion(e, retomada);
    expect(final.resumen.xpOtorgada).toBe(10);
    expect(await xp(e)).toBe(10);
  });

  it('RN-25: la XP de repaso se otorga solo una vez al día por tema, y de nuevo en otro tema o al día siguiente', async () => {
    const e = await nuevo();
    await aprobarFases(app, prisma, e, 1); // desbloquea la fase 2
    const antes = await xp(e);

    const primera = await terminarSesion(e, (await iniciar(e, fase(1).id).expect(201)).body);
    expect(primera.resumen.xpOtorgada).toBe(10);
    expect(await xp(e)).toBe(antes + 10);

    // segunda sesión del mismo tema el mismo día: se incluye todo el mazo (nada toca hoy) y no da XP
    const segundaInicio = (await iniciar(e, fase(1).id).expect(201)).body;
    expect(segundaInicio.total).toBe(await prisma.tarjeta.count({ where: { faseId: fase(1).id } }));
    const segunda = await terminarSesion(e, segundaInicio);
    expect(segunda.resumen.xpOtorgada).toBe(0);
    expect(await xp(e)).toBe(antes + 10);

    // otro tema el mismo día sí otorga
    const otroTema = await terminarSesion(e, (await iniciar(e, fase(2).id).expect(201)).body);
    expect(otroTema.resumen.xpOtorgada).toBe(10);
    expect(await xp(e)).toBe(antes + 20);

    // al día siguiente vuelve a otorgar: se mueve el día de las sesiones ya terminadas
    const ayer = diaADate(sumarDias(diaCalendarioMx(), -1));
    await prisma.sesionRepaso.updateMany({ where: { estudianteId: e.id }, data: { diaTerminada: ayer } });
    const alOtroDia = await terminarSesion(e, (await iniciar(e, fase(1).id).expect(201)).body);
    expect(alOtroDia.resumen.xpOtorgada).toBe(10);
    expect(await xp(e)).toBe(antes + 30);
  });

  it('las tarjetas vencidas y las nuevas forman la sesión de hoy; las programadas para después se omiten (RN-24)', async () => {
    const e = await nuevo();
    const tarjetas = await prisma.tarjeta.findMany({ where: { faseId: fase(1).id }, orderBy: { orden: 'asc' } });
    const hoy = diaCalendarioMx();
    // las 2 primeras vencen hoy y ayer; la tercera dentro de 3 días; el resto son nuevas
    await prisma.progresoTarjeta.createMany({
      data: [
        { estudianteId: e.id, tarjetaId: tarjetas[0].id, proximoRepaso: diaADate(hoy), ultimaAutoeval: 'NO_LO_SABIA' },
        { estudianteId: e.id, tarjetaId: tarjetas[1].id, proximoRepaso: diaADate(sumarDias(hoy, -1)), ultimaAutoeval: 'DUDE' },
        { estudianteId: e.id, tarjetaId: tarjetas[2].id, proximoRepaso: diaADate(sumarDias(hoy, 3)), ultimaAutoeval: 'LO_SABIA' },
      ],
    });
    const lista = (await temas(e).expect(200)).body[0];
    expect(lista.tarjetasParaHoy).toBe(tarjetas.length - 1);
    const sesion = (await iniciar(e, fase(1).id).expect(201)).body;
    expect(sesion.total).toBe(tarjetas.length - 1);
    const enSesion = await prisma.tarjetaSesion.findMany({ where: { sesionId: sesion.sesionId } });
    expect(enSesion.map((t) => t.tarjetaId)).not.toContain(tarjetas[2].id);
  });

  it('valida la autoevaluación y los accesos: sesión y tarjeta ajenas o repetidas', async () => {
    const e = await nuevo();
    const otro = await nuevo();
    const sesion = (await iniciar(e, fase(1).id).expect(201)).body;
    const tarjetaId = sesion.tarjetaActual.tarjetaId;
    await evaluar(e, sesion.sesionId, tarjetaId, 'TAL_VEZ').expect(400);
    await evaluar(e, sesion.sesionId, tarjetaId, '').expect(400);
    // otro estudiante no puede ver ni evaluar la sesión (404, sin revelar que existe)
    await http(app).get(`/estudio/sesiones/${sesion.sesionId}`).set(auth(otro)).expect(404);
    await evaluar(otro, sesion.sesionId, tarjetaId, 'LO_SABIA').expect(404);
    // una tarjeta que no es de la sesión
    const ajena = await prisma.tarjeta.findFirstOrThrow({ where: { faseId: fase(3).id } });
    await evaluar(e, sesion.sesionId, ajena.id, 'LO_SABIA').expect(404);
    // una tarjeta ya completada no se evalúa de nuevo
    await evaluar(e, sesion.sesionId, tarjetaId, 'LO_SABIA').expect(200);
    await evaluar(e, sesion.sesionId, tarjetaId, 'LO_SABIA').expect(409);
    // el progreso de la tarjeta no se mezcla entre estudiantes
    expect(await prisma.progresoTarjeta.count({ where: { estudianteId: otro.id } })).toBe(0);
  });

  it('una sesión terminada no admite más autoevaluaciones y se puede consultar con su resumen', async () => {
    const e = await nuevo();
    const sesion = (await iniciar(e, fase(1).id).expect(201)).body;
    const primera = sesion.tarjetaActual.tarjetaId;
    await terminarSesion(e, sesion);
    await evaluar(e, sesion.sesionId, primera, 'DUDE').expect(409);
    const consultada = (await http(app).get(`/estudio/sesiones/${sesion.sesionId}`).set(auth(e)).expect(200)).body;
    expect(consultada).toMatchObject({ terminada: true, resumen: { xpOtorgada: 10 } });
  });

  it('dos finales simultáneos no duplican la XP (RNF-RE-04)', async () => {
    const e = await nuevo();
    const sesion = (await iniciar(e, fase(1).id).expect(201)).body;
    let estado = sesion;
    while (estado.pendientes > 1) {
      estado = (await evaluar(e, sesion.sesionId, estado.tarjetaActual.tarjetaId, 'LO_SABIA').expect(200)).body;
    }
    const ultima = estado.tarjetaActual.tarjetaId;
    const respuestas = await Promise.all([1, 2].map(() => evaluar(e, sesion.sesionId, ultima, 'LO_SABIA')));
    expect(respuestas.map((r) => r.status).sort()).toEqual([200, 409]);
    expect(await xp(e)).toBe(10);
  });

  it('el dominio del tema combina los retos calificados cuando existen (RN-26)', async () => {
    const e = await nuevo();
    await aprobarFases(app, prisma, e, 1); // retos de la fase 1 al 100 %
    const sesion = (await iniciar(e, fase(1).id).expect(201)).body;
    const final = await terminarSesion(e, sesion);
    expect(final.resumen.dominio).toBe(100); // sin diagnóstico: el promedio de los retos
    const guardado = await prisma.dominioTema.findUniqueOrThrow({
      where: { estudianteId_tema: { estudianteId: e.id, tema: 'CICLO_VIDA' } },
    });
    expect(guardado.porcentaje).toBe(100);
    expect((await temas(e).expect(200)).body[0].dominio).toBe(100);
  });
});
