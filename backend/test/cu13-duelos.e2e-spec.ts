import { INestApplication } from '@nestjs/common';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { auth, borrarEstudiantes, crearApp, EstudiantePrueba, http, nuevoEstudiante, retosEnOrden } from './ayudas-e2e';

jest.setTimeout(240000);

type Jugador = EstudiantePrueba & { nombre: string };

/** CU-13 Enfrentar a otro estudiante en un duelo de conocimiento (RF-16, RN-14, RN-15, RNF-SE-04, RNF-SE-05). */
describe('CU-13: duelos (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const creados: number[] = [];

  const nuevo = async (): Promise<Jugador> => {
    const e = await nuevoEstudiante(app, prisma, 0);
    creados.push(e.id);
    const fila = await prisma.estudiante.findUniqueOrThrow({ where: { id: e.id } });
    return { ...e, nombre: fila.nombreAventurero };
  };
  const retar = (de: Jugador, a: Jugador, tema = 'CICLO_VIDA') =>
    http(app).post('/duelos').set(auth(de)).send({ rival: a.nombre, tema });
  const detalle = (e: Jugador, id: number) => http(app).get(`/duelos/${id}`).set(auth(e));
  const aceptar = (e: Jugador, id: number) => http(app).post(`/duelos/${id}/aceptar`).set(auth(e));
  const rechazar = (e: Jugador, id: number) => http(app).post(`/duelos/${id}/rechazar`).set(auth(e));
  const entregar = (e: Jugador, id: number, n: number) => http(app).post(`/duelos/${id}/preguntas/${n}/entregar`).set(auth(e));
  const responder = (e: Jugador, id: number, n: number, opcionId: number | null) =>
    http(app).post(`/duelos/${id}/preguntas/${n}/respuesta`).set(auth(e)).send({ opcionId });
  const xp = async (e: Jugador) => (await prisma.estudiante.findUniqueOrThrow({ where: { id: e.id } })).xpTotal;
  const qp = async (e: Jugador) => (await prisma.estudiante.findUniqueOrThrow({ where: { id: e.id } })).qpTotal;

  async function opcionesDe(dueloId: number, n: number) {
    const fila = await prisma.preguntaDuelo.findUniqueOrThrow({
      where: { dueloId_numero: { dueloId, numero: n } },
      include: { pregunta: { include: { opciones: true } } },
    });
    return {
      correcta: fila.pregunta.opciones.find((o) => o.correcta)!.id,
      incorrecta: fila.pregunta.opciones.find((o) => !o.correcta)!.id,
    };
  }

  /**
   * Juega la ronda de un estudiante. `aciertos`: cuántas respuestas correctas (las primeras). `modo`:
   * 'rapido' responde de inmediato; 'lento' simula 8 s por pregunta; 'agotado' responde null en todas.
   */
  async function jugarRonda(e: Jugador, dueloId: number, aciertos: number, modo: 'rapido' | 'lento' | 'agotado' = 'rapido') {
    let ultima: Record<string, any> = {};
    for (let n = 1; n <= 5; n++) {
      await entregar(e, dueloId, n).expect(200);
      if (modo === 'lento') {
        await prisma.respuestaDuelo.update({
          where: { dueloId_estudianteId_numero: { dueloId, estudianteId: e.id, numero: n } },
          data: { entregadaEn: new Date(Date.now() - 8000) },
        });
      }
      const { correcta, incorrecta } = await opcionesDe(dueloId, n);
      const opcion = modo === 'agotado' ? null : n <= aciertos ? correcta : incorrecta;
      ultima = (await responder(e, dueloId, n, opcion).expect(200)).body;
    }
    return ultima;
  }

  async function crearDuelo(a: Jugador, b: Jugador, tema = 'CICLO_VIDA') {
    return (await retar(a, b, tema).expect(201)).body.dueloId as number;
  }

  beforeAll(async () => {
    ({ app, prisma } = await crearApp());
  });
  afterAll(async () => {
    await borrarEstudiantes(prisma, creados);
    await app.close();
  });

  it('exige autenticación', async () => {
    await http(app).get('/duelos').expect(401);
    await http(app).get('/duelos/rivales').expect(401);
    await http(app).get('/duelos/avisos').expect(401);
    await http(app).post('/duelos').send({}).expect(401);
  });

  it('pasos 1 a 3: la lista de rivales trae el tema en común y solo nombre, nivel y resultados (RNF-SE-04)', async () => {
    const a = await nuevo();
    const b = await nuevo();
    const res = (await http(app).get('/duelos/rivales').set(auth(a)).expect(200)).body as { nombreAventurero: string }[];
    const fila = res.find((r) => r.nombreAventurero === b.nombre)!;
    expect(fila).toBeDefined();
    expect(Object.keys(fila).sort()).toEqual(['duelos', 'nivel', 'nombreAventurero', 'temasEnComun']);
    expect(fila).toMatchObject({
      nivel: 1,
      temasEnComun: [{ tema: 'CICLO_VIDA', nombre: 'Ciclo de vida del software' }],
      duelos: { ganados: 0, perdidos: 0, empatados: 0 },
    });
    // no aparece el propio estudiante ni ningún correo ni id interno
    expect(res.some((r) => r.nombreAventurero === a.nombre)).toBe(false);
    const texto = JSON.stringify(res);
    expect(texto).not.toContain('@');
    expect(texto).not.toMatch(/"(id|email|estudianteId)"\s*:/);
  });

  it('los temas en común son solo los desbloqueados por ambos', async () => {
    const a = await nuevo();
    const b = await nuevo();
    const retos = await retosEnOrden(prisma);
    // a completa la fase 1 y desbloquea la 2; b sigue en la 1
    await prisma.intentoReto.createMany({
      data: retos
        .filter((r) => r.fase.orden === 1)
        .map((r) => ({ estudianteId: a.id, retoId: r.id, estado: 'CALIFICADO' as const, porcentaje: 100, calificacionEstrellas: 3, aprobado: true, calificadoEn: new Date() })),
    });
    const enA = (await http(app).get('/duelos/rivales').set(auth(a)).expect(200)).body.find((r: { nombreAventurero: string }) => r.nombreAventurero === b.nombre);
    expect(enA.temasEnComun.map((t: { tema: string }) => t.tema)).toEqual(['CICLO_VIDA']);
    // RN-15: no se puede retar sobre un tema que el otro no tiene desbloqueado
    const res = await retar(a, b, 'ELICITACION').expect(403);
    expect(res.body.message).toMatch(/ambos tengan desbloqueado/);
    expect(await prisma.duelo.count({ where: { retadorId: a.id } })).toBe(0);
  });

  it('valida el cuerpo: tema desconocido, rival inexistente o uno mismo', async () => {
    const a = await nuevo();
    const b = await nuevo();
    await http(app).post('/duelos').set(auth(a)).send({ rival: b.nombre, tema: 'COCINA' }).expect(400);
    await http(app).post('/duelos').set(auth(a)).send({ tema: 'CICLO_VIDA' }).expect(400);
    await retar(a, { ...b, nombre: 'nadie_existe_xyz' }).expect(404);
    await retar(a, a).expect(400);
  });

  it('pasos 4 y 5: crea el duelo con 5 preguntas del tema, vence a las 48 h y avisa al retado', async () => {
    const a = await nuevo();
    const b = await nuevo();
    const antes = Date.now();
    const duelo = (await retar(a, b).expect(201)).body;
    expect(duelo).toMatchObject({
      estado: 'PENDIENTE',
      rol: 'RETADOR',
      tema: 'CICLO_VIDA',
      rival: { nombreAventurero: b.nombre },
      accion: 'JUGAR_RONDA',
      miRonda: { total: 5, resueltas: 0, siguiente: 1, terminada: false },
    });
    const horas = (new Date(duelo.expiraEn).getTime() - new Date(duelo.creadoEn).getTime()) / 3600000;
    expect(horas).toBeCloseTo(48, 3);
    expect(new Date(duelo.creadoEn).getTime()).toBeGreaterThanOrEqual(antes - 1000);

    const preguntas = await prisma.preguntaDuelo.findMany({ where: { dueloId: duelo.dueloId }, include: { pregunta: true } });
    expect(preguntas).toHaveLength(5);
    expect(new Set(preguntas.map((p) => p.pregunta.tema))).toEqual(new Set(['CICLO_VIDA']));
    expect(new Set(preguntas.map((p) => p.preguntaId)).size).toBe(5);

    const avisos = (await http(app).get('/duelos/avisos').set(auth(b)).expect(200)).body;
    expect(avisos).toHaveLength(1);
    expect(avisos[0]).toMatchObject({ dueloId: duelo.dueloId, retador: { nombreAventurero: a.nombre }, tema: 'CICLO_VIDA' });
    // el retador no recibe aviso de su propio duelo
    expect((await http(app).get('/duelos/avisos').set(auth(a)).expect(200)).body).toHaveLength(0);
  });

  it('flujo normal: ambos resuelven la misma ronda; gana el mayor porcentaje con 50 XP y el perdedor 20; sin QP (RN-14)', async () => {
    const a = await nuevo();
    const b = await nuevo();
    const id = await crearDuelo(a, b);
    // pasos 5 y 6: el retador juega su ronda (5 de 5)
    const finA = await jugarRonda(a, id, 5);
    expect(finA).toMatchObject({ registrada: true, rondaTerminada: true });
    expect(finA.duelo).toMatchObject({ estado: 'PENDIENTE', accion: 'ESPERAR_RIVAL', miResultado: { porcentaje: 100 }, resultado: null });
    expect(await xp(a)).toBe(0); // todavía no termina el duelo

    // el retado no ve el resultado del retador antes de terminar
    const vistaB = (await detalle(b, id).expect(200)).body;
    expect(vistaB).toMatchObject({ estado: 'PENDIENTE', rol: 'RETADO', accion: 'ACEPTAR_O_RECHAZAR', miResultado: null, resultado: null });
    expect(JSON.stringify(vistaB)).not.toMatch(/porcentaje|segundosTotales/);

    // pasos 7 y 8: el retado acepta y resuelve la misma ronda (3 de 5)
    const aceptado = (await aceptar(b, id).expect(200)).body;
    expect(aceptado).toMatchObject({ estado: 'ACEPTADO', accion: 'JUGAR_RONDA' });
    const finB = await jugarRonda(b, id, 3);
    // pasos 9 y 10: el duelo termina y ambos ven el resultado
    expect(finB.duelo).toMatchObject({ estado: 'TERMINADO', accion: 'VER_RESULTADO' });
    expect(finB.duelo.resultado).toMatchObject({
      ganador: 'RIVAL',
      yo: { porcentaje: 60, xpOtorgada: 20 },
      rival: { porcentaje: 100, xpOtorgada: 50 },
    });
    const vistaA = (await detalle(a, id).expect(200)).body;
    expect(vistaA.resultado).toMatchObject({ ganador: 'YO', yo: { porcentaje: 100, xpOtorgada: 50 }, rival: { porcentaje: 60, xpOtorgada: 20 } });
    expect(vistaA.resultado.revision).toHaveLength(5);

    expect(await xp(a)).toBe(50);
    expect(await xp(b)).toBe(20);
    expect(await qp(a)).toBe(0); // los duelos no dan QP
    expect(await qp(b)).toBe(0);
    const guardado = await prisma.duelo.findUniqueOrThrow({ where: { id } });
    expect(guardado).toMatchObject({ estado: 'TERMINADO', ganadorId: a.id, empate: false });
    expect(guardado.terminadoEn).not.toBeNull();
  });

  it('con el mismo porcentaje gana quien usó menos tiempo (RN-14)', async () => {
    const a = await nuevo();
    const b = await nuevo();
    const id = await crearDuelo(a, b);
    await jugarRonda(a, id, 4, 'lento'); // 80 % en ~40 s
    await aceptar(b, id).expect(200);
    await jugarRonda(b, id, 4, 'rapido'); // 80 % en pocos segundos
    const vista = (await detalle(b, id).expect(200)).body;
    expect(vista.resultado.ganador).toBe('YO');
    expect(vista.resultado.yo.segundosTotales).toBeLessThan(vista.resultado.rival.segundosTotales);
    expect(await xp(b)).toBe(50);
    expect(await xp(a)).toBe(20);
  });

  it('FA2: empate exacto (mismo porcentaje y mismo tiempo) otorga 30 XP a cada uno', async () => {
    const a = await nuevo();
    const b = await nuevo();
    const id = await crearDuelo(a, b);
    await jugarRonda(a, id, 0, 'agotado'); // 0 % y 20 s por pregunta
    await aceptar(b, id).expect(200);
    const fin = await jugarRonda(b, id, 0, 'agotado');
    expect(fin.duelo.resultado).toMatchObject({ ganador: 'EMPATE', yo: { porcentaje: 0, segundosTotales: 100, xpOtorgada: 30 } });
    expect(await xp(a)).toBe(30);
    expect(await xp(b)).toBe(30);
    expect(await prisma.duelo.findUniqueOrThrow({ where: { id } })).toMatchObject({ estado: 'TERMINADO', empate: true, ganadorId: null });
  });

  it('el retado no puede jugar antes de aceptar, ni dos veces la misma pregunta; las preguntas van en orden', async () => {
    const a = await nuevo();
    const b = await nuevo();
    const id = await crearDuelo(a, b);
    const res = await entregar(b, id, 1).expect(409);
    expect(res.body.message).toMatch(/acepta el duelo/);
    await responder(b, id, 1, null).expect(409);
    await entregar(a, id, 2).expect(409);
    await entregar(a, id, 0).expect(400);
    await entregar(a, id, 6).expect(400);
    await entregar(a, id, 1).expect(200);
    await responder(a, id, 1, (await opcionesDe(id, 1)).correcta).expect(200);
    await responder(a, id, 1, (await opcionesDe(id, 1)).correcta).expect(409);
  });

  it('RNF-SE-05: ninguna respuesta del servidor revela la opción correcta antes de que termine el duelo', async () => {
    const a = await nuevo();
    const b = await nuevo();
    const id = await crearDuelo(a, b);
    const pregunta = (await entregar(a, id, 1).expect(200)).body;
    expect(pregunta).toMatchObject({ numero: 1, total: 5, limiteSegundos: 20 });
    expect(JSON.stringify(pregunta)).not.toMatch(/"correcta"\s*:/);
    expect(Object.keys(pregunta.opciones[0]).sort()).toEqual(['opcionId', 'texto']);
    const r = (await responder(a, id, 1, (await opcionesDe(id, 1)).correcta).expect(200)).body;
    expect(Object.keys(r).sort()).toEqual(['duelo', 'numero', 'registrada', 'rondaTerminada']);
    expect(JSON.stringify(r)).not.toMatch(/opcionCorrectaId|"correcta"|explicacion|revision/);
    // tampoco el detalle mientras el duelo sigue abierto
    expect(JSON.stringify((await detalle(a, id).expect(200)).body)).not.toMatch(/opcionCorrectaId|explicacion|revision/);
  });

  it('RNF-SE-05: una respuesta correcta después de 21 s es incorrecta y cuenta 20 segundos', async () => {
    const a = await nuevo();
    const b = await nuevo();
    const id = await crearDuelo(a, b);
    await entregar(a, id, 1).expect(200);
    await prisma.respuestaDuelo.update({
      where: { dueloId_estudianteId_numero: { dueloId: id, estudianteId: a.id, numero: 1 } },
      data: { entregadaEn: new Date(Date.now() - 22_000) },
    });
    await responder(a, id, 1, (await opcionesDe(id, 1)).correcta).expect(200);
    const fila = await prisma.respuestaDuelo.findUniqueOrThrow({
      where: { dueloId_estudianteId_numero: { dueloId: id, estudianteId: a.id, numero: 1 } },
    });
    expect(fila.correcta).toBe(false);
    expect(Number(fila.segundos)).toBe(20);
  });

  it('FA1: el retado rechaza el duelo; queda RECHAZADO, sin XP, y ya no se puede jugar ni aceptar', async () => {
    const a = await nuevo();
    const b = await nuevo();
    const id = await crearDuelo(a, b);
    await jugarRonda(a, id, 5);
    const r = (await rechazar(b, id).expect(200)).body;
    expect(r).toMatchObject({ estado: 'RECHAZADO', accion: null });
    expect(await xp(a)).toBe(0);
    expect(await xp(b)).toBe(0);
    await aceptar(b, id).expect(409);
    await entregar(b, id, 1).expect(409);
    // sale de los avisos y queda en el historial de ambos
    expect((await http(app).get('/duelos/avisos').set(auth(b)).expect(200)).body).toHaveLength(0);
    expect((await http(app).get('/duelos').set(auth(a)).expect(200)).body.historial.map((d: { estado: string }) => d.estado)).toEqual(['RECHAZADO']);
  });

  it('solo el retado puede aceptar o rechazar', async () => {
    const a = await nuevo();
    const b = await nuevo();
    const id = await crearDuelo(a, b);
    await aceptar(a, id).expect(403);
    await rechazar(a, id).expect(403);
    expect((await detalle(a, id).expect(200)).body.estado).toBe('PENDIENTE');
  });

  it('FE1: un duelo que pasó de 48 horas expira al consultar, sin XP, y ya no se puede aceptar ni jugar', async () => {
    const a = await nuevo();
    const b = await nuevo();
    const id = await crearDuelo(a, b);
    await jugarRonda(a, id, 5);
    await prisma.duelo.update({ where: { id }, data: { expiraEn: new Date(Date.now() - 1000) } });

    const lista = (await http(app).get('/duelos').set(auth(b)).expect(200)).body;
    expect(lista.pendientes).toHaveLength(0);
    expect(lista.historial[0]).toMatchObject({ dueloId: id, estado: 'EXPIRADO', accion: null });
    expect((await http(app).get('/duelos/avisos').set(auth(b)).expect(200)).body).toHaveLength(0);
    await aceptar(b, id).expect(409);
    await entregar(b, id, 1).expect(409);
    await entregar(a, id, 1).expect(409);
    expect(await xp(a)).toBe(0);
    expect(await xp(b)).toBe(0);
  });

  it('FE1: también expira si el retador no terminó su propia ronda', async () => {
    const a = await nuevo();
    const b = await nuevo();
    const id = await crearDuelo(a, b);
    await aceptar(b, id).expect(200);
    await jugarRonda(b, id, 5);
    await prisma.duelo.update({ where: { id }, data: { expiraEn: new Date(Date.now() - 1000) } });
    expect((await detalle(b, id).expect(200)).body.estado).toBe('EXPIRADO');
    expect(await xp(b)).toBe(0);
  });

  const avisosDe = async (e: Jugador) => (await http(app).get('/duelos/avisos').set(auth(e)).expect(200)).body as Array<Record<string, any>>;
  const avisoVisto = (e: Jugador, id: number) => http(app).post(`/duelos/${id}/aviso-visto`).set(auth(e));

  it('D-001 FA1: el retador recibe una sola vez el aviso de cierre del duelo rechazado, con 0 XP', async () => {
    const a = await nuevo();
    const b = await nuevo();
    const id = await crearDuelo(a, b);
    // pendiente: ni el retador ni el estudiante ajeno tienen aviso de cierre
    expect(await avisosDe(a)).toHaveLength(0);
    await rechazar(b, id).expect(200);

    const avisos = await avisosDe(a);
    expect(avisos).toHaveLength(1);
    expect(avisos[0]).toMatchObject({
      tipo: 'CIERRE',
      dueloId: id,
      estado: 'RECHAZADO',
      xpOtorgada: 0,
      rival: { nombreAventurero: b.nombre },
      tema: 'CICLO_VIDA',
    });
    // el retado que rechazó no recibe aviso de cierre ni de invitación
    expect(await avisosDe(b)).toHaveLength(0);
    // consultar de nuevo no lo consume: sigue hasta que el retador lo cierra
    expect(await avisosDe(a)).toHaveLength(1);

    await avisoVisto(b, id).expect(403);
    await avisoVisto(a, id).expect(204);
    expect(await avisosDe(a)).toHaveLength(0);
    // marcarlo otra vez es inocuo y el duelo sigue en el historial
    await avisoVisto(a, id).expect(204);
    expect((await http(app).get('/duelos').set(auth(a)).expect(200)).body.historial[0]).toMatchObject({ dueloId: id, estado: 'RECHAZADO' });
    expect(await xp(a)).toBe(0);
    expect(await xp(b)).toBe(0);
  });

  it('D-001 FE1: el retador recibe una sola vez el aviso de cierre del duelo expirado, con 0 XP', async () => {
    const a = await nuevo();
    const b = await nuevo();
    const id = await crearDuelo(a, b);
    await jugarRonda(a, id, 5);
    await prisma.duelo.update({ where: { id }, data: { expiraEn: new Date(Date.now() - 1000) } });

    // la expiración se evalúa al consultar los avisos
    const avisos = await avisosDe(a);
    expect(avisos).toHaveLength(1);
    expect(avisos[0]).toMatchObject({ tipo: 'CIERRE', dueloId: id, estado: 'EXPIRADO', xpOtorgada: 0, rival: { nombreAventurero: b.nombre } });
    // el retado tampoco recibe ya la invitación
    expect(await avisosDe(b)).toHaveLength(0);

    await avisoVisto(a, id).expect(204);
    expect(await avisosDe(a)).toHaveLength(0);
    expect(await xp(a)).toBe(0);
    expect(await xp(b)).toBe(0);
  });

  it('D-001: no hay aviso de cierre para un duelo que sigue pendiente, ni para un ajeno', async () => {
    const a = await nuevo();
    const b = await nuevo();
    const c = await nuevo();
    const id = await crearDuelo(a, b);
    await avisoVisto(a, id).expect(409);
    await avisoVisto(c, id).expect(404);
    expect(await avisosDe(a)).toHaveLength(0);
  });

  it('FE2: con 3 duelos pendientes el retador no puede crear otro y el mensaje indica el límite', async () => {
    const a = await nuevo();
    const rivales = [await nuevo(), await nuevo(), await nuevo(), await nuevo()];
    for (const r of rivales.slice(0, 3)) await crearDuelo(a, r);
    const res = await retar(a, rivales[3]).expect(409);
    expect(res.body).toMatchObject({ limite: 3, quien: 'RETADOR' });
    expect(res.body.message).toMatch(/3 duelos pendientes/);
    expect(await prisma.duelo.count({ where: { retadorId: a.id } })).toBe(3);

    // un duelo rechazado libera un lugar
    const primero = await prisma.duelo.findFirstOrThrow({ where: { retadorId: a.id }, orderBy: { id: 'asc' } });
    await rechazar(rivales[0], primero.id).expect(200);
    await retar(a, rivales[3]).expect(201);
  });

  it('FE2: tampoco se puede retar a quien ya tiene 3 duelos pendientes (como retado)', async () => {
    const objetivo = await nuevo();
    for (let i = 0; i < 3; i++) await crearDuelo(await nuevo(), objetivo);
    const otro = await nuevo();
    const res = await retar(otro, objetivo).expect(409);
    expect(res.body).toMatchObject({ limite: 3, quien: 'RETADO' });
    expect(res.body.message).toMatch(/Ese estudiante ya tiene el máximo/);
  });

  it('la lista agrupa los duelos en pendientes, por jugar, en espera e historial', async () => {
    const a = await nuevo();
    const b = await nuevo();
    const c = await nuevo();
    const delA = await crearDuelo(a, b); // a por jugar
    const lista0 = (await http(app).get('/duelos').set(auth(a)).expect(200)).body;
    expect(lista0.porJugar.map((d: { dueloId: number }) => d.dueloId)).toEqual([delA]);
    expect(lista0).toMatchObject({ limitePendientes: 3, activos: 1 });
    const listaB = (await http(app).get('/duelos').set(auth(b)).expect(200)).body;
    expect(listaB.pendientes.map((d: { dueloId: number }) => d.dueloId)).toEqual([delA]);

    await jugarRonda(a, delA, 5);
    expect((await http(app).get('/duelos').set(auth(a)).expect(200)).body.enEspera.map((d: { dueloId: number }) => d.dueloId)).toEqual([delA]);
    expect((await http(app).get('/duelos').set(auth(c)).expect(200)).body).toMatchObject({ pendientes: [], porJugar: [], enEspera: [], historial: [] });
  });

  it('un estudiante ajeno no puede ver, aceptar ni jugar el duelo de otros (RNF-SE-04)', async () => {
    const a = await nuevo();
    const b = await nuevo();
    const intruso = await nuevo();
    const id = await crearDuelo(a, b);
    await detalle(intruso, id).expect(404);
    await aceptar(intruso, id).expect(404);
    await rechazar(intruso, id).expect(404);
    await entregar(intruso, id, 1).expect(404);
    await responder(intruso, id, 1, null).expect(404);
    expect((await prisma.duelo.findUniqueOrThrow({ where: { id } })).estado).toBe('PENDIENTE');
  });

  it('los duelos no exponen correos ni ids de otros estudiantes', async () => {
    const a = await nuevo();
    const b = await nuevo();
    const id = await crearDuelo(a, b);
    await jugarRonda(a, id, 5);
    await aceptar(b, id).expect(200);
    await jugarRonda(b, id, 2);
    const respuestas = [
      (await detalle(a, id).expect(200)).body,
      (await detalle(b, id).expect(200)).body,
      (await http(app).get('/duelos').set(auth(a)).expect(200)).body,
      (await http(app).get('/duelos/rivales').set(auth(a)).expect(200)).body,
    ];
    for (const cuerpo of respuestas) {
      const texto = JSON.stringify(cuerpo);
      expect(texto).not.toContain('@test.local');
      expect(texto).not.toMatch(/"(email|retadorId|retadoId|ganadorId|estudianteId)"\s*:/);
    }
  });

  it('sin cinto de ayudas: el duelo no tiene ruta de ayuda', async () => {
    const a = await nuevo();
    const b = await nuevo();
    const id = await crearDuelo(a, b);
    await http(app).post(`/duelos/${id}/ayuda`).set(auth(a)).send({ objetoId: 1 }).expect(404);
  });

  it('dos rondas que terminan al mismo tiempo cierran el duelo una sola vez y pagan la XP una sola vez', async () => {
    const a = await nuevo();
    const b = await nuevo();
    const id = await crearDuelo(a, b);
    await aceptar(b, id).expect(200);
    // ambos llegan a la última pregunta
    for (const e of [a, b]) {
      for (let n = 1; n <= 4; n++) {
        await entregar(e, id, n).expect(200);
        await responder(e, id, n, (await opcionesDe(id, n)).correcta).expect(200);
      }
      await entregar(e, id, 5).expect(200);
    }
    const { correcta } = await opcionesDe(id, 5);
    const respuestas = await Promise.all([responder(a, id, 5, correcta), responder(b, id, 5, correcta)]);
    expect(respuestas.map((r) => r.status)).toEqual([200, 200]);
    const duelo = await prisma.duelo.findUniqueOrThrow({ where: { id } });
    expect(duelo.estado).toBe('TERMINADO');
    expect((await xp(a)) + (await xp(b))).toBe(70); // 50 + 20, o 30 + 30 con empate exacto de tiempo
    expect(await prisma.resultadoDuelo.count({ where: { dueloId: id } })).toBe(2);
  });

  it('si el navegador se cerró con la última pregunta vencida, la ronda se cierra sola al volver', async () => {
    const a = await nuevo();
    const b = await nuevo();
    const id = await crearDuelo(a, b);
    for (let n = 1; n <= 4; n++) {
      await entregar(a, id, n).expect(200);
      await responder(a, id, n, (await opcionesDe(id, n)).correcta).expect(200);
    }
    await entregar(a, id, 5).expect(200);
    await prisma.respuestaDuelo.update({
      where: { dueloId_estudianteId_numero: { dueloId: id, estudianteId: a.id, numero: 5 } },
      data: { entregadaEn: new Date(Date.now() - 60_000) },
    });
    const vista = (await detalle(a, id).expect(200)).body;
    expect(vista.miRonda.terminada).toBe(true);
    expect(vista.miResultado).toMatchObject({ porcentaje: 80 });
    expect(vista.accion).toBe('ESPERAR_RIVAL');
  });

  it('el historial de duelos terminados alimenta el récord de la lista de rivales', async () => {
    const a = await nuevo();
    const b = await nuevo();
    const id = await crearDuelo(a, b);
    await jugarRonda(a, id, 5);
    await aceptar(b, id).expect(200);
    await jugarRonda(b, id, 1);
    const c = await nuevo();
    const vistaPorC = (await http(app).get('/duelos/rivales').set(auth(c)).expect(200)).body;
    expect(vistaPorC.find((r: { nombreAventurero: string }) => r.nombreAventurero === a.nombre).duelos).toEqual({ ganados: 1, perdidos: 0, empatados: 0 });
    expect(vistaPorC.find((r: { nombreAventurero: string }) => r.nombreAventurero === b.nombre).duelos).toEqual({ ganados: 0, perdidos: 1, empatados: 0 });
  });
});
