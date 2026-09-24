import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { configurarApp } from '../src/app.setup';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { parsearClave } from '../src/modules/aprendizaje/evaluacion';
import { calcularNivel } from '../src/modules/progreso/nivel';

// Requiere la base de datos migrada y con el seed cargado (fases 1-3 con
// contenido real: 3 retos cada una). El estudiante de prueba se borra al
// terminar.
describe('Auth + Aprendizaje (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let token: string;
  let estudianteId: number;

  const sufijo = Date.now();
  const credenciales = {
    email: `e2e_${sufijo}@test.local`,
    password: 'contrasena-e2e',
  };

  const http = () => request(app.getHttpServer());
  const auth = () => ({ Authorization: `Bearer ${token}` });

  /** Respuestas 100% correctas de un reto, leídas directamente de la BD (el cliente nunca ve `correcta`). */
  const respuestasCorrectas = async (retoId: number) => {
    const reto = await prisma.reto.findUniqueOrThrow({ where: { id: retoId } });
    return parsearClave(reto.contenido).map((p) => ({
      preguntaId: p.preguntaId,
      respuesta: p.correcta,
    }));
  };

  /** Envía la solución 100% correcta al "reto actual" de la fase, repitiendo hasta dejarla completada. */
  const aprobarFaseCompleta = async (faseId: number) => {
    for (;;) {
      const detalle = (await http().get(`/fases/${faseId}`).set(auth())).body;
      if (detalle.fase.estado === 'completada') return;
      const respuestas = await respuestasCorrectas(detalle.reto.id);
      await http()
        .post(`/retos/${detalle.reto.id}/intentos`)
        .set(auth())
        .send({ respuestas })
        .expect(201);
    }
  };

  beforeAll(async () => {
    const modulo = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = modulo.createNestApplication();
    configurarApp(app);
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    if (estudianteId) {
      await prisma.estudiante.delete({ where: { id: estudianteId } });
    }
    await app.close();
  });

  describe('Auth', () => {
    it('registra un estudiante y devuelve un token', async () => {
      const res = await http()
        .post('/auth/registro')
        .send({ ...credenciales, nombreAventurero: `e2e_${sufijo}` })
        .expect(201);
      expect(res.body.accessToken).toEqual(expect.any(String));
      expect(res.body.estudiante).toMatchObject({
        email: credenciales.email,
        nivel: 1,
        xpTotal: 0,
        qpTotal: 0,
        racha: { diasActuales: 0 },
      });
      expect(res.body.estudiante.passwordHash).toBeUndefined();
      estudianteId = res.body.estudiante.id;
    });

    it('rechaza un email ya registrado con 409', () =>
      http()
        .post('/auth/registro')
        .send({ ...credenciales, nombreAventurero: `otro_${sufijo}` })
        .expect(409));

    it('rechaza datos de registro inválidos con 400', () =>
      http()
        .post('/auth/registro')
        .send({
          email: 'no-es-email',
          password: 'corta',
          nombreAventurero: 'x',
        })
        .expect(400));

    it('rechaza una contraseña incorrecta con 401', () =>
      http()
        .post('/auth/login')
        .send({ ...credenciales, password: 'incorrecta-123' })
        .expect(401));

    it('inicia sesión con credenciales válidas', async () => {
      const res = await http()
        .post('/auth/login')
        .send(credenciales)
        .expect(200);
      token = res.body.accessToken;
    });

    it('devuelve el perfil con token y 401 sin token', async () => {
      await http().get('/auth/perfil').expect(401);
      const res = await http().get('/auth/perfil').set(auth()).expect(200);
      expect(res.body.id).toBe(estudianteId);
    });
  });

  describe('Aprendizaje', () => {
    it('exige autenticación', () => http().get('/fases').expect(401));

    it('para un estudiante nuevo solo la primera fase está desbloqueada', async () => {
      const res = await http().get('/fases').set(auth()).expect(200);
      const [primera, ...resto] = res.body;
      expect(primera.estado).toBe('desbloqueada');
      expect(resto.every((f) => f.estado === 'bloqueada')).toBe(true);
    });

    it('responde 404 real para una fase inexistente', () =>
      http().get('/fases/999999').set(auth()).expect(404));

    it('no deja enviar intentos a un reto de una fase bloqueada', async () => {
      const fases = (await http().get('/fases').set(auth())).body;
      const bloqueada = fases.find((f) => f.estado === 'bloqueada' && f.retoId);
      if (!bloqueada) return;
      await http()
        .post(`/retos/${bloqueada.retoId}/intentos`)
        .set(auth())
        .send({ respuestas: [{ preguntaId: 'x', respuesta: 'y' }] })
        .expect(403);
    });

    it('el reto nunca expone la respuesta correcta, sí el texto y las opciones de cada pregunta', async () => {
      const fases = (await http().get('/fases').set(auth())).body;
      const detalle = (await http().get(`/fases/${fases[0].id}`).set(auth()))
        .body;
      expect(JSON.stringify(detalle.reto)).not.toMatch(/"correcta"/);
      expect(detalle.reto.preguntas[0]).toMatchObject({
        preguntaId: expect.any(String),
        texto: expect.any(String),
      });
      expect(detalle.reto.preguntas[0].opciones[0]).toMatchObject({
        valor: expect.any(String),
        texto: expect.any(String),
      });
    });

    it('evalúa en el servidor, calcula usoAyuda e ignora lo que mande el cliente (fase 1, reto 1 de 3)', async () => {
      const fases = (await http().get('/fases').set(auth())).body;
      const primera = fases[0];
      const detalle = (
        await http().get(`/fases/${primera.id}`).set(auth()).expect(200)
      ).body;
      const reto = detalle.reto;
      const respuestas = await respuestasCorrectas(reto.id);

      // Sin ayuda, con una respuesta incorrecta: aunque el cliente mande
      // usoAyuda/porcentaje/aprobado, se ignoran.
      const fallido = await http()
        .post(`/retos/${reto.id}/intentos`)
        .set(auth())
        .send({
          respuestas: [
            { preguntaId: respuestas[0].preguntaId, respuesta: 'mal' },
            ...respuestas.slice(1),
          ],
          usoAyuda: true,
          porcentaje: 100,
          aprobado: true,
        })
        .expect(201);
      expect(fallido.body).toMatchObject({
        aprobado: false,
        usoAyuda: false,
        xpGanado: 0,
      });

      // Con ayuda registrada antes del envío.
      const ayuda = await http()
        .post(`/retos/${reto.id}/ayuda`)
        .set(auth())
        .expect(201);
      expect(ayuda.body.ayudasPendientes).toBe(1);

      const aprobado = await http()
        .post(`/retos/${reto.id}/intentos`)
        .set(auth())
        .send({ respuestas })
        .expect(201);
      // 100% con ayuda usada: la Fase 2 (RN-04/RF-05) trunca a 2 estrellas,
      // aunque la precisión sea perfecta; la recompensa no se ve afectada.
      expect(aprobado.body).toMatchObject({
        porcentaje: 100,
        calificacionEstrellas: 2,
        aprobado: true,
        usoAyuda: true,
        xpGanado: reto.recompensaXp,
        qpGanado: reto.recompensaQp,
      });

      // La ayuda se consumió en ese intento; el siguiente no la hereda y ya
      // no otorga recompensa (solo la primera aprobación).
      const repetido = await http()
        .post(`/retos/${reto.id}/intentos`)
        .set(auth())
        .send({ respuestas })
        .expect(201);
      expect(repetido.body).toMatchObject({
        aprobado: true,
        usoAyuda: false,
        xpGanado: 0,
        qpGanado: 0,
      });

      const perfil = (await http().get('/auth/perfil').set(auth())).body;
      expect(perfil.xpTotal).toBe(reto.recompensaXp);
      expect(perfil.qpTotal).toBe(reto.recompensaQp);
      expect(perfil).toMatchObject(calcularNivel(reto.recompensaXp));

      // Fase 1 tiene 3 retos reales: aprobar solo el primero la deja
      // en_progreso, NO completada, y la fase 2 sigue bloqueada.
      const despues = (await http().get('/fases').set(auth())).body;
      expect(despues[0]).toMatchObject({
        estado: 'en_progreso',
        totalRetos: 3,
        retosAprobados: 1,
      });
      expect(despues[1].estado).toBe('bloqueada');

      const consultado = await http()
        .get(`/intentos/${aprobado.body.id}`)
        .set(auth())
        .expect(200);
      expect(consultado.body).toMatchObject({
        id: aprobado.body.id,
        faseId: primera.id,
      });
    });

    it('rechaza preguntas que no existen en el reto con 400', async () => {
      const fases = (await http().get('/fases').set(auth())).body;
      await http()
        .post(`/retos/${fases[0].retoId}/intentos`)
        .set(auth())
        .send({ respuestas: [{ preguntaId: 'inventada', respuesta: 'x' }] })
        .expect(400);
    });

    it('responde 404 real para un intento inexistente', () =>
      http().get('/intentos/999999999').set(auth()).expect(404));

    it('la fase solo se marca completada al aprobar TODOS sus retos, y eso desbloquea la siguiente', async () => {
      let fases = (await http().get('/fases').set(auth())).body;
      expect(fases[0]).toMatchObject({
        estado: 'en_progreso',
        retosAprobados: 1,
        totalRetos: 3,
      });
      expect(fases[1].estado).toBe('bloqueada');

      // Aprueba los 2 retos restantes de fase 1 (ya tiene 1 de 3 aprobado).
      await aprobarFaseCompleta(fases[0].id);
      fases = (await http().get('/fases').set(auth())).body;
      expect(fases[0]).toMatchObject({
        estado: 'completada',
        retosAprobados: 3,
        totalRetos: 3,
      });
      expect(fases[1].estado).toBe('desbloqueada');

      // Aprueba los 3 retos de fase 2.
      await aprobarFaseCompleta(fases[1].id);
      fases = (await http().get('/fases').set(auth())).body;
      expect(fases[1]).toMatchObject({
        estado: 'completada',
        retosAprobados: 3,
        totalRetos: 3,
      });
      expect(fases[2].estado).toBe('desbloqueada');
    });

    describe('calificación en estrellas (RN-04/RF-05, RN-05/RF-06) — reto ISO 25010 (fase 3, orden 1)', () => {
      it('menos de 80%: 0 estrellas, no aprobado, no otorga recompensa', async () => {
        const fases = (await http().get('/fases').set(auth())).body;
        const reto = await prisma.reto.findUniqueOrThrow({
          where: { id: fases[2].retoId },
        });
        const clave = parsearClave(reto.contenido);
        // Falla el tradeoff (peso 2 de 5): 3/5 = 60%.
        const res = await http()
          .post(`/retos/${reto.id}/intentos`)
          .set(auth())
          .send({
            respuestas: clave.map((p) => ({
              preguntaId: p.preguntaId,
              respuesta:
                p.preguntaId === 'tradeoff' ? 'incorrecta' : p.correcta,
            })),
          })
          .expect(201);
        expect(res.body).toMatchObject({
          porcentaje: 60,
          calificacionEstrellas: 0,
          aprobado: false,
          xpGanado: 0,
          qpGanado: 0,
        });
      });

      it('aprueba con 1 estrella (80-89%) y luego mejora a 3 sin volver a dar recompensa', async () => {
        const fases = (await http().get('/fases').set(auth())).body;
        const reto = await prisma.reto.findUniqueOrThrow({
          where: { id: fases[2].retoId },
        });
        const clave = parsearClave(reto.contenido);

        // Falla solo req-3 (peso 1 de 5): 4/5 = 80% -> 1 estrella, aprobado,
        // primera aprobación de este reto: sí otorga XP/QP.
        const primerIntento = await http()
          .post(`/retos/${reto.id}/intentos`)
          .set(auth())
          .send({
            respuestas: clave.map((p) => ({
              preguntaId: p.preguntaId,
              respuesta: p.preguntaId === 'req-3' ? 'incorrecta' : p.correcta,
            })),
          })
          .expect(201);
        expect(primerIntento.body).toMatchObject({
          porcentaje: 80,
          calificacionEstrellas: 1,
          aprobado: true,
        });
        expect(primerIntento.body.xpGanado).toBe(reto.recompensaXp);

        // Se repite el mismo reto con 100%: mejora la marca a 3 estrellas,
        // pero ya no otorga XP/QP (ya se había aprobado antes).
        const segundoIntento = await http()
          .post(`/retos/${reto.id}/intentos`)
          .set(auth())
          .send({
            respuestas: clave.map((p) => ({
              preguntaId: p.preguntaId,
              respuesta: p.correcta,
            })),
          })
          .expect(201);
        expect(segundoIntento.body).toMatchObject({
          porcentaje: 100,
          calificacionEstrellas: 3,
          aprobado: true,
          xpGanado: 0,
          qpGanado: 0,
        });

        // La MEJOR MARCA HISTÓRICA del reto es 3 (la del segundo intento), no
        // 1 (la del primero, que fue el que aprobó primero). Fase 3 tiene más
        // retos: como este ya quedó aprobado, "reto actual" de la fase avanzó
        // al siguiente (orden 2), así que la mejor marca ya no se lee en
        // GET /fases (que ahora describe ESE otro reto) sino directamente
        // sobre este reto, igual que la calcula resumirIntentos().
        const mejorMarca = await prisma.intentoReto.aggregate({
          where: { estudianteId, retoId: reto.id },
          _max: { calificacionEstrellas: true, porcentaje: true },
        });
        expect(mejorMarca._max).toEqual({
          calificacionEstrellas: 3,
          porcentaje: 100,
        });
      });

      it('100% usando ayuda se trunca a 2 estrellas', async () => {
        const fases = (await http().get('/fases').set(auth())).body;
        const reto = await prisma.reto.findUniqueOrThrow({
          where: { id: fases[2].retoId },
        });
        const clave = parsearClave(reto.contenido);

        await http().post(`/retos/${reto.id}/ayuda`).set(auth()).expect(201);
        const res = await http()
          .post(`/retos/${reto.id}/intentos`)
          .set(auth())
          .send({
            respuestas: clave.map((p) => ({
              preguntaId: p.preguntaId,
              respuesta: p.correcta,
            })),
          })
          .expect(201);
        expect(res.body).toMatchObject({
          porcentaje: 100,
          calificacionEstrellas: 2,
          aprobado: true,
          usoAyuda: true,
        });
      });
    });

    it('aprobar los 3 retos de fase 3 (ISO ya aprobado + los 2 nuevos) la completa y desbloquea fase 4', async () => {
      let fases = (await http().get('/fases').set(auth())).body;
      expect(fases[2].estado).toBe('en_progreso');
      expect(fases[3].estado).toBe('bloqueada');

      await aprobarFaseCompleta(fases[2].id);

      fases = (await http().get('/fases').set(auth())).body;
      expect(fases[2]).toMatchObject({
        estado: 'completada',
        retosAprobados: 3,
        totalRetos: 3,
      });
      // Fase 4 no tiene retos en el seed: queda "disponible, sin contenido todavía".
      expect(fases[3]).toMatchObject({
        estado: 'desbloqueada',
        totalRetos: 0,
        progreso: null,
      });
    });

    describe('progreso agregado de una fase con varios retos (Fase 3)', () => {
      let faseId: number;
      let retoUnoId: number;
      let retoDosId: number;

      afterAll(async () => {
        for (const id of [retoUnoId, retoDosId]) {
          if (!id) continue;
          await prisma.usoAyuda.deleteMany({ where: { retoId: id } });
          await prisma.intentoReto.deleteMany({ where: { retoId: id } });
          await prisma.reto.delete({ where: { id } });
        }
      });

      beforeAll(async () => {
        // Fase 4 (orden 4) no tiene retos en el seed: se le agregan 2 retos de
        // prueba directamente en la BD (no hay endpoint para crear retos,
        // fuera del alcance de esta fase) para probar la agregación
        // multi-reto sin mezclarla con el contenido curricular real.
        const fases = (await http().get('/fases').set(auth())).body;
        const fase4 = fases.find((f: { orden: number }) => f.orden === 4);
        expect(fase4.estado).toBe('desbloqueada');
        faseId = fase4.id;

        const crear = (orden: number) =>
          prisma.reto.create({
            data: {
              faseId,
              orden,
              modo: 'OPCION_MULTIPLE',
              criteriosAceptacion: `[Fase 3 e2e] reto de prueba ${orden}`,
              calificacionMinima: '0.80',
              contenido: [{ preguntaId: 'unica', correcta: 'si', peso: 1 }],
              recompensaXp: orden === 1 ? 40 : 60,
              recompensaQp: orden === 1 ? 30 : 50,
            },
          });
        retoUnoId = (await crear(1)).id;
        retoDosId = (await crear(2)).id;
      });

      it('aprobar solo 1 de 2 retos deja la fase en_progreso con progreso parcial', async () => {
        await http()
          .post(`/retos/${retoUnoId}/intentos`)
          .set(auth())
          .send({ respuestas: [{ preguntaId: 'unica', respuesta: 'si' }] })
          .expect(201);

        const fases = (await http().get('/fases').set(auth())).body;
        const fase = fases.find((f: { id: number }) => f.id === faseId);
        expect(fase).toMatchObject({
          estado: 'en_progreso',
          totalRetos: 2,
          retosAprobados: 1,
          progreso: 50,
          calificacionEstrellasFase: null,
          recompensaQpFase: null,
        });
      });

      it('al aprobar también el segundo reto, la fase queda completada con estrellas y QP combinados', async () => {
        const res = await http()
          .post(`/retos/${retoDosId}/intentos`)
          .set(auth())
          .send({ respuestas: [{ preguntaId: 'unica', respuesta: 'si' }] })
          .expect(201);
        expect(res.body).toMatchObject({
          porcentaje: 100,
          calificacionEstrellas: 3,
          aprobado: true,
          xpGanado: 60,
          qpGanado: 50,
        });

        const fases = (await http().get('/fases').set(auth())).body;
        const fase = fases.find((f: { id: number }) => f.id === faseId);
        expect(fase).toMatchObject({
          estado: 'completada',
          totalRetos: 2,
          retosAprobados: 2,
          progreso: 100,
          calificacionEstrellasFase: 3, // promedio de la mejor marca de cada reto: (3+3)/2 = 3.
          recompensaQpFase: 80, // suma del QP realmente otorgado por cada reto: 30 + 50.
        });
      });
    });

    describe('flujo secuencial de retos dentro de una fase, sin poder saltarse ninguno (Fase 4)', () => {
      let faseId: number;
      let retoUnoId: number;
      let retoDosId: number;

      afterAll(async () => {
        for (const id of [retoUnoId, retoDosId]) {
          if (!id) continue;
          await prisma.usoAyuda.deleteMany({ where: { retoId: id } });
          await prisma.intentoReto.deleteMany({ where: { retoId: id } });
          await prisma.reto.delete({ where: { id } });
        }
      });

      beforeAll(async () => {
        // El describe anterior deja fase 4 completada y LUEGO borra sus 2
        // retos de prueba en su afterAll: sin retos otra vez, fase 4 vuelve a
        // "desbloqueada" (fase 3 sigue completada), lista para este nuevo
        // escenario de 2 retos secuenciales.
        const fases = (await http().get('/fases').set(auth())).body;
        const fase4 = fases.find((f: { orden: number }) => f.orden === 4);
        expect(fase4.estado).toBe('desbloqueada');
        faseId = fase4.id;

        const crear = (orden: number) =>
          prisma.reto.create({
            data: {
              faseId,
              orden,
              modo: 'OPCION_MULTIPLE',
              criteriosAceptacion: `[Fase 4 e2e] reto ${orden}`,
              calificacionMinima: '0.80',
              contenido: [{ preguntaId: 'unica', correcta: 'si', peso: 1 }],
              recompensaXp: 10,
              recompensaQp: 10,
            },
          });
        retoUnoId = (await crear(1)).id;
        retoDosId = (await crear(2)).id;
      });

      it('GET /fases/:id devuelve el reto 1 (el primero, en orden) como el "reto actual"', async () => {
        const detalle = (await http().get(`/fases/${faseId}`).set(auth())).body;
        expect(detalle.reto).toMatchObject({ id: retoUnoId, orden: 1 });
        expect(detalle.fase.retoId).toBe(retoUnoId);
      });

      it('rechaza con 403 un intento en el reto 2 mientras el reto 1 no está aprobado', () =>
        http()
          .post(`/retos/${retoDosId}/intentos`)
          .set(auth())
          .send({ respuestas: [{ preguntaId: 'unica', respuesta: 'si' }] })
          .expect(403));

      it('rechaza con 403 pedir ayuda para el reto 2 mientras el reto 1 no está aprobado', () =>
        http().post(`/retos/${retoDosId}/ayuda`).set(auth()).expect(403));

      it('al aprobar el reto 1, el reto 2 queda disponible y pasa a ser el "reto actual"', async () => {
        await http()
          .post(`/retos/${retoUnoId}/intentos`)
          .set(auth())
          .send({ respuestas: [{ preguntaId: 'unica', respuesta: 'si' }] })
          .expect(201);

        const detalle = (await http().get(`/fases/${faseId}`).set(auth())).body;
        expect(detalle.reto).toMatchObject({ id: retoDosId, orden: 2 });
        expect(detalle.fase).toMatchObject({
          retoId: retoDosId,
          estado: 'en_progreso',
          totalRetos: 2,
          retosAprobados: 1,
        });

        await http()
          .post(`/retos/${retoDosId}/intentos`)
          .set(auth())
          .send({ respuestas: [{ preguntaId: 'unica', respuesta: 'si' }] })
          .expect(201);
      });

      it('repetir el reto 1 (ya aprobado) sigue permitido: sus predecesores, que no tiene, siempre están al día', () =>
        http()
          .post(`/retos/${retoUnoId}/intentos`)
          .set(auth())
          .send({ respuestas: [{ preguntaId: 'unica', respuesta: 'si' }] })
          .expect(201));

      it('con los dos retos aprobados, la fase queda completada y el "reto actual" es el último', async () => {
        const detalle = (await http().get(`/fases/${faseId}`).set(auth())).body;
        expect(detalle.reto).toMatchObject({ id: retoDosId });
        expect(detalle.fase).toMatchObject({
          estado: 'completada',
          retoId: retoDosId,
          totalRetos: 2,
          retosAprobados: 2,
        });
      });
    });
  });
});
