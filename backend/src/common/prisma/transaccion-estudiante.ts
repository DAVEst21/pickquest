import { ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { esConflictoTransaccion } from './prisma-errores';
import { PrismaService } from './prisma.service';

/**
 * Transacción atómica (RNF-RE-04) que serializa las escrituras de UN estudiante:
 * bloquea su fila (`FOR UPDATE`) antes de ejecutar el trabajo, así dos
 * operaciones simultáneas del mismo estudiante (comprar, pagar un reto diario,
 * terminar un duelo) se ejecutan una tras otra y nunca cobran ni otorgan dos
 * veces, sin generar conflictos entre estudiantes distintos.
 *
 * Ante un conflicto transitorio (p. ej. un deadlock) reintenta una vez y luego
 * responde 409.
 */
export async function transaccionDeEstudiante<T>(
  prisma: PrismaService,
  estudianteId: number,
  trabajo: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  const opciones = { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted };
  for (let intento = 1; ; intento++) {
    try {
      return await prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM estudiante WHERE id = ${estudianteId} FOR UPDATE`;
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
