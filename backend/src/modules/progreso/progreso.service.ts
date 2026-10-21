import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { aplicarMultiplicador, MULTIPLICADOR_POR_DEFECTO } from './multiplicador';
import { calcularNivel } from './nivel';

type Db = Prisma.TransactionClient;

export interface RecompensaOtorgada {
  xp: number;
  /** QP ya multiplicados (RN-13). */
  qp: number;
  multiplicador: number;
  nivel: number;
}

/**
 * Módulo de progreso (RNF-MA-01): único lugar que escribe XP, QP y nivel del
 * estudiante. `aprendizaje` lo usa; no escribe en estas tablas directamente.
 */
@Injectable()
export class ProgresoService {
  /** Multiplicador de QP vigente (RN-13); 1.00 si el estudiante no tiene racha. */
  async multiplicadorVigente(db: Db, estudianteId: number): Promise<number> {
    const racha = await db.rachaEstudio.findUnique({
      where: { estudianteId },
      select: { multiplicadorQP: true },
    });
    return racha ? Number(racha.multiplicadorQP) : MULTIPLICADOR_POR_DEFECTO;
  }

  /** QP que se mostrarán y otorgarán por un reto (RN-02: ambos coinciden). */
  qpConMultiplicador(qpBase: number, multiplicador: number): number {
    return aplicarMultiplicador(qpBase, multiplicador);
  }

  /** Suma XP y QP (ya multiplicados) al estudiante y actualiza su nivel. */
  async otorgarRecompensa(
    db: Db,
    estudianteId: number,
    xp: number,
    qpBase: number,
  ): Promise<RecompensaOtorgada> {
    const multiplicador = await this.multiplicadorVigente(db, estudianteId);
    const qp = aplicarMultiplicador(qpBase, multiplicador);
    const estudiante = await db.estudiante.update({
      where: { id: estudianteId },
      data: { xpTotal: { increment: xp }, qpTotal: { increment: qp } },
      select: { xpTotal: true, nivel: true },
    });
    const { nivel } = calcularNivel(estudiante.xpTotal);
    if (nivel !== estudiante.nivel) {
      await db.estudiante.update({ where: { id: estudianteId }, data: { nivel } });
    }
    return { xp, qp, multiplicador, nivel };
  }
}
