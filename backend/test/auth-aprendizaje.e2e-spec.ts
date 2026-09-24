import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { configurarApp } from '../src/app.setup';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { parsearClave } from '../src/modules/aprendizaje/evaluacion';
import { calcularNivel } from '../src/modules/progreso/nivel';

// Requiere la base de datos migrada y con el seed cargado (al menos una fase
// de orden 1 con reto). El estudiante de prueba se borra al terminar.
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

    it('evalúa en el servidor, calcula usoAyuda e ignora lo que mande el cliente', async () => {
      const fases = (await http().get('/fases').set(auth())).body;
      const primera = fases[0];
      const detalle = (
        await http().get(`/fases/${primera.id}`).set(auth()).expect(200)
      ).body;
      expect(detalle.reto.claveRespuestas).toBeUndefined();

      // Respuestas correctas leídas de la BD (el cliente nunca recibe la clave).
      const reto = await prisma.reto.findUniqueOrThrow({
        where: { id: primera.retoId },
      });
      const respuestas = parsearClave(reto.contenido).map((p) => ({
        preguntaId: p.preguntaId,
        respuesta: p.correcta,
      }));

      // Sin ayuda: aunque el cliente mande usoAyuda/porcentaje, se ignoran.
      const fallido = await http()
        .post(`/retos/${reto.id}/intentos`)
        .set(auth())
        .send({
          respuestas: [
            { preguntaId: respuestas[0].preguntaId, respuesta: 'mal' },
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

      const despues = (await http().get('/fases').set(auth())).body;
      expect(despues[0]).toMatchObject({
        estado: 'completada',
        intentosRealizados: 3,
        mejorPorcentaje: 100,
        mejorCalificacionEstrellas: 3,
      });
      expect(despues[1].estado).toBe('desbloqueada');

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

    describe('calificación en estrellas (RN-04/RF-05, RN-05/RF-06)', () => {
      it('menos de 80%: 0 estrellas, no aprobado, no otorga recompensa', async () => {
        const fases = (await http().get('/fases').set(auth())).body;
        const reto = await prisma.reto.findUniqueOrThrow({
          where: { id: fases[1].retoId },
        });
        const clave = parsearClave(reto.contenido);
        // 1 de 2 preguntas correctas (peso 1 cada una) = 50%.
        const res = await http()
          .post(`/retos/${reto.id}/intentos`)
          .set(auth())
          .send({
            respuestas: [
              { preguntaId: clave[0].preguntaId, respuesta: clave[0].correcta },
              { preguntaId: clave[1].preguntaId, respuesta: 'incorrecta' },
            ],
          })
          .expect(201);
        expect(res.body).toMatchObject({
          porcentaje: 50,
          calificacionEstrellas: 0,
          aprobado: false,
          xpGanado: 0,
          qpGanado: 0,
        });
      });

      it('aprueba con 1 estrella (80-89%) y luego mejora a 3 sin volver a dar recompensa', async () => {
        const fases = (await http().get('/fases').set(auth())).body;
        const reto2 = await prisma.reto.findUniqueOrThrow({
          where: { id: fases[1].retoId },
        });
        const clave2 = parsearClave(reto2.contenido);

        // Fase 2 aprobada al 100% (2 de 2), primera aprobación: sí otorga XP/QP.
        const primeraAprobacion = await http()
          .post(`/retos/${reto2.id}/intentos`)
          .set(auth())
          .send({
            respuestas: clave2.map((p) => ({
              preguntaId: p.preguntaId,
              respuesta: p.correcta,
            })),
          })
          .expect(201);
        expect(primeraAprobacion.body).toMatchObject({
          porcentaje: 100,
          calificacionEstrellas: 3,
          aprobado: true,
        });
        expect(primeraAprobacion.body.xpGanado).toBeGreaterThan(0);

        // Fase 3 (ISO 25010: 4 preguntas, pesos 1,1,1,2 = 5 puntos) ya está
        // desbloqueada. Primer intento: 4/5 puntos = 80% -> 1 estrella, aprobado,
        // primera aprobación de ESTE reto: sí otorga XP/QP.
        const fasesTrasFase2 = (await http().get('/fases').set(auth())).body;
        const reto3 = await prisma.reto.findUniqueOrThrow({
          where: { id: fasesTrasFase2[2].retoId },
        });
        const clave3 = parsearClave(reto3.contenido);
        const correctas3 = Object.fromEntries(
          clave3.map((p) => [p.preguntaId, p.correcta]),
        );
        // tradeoff pesa 2 de los 5 puntos: fallarlo dejamos exactamente 3/5 = 60%,
        // así que en vez fallamos req-3 (peso 1) para quedar en 4/5 = 80%.
        const primerIntentoFase3 = await http()
          .post(`/retos/${reto3.id}/intentos`)
          .set(auth())
          .send({
            respuestas: clave3.map((p) => ({
              preguntaId: p.preguntaId,
              respuesta:
                p.preguntaId === 'req-3'
                  ? 'incorrecta'
                  : correctas3[p.preguntaId],
            })),
          })
          .expect(201);
        expect(primerIntentoFase3.body).toMatchObject({
          porcentaje: 80,
          calificacionEstrellas: 1,
          aprobado: true,
        });
        expect(primerIntentoFase3.body.xpGanado).toBe(reto3.recompensaXp);

        // Se repite el mismo reto con 100%: mejora la marca a 3 estrellas, pero
        // ya no otorga XP/QP (ya se había aprobado antes).
        const segundoIntentoFase3 = await http()
          .post(`/retos/${reto3.id}/intentos`)
          .set(auth())
          .send({
            respuestas: clave3.map((p) => ({
              preguntaId: p.preguntaId,
              respuesta: correctas3[p.preguntaId],
            })),
          })
          .expect(201);
        expect(segundoIntentoFase3.body).toMatchObject({
          porcentaje: 100,
          calificacionEstrellas: 3,
          aprobado: true,
          xpGanado: 0,
          qpGanado: 0,
        });

        // La MEJOR MARCA HISTÓRICA reportada por /fases es 3 (la del segundo
        // intento), no 1 (la del primero, que fue el que aprobó primero).
        const fasesFinal = (await http().get('/fases').set(auth())).body;
        expect(fasesFinal[2]).toMatchObject({
          estado: 'completada',
          mejorCalificacionEstrellas: 3,
          mejorPorcentaje: 100,
        });
      });

      it('100% usando ayuda se trunca a 2 estrellas', async () => {
        const fases = (await http().get('/fases').set(auth())).body;
        const reto3 = await prisma.reto.findUniqueOrThrow({
          where: { id: fases[2].retoId },
        });
        const clave3 = parsearClave(reto3.contenido);

        await http().post(`/retos/${reto3.id}/ayuda`).set(auth()).expect(201);
        const res = await http()
          .post(`/retos/${reto3.id}/intentos`)
          .set(auth())
          .send({
            respuestas: clave3.map((p) => ({
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

    describe('progreso agregado de una fase con varios retos (Fase 3)', () => {
      let faseId: number;
      let retoOriginalId: number;
      let retoNuevoId: number;

      afterAll(async () => {
        // El reto creado para esta prueba no pertenece al estudiante de
        // prueba (Reto no tiene dueño): si no se borra, queda para siempre
        // como un segundo reto de la fase 2 para todos los estudiantes,
        // incluido el demo.
        if (retoNuevoId) {
          await prisma.usoAyuda.deleteMany({ where: { retoId: retoNuevoId } });
          await prisma.intentoReto.deleteMany({
            where: { retoId: retoNuevoId },
          });
          await prisma.reto.delete({ where: { id: retoNuevoId } });
        }
      });

      beforeAll(async () => {
        // fases[1] (orden 2) ya está completada (100%, 3 estrellas, un solo
        // reto) por la prueba de "mejora de marca" de más arriba. Se le
        // agrega un SEGUNDO reto directamente en la BD: no hay endpoint para
        // crear retos (fuera del alcance de esta fase), y es la forma más
        // directa de probar la agregación multi-reto sin depender del seed.
        const fases = (await http().get('/fases').set(auth())).body;
        faseId = fases[1].id;
        retoOriginalId = fases[1].retoId;
        const nuevo = await prisma.reto.create({
          data: {
            faseId,
            orden: 2,
            modo: 'OPCION_MULTIPLE',
            criteriosAceptacion: '[Fase 3 e2e] segundo reto de la fase',
            calificacionMinima: '0.80',
            contenido: [{ preguntaId: 'unica', correcta: 'si', peso: 1 }],
            recompensaXp: 40,
            recompensaQp: 30,
          },
        });
        retoNuevoId = nuevo.id;
      });

      it('agregar un segundo reto sin aprobar baja la fase de completada a en_progreso', async () => {
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

      it('al aprobar también el segundo reto, la fase vuelve a completada con estrellas y QP combinados', async () => {
        const res = await http()
          .post(`/retos/${retoNuevoId}/intentos`)
          .set(auth())
          .send({ respuestas: [{ preguntaId: 'unica', respuesta: 'si' }] })
          .expect(201);
        expect(res.body).toMatchObject({
          porcentaje: 100,
          calificacionEstrellas: 3,
          aprobado: true,
          xpGanado: 40,
          qpGanado: 30,
        });

        const retoOriginal = await prisma.reto.findUniqueOrThrow({
          where: { id: retoOriginalId },
        });
        const fases = (await http().get('/fases').set(auth())).body;
        const fase = fases.find((f: { id: number }) => f.id === faseId);
        expect(fase).toMatchObject({
          estado: 'completada',
          totalRetos: 2,
          retosAprobados: 2,
          progreso: 100,
          // promedio de la mejor marca de cada reto: (3 del original + 3 del nuevo) / 2 = 3.
          calificacionEstrellasFase: 3,
          // suma del QP realmente otorgado por cada reto: reto original + reto nuevo.
          recompensaQpFase: retoOriginal.recompensaQp + 30,
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
        // A esta altura el estudiante de prueba ya completó las fases 1-3
        // (pruebas anteriores), así que la fase 4 (orden 4, sin retos en el
        // seed) está desbloqueada. Se le agregan 2 retos de prueba en orden.
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
