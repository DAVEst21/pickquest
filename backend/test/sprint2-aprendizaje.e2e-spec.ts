import { INestApplication } from '@nestjs/common';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { calcularNivel } from '../src/modules/progreso/nivel';
import {
  aprobarFases,
  auth,
  borrarEstudiantes,
  clavesDe,
  crearApp,
  EstudiantePrueba,
  http,
  idPocion,
  iniciarIntento,
  jugarReto,
  nuevoEstudiante,
  opcionPorPregunta,
  PLAN_DIALOGO_PERFECTO,
  resolver,
  retosEnOrden,
} from './ayudas-e2e';

// Requiere la base migrada y con el seed cargado (3 fases, 5 retos).
// Los estudiantes de prueba se borran al terminar (cascada a sus intentos).
describe('Sprint 2: aprendizaje por mecánicas (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const creados: number[] = [];
  let retos: Awaited<ReturnType<typeof retosEnOrden>>;
  const reto = (faseOrden: number, orden: number) =>
    retos.find((r) => r.fase.orden === faseOrden && r.orden === orden)!;

  const estudiante = async (pociones = 3) => {
    const e = await nuevoEstudiante(app, prisma, pociones);
    creados.push(e.id);
    return e;
  };
  const get = (e: EstudiantePrueba, ruta: string) => http(app).get(ruta).set(auth(e));

  /** Campos con la respuesta de referencia que un intento NO aprobado nunca debe recibir. */
  const CAMPOS_DE_REFERENCIA = [
    'planReferencia',
    'finReferencia',
    'faseCorrecta',
    'columnaCorrecta',
    'tipoCorrecto',
    'ordenMustReferencia',
    'atributoCorrecto',
    'explicacion',
    'noEncontradas',
    'referencia',
    'medidorReferencia',
    'justificacionCorrecta',
    'tecnicaCorrecta',
    'noDescubiertos',
  ];
  const sinReferencia = (retro: unknown) => {
    const claves = clavesDe(retro);
    for (const campo of CAMPOS_DE_REFERENCIA) expect(claves.has(campo)).toBe(false);
    expect((retro as { referenciaCompleta: boolean }).referenciaCompleta).toBe(false);
  };

  beforeAll(async () => {
    ({ app, prisma } = await crearApp());
    retos = await retosEnOrden(prisma);
  }, 30000);

  afterAll(async () => {
    await borrarEstudiantes(prisma, creados);
    await app.close();
  });

  // ===================================================================
  describe('Mapa de fases y tablón (RF-18)', () => {
    it('exige autenticación', async () => {
      await http(app).get('/fases').expect(401);
      await http(app).get('/fases/1').expect(401);
      await http(app).post('/retos/1/intentos').expect(401);
      await http(app).get('/inventario/equipados').expect(401);
    });

    it('un estudiante nuevo ve 3 fases con descripción y solo la primera desbloqueada (RN-01)', async () => {
      const e = await estudiante();
      const res = await get(e, '/fases').expect(200);
      expect(res.body.map((f: { orden: number }) => f.orden)).toEqual([1, 2, 3]);
      expect(res.body.map((f: { estado: string }) => f.estado)).toEqual([
        'desbloqueada',
        'bloqueada',
        'bloqueada',
      ]);
      for (const fase of res.body) {
        expect(fase.descripcion.length).toBeGreaterThan(40);
        expect(JSON.stringify(fase).toLowerCase()).not.toContain('sprint');
      }
    });

    it('responde 404 para una fase inexistente', async () => {
      const e = await estudiante();
      await get(e, '/fases/999999').expect(404);
    });

    it('el tablón lista todos los retos de la fase con objetivo, mecánica, recompensas y estado', async () => {
      const e = await estudiante();
      const fase1 = retos.find((r) => r.fase.orden === 1)!.faseId;
      const fase2 = retos.find((r) => r.fase.orden === 2)!.faseId;

      const t1 = (await get(e, `/fases/${fase1}`).expect(200)).body;
      expect(t1.retos).toHaveLength(1);
      expect(t1.retos[0]).toMatchObject({
        orden: 1,
        mecanica: 'LINEA_TIEMPO',
        recompensaXp: 150,
        recompensaQp: 100,
        estado: 'DISPONIBLE',
      });
      expect(t1.retos[0].titulo).toEqual(expect.any(String));
      expect(t1.retos[0].objetivo.length).toBeGreaterThan(20);

      const t2 = (await get(e, `/fases/${fase2}`).expect(200)).body;
      expect(t2.retos.map((r: { mecanica: string }) => r.mecanica)).toEqual([
        'DIALOGO_STAKEHOLDER',
        'TABLERO_MOSCOW',
      ]);
      expect(t2.retos.every((r: { estado: string }) => r.estado === 'BLOQUEADO')).toBe(true);
    });

    it('RN-02 y RN-13: la recompensa de QP anunciada ya incluye el multiplicador y coincide con la otorgada', async () => {
      const e = await estudiante();
      await prisma.rachaEstudio.update({
        where: { estudianteId: e.id },
        data: { multiplicadorQP: 1.5 },
      });
      const faseId = reto(1, 1).faseId;
      const anunciado = (await get(e, `/fases/${faseId}`).expect(200)).body.retos[0];
      expect(anunciado.recompensaQp).toBe(150); // 100 × 1.5
      expect(anunciado.recompensaXp).toBe(150); // la XP no se multiplica

      const intento = await iniciarIntento(app, e, reto(1, 1).id);
      expect(intento.reto.recompensaQp).toBe(150);

      const resultado = await jugarReto(app, prisma, e, reto(1, 1).id);
      expect(resultado.resultado.qpGanado).toBe(150);
      expect(resultado.resultado.xpGanado).toBe(150);
      const perfil = (await get(e, '/auth/perfil').expect(200)).body;
      expect(perfil.qpTotal).toBe(150);
      expect(perfil.xpTotal).toBe(150);
    });
  });

  // ===================================================================
  describe('Iniciar y retomar un intento', () => {
    it('RN-01: un reto de una fase bloqueada no se puede iniciar (403)', async () => {
      const e = await estudiante();
      await http(app).post(`/retos/${reto(2, 1).id}/intentos`).set(auth(e)).expect(403);
      await http(app).post(`/retos/${reto(3, 1).id}/intentos`).set(auth(e)).expect(403);
    });

    it('un reto inexistente responde 404', async () => {
      const e = await estudiante();
      await http(app).post('/retos/999999/intentos').set(auth(e)).expect(404);
    });

    it('RN-08: el segundo reto de una fase no se puede iniciar hasta aprobar el primero', async () => {
      const e = await estudiante();
      await aprobarFases(app, prisma, e, 1);
      await http(app).post(`/retos/${reto(2, 2).id}/intentos`).set(auth(e)).expect(403);
      await jugarReto(app, prisma, e, reto(2, 1).id);
      await http(app).post(`/retos/${reto(2, 2).id}/intentos`).set(auth(e)).expect(201);
    });

    it('FA3: retomar devuelve el mismo intento EN_CURSO con su borrador guardado en el servidor', async () => {
      const e = await estudiante();
      const primero = await iniciarIntento(app, e, reto(1, 1).id);
      expect(primero).toMatchObject({ estado: 'EN_CURSO', ayudaUsada: false });
      expect(primero.borrador).toEqual({ posiciones: [], asociaciones: [] });

      const bloque = primero.contenido.bloques[0];
      await http(app)
        .put(`/intentos/${primero.intentoId}/borrador`)
        .set(auth(e))
        .send({ posiciones: [{ bloqueId: bloque.id, inicioSemana: 3 }], asociaciones: [] })
        .expect(200);

      const retomado = await iniciarIntento(app, e, reto(1, 1).id);
      expect(retomado.intentoId).toBe(primero.intentoId);
      expect(retomado.borrador.posiciones).toEqual([{ bloqueId: bloque.id, inicioSemana: 3 }]);

      const consultado = (await get(e, `/intentos/${primero.intentoId}`).expect(200)).body;
      expect(consultado.estado).toBe('EN_CURSO');
      expect(consultado.borrador.posiciones).toHaveLength(1);
    });

    it('solo hay un intento EN_CURSO por estudiante y reto, aun con dos peticiones simultáneas', async () => {
      const e = await estudiante();
      const [a, b] = await Promise.all([
        http(app).post(`/retos/${reto(1, 1).id}/intentos`).set(auth(e)),
        http(app).post(`/retos/${reto(1, 1).id}/intentos`).set(auth(e)),
      ]);
      expect(a.status).toBe(201);
      expect(b.status).toBe(201);
      expect(a.body.intentoId).toBe(b.body.intentoId);
      expect(
        await prisma.intentoReto.count({
          where: { estudianteId: e.id, retoId: reto(1, 1).id, estado: 'EN_CURSO' },
        }),
      ).toBe(1);
    });
  });

  // ===================================================================
  describe('Recorrido completo: mapa → tablón → reto → resultado (RN-01, RN-04, RN-09, RNF-SE-02)', () => {
    let e: EstudiantePrueba;
    let xpEsperada = 0;
    let qpEsperada = 0;

    const PROHIBIDAS: Record<string, string[]> = {
      LINEA_TIEMPO: ['inicioReferencia', 'faseCorrectaId', 'dependencias', 'requiereId', 'dependencia'],
      DIALOGO_STAKEHOLDER: [
        'tecnicaCorrecta',
        'productiva',
        'requerimientoId',
        'siguienteNodoId',
        'requerimientos',
        'requerimiento',
      ],
      TABLERO_MOSCOW: ['columnaCorrecta', 'tipoCorrecto', 'ordenMustReferencia'],
      INSPECCION_SISTEMA: ['falla', 'explicacion', 'atributoCorrecto'],
      REPARTO_PRESUPUESTO: ['asignacionReferencia', 'correcta'],
    };
    const PISTA: Record<string, string> = {
      LINEA_TIEMPO: 'DEPENDENCIA',
      DIALOGO_STAKEHOLDER: 'OPCION_DIALOGO',
      TABLERO_MOSCOW: 'COLUMNA_TARJETA',
      INSPECCION_SISTEMA: 'PANTALLA',
      REPARTO_PRESUPUESTO: 'RESTRICCION',
    };

    beforeAll(async () => {
      e = await estudiante(10);
    });

    /** Secretos en texto que no deben aparecer en el contenido público de ningún reto. */
    async function textosSecretos(retoId: number): Promise<string[]> {
      return [
        ...(await prisma.fallaCalidad.findMany({ where: { elemento: { pantalla: { retoId } } } })).map(
          (f) => f.explicacion,
        ),
        ...(await prisma.requerimientoOculto.findMany({ where: { retoId } })).map((r) => r.descripcion),
        ...(await prisma.opcionDialogo.findMany({ where: { nodo: { retoId } } })).map(
          (o) => o.respuestaStakeholder,
        ),
      ];
    }

    async function recorrer(faseOrden: number, orden: number) {
      const r = reto(faseOrden, orden);
      const intento = await iniciarIntento(app, e, r.id);

      // RNF-SE-02: el contenido público no incluye respuestas ni datos de referencia.
      const claves = clavesDe(intento.contenido);
      for (const prohibida of PROHIBIDAS[r.mecanica]) {
        expect(claves.has(prohibida)).toBe(false);
      }
      const texto = JSON.stringify({ c: intento.contenido, b: intento.borrador });
      for (const secreto of await textosSecretos(r.id)) {
        expect(texto).not.toContain(secreto);
      }
      expect(intento.reto.mecanica).toBe(r.mecanica);
      expect(intento.fase.orden).toBe(faseOrden);

      expect(intento.pista).toBeNull();

      // RF-03: la ayuda devuelve el efecto de su mecánica y consume una unidad.
      const ayuda = await http(app)
        .post(`/intentos/${intento.intentoId}/ayuda`)
        .set(auth(e))
        .send({ objetoId: await idPocion(prisma) })
        .expect(200);
      expect(ayuda.body.pista.tipo).toBe(PISTA[r.mecanica]);

      // La pista se guarda de forma relacional y se devuelve al consultar y al retomar el intento.
      const uso = await prisma.usoAyuda.findUniqueOrThrow({ where: { intentoId: intento.intentoId } });
      expect(uso.tipoPista).toBe(PISTA[r.mecanica]);
      const consultado = (await get(e, `/intentos/${intento.intentoId}`).expect(200)).body;
      expect(consultado.pista).toEqual(ayuda.body.pista);
      const retomado = await iniciarIntento(app, e, r.id);
      expect(retomado.intentoId).toBe(intento.intentoId);
      expect(retomado.pista).toEqual(ayuda.body.pista);
      expect(retomado.ayudaUsada).toBe(true);

      await resolver(app, prisma, e, intento);
      const res = await http(app).post(`/intentos/${intento.intentoId}/enviar`).set(auth(e)).expect(200);
      const { resultado, retroalimentacion } = res.body;

      expect(res.body.estado).toBe('CALIFICADO');
      expect(retroalimentacion.mecanica).toBe(r.mecanica);
      expect(resultado).toMatchObject({ porcentaje: 100, aprobado: true, usoAyuda: true });
      // RN-04: con ayuda, aunque saque 100%, el máximo son 2 estrellas.
      expect(resultado.calificacionEstrellas).toBe(2);
      expect(resultado.xpGanado).toBe(r.recompensaXp);
      expect(resultado.qpGanado).toBe(r.recompensaQp);
      xpEsperada += r.recompensaXp;
      qpEsperada += r.recompensaQp;
      return res.body;
    }

    const estados = async () =>
      (await get(e, '/fases').expect(200)).body.map((f: { estado: string }) => f.estado);

    it('fase 1 (CU-08): al aprobar su único reto queda completada y se desbloquea la fase 2 (RN-01, RN-09)', async () => {
      expect(await estados()).toEqual(['desbloqueada', 'bloqueada', 'bloqueada']);
      await recorrer(1, 1);
      expect(await estados()).toEqual(['completada', 'desbloqueada', 'bloqueada']);
    });

    it('fase 2, reto 1 (CU-01): la fase queda en progreso y la 3 sigue bloqueada', async () => {
      await recorrer(2, 1);
      expect(await estados()).toEqual(['completada', 'en_progreso', 'bloqueada']);
    });

    it('fase 2, reto 2 (CU-03): con todos sus retos aprobados se completa y desbloquea la fase 3 (RN-09)', async () => {
      await recorrer(2, 2);
      expect(await estados()).toEqual(['completada', 'completada', 'desbloqueada']);
    });

    it('fase 3, retos 1 (CU-04) y 2 (CU-06)', async () => {
      await recorrer(3, 1);
      expect(await estados()).toEqual(['completada', 'completada', 'en_progreso']);
      await recorrer(3, 2);
      expect(await estados()).toEqual(['completada', 'completada', 'completada']);
    });

    it('el progreso acumulado de XP, QP y nivel coincide con lo otorgado por cada reto', async () => {
      const perfil = (await get(e, '/auth/perfil').expect(200)).body;
      expect(perfil.xpTotal).toBe(xpEsperada);
      expect(perfil.qpTotal).toBe(qpEsperada);
      expect(perfil.nivel).toBe(calcularNivel(xpEsperada).nivel);
      const fases = (await get(e, '/fases').expect(200)).body;
      expect(fases.map((f: { calificacionEstrellasFase: number }) => f.calificacionEstrellasFase)).toEqual([2, 2, 2]);
      expect(fases.every((f: { progreso: number }) => f.progreso === 100)).toBe(true);
    });

    it('consumió una unidad de poción por cada ayuda (RN-10)', async () => {
      const equipados = (await get(e, '/inventario/equipados').expect(200)).body;
      expect(equipados).toHaveLength(1);
      expect(equipados[0]).toMatchObject({ nombre: 'Poción de Sabiduría', cantidad: 10 - 5 });
    });

    it('el tablón de la fase 2 muestra ambos retos APROBADOS con su mejor calificación', async () => {
      const tablon = (await get(e, `/fases/${reto(2, 1).faseId}`).expect(200)).body;
      expect(tablon.retos.map((r: { estado: string }) => r.estado)).toEqual(['APROBADO', 'APROBADO']);
      expect(tablon.retos[0]).toMatchObject({ mejorPorcentaje: 100, mejorCalificacionEstrellas: 2 });
    });
  });

  // ===================================================================
  describe('Envío, calificación y recompensas (RF-01, RF-02)', () => {
    it('CU-08 FE1: enviar sin colocar los bloques ni asociar los entregables → 400 con la lista de faltantes', async () => {
      const e = await estudiante();
      const intento = await iniciarIntento(app, e, reto(1, 1).id);
      const res = await http(app).post(`/intentos/${intento.intentoId}/enviar`).set(auth(e)).expect(400);
      expect(res.body.faltantes).toHaveLength(8 + 5);
      expect(res.body.message).toContain('No se puede enviar');
      // sigue EN_CURSO: no se calificó
      expect((await get(e, `/intentos/${intento.intentoId}`).expect(200)).body.estado).toBe('EN_CURSO');
    });

    it('RN-07 y RN-06: la primera aprobación (100% sin ayuda = 3 estrellas) otorga XP y QP; la segunda no', async () => {
      const e = await estudiante();
      const primera = (await jugarReto(app, prisma, e, reto(1, 1).id)).resultado;
      expect(primera).toMatchObject({
        porcentaje: 100,
        calificacionEstrellas: 3,
        aprobado: true,
        usoAyuda: false,
        xpGanado: 150,
        qpGanado: 100,
      });
      const segunda = (await jugarReto(app, prisma, e, reto(1, 1).id)).resultado;
      expect(segunda).toMatchObject({ aprobado: true, xpGanado: 0, qpGanado: 0 });

      const perfil = (await get(e, '/auth/perfil').expect(200)).body;
      expect(perfil.xpTotal).toBe(150);
      expect(perfil.qpTotal).toBe(100);
    });

    it('RN-05 y FA1: reintentar y sacar peor conserva la mejor calificación y no quita el avance', async () => {
      const e = await estudiante();
      await jugarReto(app, prisma, e, reto(1, 1).id); // 100 %, 3 estrellas
      const peor = (await jugarReto(app, prisma, e, reto(1, 1).id, 'malo')).resultado;
      expect(peor.aprobado).toBe(false);
      expect(peor.porcentaje).toBeLessThan(80);
      expect(peor.calificacionEstrellas).toBe(0);
      expect(peor.xpGanado).toBe(0);

      const fase = (await get(e, '/fases').expect(200)).body[0];
      expect(fase).toMatchObject({
        estado: 'completada',
        mejorPorcentaje: 100,
        mejorCalificacionEstrellas: 3,
        intentosRealizados: 2,
      });
      const tablon = (await get(e, `/fases/${fase.id}`).expect(200)).body;
      expect(tablon.retos[0]).toMatchObject({ estado: 'APROBADO', mejorPorcentaje: 100 });
    });

    it('un intento reprobado (< 80 %) no aprueba, no da recompensa y no completa la fase (RN-03)', async () => {
      const e = await estudiante();
      const r = (await jugarReto(app, prisma, e, reto(1, 1).id, 'malo')).resultado;
      expect(r).toMatchObject({ aprobado: false, calificacionEstrellas: 0, xpGanado: 0, qpGanado: 0 });
      expect((await get(e, '/fases').expect(200)).body[0].estado).toBe('en_progreso');
    });

    it('los intentos EN_CURSO no cuentan para el progreso de la fase', async () => {
      const e = await estudiante();
      await iniciarIntento(app, e, reto(1, 1).id);
      const fase = (await get(e, '/fases').expect(200)).body[0];
      expect(fase).toMatchObject({ estado: 'desbloqueada', intentosRealizados: 0, mejorPorcentaje: null });
    });

    it('enviar dos veces a la vez cobra la recompensa una sola vez', async () => {
      const e = await estudiante();
      const intento = await iniciarIntento(app, e, reto(1, 1).id);
      await resolver(app, prisma, e, intento);
      const [a, b] = await Promise.all([
        http(app).post(`/intentos/${intento.intentoId}/enviar`).set(auth(e)),
        http(app).post(`/intentos/${intento.intentoId}/enviar`).set(auth(e)),
      ]);
      expect([a.status, b.status]).toEqual([200, 200]);
      expect(a.body.resultado).toEqual(b.body.resultado);
      const perfil = (await get(e, '/auth/perfil').expect(200)).body;
      expect(perfil.xpTotal).toBe(150);
    });

    it('reenviar recupera el mismo resultado, pero modificar un intento calificado sigue dando 409', async () => {
      const e = await estudiante();
      const intento = await iniciarIntento(app, e, reto(1, 1).id);
      await resolver(app, prisma, e, intento);
      await http(app).post(`/intentos/${intento.intentoId}/enviar`).set(auth(e)).expect(200);
      const recuperado = await http(app).post(`/intentos/${intento.intentoId}/enviar`).set(auth(e)).expect(200);
      expect(recuperado.body.resultado.porcentaje).toBe(100);
      await http(app)
        .put(`/intentos/${intento.intentoId}/borrador`)
        .set(auth(e))
        .send({ posiciones: [], asociaciones: [] })
        .expect(409);
      const consulta = (await get(e, `/intentos/${intento.intentoId}`).expect(200)).body;
      expect(consulta.estado).toBe('CALIFICADO');
      expect(consulta.resultado.porcentaje).toBe(100);
      expect(consulta.retroalimentacion.referenciaCompleta).toBe(true);
      expect(consulta.retroalimentacion.planReferencia.length).toBe(8);
    });

    it('CU-08 retroalimentación de un intento NO aprobado: dice qué está mal, pero no el plan de referencia ni la fase correcta', async () => {
      const e = await estudiante();
      const res = await jugarReto(app, prisma, e, reto(1, 1).id, 'malo');
      expect(res.resultado.aprobado).toBe(false);
      expect(res.retroalimentacion.dependenciasIncumplidas.length).toBeGreaterThan(0);
      expect(res.retroalimentacion.entregablesMalAsociados.length).toBeGreaterThan(0);
      expect(res.retroalimentacion.entregablesMalAsociados[0]).toEqual({
        entregable: expect.any(String),
        faseElegida: expect.any(String),
      });
      expect(res.retroalimentacion.dentroDelPlazo).toBe(true);
      sinReferencia(res.retroalimentacion);
      // lo mismo al consultar el intento después
      sinReferencia((await get(e, `/intentos/${res.intentoId}`).expect(200)).body.retroalimentacion);
    });

    it('CU-08 retroalimentación de un intento aprobado: incluye el plan de referencia completo', async () => {
      const e = await estudiante();
      const res = await jugarReto(app, prisma, e, reto(1, 1).id);
      expect(res.retroalimentacion.referenciaCompleta).toBe(true);
      expect(res.retroalimentacion.planReferencia).toHaveLength(8);
      expect(res.retroalimentacion.planReferencia[0]).toHaveProperty('inicio');
      expect(res.retroalimentacion.finReferencia).toBe(14);
    });
  });

  // ===================================================================
  describe('Ayuda: máximo 1 por intento y solo objetos equipados (RF-03, RN-04, RN-10)', () => {
    it('RN-04 y RN-10: con ayuda el máximo es 2 estrellas, consume una unidad y no admite una segunda ayuda', async () => {
      const e = await estudiante(3);
      const intento = await iniciarIntento(app, e, reto(1, 1).id);
      const pocion = await idPocion(prisma);
      await http(app).post(`/intentos/${intento.intentoId}/ayuda`).set(auth(e)).send({ objetoId: pocion }).expect(200);
      await http(app).post(`/intentos/${intento.intentoId}/ayuda`).set(auth(e)).send({ objetoId: pocion }).expect(409);

      expect((await get(e, '/inventario/equipados').expect(200)).body[0].cantidad).toBe(2);
      await resolver(app, prisma, e, intento);
      const res = await http(app).post(`/intentos/${intento.intentoId}/enviar`).set(auth(e)).expect(200);
      expect(res.body.resultado).toMatchObject({ porcentaje: 100, calificacionEstrellas: 2, usoAyuda: true });
      expect(await prisma.usoAyuda.count({ where: { intentoId: intento.intentoId } })).toBe(1);
    });

    it('la pista se guarda de forma relacional (tipo + elemento al que apunta) y se vuelve a dibujar al consultar y retomar el intento', async () => {
      const e = await estudiante(3);
      const intento = await iniciarIntento(app, e, reto(1, 1).id);
      const ayuda = await http(app)
        .post(`/intentos/${intento.intentoId}/ayuda`)
        .set(auth(e))
        .send({ objetoId: await idPocion(prisma) })
        .expect(200);
      const { bloqueId, requiereId } = ayuda.body.pista;
      expect(bloqueId).toEqual(expect.any(Number));
      expect(requiereId).toEqual(expect.any(Number));

      // en la base: columnas con el tipo y los ids, sin JSON
      const uso = await prisma.usoAyuda.findUniqueOrThrow({ where: { intentoId: intento.intentoId } });
      expect(uso).toMatchObject({
        tipoPista: 'DEPENDENCIA',
        bloqueId,
        requiereId,
        opcionId: null,
        tarjetaId: null,
        pantallaId: null,
        atributoEscenarioId: null,
      });

      // al consultar el intento y al retomarlo vuelve la misma pista
      const esperada = { tipo: 'DEPENDENCIA', bloqueId, requiereId };
      expect((await get(e, `/intentos/${intento.intentoId}`).expect(200)).body.pista).toEqual(esperada);
      const retomado = await iniciarIntento(app, e, reto(1, 1).id);
      expect(retomado).toMatchObject({ intentoId: intento.intentoId, ayudaUsada: true, pista: esperada });

      // una ayuda registrada antes de guardar pistas (tipoPista null) no rompe: ayudaUsada sí, pista no
      await prisma.usoAyuda.update({
        where: { intentoId: intento.intentoId },
        data: { tipoPista: null, bloqueId: null, requiereId: null },
      });
      const antigua = await iniciarIntento(app, e, reto(1, 1).id);
      expect(antigua.ayudaUsada).toBe(true);
      expect(antigua.pista).toBeNull();
    });

    it('un intento nuevo, o uno sin ayuda, no trae pista', async () => {
      const e = await estudiante(1);
      const intento = await iniciarIntento(app, e, reto(1, 1).id);
      expect(intento).toMatchObject({ ayudaUsada: false, pista: null });
    });

    it('la ayuda se ata al intento: el siguiente intento empieza sin ayuda y puede sacar 3 estrellas', async () => {
      const e = await estudiante(3);
      await jugarReto(app, prisma, e, reto(1, 1).id, 'perfecto', true);
      const siguiente = await jugarReto(app, prisma, e, reto(1, 1).id);
      expect(siguiente.resultado).toMatchObject({ usoAyuda: false, calificacionEstrellas: 3 });
    });

    it('RN-10: un objeto que no está en el inventario, no está equipado o se agotó no se puede usar (400)', async () => {
      const sinNada = await estudiante(0);
      const pocion = await idPocion(prisma);
      const intento = await iniciarIntento(app, sinNada, reto(1, 1).id);
      await http(app).post(`/intentos/${intento.intentoId}/ayuda`).set(auth(sinNada)).send({ objetoId: pocion }).expect(400);

      const e = await estudiante(1);
      await prisma.inventarioObjeto.update({
        where: { estudianteId_objetoId: { estudianteId: e.id, objetoId: pocion } },
        data: { equipado: false },
      });
      const i2 = await iniciarIntento(app, e, reto(1, 1).id);
      await http(app).post(`/intentos/${i2.intentoId}/ayuda`).set(auth(e)).send({ objetoId: pocion }).expect(400);

      await prisma.inventarioObjeto.update({
        where: { estudianteId_objetoId: { estudianteId: e.id, objetoId: pocion } },
        data: { equipado: true, cantidad: 0 },
      });
      await http(app).post(`/intentos/${i2.intentoId}/ayuda`).set(auth(e)).send({ objetoId: pocion }).expect(400);
      expect(await prisma.usoAyuda.count({ where: { intentoId: i2.intentoId } })).toBe(0);
    });

    it('la ayuda exige un objetoId y un intento en curso', async () => {
      const e = await estudiante(2);
      const intento = await iniciarIntento(app, e, reto(1, 1).id);
      await http(app).post(`/intentos/${intento.intentoId}/ayuda`).set(auth(e)).send({}).expect(400);
      await resolver(app, prisma, e, intento);
      await http(app).post(`/intentos/${intento.intentoId}/enviar`).set(auth(e)).expect(200);
      await http(app)
        .post(`/intentos/${intento.intentoId}/ayuda`)
        .set(auth(e))
        .send({ objetoId: await idPocion(prisma) })
        .expect(409);
    });
  });

  // ===================================================================
  describe('Aislamiento entre estudiantes', () => {
    it('un estudiante no puede ver ni modificar los intentos de otro (404)', async () => {
      const dueno = await estudiante();
      const intruso = await estudiante();
      const intento = await iniciarIntento(app, dueno, reto(1, 1).id);
      const id = intento.intentoId;
      await get(intruso, `/intentos/${id}`).expect(404);
      await http(app).put(`/intentos/${id}/borrador`).set(auth(intruso)).send({ posiciones: [], asociaciones: [] }).expect(404);
      await http(app).post(`/intentos/${id}/enviar`).set(auth(intruso)).expect(404);
      await http(app).post(`/intentos/${id}/ayuda`).set(auth(intruso)).send({ objetoId: await idPocion(prisma) }).expect(404);
      await http(app).post(`/intentos/${id}/dialogo/tecnica`).set(auth(intruso)).send({ tecnica: 'ENTREVISTA' }).expect(404);
      await http(app).post(`/intentos/${id}/dialogo/turnos`).set(auth(intruso)).send({ opcionId: 1 }).expect(404);
      // el intento del dueño sigue intacto
      expect((await get(dueno, `/intentos/${id}`).expect(200)).body.estado).toBe('EN_CURSO');
    });

    it('el intruso tampoco comparte el EN_CURSO: iniciar el mismo reto crea su propio intento', async () => {
      const a = await estudiante();
      const b = await estudiante();
      const ia = await iniciarIntento(app, a, reto(1, 1).id);
      const ib = await iniciarIntento(app, b, reto(1, 1).id);
      expect(ib.intentoId).not.toBe(ia.intentoId);
    });
  });

  // ===================================================================
  describe('CU-01 Diálogo con stakeholder (RF-04, RN-16)', () => {
    let e: EstudiantePrueba;
    const dialogoId = () => reto(2, 1).id;

    beforeAll(async () => {
      e = await estudiante();
      await aprobarFases(app, prisma, e, 1);
    });

    it('al iniciar muestra al stakeholder, los turnos y 4 técnicas, sin libreta ni nodo hasta elegir la técnica', async () => {
      const intento = await iniciarIntento(app, e, dialogoId());
      expect(intento.contenido).toMatchObject({
        stakeholder: { nombre: 'Don Ramón' },
        turnosMaximos: 12,
        totalRequerimientos: 6,
      });
      expect(intento.contenido.tecnicas).toHaveLength(4);
      expect(intento.borrador).toMatchObject({
        tecnicaElegida: null,
        turnosRestantes: 12,
        libreta: [],
        nodoActual: null,
      });
    });

    it('CU-01: no se puede preguntar sin elegir técnica (400), y enviar sin técnica da 400 con faltantes', async () => {
      const intento = await iniciarIntento(app, e, dialogoId());
      const opcion = await opcionPorPregunta(prisma, dialogoId(), PLAN_DIALOGO_PERFECTO[0]);
      await http(app).post(`/intentos/${intento.intentoId}/dialogo/turnos`).set(auth(e)).send({ opcionId: opcion.id }).expect(400);
      const res = await http(app).post(`/intentos/${intento.intentoId}/enviar`).set(auth(e)).expect(400);
      expect(res.body.faltantes).toEqual(['Falta elegir la técnica de elicitación']);
    });

    it('el servidor conduce el diálogo: las opciones no revelan si son productivas ni qué requerimiento revelan', async () => {
      const intento = await iniciarIntento(app, e, dialogoId());
      const res = await http(app)
        .post(`/intentos/${intento.intentoId}/dialogo/tecnica`)
        .set(auth(e))
        .send({ tecnica: 'ENTREVISTA' })
        .expect(200);
      const nodo = res.body.nodoActual;
      expect(nodo.intervencion).toContain('Pase, pase');
      expect(nodo.opciones).toHaveLength(5);
      for (const o of nodo.opciones) expect(Object.keys(o).sort()).toEqual(['id', 'pregunta']);
    });

    it('un turno devuelve la respuesta, el requerimiento revelado, el siguiente nodo y los turnos restantes', async () => {
      const intento = await iniciarIntento(app, e, dialogoId());
      const base = `/intentos/${intento.intentoId}/dialogo/turnos`;
      const nav = await opcionPorPregunta(prisma, dialogoId(), PLAN_DIALOGO_PERFECTO[0]);
      const sinReq = await http(app).post(base).set(auth(e)).send({ opcionId: nav.id }).expect(200);
      expect(sinReq.body.turno.requerimiento).toBeNull();
      expect(sinReq.body.turnosRestantes).toBe(11);
      expect(sinReq.body.nodoActual.intervencion).toContain('libreta');

      const revela = await opcionPorPregunta(prisma, dialogoId(), PLAN_DIALOGO_PERFECTO[1]);
      const conReq = await http(app).post(base).set(auth(e)).send({ opcionId: revela.id }).expect(200);
      expect(conReq.body.turno.requerimiento.codigo).toBe('R1');
      expect(conReq.body.libreta).toHaveLength(1);
      expect(conReq.body.turnosRestantes).toBe(10);
      // la opción ya elegida no vuelve a ofrecerse
      expect(conReq.body.nodoActual.opciones.map((o: { id: number }) => o.id)).not.toContain(revela.id);
    });

    it('una pregunta que no está disponible en el nodo actual se rechaza (400) y la técnica no cambia tras el primer turno', async () => {
      const intento = await iniciarIntento(app, e, dialogoId()); // retoma el anterior (ya con 2 turnos)
      const base = `/intentos/${intento.intentoId}/dialogo`;
      const lejana = await opcionPorPregunta(prisma, dialogoId(), PLAN_DIALOGO_PERFECTO[10]);
      await http(app).post(`${base}/turnos`).set(auth(e)).send({ opcionId: lejana.id }).expect(400);
      await http(app).post(`${base}/tecnica`).set(auth(e)).send({ tecnica: 'TALLER' }).expect(400);
      const repetida = await opcionPorPregunta(prisma, dialogoId(), PLAN_DIALOGO_PERFECTO[1]);
      await http(app).post(`${base}/turnos`).set(auth(e)).send({ opcionId: repetida.id }).expect(400);
    });

    it('retomar conserva técnica, turnos y libreta', async () => {
      const intento = await iniciarIntento(app, e, dialogoId());
      expect(intento.borrador.tecnicaElegida).toBe('ENTREVISTA');
      expect(intento.borrador.turnos).toHaveLength(2);
      expect(intento.borrador.libreta).toHaveLength(1);
    });

    it('el diálogo no usa el borrador genérico (400)', async () => {
      const intento = await iniciarIntento(app, e, dialogoId());
      await http(app).put(`/intentos/${intento.intentoId}/borrador`).set(auth(e)).send({}).expect(400);
    });

    it('RN-16: entrevista perfecta (técnica correcta, 6 requerimientos, sin improductivas) = 100 y llena la libreta', async () => {
      const e2 = await estudiante();
      await aprobarFases(app, prisma, e2, 1);
      const intento = await iniciarIntento(app, e2, dialogoId());
      await resolver(app, prisma, e2, intento);
      expect(await get(e2, `/retos/${dialogoId()}/libreta`).then((r) => r.body)).toEqual([]);

      const res = await http(app).post(`/intentos/${intento.intentoId}/enviar`).set(auth(e2)).expect(200);
      expect(res.body.resultado).toMatchObject({ porcentaje: 100, calificacionEstrellas: 3 });
      expect(res.body.retroalimentacion).toMatchObject({
        tecnicaElegida: 'ENTREVISTA',
        tecnicaCorrecta: 'ENTREVISTA',
        preguntasImproductivas: 0,
        turnosUsados: 11,
      });
      expect(res.body.retroalimentacion.descubiertos).toHaveLength(6);
      expect(res.body.retroalimentacion.noDescubiertos).toHaveLength(0);

      const libreta = (await get(e2, `/retos/${dialogoId()}/libreta`).expect(200)).body;
      expect(libreta.map((r: { codigo: string }) => r.codigo)).toEqual(['R1', 'R2', 'R3', 'R4', 'R5', 'R6']);
    });

    it('FE1: con la libreta vacía el servidor sí permite enviar (el cliente pide confirmación): solo vale la técnica (20)', async () => {
      const e3 = await estudiante();
      await aprobarFases(app, prisma, e3, 1);
      const intento = await iniciarIntento(app, e3, dialogoId());
      await http(app).post(`/intentos/${intento.intentoId}/dialogo/tecnica`).set(auth(e3)).send({ tecnica: 'ENTREVISTA' }).expect(200);
      const res = await http(app).post(`/intentos/${intento.intentoId}/enviar`).set(auth(e3)).expect(200);
      expect(res.body.resultado).toMatchObject({ porcentaje: 20, aprobado: false });
    });

    it('FE2: al agotar los turnos ya no se aceptan preguntas (el cliente envía automáticamente)', async () => {
      const e4 = await estudiante();
      await aprobarFases(app, prisma, e4, 1);
      const intento = await iniciarIntento(app, e4, dialogoId());
      await resolver(app, prisma, e4, intento); // 11 turnos
      const estado = (await get(e4, `/intentos/${intento.intentoId}`).expect(200)).body.borrador;
      expect(estado.turnosRestantes).toBe(1);
      const ultima = estado.nodoActual.opciones[0].id;
      const doceavo = await http(app)
        .post(`/intentos/${intento.intentoId}/dialogo/turnos`)
        .set(auth(e4))
        .send({ opcionId: ultima })
        .expect(200);
      expect(doceavo.body.turnosRestantes).toBe(0);
      expect(doceavo.body.nodoActual).toBeNull();
      await http(app).post(`/intentos/${intento.intentoId}/dialogo/turnos`).set(auth(e4)).send({ opcionId: ultima }).expect(400);
      await http(app).post(`/intentos/${intento.intentoId}/enviar`).set(auth(e4)).expect(200);
    });

    it('RN-16: técnica equivocada y una pregunta improductiva = 0', async () => {
      const e5 = await estudiante();
      await aprobarFases(app, prisma, e5, 1);
      const res = await jugarReto(app, prisma, e5, dialogoId(), 'malo');
      expect(res.resultado).toMatchObject({ porcentaje: 0, aprobado: false });
      expect(res.retroalimentacion.preguntasImproductivas).toBe(1);
      expect(res.retroalimentacion.tecnicaElegida).toBe('CUESTIONARIO');
      // dice que la técnica está mal y cuántos requerimientos faltaron, pero no cuál era ni cuáles
      expect(res.retroalimentacion.tecnicaAcertada).toBe(false);
      expect(res.retroalimentacion.noDescubiertosCantidad).toBe(6);
      sinReferencia(res.retroalimentacion);
    });
  });

  // ===================================================================
  describe('CU-03 Tablero MoSCoW (RF-06, RN-18)', () => {
    let e: EstudiantePrueba;
    const moscowId = () => reto(2, 2).id;

    beforeAll(async () => {
      e = await estudiante();
      await aprobarFases(app, prisma, e, 1);
      await jugarReto(app, prisma, e, reto(2, 1).id);
    });

    it('FA2 mueve una tarjeta, conserva tipos y orden, persiste al retomar y cobra una sola ayuda', async () => {
      const alumno = await estudiante();
      await aprobarFases(app, prisma, alumno, 1);
      await jugarReto(app, prisma, alumno, reto(2, 1).id);
      const intento = await iniciarIntento(app, alumno, moscowId());
      const tarjetas = await prisma.tarjetaRequerimiento.findMany({ where: { retoId: moscowId() }, orderBy: { orden: 'asc' } });
      const objetivo = tarjetas[0];
      expect(objetivo.columnaCorrecta).toBe('MUST');
      const borrador = { tarjetas: tarjetas.map((t) => ({
        tarjetaId: t.id, columna: t.id === objetivo.id ? 'WONT' : t.columnaCorrecta,
        tipo: 'NO_FUNCIONAL', ordenMust: t.id === objetivo.id ? null : t.ordenMustReferencia,
      })) };
      await http(app).put(`/intentos/${intento.intentoId}/borrador`).set(auth(alumno)).send(borrador).expect(200);
      const ayuda = await http(app).post(`/intentos/${intento.intentoId}/ayuda`).set(auth(alumno))
        .send({ objetoId: await idPocion(prisma) }).expect(200);
      const actual = ayuda.body.borradorActualizado.tarjetas;
      expect(actual.find((t: { tarjetaId: number }) => t.tarjetaId === objetivo.id))
        .toMatchObject({ columna: 'MUST', tipo: 'NO_FUNCIONAL', ordenMust: 4 });
      expect(actual.every((t: { tipo: string }) => t.tipo === 'NO_FUNCIONAL')).toBe(true);
      const consulta = (await get(alumno, `/intentos/${intento.intentoId}`).expect(200)).body;
      expect(consulta.borrador).toEqual(ayuda.body.borradorActualizado);
      expect((await iniciarIntento(app, alumno, moscowId())).borrador).toEqual(consulta.borrador);
      await http(app).post(`/intentos/${intento.intentoId}/ayuda`).set(auth(alumno))
        .send({ objetoId: await idPocion(prisma) }).expect(409);
      expect((await get(alumno, '/inventario/equipados')).body[0].cantidad).toBe(2);
      await resolver(app, prisma, alumno, intento);
      const resultado = await http(app).post(`/intentos/${intento.intentoId}/enviar`).set(auth(alumno)).expect(200);
      expect(resultado.body.resultado).toMatchObject({ porcentaje: 100, calificacionEstrellas: 2 });
    });

    it('FA2 sin tarjeta que corregir no consume inventario ni registra ayuda', async () => {
      const alumno = await estudiante();
      await aprobarFases(app, prisma, alumno, 1);
      await jugarReto(app, prisma, alumno, reto(2, 1).id);
      const intento = await iniciarIntento(app, alumno, moscowId());
      await resolver(app, prisma, alumno, intento);
      await http(app).post(`/intentos/${intento.intentoId}/ayuda`).set(auth(alumno))
        .send({ objetoId: await idPocion(prisma) }).expect(400);
      expect((await get(alumno, '/inventario/equipados')).body[0].cantidad).toBe(3);
      expect(await prisma.usoAyuda.count({ where: { intentoId: intento.intentoId } })).toBe(0);
      expect((await get(alumno, `/intentos/${intento.intentoId}`)).body.ayudaUsada).toBe(false);
    });

    it('CU-03 FE1: enviar con tarjetas sin columna o sin tipo → 400 con la lista', async () => {
      const intento = await iniciarIntento(app, e, moscowId());
      expect(intento.contenido.tarjetas).toHaveLength(10);
      expect(intento.contenido.capacidad).toBe(20);
      const res = await http(app).post(`/intentos/${intento.intentoId}/enviar`).set(auth(e)).expect(400);
      expect(res.body.faltantes.length).toBe(20); // 10 sin columna + 10 sin tipo
    });

    it('CU-03 FE2: MUST por encima de la capacidad no se puede enviar (400)', async () => {
      const intento = await iniciarIntento(app, e, moscowId());
      const tarjetas = await prisma.tarjetaRequerimiento.findMany({ where: { retoId: moscowId() } });
      // todas en MUST (suma 54 puntos > 20), con tipo
      await http(app)
        .put(`/intentos/${intento.intentoId}/borrador`)
        .set(auth(e))
        .send({ tarjetas: tarjetas.map((t, i) => ({ tarjetaId: t.id, columna: 'MUST', tipo: 'FUNCIONAL', ordenMust: i + 1 })) })
        .expect(200);
      const res = await http(app).post(`/intentos/${intento.intentoId}/enviar`).set(auth(e)).expect(400);
      expect(res.body.faltantes).toEqual([expect.stringContaining('superan la capacidad')]);
    });

    it('el borrador valida las tarjetas: una tarjeta de otro reto o un campo desconocido se rechazan (400)', async () => {
      const intento = await iniciarIntento(app, e, moscowId());
      await http(app).put(`/intentos/${intento.intentoId}/borrador`).set(auth(e)).send({ tarjetas: [{ tarjetaId: 999999 }] }).expect(400);
      await http(app).put(`/intentos/${intento.intentoId}/borrador`).set(auth(e)).send({ tarjetas: [], extra: 1 }).expect(400);
      await http(app).put(`/intentos/${intento.intentoId}/borrador`).set(auth(e)).send({ tarjetas: [{ tarjetaId: 1, columna: 'NUNCA' }] }).expect(400);
      // el cuerpo de otra mecánica tampoco sirve
      await http(app).put(`/intentos/${intento.intentoId}/borrador`).set(auth(e)).send({ marcas: [] }).expect(400);
    });

    it('el borrador se normaliza: el orden de MUST se guarda como 1..n', async () => {
      const intento = await iniciarIntento(app, e, moscowId());
      const t = await prisma.tarjetaRequerimiento.findMany({ where: { retoId: moscowId(), columnaCorrecta: 'MUST' } });
      await http(app)
        .put(`/intentos/${intento.intentoId}/borrador`)
        .set(auth(e))
        .send({ tarjetas: t.map((x, i) => ({ tarjetaId: x.id, columna: 'MUST', tipo: 'FUNCIONAL', ordenMust: (i + 1) * 10 })) })
        .expect(200);
      const retomado = await iniciarIntento(app, e, moscowId());
      expect(retomado.borrador.tarjetas.map((x: { ordenMust: number }) => x.ordenMust).sort()).toEqual([1, 2, 3, 4]);
    });

    it('RN-18: clasificación perfecta = 100 y la retroalimentación muestra el orden de referencia de MUST', async () => {
      const res = await jugarReto(app, prisma, e, moscowId());
      expect(res.resultado.porcentaje).toBe(100);
      expect(res.retroalimentacion.tarjetas).toHaveLength(10);
      expect(res.retroalimentacion.tarjetas.every((t: { columnaAcertada: boolean }) => t.columnaAcertada)).toBe(true);
      expect(res.retroalimentacion.ordenMustReferencia.map((x: { orden: number }) => x.orden)).toEqual([1, 2, 3, 4]);
    });

    it('RN-18: todo en WONT como RF reprueba y marca cada columna mal elegida', async () => {
      const res = await jugarReto(app, prisma, e, moscowId(), 'malo');
      expect(res.resultado.aprobado).toBe(false);
      expect(res.retroalimentacion.tarjetas.filter((t: { columnaAcertada: boolean }) => !t.columnaAcertada)).toHaveLength(9);
      // señala las tarjetas mal colocadas, pero no la columna correcta ni el orden de referencia
      expect(res.retroalimentacion.tarjetas[0]).not.toHaveProperty('columnaCorrecta');
      sinReferencia(res.retroalimentacion);
    });
  });

  // ===================================================================
  describe('CU-04 Inspección (RF-07, RN-19) y CU-06 Reparto de presupuesto (RF-09, RN-21)', () => {
    let e: EstudiantePrueba;
    const inspeccionId = () => reto(3, 1).id;
    const presupuestoId = () => reto(3, 2).id;

    beforeAll(async () => {
      e = await estudiante();
      await aprobarFases(app, prisma, e, 2);
    });

    it('CU-04: el sistema trae 3 pantallas con sus elementos y un máximo de 9 marcas', async () => {
      const intento = await iniciarIntento(app, e, inspeccionId());
      expect(intento.contenido.nombreAplicacion).toBe('SaludYa');
      expect(intento.contenido.maxMarcas).toBe(9);
      expect(intento.contenido.pantallas).toHaveLength(3);
      for (const p of intento.contenido.pantallas) expect(p.elementos.length).toBeGreaterThanOrEqual(6);
    });

    it('CU-04 FE1: no se permiten más marcas que el máximo (400), validado en el servidor', async () => {
      const intento = await iniciarIntento(app, e, inspeccionId());
      const elementos = await prisma.elementoPantalla.findMany({ where: { pantalla: { retoId: inspeccionId() } } });
      const marcas = (n: number) =>
        elementos.slice(0, n).map((x) => ({ elementoId: x.id, atributo: 'USABILIDAD' }));
      await http(app).put(`/intentos/${intento.intentoId}/borrador`).set(auth(e)).send({ marcas: marcas(10) }).expect(400);
      await http(app).put(`/intentos/${intento.intentoId}/borrador`).set(auth(e)).send({ marcas: marcas(9) }).expect(200);
    });

    it('CU-04 FE2: una marca sin atributo impide enviar (400)', async () => {
      const intento = await iniciarIntento(app, e, inspeccionId());
      const falla = await prisma.fallaCalidad.findFirstOrThrow({ where: { elemento: { pantalla: { retoId: inspeccionId() } } } });
      await http(app)
        .put(`/intentos/${intento.intentoId}/borrador`)
        .set(auth(e))
        .send({ marcas: [{ elementoId: falla.elementoId }] })
        .expect(200);
      const res = await http(app).post(`/intentos/${intento.intentoId}/enviar`).set(auth(e)).expect(400);
      expect(res.body.faltantes).toHaveLength(1);
    });

    it('CU-04 FA4: las marcas se pueden retirar o cambiar mientras el intento sigue en curso', async () => {
      const intento = await iniciarIntento(app, e, inspeccionId());
      const fallas = await prisma.fallaCalidad.findMany({ where: { elemento: { pantalla: { retoId: inspeccionId() } } } });
      await http(app).put(`/intentos/${intento.intentoId}/borrador`).set(auth(e)).send({ marcas: [{ elementoId: fallas[0].elementoId, atributo: 'SEGURIDAD' }, { elementoId: fallas[1].elementoId, atributo: 'SEGURIDAD' }] }).expect(200);
      await http(app).put(`/intentos/${intento.intentoId}/borrador`).set(auth(e)).send({ marcas: [{ elementoId: fallas[1].elementoId, atributo: 'USABILIDAD' }] }).expect(200);
      const retomado = await iniciarIntento(app, e, inspeccionId());
      expect(retomado.borrador.marcas).toEqual([{ elementoId: fallas[1].elementoId, atributo: 'USABILIDAD' }]);
    });

    it('RN-19: marcar las 6 fallas con su atributo da 100 y la retroalimentación las explica', async () => {
      const res = await jugarReto(app, prisma, e, inspeccionId());
      expect(res.resultado.porcentaje).toBe(100);
      expect(res.retroalimentacion.encontradas).toHaveLength(6);
      expect(res.retroalimentacion.referenciaCompleta).toBe(true);
      expect(res.retroalimentacion.noEncontradas).toHaveLength(0);
      expect(res.retroalimentacion.encontradas[0].explicacion.length).toBeGreaterThan(20);
    });

    it('RN-19: marcar solo elementos sin falla da 0 y los lista junto con las fallas no encontradas', async () => {
      const res = await jugarReto(app, prisma, e, inspeccionId(), 'malo');
      expect(res.resultado).toMatchObject({ porcentaje: 0, aprobado: false });
      expect(res.retroalimentacion.marcasSinFalla).toHaveLength(3);
      // no revela cuáles fallas se escaparon, solo cuántas
      expect(res.retroalimentacion.fallasNoEncontradas).toBe(6);
      sinReferencia(res.retroalimentacion);
    });

    it('CU-06: el contenido público trae lo necesario para el medidor, pero no el reparto de referencia', async () => {
      const intento = await iniciarIntento(app, e, presupuestoId());
      expect(intento.contenido.presupuesto).toBe(20);
      expect(intento.contenido.atributos).toHaveLength(4);
      expect(intento.contenido.atributos[0]).toEqual(
        expect.objectContaining({ valorBase: expect.any(Number), ganancia: expect.any(Number) }),
      );
      expect(intento.contenido.efectos.length).toBeGreaterThanOrEqual(3);
      expect(intento.contenido.justificaciones).toHaveLength(3);
    });

    it('CU-06 FE1: no se puede asignar más que el presupuesto (400)', async () => {
      const intento = await iniciarIntento(app, e, presupuestoId());
      const atributos = await prisma.atributoEscenario.findMany({ where: { retoId: presupuestoId() } });
      await http(app)
        .put(`/intentos/${intento.intentoId}/borrador`)
        .set(auth(e))
        .send({ asignaciones: atributos.map((a) => ({ atributoEscenarioId: a.id, puntos: 6 })) }) // 24 > 20
        .expect(400);
      await http(app)
        .put(`/intentos/${intento.intentoId}/borrador`)
        .set(auth(e))
        .send({ asignaciones: atributos.map((a) => ({ atributoEscenarioId: a.id, puntos: 5 })) }) // 20
        .expect(200);
    });

    it('CU-06: enviar sin elegir una justificación → 400', async () => {
      const intento = await iniciarIntento(app, e, presupuestoId());
      const res = await http(app).post(`/intentos/${intento.intentoId}/enviar`).set(auth(e)).expect(400);
      expect(res.body.faltantes).toEqual(['Falta elegir una justificación para tu reparto']);
    });

    it('CU-06 FE2: incumplir una restricción obligatoria sí permite enviar (solo baja la nota)', async () => {
      // reparto parejo 5-5-5-5 y justificación errónea
      const res = await jugarReto(app, prisma, e, presupuestoId(), 'malo');
      expect(res.resultado.porcentaje).toBe(57);
      expect(res.resultado.aprobado).toBe(false);
      expect(res.retroalimentacion.restriccionesCumplidas).toBe(2);
      expect(res.retroalimentacion.restriccionesTotales).toBe(3);
      expect(res.retroalimentacion.justificacionAcertada).toBe(false);
      // muestra las restricciones incumplidas, pero no el reparto de referencia ni la justificación correcta
      expect(res.retroalimentacion.atributos.filter((a: { cumple: boolean | null }) => a.cumple === false)).toHaveLength(1);
      sinReferencia(res.retroalimentacion);
    });

    it('RN-21: el reparto de referencia con la justificación correcta da 100 y revela el reparto de referencia', async () => {
      const res = await jugarReto(app, prisma, e, presupuestoId());
      expect(res.resultado.porcentaje).toBe(100);
      expect(res.retroalimentacion.atributos.map((a: { referencia: number }) => a.referencia)).toEqual([8, 6, 4, 2]);
      expect(res.retroalimentacion.atributos.every((a: { cumple: boolean | null }) => a.cumple !== false)).toBe(true);
    });
  });
});
