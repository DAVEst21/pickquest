import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { configurarApp } from '../src/app.setup';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { ProgresoService } from '../src/modules/progreso/progreso.service';

// Fixtures exclusivos de pruebas; no se agregan al seed ni al catálogo real.
describe('CU-03 progreso (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let token: string;
  let id: number;
  let otroId: number;
  let faseId: number;
  let retoId: number;
  let logroId: number;
  const sufijo = Date.now();
  const get = () =>
    request(app.getHttpServer())
      .get('/progreso')
      .auth(token, { type: 'bearer' });

  beforeAll(async () => {
    const modulo = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = modulo.createNestApplication();
    configurarApp(app);
    await app.init();
    prisma = app.get(PrismaService);
    const res = await request(app.getHttpServer())
      .post('/auth/registro')
      .send({
        email: `progreso_${sufijo}@test.local`,
        password: 'prueba-segura',
        nombreAventurero: `progreso_${sufijo}`,
      })
      .expect(201);
    token = res.body.accessToken;
    id = res.body.estudiante.id;
  });
  afterAll(async () => {
    jest.restoreAllMocks();
    if (id) await prisma.estudiante.delete({ where: { id } });
    if (otroId) await prisma.estudiante.delete({ where: { id: otroId } });
    if (logroId) await prisma.logro.delete({ where: { id: logroId } });
    if (retoId) await prisma.reto.delete({ where: { id: retoId } });
    if (faseId) await prisma.fase.delete({ where: { id: faseId } });
    await app.close();
  });
  it('exige sesión', () =>
    request(app.getHttpServer()).get('/progreso').expect(401));
  it('distingue ausencia de historial de definiciones pendientes', async () => {
    const { body } = await get().expect(200);
    expect(body).toMatchObject({
      sinHistorial: true,
      nivel: 1,
      xpTotal: 0,
      qpTotal: 0,
      promedioEstrellas: null,
      precision: null,
      tiempoPromedioSegundos: null,
    });
    expect(body.habilidades).toHaveLength(7);
    expect(
      body.habilidades.every(
        (h) => h.nivel === null && h.dominio === null && h.fases.length === 0,
      ),
    ).toBe(true);
    expect(body.racha).toEqual({
      diasActuales: null,
      diasRecord: null,
      multiplicadorQP: null,
      zonaHoraria: null,
    });
  });
  it('consulta datos propios, relaciones explícitas y logros sin otorgar nada', async () => {
    const fase = await prisma.fase.create({
      data: {
        nombre: `Prueba ${sufijo}`,
        orden: 1000000 + (sufijo % 1000000),
        tema: 'ELICITACION',
        dificultad: 'Prueba',
        habilidades: {
          create: [{ categoria: 'DISENO' }, { categoria: 'TESTING' }],
        },
      },
    });
    faseId = fase.id;
    const reto = await prisma.reto.create({
      data: {
        faseId,
        orden: 1,
        modo: 'OPCION_MULTIPLE',
        contenido: [],
        calificacionMinima: '0.80',
      },
    });
    retoId = reto.id;
    await prisma.intentoReto.createMany({
      data: [
        {
          estudianteId: id,
          retoId,
          respuesta: {},
          porcentaje: 40,
          calificacionEstrellas: 0,
        },
        {
          estudianteId: id,
          retoId,
          respuesta: {},
          porcentaje: 80,
          calificacionEstrellas: 2,
          aprobado: true,
        },
        {
          estudianteId: id,
          retoId,
          respuesta: {},
          porcentaje: 100,
          calificacionEstrellas: 3,
          aprobado: true,
        },
      ],
    });
    await prisma.estudiante.update({
      where: { id },
      data: {
        xpTotal: 750,
        qpTotal: 30,
        nivel: 99,
        habilidades: { create: { categoria: 'DISENO', nivelAlcanzado: 2 } },
      },
    });
    const otro = await prisma.estudiante.create({
      data: {
        email: `otro_${sufijo}@test.local`,
        passwordHash: 'no-utilizable',
        nombreAventurero: `otro_${sufijo}`,
        avatar: '',
        intentos: {
          create: {
            retoId,
            respuesta: {},
            porcentaje: 10,
            calificacionEstrellas: 0,
          },
        },
      },
    });
    otroId = otro.id;
    const logro = await prisma.logro.create({
      data: {
        nombre: `Trofeo prueba ${sufijo}`,
        condicionDesbloqueo: 'Condición de prueba',
        rareza: 'PLATA',
        estudiantes: { create: { estudianteId: id } },
      },
    });
    logroId = logro.id;
    const antes = await prisma.estudiante.findUnique({
      where: { id },
      include: { racha: true, intentos: true, logros: true },
    });
    const { body } = await get().expect(200);
    expect(body).toMatchObject({
      sinHistorial: false,
      nivel: 2,
      xpTotal: 750,
      qpTotal: 30,
      fasesCompletadas: 1,
      promedioEstrellas: 3,
    });
    expect(
      body.habilidades.find((h) => h.categoria === 'DISENO'),
    ).toMatchObject({
      nivel: 2,
      dominio: null,
      fases: [{ id: faseId, nombre: fase.nombre, dominio: null }],
    });
    expect(
      body.habilidades.find((h) => h.categoria === 'TESTING').fases,
    ).toHaveLength(1);
    expect(body.logros).toEqual([
      expect.objectContaining({
        id: logroId,
        descripcion: 'Condición de prueba',
        rareza: 'PLATA',
      }),
    ]);
    const repetido = await get().expect(200);
    expect(repetido.body).toEqual(body);
    const despues = await prisma.estudiante.findUnique({
      where: { id },
      include: { racha: true, intentos: true, logros: true },
    });
    expect(despues).toEqual(antes);
  });
  it('permite reintentar tras una falla sin modificar el progreso', async () => {
    const antes = (await get().expect(200)).body;
    jest
      .spyOn(app.get(ProgresoService), 'consultar')
      .mockRejectedValueOnce(new Error('Falla de prueba'));
    await get().expect(500);
    expect((await get().expect(200)).body).toEqual(antes);
  });
});
