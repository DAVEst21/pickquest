import { INestApplication } from '@nestjs/common';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { EstudiantePrueba, jugarReto, retosEnOrden } from './ayudas-e2e';

/** Utilidades de las pruebas e2e del Sprint 3 (se suman a las del Sprint 2 en ayudas-e2e.ts). */

/** Reto del seed por su mecánica. */
export async function retoPorMecanica(prisma: PrismaService, mecanica: string) {
  return prisma.reto.findFirstOrThrow({ where: { mecanica: mecanica as never }, include: { fase: true } });
}

/** Aprueba, en orden y al 100 %, todos los retos que van antes de `retoId`. */
export async function aprobarAnteriores(
  app: INestApplication,
  prisma: PrismaService,
  e: EstudiantePrueba,
  retoId: number,
) {
  for (const reto of await retosEnOrden(prisma)) {
    if (reto.id === retoId) break;
    await jugarReto(app, prisma, e, reto.id);
  }
}

/** Deja `cantidad` unidades de un objeto en el inventario del estudiante. */
export async function darObjeto(
  prisma: PrismaService,
  estudianteId: number,
  nombreObjeto: string,
  cantidad = 3,
  equipado = true,
) {
  const objeto = await prisma.objeto.findUniqueOrThrow({ where: { nombre: nombreObjeto } });
  await prisma.inventarioObjeto.upsert({
    where: { estudianteId_objetoId: { estudianteId, objetoId: objeto.id } },
    update: { cantidad, equipado },
    create: { estudianteId, objetoId: objeto.id, cantidad, equipado },
  });
  return objeto;
}
