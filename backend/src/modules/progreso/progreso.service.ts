import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { aplicarMultiplicador, MULTIPLICADOR_POR_DEFECTO } from './multiplicador';
import { calcularNivel } from './nivel';
import { leerRachaVigente } from './racha';

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
  /**
   * Multiplicador de QP vigente (RN-13). Aplica el reinicio perezoso de la racha: si pasó un día
   * calendario sin lograr el reto diario, vale 1.00 y así se guarda.
   */
  async multiplicadorVigente(db: Db, estudianteId: number): Promise<number> {
    const racha = await leerRachaVigente(db, estudianteId);
    return racha.multiplicador ?? MULTIPLICADOR_POR_DEFECTO;
  }

  /** QP que se mostrarán y otorgarán por un reto (RN-02: ambos coinciden). */
  qpConMultiplicador(qpBase: number, multiplicador: number): number {
    return aplicarMultiplicador(qpBase, multiplicador);
  }

  /**
   * Suma XP y QP (ya multiplicados) al estudiante y actualiza su nivel. Con `multiplicadorFijo` se
   * usa ese multiplicador en vez del vigente (el reto diario cobra el que tenía al iniciar, RN-29).
   */
  async otorgarRecompensa(
    db: Db,
    estudianteId: number,
    xp: number,
    qpBase: number,
    multiplicadorFijo?: number,
  ): Promise<RecompensaOtorgada> {
    const multiplicador = multiplicadorFijo ?? (await this.multiplicadorVigente(db, estudianteId));
    const qp = aplicarMultiplicador(qpBase, multiplicador);
    const estudiante = await db.estudiante.update({
      where: { id: estudianteId },
      data: {
        xpTotal: { increment: xp },
        qpTotal: { increment: qp },
        // RN-30: desempate de la clasificación por quien alcanzó primero esa XP.
        ...(xp > 0 ? { xpAlcanzadaEn: new Date() } : {}),
      },
      select: { xpTotal: true, nivel: true },
    });
    const { nivel } = calcularNivel(estudiante.xpTotal);
    if (nivel !== estudiante.nivel) {
      await db.estudiante.update({ where: { id: estudianteId }, data: { nivel } });
    }
    return { xp, qp, multiplicador, nivel };
  }
}
