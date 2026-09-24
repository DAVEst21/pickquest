/**
 * Datos de ejemplo basados en frontend/src/services/mocks/data.ts: las mismas
 * 7 fases, el reto de ejemplo de la fase 3 (ISO 25010 / trade-offs) y un
 * estudiante demo con el mismo estado del mock (fases 1 y 2 completadas,
 * fase 3 en progreso).
 *
 * Es idempotente: se puede ejecutar varias veces sin duplicar datos.
 */
import { ModoRespuesta, Prisma, PrismaClient, TemaFase, TipoObjeto } from '@prisma/client';
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
  orden: number;
  modo: ModoRespuesta;
  criteriosAceptacion: string;
  calificacionMinima: string;
  contenido: {
    enunciado?: string;
    claveRespuestas: { preguntaId: string; correcta: string; peso: number }[];
  };
  recompensaXp: number;
  recompensaQp: number;
}

const RETOS: RetoSeed[] = [
  {
    ordenFase: 1,
    orden: 1,
    modo: 'OPCION_MULTIPLE',
    criteriosAceptacion:
      '[Reto de ejemplo del seed] Identificar el artefacto de planificación correcto (80% de precisión).',
    calificacionMinima: '80.00',
    contenido: {
      enunciado: 'Selecciona el artefacto principal de planificación en Scrum.',
      claveRespuestas: [
        { preguntaId: 'artefacto', correcta: 'backlog', peso: 1 },
      ],
    },
    recompensaXp: 100,
    recompensaQp: 50,
  },
  {
    ordenFase: 2,
    orden: 1,
    modo: 'DRAG_AND_DROP',
    criteriosAceptacion:
      '[Reto de ejemplo del seed] Distinguir requisitos funcionales de no funcionales (80% de precisión).',
    calificacionMinima: '80.00',
    contenido: {
      enunciado: 'Clasifica los siguientes requisitos según su categoría.',
      claveRespuestas: [
        { preguntaId: 'req-1', correcta: 'funcional', peso: 1 },
        { preguntaId: 'req-2', correcta: 'no_funcional', peso: 1 },
      ],
    },
    recompensaXp: 200,
    recompensaQp: 250,
  },
  {
    ordenFase: 3,
    orden: 1,
    modo: 'COMPUESTO',
    criteriosAceptacion:
      '80% de precisión en trade-offs arquitectónicos y clasificación ISO 25010',
    calificacionMinima: '80.00',
    contenido: {
      enunciado: 'Evalúa los atributos de calidad ISO 25010 y analiza los trade-offs de arquitectura.',
      claveRespuestas: [
        { preguntaId: 'req-1', correcta: 'seguridad', peso: 1 },
        { preguntaId: 'req-2', correcta: 'desempeno', peso: 1 },
        { preguntaId: 'req-3', correcta: 'usabilidad', peso: 1 },
        { preguntaId: 'tradeoff', correcta: 'A', peso: 2 },
      ],
    },
    recompensaXp: 350,
    recompensaQp: 120,
  },
];

const OBJETOS_SEED = [
  {
    nombre: 'Poción de Sabiduría',
    tipo: 'POCION' as TipoObjeto,
    costoQP: 50,
    efecto: 'Revela una pista contextual sobre los requisitos del reto.',
    rareza: 'Común',
  },
  {
    nombre: 'Pergamino de Claridad',
    tipo: 'PERGAMINO' as TipoObjeto,
    costoQP: 100,
    efecto: 'Descarta una opción de respuesta incorrecta.',
    rareza: 'Rara',
  },
  {
    nombre: 'Reliquia del Arquitecto',
    tipo: 'RELIQUIA' as TipoObjeto,
    costoQP: 300,
    efecto: 'Otorga un 50% extra de XP en el reto actual.',
    rareza: 'Épica',
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

  // Seed de Objetos
  const objetosPorNombre = new Map<string, number>();
  for (const obj of OBJETOS_SEED) {
    const registro = await prisma.objeto.upsert({
      where: { nombre: obj.nombre },
      update: {
        tipo: obj.tipo,
        costoQP: obj.costoQP,
        efecto: obj.efecto,
        rareza: obj.rareza,
      },
      create: obj,
    });
    objetosPorNombre.set(obj.nombre, registro.id);
  }

  const retoPorOrdenFase = new Map<number, number>();
  for (const { ordenFase, orden, modo, contenido, ...datos } of RETOS) {
    const faseId = fasePorOrden.get(ordenFase)!;
    const valores = {
      ...datos,
      orden,
      modo,
      contenido,
      calificacionMinima: new Prisma.Decimal(datos.calificacionMinima),
    };
    const existente = await prisma.reto.findFirst({
      where: { faseId, orden },
    });
    let retoId: number;
    if (existente) {
      const actualizado = await prisma.reto.update({
        where: { id: existente.id },
        data: valores,
      });
      retoId = actualizado.id;
    } else {
      const creado = await prisma.reto.create({
        data: { ...valores, faseId },
      });
      retoId = creado.id;
    }
    retoPorOrdenFase.set(ordenFase, retoId);
  }

  const fase3 = fasePorOrden.get(3)!;
  await prisma.contenidoApoyo.upsert({
    where: { faseId: fase3 },
    update: CONTENIDO_FASE_3,
    create: { faseId: fase3, ...CONTENIDO_FASE_3 },
  });

  // Estudiante demo con los mismos totales de XP/QP del mock (ESTUDIANTE_MOCK).
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
      racha: { create: { diasActuales: 4, diasRecord: 4, multiplicadorQP: 1.0 } },
    },
  });

  // Asignar poción al inventario del demo si no la tiene
  const pocionId = objetosPorNombre.get('Poción de Sabiduría');
  if (pocionId) {
    await prisma.inventarioObjeto.upsert({
      where: {
        estudianteId_objetoId: {
          estudianteId: demo.id,
          objetoId: pocionId,
        },
      },
      update: {},
      create: {
        estudianteId: demo.id,
        objetoId: pocionId,
        cantidad: 3,
        equipado: true,
      },
    });
  }

  if (
    (await prisma.intentoReto.count({ where: { estudianteId: demo.id } })) === 0
  ) {
    await prisma.intentoReto.createMany({
      data: [
        // Fases 1 y 2 completadas con 3 estrellas.
        {
          estudianteId: demo.id,
          retoId: retoPorOrdenFase.get(1)!,
          respuesta: [{ preguntaId: 'artefacto', respuesta: 'backlog' }],
          porcentaje: 100,
          calificacionEstrellas: 3.0,
          aprobado: true,
        },
        {
          estudianteId: demo.id,
          retoId: retoPorOrdenFase.get(2)!,
          respuesta: [
            { preguntaId: 'req-1', respuesta: 'funcional' },
            { preguntaId: 'req-2', respuesta: 'no_funcional' },
          ],
          porcentaje: 100,
          calificacionEstrellas: 3.0,
          aprobado: true,
        },
        // Fase 3 en progreso: un intento fallido (60%).
        {
          estudianteId: demo.id,
          retoId: retoPorOrdenFase.get(3)!,
          respuesta: [
            { preguntaId: 'req-1', respuesta: 'seguridad' },
            { preguntaId: 'tradeoff', respuesta: 'B' },
          ],
          porcentaje: 60,
          calificacionEstrellas: 1.0,
          aprobado: false,
        },
      ],
    });
  }

  const [fases, retos, objetos, estudiantes, intentos] = await Promise.all([
    prisma.fase.count(),
    prisma.reto.count(),
    prisma.objeto.count(),
    prisma.estudiante.count(),
    prisma.intentoReto.count(),
  ]);
  console.log(
    `Seed listo: ${fases} fases, ${retos} retos, ${objetos} objetos, ${estudiantes} estudiantes, ${intentos} intentos. ` +
      `Usuario demo: ${DEMO.email} / ${DEMO.password}`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
