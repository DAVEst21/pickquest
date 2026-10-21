import { Prisma } from '@prisma/client';

/** Violación de restricción única (por ejemplo, email repetido). */
export function esErrorUnico(
  error: unknown,
): error is Prisma.PrismaClientKnownRequestError {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  );
}

/** Conflicto de escritura en una transacción serializable. */
export function esConflictoTransaccion(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2034'
  );
}
