import { INestApplication } from '@nestjs/common';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { crearApp, http } from './ayudas-e2e';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let token: string;
  let estudianteId: number;

  const sufijo = Date.now();
  const credenciales = {
    email: `e2e_auth_${sufijo}@test.local`,
    password: 'contrasena-e2e',
  };
  const auth = () => ({ Authorization: `Bearer ${token}` });

  beforeAll(async () => {
    ({ app, prisma } = await crearApp());
  });

  afterAll(async () => {
    if (estudianteId) await prisma.estudiante.delete({ where: { id: estudianteId } });
    await app.close();
  });

  it('registra un estudiante y devuelve un token', async () => {
    const res = await http(app)
      .post('/auth/registro')
      .send({ ...credenciales, nombreAventurero: `e2e_auth_${sufijo}` })
      .expect(201);
    expect(res.body.accessToken).toEqual(expect.any(String));
    expect(res.body.estudiante).toMatchObject({
      email: credenciales.email,
      nivel: 1,
      xpTotal: 0,
      qpTotal: 0,
      racha: { diasActuales: 0, multiplicadorQP: 1 },
    });
    expect(res.body.estudiante.passwordHash).toBeUndefined();
    estudianteId = res.body.estudiante.id;
  });

  it('rechaza un email ya registrado con 409', () =>
    http(app)
      .post('/auth/registro')
      .send({ ...credenciales, nombreAventurero: `otro_${sufijo}` })
      .expect(409));

  it('rechaza datos de registro inválidos con 400', () =>
    http(app)
      .post('/auth/registro')
      .send({ email: 'no-es-email', password: 'corta', nombreAventurero: 'x' })
      .expect(400));

  it('rechaza una contraseña incorrecta con 401', () =>
    http(app)
      .post('/auth/login')
      .send({ ...credenciales, password: 'incorrecta-123' })
      .expect(401));

  it('inicia sesión con credenciales válidas', async () => {
    const res = await http(app).post('/auth/login').send(credenciales).expect(200);
    token = res.body.accessToken;
  });

  it('devuelve el perfil con token y 401 sin token', async () => {
    await http(app).get('/auth/perfil').expect(401);
    const res = await http(app).get('/auth/perfil').set(auth()).expect(200);
    expect(res.body.id).toBe(estudianteId);
  });
});
