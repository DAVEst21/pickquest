import { ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { esConflictoTransaccion } from './prisma-errores';
import { PrismaService } from './prisma.service';

/**
 * Transacción atómica de un duelo (RNF-RE-04). Un duelo involucra a dos estudiantes, así que el orden
 * de los bloqueos es siempre el mismo para evitar interbloqueos: primero la fila del duelo (si existe)
 * y después las filas de los dos estudiantes, de menor a mayor id.
 *
 * Con el duelo bloqueado, dos rondas que terminan al mismo tiempo se ejecutan una tras otra y la
 * segunda ve el resultado de la primera: el duelo se cierra exactamente una vez.
 */
export async function transaccionDeDuelo<T>(
  prisma: PrismaService,
  dueloId: number | null,
  estudianteIds: [number, number],
  trabajo: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  const opciones = { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted };
  const [menor, mayor] = [...estudianteIds].sort((a, b) => a - b);
  for (let intento = 1; ; intento++) {
    try {
      return await prisma.$transaction(async (tx) => {
        if (dueloId !== null) await tx.$queryRaw`SELECT id FROM duelo WHERE id = ${dueloId} FOR UPDATE`;
        await tx.$queryRaw`SELECT id FROM estudiante WHERE id IN (${menor}, ${mayor}) ORDER BY id FOR UPDATE`;
        return trabajo(tx);
      }, opciones);
    } catch (error) {
      if (!esConflictoTransaccion(error)) throw error;
      if (intento >= 2) {
        throw new ConflictException('Se procesó otra operación al mismo tiempo; vuelve a intentarlo');
      }
    }
  }
}
