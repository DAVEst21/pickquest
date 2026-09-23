/**
 * Datos de ejemplo basados en frontend/src/services/mocks/data.ts: las mismas
 * 7 fases, el reto de ejemplo de la fase 3 (ISO 25010 / trade-offs) y un
 * estudiante demo con el mismo estado del mock (fases 1 y 2 completadas,
 * fase 3 en progreso).
 *
 * Es idempotente: se puede ejecutar varias veces sin duplicar datos.
 */
import { Prisma, PrismaClient, TemaFase } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { calcularNivel } from '../src/modules/progreso/nivel';

const prisma = new PrismaClient();

const FASES: {
  orden: number;
  nombre: string;
  tema: TemaFase;
  dificultad: string;
}[] = [
  {
    orden: 1,
    nombre: 'Planificación',
    tema: 'ELICITACION',
    dificultad: 'Básica',
  },
  {
    orden: 2,
    nombre: 'Elicitación Req.',
    tema: 'ELICITACION',
    dificultad: 'Básica',
  },
  {
    orden: 3,
    nombre: 'Calidad & Arquitectura',
    tema: 'ATRIBUTOS_CALIDAD',
    dificultad: 'Intermedia',
  },
  {
    orden: 4,
    nombre: 'Diseño Detallado',
    tema: 'ATRIBUTOS_CALIDAD',
    dificultad: 'Intermedia',
  },
  {
    orden: 5,
    nombre: 'Implementación',
    tema: 'CODIGO_PRUEBAS',
    dificultad: 'Avanzada',
  },
  {
    orden: 6,
    nombre: 'Pruebas & Val.',
    tema: 'CODIGO_PRUEBAS',
    dificultad: 'Avanzada',
  },
  {
    orden: 7,
    nombre: 'Despliegue',
    tema: 'CODIGO_PRUEBAS',
    dificultad: 'Boss Raid',
  },
];

interface RetoSeed {
  ordenFase: number;
  criteriosAceptacion: string;
  calificacionMinima: string;
  claveRespuestas: { preguntaId: string; correcta: string; peso: number }[];
  recompensaXp: number;
  recompensaQp: number;
}

const RETOS: RetoSeed[] = [
  // PLACEHOLDER: el mock no define retos para las fases 1 y 2, pero sin un
  // reto no se pueden completar y el resto del mapa quedaría bloqueado.
  {
    ordenFase: 1,
    criteriosAceptacion:
      '[Reto de ejemplo del seed] Identificar el artefacto de planificación correcto (80% de precisión).',
    calificacionMinima: '0.80',
    claveRespuestas: [
      { preguntaId: 'artefacto', correcta: 'backlog', peso: 1 },
    ],
    recompensaXp: 100,
    recompensaQp: 50,
  },
  {
    ordenFase: 2,
    criteriosAceptacion:
      '[Reto de ejemplo del seed] Distinguir requisitos funcionales de no funcionales (80% de precisión).',
    calificacionMinima: '0.80',
    claveRespuestas: [
      { preguntaId: 'req-1', correcta: 'funcional', peso: 1 },
      { preguntaId: 'req-2', correcta: 'no_funcional', peso: 1 },
    ],
    recompensaXp: 200,
    recompensaQp: 250,
  },
  // Reto 204 del mock (RETO_FASE_3). La clave replica la evaluación del mock en
  // frontend/src/services/api.ts: 3 clasificaciones (peso 1) + trade-off (peso 2).
  // Recompensas tomadas de RETO_FASE_3.recompensas (350 XP / 120 QP).
  {
    ordenFase: 3,
    criteriosAceptacion:
      '80% de precisión en trade-offs arquitectónicos y clasificación ISO 25010',
    calificacionMinima: '0.80',
    claveRespuestas: [
      { preguntaId: 'req-1', correcta: 'seguridad', peso: 1 },
      { preguntaId: 'req-2', correcta: 'desempeno', peso: 1 },
      { preguntaId: 'req-3', correcta: 'usabilidad', peso: 1 },
      { preguntaId: 'tradeoff', correcta: 'A', peso: 2 },
    ],
    recompensaXp: 350,
    recompensaQp: 120,
  },
];

// Texto de la "Guía Técnica ISO/IEC 25010" que muestra RetoPage.
const CONTENIDO_FASE_3 = {
  contenidoTeorico:
    'Los Atributos de Calidad dictan cómo el software satisface las necesidades explícitas e implícitas de las partes interesadas en condiciones operativas reales.\n' +
    'Seguridad (Confidencialidad e Integridad): capacidad de proteger la información contra accesos no autorizados, ataques de alteración y permitir el no repudio.\n' +
    'Eficiencia de Desempeño: comportamiento temporal, uso de recursos y capacidad volumétrica ante escenarios de estrés.',
  ejemplos:
    'Trade-offs clásicos: a mayor complejidad criptográfica en tránsito (mTLS con re-cifrado en capas de aplicación), mayor consumo de ciclos de reloj y latencia terminal. Se mitiga desacoplando la criptografía a nivel de proxy de infraestructura (Sidecars o Hardware Offloading).',
  glosario:
    'mTLS: TLS mutuo, ambos extremos se autentican con certificados.\n' +
    'Sidecar: proxy que se despliega junto a cada servicio y asume funciones transversales como el cifrado.\n' +
    'Hardware Offloading: delegar el trabajo criptográfico a hardware dedicado.',
};

const DEMO = {
  email: 'demo@pickquest.dev',
  password: 'pickquest123',
  nombreAventurero: 'aventurero_demo',
  avatar:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuAkK1BCQ8uGfm-oL05s5RyoOMILULmuhtykUluqRc6SeaYtNxAeZ6CjcKfWiev__MjOaHVUvHYGN6QnGKkuJwCaIA0_4Zihc1pI32IKqSSiN8PajarzaqNy-qacQnYF_ge64QGn508tpjeK3XYAYlMf3tSI053ZuLimtZf9VySuiyaGCZfRw38emwEPMwTRPSH2FtcrGSz93xx1vi4NYNRKYZA0qPEsFmy7oNgFY-G6xbXwSsNt9SLt',
};

async function main() {
  const fasePorOrden = new Map<number, number>();
  for (const fase of FASES) {
    const { id } = await prisma.fase.upsert({
      where: { orden: fase.orden },
      update: {
        nombre: fase.nombre,
        tema: fase.tema,
        dificultad: fase.dificultad,
      },
      create: fase,
    });
    fasePorOrden.set(fase.orden, id);
  }

  const retoPorOrden = new Map<number, number>();
  for (const { ordenFase, ...datos } of RETOS) {
    const faseId = fasePorOrden.get(ordenFase)!;
    const valores = {
      ...datos,
      calificacionMinima: new Prisma.Decimal(datos.calificacionMinima),
    };
    const { id } = await prisma.reto.upsert({
      where: { faseId },
      update: valores,
      create: { ...valores, faseId },
    });
    retoPorOrden.set(ordenFase, id);
  }

  const fase3 = fasePorOrden.get(3)!;
  if ((await prisma.contenidoApoyo.count({ where: { faseId: fase3 } })) === 0) {
    await prisma.contenidoApoyo.create({
      data: { faseId: fase3, ...CONTENIDO_FASE_3 },
    });
  }

  // Estudiante demo con los mismos totales de XP/QP del mock (ESTUDIANTE_MOCK).
  // El nivel se deriva del XP con la curva del backend (750 XP -> nivel 2),
  // no se copia el nivel 5 del mock, que no es coherente con esa curva.
  const demo = await prisma.estudiante.upsert({
    where: { email: DEMO.email },
    update: {},
    create: {
      email: DEMO.email,
      passwordHash: await bcrypt.hash(DEMO.password, 12),
      nombreAventurero: DEMO.nombreAventurero,
      avatar: DEMO.avatar,
      nivel: calcularNivel(750).nivel,
      xpTotal: 750,
      qpTotal: 1420,
      racha: { create: { diasActuales: 4, diasRecord: 4 } },
    },
  });

  if (
    (await prisma.intentoReto.count({ where: { estudianteId: demo.id } })) === 0
  ) {
    await prisma.intentoReto.createMany({
      data: [
        // Fases 1 y 2 completadas con 3 estrellas.
        {
          estudianteId: demo.id,
          retoId: retoPorOrden.get(1)!,
          porcentaje: 100,
          calificacionEstrellas: 3,
          aprobado: true,
        },
        {
          estudianteId: demo.id,
          retoId: retoPorOrden.get(2)!,
          porcentaje: 100,
          calificacionEstrellas: 3,
          aprobado: true,
        },
        // Fase 3 en progreso: un intento fallido (el mock usa 68%, que no es
        // alcanzable con los pesos del reto; 60% es el más cercano).
        {
          estudianteId: demo.id,
          retoId: retoPorOrden.get(3)!,
          porcentaje: 60,
          calificacionEstrellas: 1,
          aprobado: false,
        },
      ],
    });
  }

  const [fases, retos, estudiantes, intentos] = await Promise.all([
    prisma.fase.count(),
    prisma.reto.count(),
    prisma.estudiante.count(),
    prisma.intentoReto.count(),
  ]);
  console.log(
    `Seed listo: ${fases} fases, ${retos} retos, ${estudiantes} estudiantes, ${intentos} intentos. ` +
      `Usuario demo: ${DEMO.email} / ${DEMO.password}`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
