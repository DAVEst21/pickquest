import { INestApplication } from '@nestjs/common';
import { dateADia, diaADate, diaCalendarioMx, sumarDias } from '../src/common/fechas/dia-calendario';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { auth, borrarEstudiantes, crearApp, EstudiantePrueba, http, nuevoEstudiante } from './ayudas-e2e';

jest.setTimeout(180000);

/** CU-11 Superar el reto diario contrarreloj (RF-14, RN-12, RN-13, RN-29, RNF-SE-05). */
describe('CU-11: reto diario (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const creados: number[] = [];

  const nuevo = async () => {
    const e = await nuevoEstudiante(app, prisma, 0);
    creados.push(e.id);
    return e;
  };
  const hoy = (e: EstudiantePrueba) => http(app).get('/reto-diario/hoy').set(auth(e));
  const iniciar = (e: EstudiantePrueba) => http(app).post('/reto-diario').set(auth(e));
  const entregar = (e: EstudiantePrueba, id: number, n: number) =>
    http(app).post(`/reto-diario/${id}/preguntas/${n}/entregar`).set(auth(e));
  const responder = (e: EstudiantePrueba, id: number, n: number, opcionId: number | null) =>
    http(app).post(`/reto-diario/${id}/preguntas/${n}/respuesta`).set(auth(e)).send({ opcionId });
  const abandonar = (e: EstudiantePrueba, id: number) => http(app).post(`/reto-diario/${id}/abandonar`).set(auth(e));
  const perfil = async (e: EstudiantePrueba) => (await http(app).get('/auth/perfil').set(auth(e)).expect(200)).body;
  const racha = (e: EstudiantePrueba, datos: { dias: number; ultimo: string | null; record?: number }) =>
    prisma.rachaEstudio.update({
      where: { estudianteId: e.id },
      data: {
        diasActuales: datos.dias,
        diasRecord: datos.record ?? datos.dias,
        multiplicadorQP: Math.min(2, 1 + 0.1 * datos.dias),
        ultimaActividad: datos.ultimo ? diaADate(datos.ultimo) : null,
      },
    });

  /** Opción correcta de la pregunta `n` de un reto (la API nunca la envía antes de responder). */
  async function correctaDe(retoDiarioId: number, n: number) {
    const fila = await prisma.preguntaRetoDiario.findUniqueOrThrow({
      where: { retoDiarioId_numero: { retoDiarioId, numero: n } },
      include: { pregunta: { include: { opciones: true } } },
    });
    return {
      correcta: fila.pregunta.opciones.find((o) => o.correcta)!.id,
      incorrecta: fila.pregunta.opciones.find((o) => !o.correcta)!.id,
    };
  }

  /** Juega las 10 preguntas acertando las primeras `aciertos`. */
  async function jugar(e: EstudiantePrueba, retoDiarioId: number, aciertos: number) {
    let ultima: Record<string, any> = {};
    for (let n = 1; n <= 10; n++) {
      await entregar(e, retoDiarioId, n).expect(200);
      const { correcta, incorrecta } = await correctaDe(retoDiarioId, n);
      ultima = (await responder(e, retoDiarioId, n, n <= aciertos ? correcta : incorrecta).expect(200)).body;
    }
    return ultima;
  }

  async function nuevoReto(e: EstudiantePrueba) {
    return (await iniciar(e).expect(201)).body.retoDiarioId as number;
  }

  beforeAll(async () => {
    ({ app, prisma } = await crearApp());
  });
  afterAll(async () => {
    await borrarEstudiantes(prisma, creados);
    await app.close();
  });

  it('exige autenticación', async () => {
    await http(app).get('/reto-diario/hoy').expect(401);
    await http(app).post('/reto-diario').expect(401);
  });

  it('pasos 1 y 2: muestra la racha, el multiplicador y las reglas antes de empezar', async () => {
    const e = await nuevo();
    const res = (await hoy(e).expect(200)).body;
    expect(res).toMatchObject({
      estado: 'DISPONIBLE',
      reto: null,
      segundosHastaSiguiente: null,
      racha: { diasActuales: 0, diasRecord: 0, multiplicadorQP: 1 },
      reglas: { preguntas: 10, segundosPorPregunta: 20, porcentajeRacha: 50, xpPorAcierto: 2, qpPorAcierto: 5 },
    });
    expect(res.dia).toBe(diaCalendarioMx());
  });

  it('pasos 3 a 9: 10 preguntas del banco, sin la opción correcta; puntaje, XP, QP y racha al terminar (RN-29, RN-13)', async () => {
    const e = await nuevo();
    const id = await nuevoReto(e);
    const estado = (await hoy(e).expect(200)).body;
    expect(estado).toMatchObject({ estado: 'EN_CURSO', reto: { total: 10, resueltas: 0, siguiente: 1, terminado: false } });

    const primera = (await entregar(e, id, 1).expect(200)).body;
    expect(primera).toMatchObject({ numero: 1, total: 10, limiteSegundos: 20 });
    expect(primera.segundosRestantes).toBeGreaterThan(18);
    expect(primera.opciones).toHaveLength(4);
    expect(JSON.stringify(primera)).not.toMatch(/"correcta"\s*:/);
    expect(Object.keys(primera.opciones[0]).sort()).toEqual(['opcionId', 'texto']);

    // resuelve con 7 aciertos
    const { correcta } = await correctaDe(id, 1);
    const r1 = (await responder(e, id, 1, correcta).expect(200)).body;
    expect(r1).toMatchObject({ numero: 1, correcta: true, tiempoAgotado: false, opcionCorrectaId: correcta, terminado: false });
    expect(r1.explicacion).toEqual(expect.any(String));
    for (let n = 2; n <= 10; n++) {
      await entregar(e, id, n).expect(200);
      const o = await correctaDe(id, n);
      await responder(e, id, n, n <= 7 ? o.correcta : o.incorrecta).expect(200);
    }

    const fin = (await hoy(e).expect(200)).body;
    expect(fin.estado).toBe('TERMINADO');
    expect(fin.reto.resultado).toMatchObject({
      aciertos: 7,
      total: 10,
      porcentaje: 70,
      xpOtorgada: 14, // RN-29: 2 XP por acierto
      qpOtorgado: 35, // 5 QP por acierto × 1.0
      multiplicadorAplicado: 1,
      logroRacha: true,
      racha: { diasActuales: 1, multiplicadorQP: 1.1 },
    });
    const p = await perfil(e);
    expect(p).toMatchObject({ xpTotal: 14, qpTotal: 35, racha: { diasActuales: 1, diasRecord: 1, multiplicadorQP: 1.1 } });
  });

  it('FE1: un segundo reto el mismo día responde 409 con el resultado y el tiempo que falta', async () => {
    const e = await nuevo();
    const id = await nuevoReto(e);
    await jugar(e, id, 6);
    const res = await iniciar(e).expect(409);
    expect(res.body.message).toMatch(/Ya realizaste el reto diario de hoy/);
    expect(res.body.reto.resultado.aciertos).toBe(6);
    expect(res.body.segundosHastaSiguiente).toBeGreaterThan(0);
    expect(res.body.segundosHastaSiguiente).toBeLessThanOrEqual(24 * 3600);
    expect(await prisma.retoDiario.count({ where: { estudianteId: e.id } })).toBe(1);

    const consulta = (await hoy(e).expect(200)).body;
    expect(consulta).toMatchObject({ estado: 'TERMINADO' });
    expect(consulta.segundosHastaSiguiente).toBeGreaterThan(0);
    // sus preguntas ya no se pueden volver a entregar
    await entregar(e, id, 1).expect(409);
  });

  it('el mismo día, iniciar de nuevo retoma el reto en curso sin crear otro', async () => {
    const e = await nuevo();
    const id = await nuevoReto(e);
    await entregar(e, id, 1).expect(200);
    const o = await correctaDe(id, 1);
    await responder(e, id, 1, o.correcta).expect(200);
    const retomado = (await iniciar(e).expect(201)).body;
    expect(retomado).toMatchObject({ retoDiarioId: id, resueltas: 1, siguiente: 2 });
    expect(await prisma.retoDiario.count({ where: { estudianteId: e.id } })).toBe(1);
  });

  it('solo hay preguntas de los temas desbloqueados (un estudiante nuevo, solo Ciclo de vida)', async () => {
    const e = await nuevo();
    const id = await nuevoReto(e);
    const filas = await prisma.preguntaRetoDiario.findMany({ where: { retoDiarioId: id }, include: { pregunta: true } });
    expect(filas).toHaveLength(10);
    expect(new Set(filas.map((f) => f.pregunta.tema))).toEqual(new Set(['CICLO_VIDA']));
    expect(new Set(filas.map((f) => f.preguntaId)).size).toBe(10);
  });

  it('las preguntas se entregan en orden', async () => {
    const e = await nuevo();
    const id = await nuevoReto(e);
    const res = await entregar(e, id, 3).expect(409);
    expect(res.body.message).toMatch(/pregunta anterior/);
    await entregar(e, id, 0).expect(400);
    await entregar(e, id, 11).expect(400);
    await entregar(e, id, 1).expect(200);
    // la 2 no se entrega hasta resolver la 1
    await entregar(e, id, 2).expect(409);
  });

  it('entregar dos veces la misma pregunta no reinicia su reloj', async () => {
    const e = await nuevo();
    const id = await nuevoReto(e);
    await entregar(e, id, 1).expect(200);
    const antes = await prisma.preguntaRetoDiario.findUniqueOrThrow({ where: { retoDiarioId_numero: { retoDiarioId: id, numero: 1 } } });
    const otra = (await entregar(e, id, 1).expect(200)).body;
    const despues = await prisma.preguntaRetoDiario.findUniqueOrThrow({ where: { retoDiarioId_numero: { retoDiarioId: id, numero: 1 } } });
    expect(despues.entregadaEn!.getTime()).toBe(antes.entregadaEn!.getTime());
    expect(otra.segundosRestantes).toBeLessThanOrEqual(20);
  });

  it('responder una pregunta que no se entregó, o dos veces, responde 409', async () => {
    const e = await nuevo();
    const id = await nuevoReto(e);
    const o = await correctaDe(id, 1);
    await responder(e, id, 1, o.correcta).expect(409);
    await entregar(e, id, 1).expect(200);
    await responder(e, id, 1, o.correcta).expect(200);
    await responder(e, id, 1, o.correcta).expect(409);
  });

  it('FA1: tiempo agotado (opcionId null) cuenta como incorrecta y sigue con la siguiente', async () => {
    const e = await nuevo();
    const id = await nuevoReto(e);
    await entregar(e, id, 1).expect(200);
    const r = (await responder(e, id, 1, null).expect(200)).body;
    expect(r).toMatchObject({ correcta: false, tiempoAgotado: true });
    expect(r.opcionCorrectaId).toEqual(expect.any(Number));
    expect(r.estado).toMatchObject({ resueltas: 1, siguiente: 2 });
    await entregar(e, id, 2).expect(200);
  });

  it('RNF-SE-05: una respuesta correcta después de 21 s es incorrecta; a los 20 s sí vale', async () => {
    const e = await nuevo();
    const id = await nuevoReto(e);
    const retrasar = (n: number, segundos: number) =>
      prisma.preguntaRetoDiario.update({
        where: { retoDiarioId_numero: { retoDiarioId: id, numero: n } },
        data: { entregadaEn: new Date(Date.now() - segundos * 1000) },
      });

    await entregar(e, id, 1).expect(200);
    await retrasar(1, 22);
    const tarde = (await responder(e, id, 1, (await correctaDe(id, 1)).correcta).expect(200)).body;
    expect(tarde).toMatchObject({ correcta: false, tiempoAgotado: true });

    await entregar(e, id, 2).expect(200);
    await retrasar(2, 20);
    const justo = (await responder(e, id, 2, (await correctaDe(id, 2)).correcta).expect(200)).body;
    expect(justo).toMatchObject({ correcta: true, tiempoAgotado: false });

    await entregar(e, id, 3).expect(200);
    await retrasar(3, 20.5); // dentro de la tolerancia de red
    expect((await responder(e, id, 3, (await correctaDe(id, 3)).correcta).expect(200)).body.correcta).toBe(true);
  });

  it('responder con una opción de otra pregunta responde 400 y no se registra', async () => {
    const e = await nuevo();
    const id = await nuevoReto(e);
    await entregar(e, id, 1).expect(200);
    const otra = await correctaDe(id, 2);
    await responder(e, id, 1, otra.correcta).expect(400);
    await http(app).post(`/reto-diario/${id}/preguntas/1/respuesta`).set(auth(e)).send({}).expect(400);
    await http(app).post(`/reto-diario/${id}/preguntas/1/respuesta`).set(auth(e)).send({ opcionId: 'x' }).expect(400);
    expect((await prisma.preguntaRetoDiario.findUniqueOrThrow({ where: { retoDiarioId_numero: { retoDiarioId: id, numero: 1 } } })).correcta).toBeNull();
  });

  it('FA2: abandonar cuenta lo no respondido como incorrecto, otorga lo ganado y el reto del día queda realizado', async () => {
    const e = await nuevo();
    const id = await nuevoReto(e);
    for (let n = 1; n <= 3; n++) {
      await entregar(e, id, n).expect(200);
      await responder(e, id, n, (await correctaDe(id, n)).correcta).expect(200);
    }
    const estado = (await abandonar(e, id).expect(200)).body;
    expect(estado.terminado).toBe(true);
    expect(estado.resultado).toMatchObject({ aciertos: 3, porcentaje: 30, xpOtorgada: 6, qpOtorgado: 15, logroRacha: false });
    expect(await perfil(e)).toMatchObject({ xpTotal: 6, qpTotal: 15 });
    // quedó realizado: no hay segundo reto
    await iniciar(e).expect(409);
    const filas = await prisma.preguntaRetoDiario.findMany({ where: { retoDiarioId: id }, orderBy: { numero: 'asc' } });
    expect(filas.slice(3).every((f) => f.correcta === false && f.opcionId === null)).toBe(true);
  });

  it('abandonar de nuevo o con un reto ajeno responde 409 y 404', async () => {
    const e = await nuevo();
    const otro = await nuevo();
    const id = await nuevoReto(e);
    await abandonar(otro, id).expect(404);
    await entregar(otro, id, 1).expect(404);
    await abandonar(e, id).expect(200);
    await abandonar(e, id).expect(409);
  });

  it('sin cinto de ayudas: no existe ninguna ruta de ayuda en el reto diario', async () => {
    const e = await nuevo();
    const id = await nuevoReto(e);
    await http(app).post(`/reto-diario/${id}/ayuda`).set(auth(e)).send({ objetoId: 1 }).expect(404);
  });

  it('con menos de 50 % la racha no aumenta, pero se pagan los aciertos (RN-13)', async () => {
    const e = await nuevo();
    const id = await nuevoReto(e);
    const fin = await jugar(e, id, 4);
    expect(fin.estado.resultado).toMatchObject({ aciertos: 4, logroRacha: false, xpOtorgada: 8, qpOtorgado: 20 });
    expect((await perfil(e)).racha).toMatchObject({ diasActuales: 0, multiplicadorQP: 1 });
  });

  it('RN-13: un día consecutivo con 50 % suma a la racha y el multiplicador sube de 0.1 en 0.1', async () => {
    const e = await nuevo();
    const ayer = sumarDias(diaCalendarioMx(), -1);
    await racha(e, { dias: 4, ultimo: ayer });
    expect((await perfil(e)).racha).toMatchObject({ diasActuales: 4, multiplicadorQP: 1.4 });
    const id = await nuevoReto(e);
    const fin = await jugar(e, id, 5);
    // los QP se pagan con el multiplicador vigente al iniciar (1.4): 25 × 1.4 = 35
    expect(fin.estado.resultado).toMatchObject({ aciertos: 5, qpOtorgado: 35, multiplicadorAplicado: 1.4, logroRacha: true });
    expect(fin.estado.resultado.racha).toMatchObject({ diasActuales: 5, multiplicadorQP: 1.5 });
    expect(await perfil(e)).toMatchObject({ qpTotal: 35, racha: { diasActuales: 5, diasRecord: 5, multiplicadorQP: 1.5 } });
    const guardada = await prisma.rachaEstudio.findUniqueOrThrow({ where: { estudianteId: e.id } });
    expect(dateADia(guardada.ultimaActividad!)).toBe(diaCalendarioMx());
  });

  it('RN-13: el multiplicador tiene un tope de 2.0', async () => {
    const e = await nuevo();
    await racha(e, { dias: 14, ultimo: sumarDias(diaCalendarioMx(), -1) });
    const id = await nuevoReto(e);
    const fin = await jugar(e, id, 10);
    expect(fin.estado.resultado.racha).toMatchObject({ diasActuales: 15, multiplicadorQP: 2 });
    expect(fin.estado.resultado.qpOtorgado).toBe(100); // 50 × 2.0
  });

  it('RN-13: reinicio perezoso — pasó un día sin lograrlo: la racha vale 0 y el multiplicador 1.0, y se guarda así', async () => {
    const e = await nuevo();
    await racha(e, { dias: 6, ultimo: sumarDias(diaCalendarioMx(), -3), record: 6 });
    // el perfil, el reto diario y las recompensas de los retos leen la racha ya reiniciada
    expect((await perfil(e)).racha).toMatchObject({ diasActuales: 0, diasRecord: 6, multiplicadorQP: 1 });
    const guardada = await prisma.rachaEstudio.findUniqueOrThrow({ where: { estudianteId: e.id } });
    expect(guardada.diasActuales).toBe(0);
    expect(Number(guardada.multiplicadorQP)).toBe(1);
    expect(guardada.diasRecord).toBe(6);
  });

  it('RN-13: el reinicio perezoso también aplica al consultar el reto diario y al anunciar la recompensa de un reto', async () => {
    const e = await nuevo();
    await racha(e, { dias: 6, ultimo: sumarDias(diaCalendarioMx(), -2) });
    const res = (await hoy(e).expect(200)).body;
    expect(res.racha).toMatchObject({ diasActuales: 0, multiplicadorQP: 1 });

    const f = await racha(e, { dias: 8, ultimo: sumarDias(diaCalendarioMx(), -5) });
    expect(f.diasActuales).toBe(8);
    const fases = (await http(app).get('/fases').set(auth(e)).expect(200)).body;
    const tablon = (await http(app).get(`/fases/${fases[0].id}`).set(auth(e)).expect(200)).body;
    const base = await prisma.reto.findFirstOrThrow({ where: { faseId: fases[0].id }, orderBy: { orden: 'asc' } });
    expect(tablon.retos[0].recompensaQp).toBe(base.recompensaQp); // ×1.0, no ×1.8
  });

  it('un reto de un día anterior sin terminar se cierra solo en el siguiente acceso, con la racha de su propio día', async () => {
    const e = await nuevo();
    const antesDeAyer = sumarDias(diaCalendarioMx(), -2);
    const ayer = sumarDias(diaCalendarioMx(), -1);
    await racha(e, { dias: 3, ultimo: antesDeAyer });

    // un reto de ayer con 6 aciertos ya contestados y el resto sin responder
    const pool = await prisma.preguntaBanco.findMany({ where: { tema: 'CICLO_VIDA' }, take: 10, include: { opciones: true } });
    const reto = await prisma.retoDiario.create({
      data: {
        estudianteId: e.id,
        dia: diaADate(ayer),
        multiplicador: 1.3,
        preguntas: {
          create: pool.map((p, i) => ({
            numero: i + 1,
            preguntaId: p.id,
            entregadaEn: i < 6 ? new Date(Date.now() - 86_400_000) : null,
            opcionId: i < 6 ? p.opciones.find((o) => o.correcta)!.id : null,
            correcta: i < 6 ? true : null,
          })),
        },
      },
    });

    const res = (await hoy(e).expect(200)).body;
    // se cerró con las 4 sin responder como incorrectas
    const cerrado = await prisma.retoDiario.findUniqueOrThrow({ where: { id: reto.id } });
    expect(cerrado.terminadoEn).not.toBeNull();
    expect(cerrado).toMatchObject({ aciertos: 6, xpOtorgada: 12, qpOtorgado: 39 }); // 30 × 1.3
    // la racha de AYER subió (3 → 4) y hoy sigue vigente
    expect(res.racha).toMatchObject({ diasActuales: 4, multiplicadorQP: 1.4 });
    expect(res.estado).toBe('DISPONIBLE'); // el de hoy aún no se hace
    expect(await perfil(e)).toMatchObject({ xpTotal: 12, qpTotal: 39 });
  });

  it('si cerró el navegador, el mismo día continúa con la siguiente y la pregunta vencida cuenta como incorrecta', async () => {
    const e = await nuevo();
    const id = await nuevoReto(e);
    await entregar(e, id, 1).expect(200);
    // la 1 quedó en pantalla y pasó el tiempo
    await prisma.preguntaRetoDiario.update({
      where: { retoDiarioId_numero: { retoDiarioId: id, numero: 1 } },
      data: { entregadaEn: new Date(Date.now() - 60_000) },
    });
    const res = (await hoy(e).expect(200)).body;
    expect(res.reto).toMatchObject({ siguiente: 2, resueltas: 1 });
    expect(res.reto.preguntas[0]).toMatchObject({ numero: 1, correcta: false });
    await entregar(e, id, 2).expect(200); // continúa sin problema
    expect((await prisma.preguntaRetoDiario.findUniqueOrThrow({ where: { retoDiarioId_numero: { retoDiarioId: id, numero: 1 } } })).correcta).toBe(false);
  });

  it('si la última pregunta venció con el navegador cerrado, el reto se cierra solo al volver', async () => {
    const e = await nuevo();
    const id = await nuevoReto(e);
    for (let n = 1; n <= 9; n++) {
      await entregar(e, id, n).expect(200);
      await responder(e, id, n, (await correctaDe(id, n)).correcta).expect(200);
    }
    await entregar(e, id, 10).expect(200);
    await prisma.preguntaRetoDiario.update({
      where: { retoDiarioId_numero: { retoDiarioId: id, numero: 10 } },
      data: { entregadaEn: new Date(Date.now() - 60_000) },
    });
    const res = (await hoy(e).expect(200)).body;
    expect(res.estado).toBe('TERMINADO');
    expect(res.reto.resultado).toMatchObject({ aciertos: 9, porcentaje: 90, xpOtorgada: 18 });
  });

  it('el reto diario es de cada estudiante: sus preguntas y resultados no se mezclan', async () => {
    const a = await nuevo();
    const b = await nuevo();
    const idA = await nuevoReto(a);
    const idB = await nuevoReto(b);
    expect(idA).not.toBe(idB);
    await entregar(b, idA, 1).expect(404);
    await responder(b, idA, 1, null).expect(404);
    expect((await hoy(b).expect(200)).body.reto.retoDiarioId).toBe(idB);
  });

  it('dos inicios simultáneos crean un solo reto del día (RN-12)', async () => {
    const e = await nuevo();
    const [a, b] = await Promise.all([iniciar(e), iniciar(e)]);
    expect([a.status, b.status].sort()).toEqual([201, 201]);
    expect(a.body.retoDiarioId).toBe(b.body.retoDiarioId);
    expect(await prisma.retoDiario.count({ where: { estudianteId: e.id } })).toBe(1);
  });

  it('dos respuestas finales simultáneas no pagan dos veces', async () => {
    const e = await nuevo();
    const id = await nuevoReto(e);
    for (let n = 1; n <= 9; n++) {
      await entregar(e, id, n).expect(200);
      await responder(e, id, n, (await correctaDe(id, n)).correcta).expect(200);
    }
    await entregar(e, id, 10).expect(200);
    const { correcta } = await correctaDe(id, 10);
    const respuestas = await Promise.all([responder(e, id, 10, correcta), responder(e, id, 10, correcta)]);
    expect(respuestas.map((r) => r.status).sort()).toEqual([200, 409]);
    expect(await perfil(e)).toMatchObject({ xpTotal: 20, qpTotal: 50 });
  });
});
