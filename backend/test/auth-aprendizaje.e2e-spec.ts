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
      expect(aprobado.body).toMatchObject({
        porcentaje: 100,
        calificacionEstrellas: 3,
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
  });
});
