import { Prisma } from '@prisma/client';
import { dateADia, diaADate, diaAnterior, diaCalendarioMx } from '../../common/fechas/dia-calendario';
import { PrismaService } from '../../common/prisma/prisma.service';

type Db = Prisma.TransactionClient | PrismaService;

/**
 * Racha y multiplicador de QP (RN-13).
 *
 * La racha aumenta en 1 cuando el estudiante obtiene al menos 50 % en el reto diario de un día
 * consecutivo, y vuelve a 0 si pasa un día calendario sin lograrlo. El multiplicador de QP es
 * 1 + 0.1 por cada día de racha, con un máximo de 2.0.
 */
export const PORCENTAJE_MINIMO_RACHA = 50;
export const PREGUNTAS_RETO_DIARIO = 10;
export const MULTIPLICADOR_MAXIMO = 2;
const INCREMENTO_POR_DIA = 0.1;

export interface EstadoRacha {
  dias: number;
  record: number;
  /** Último día calendario MX en que se logró el 50 % del reto diario (columna `ultimaActividad`). */
  ultimoDiaLogrado: string | null;
}

/** Multiplicador de QP para unos días de racha: 1 + 0.1 × días, máximo 2.0, con dos decimales. */
export function multiplicadorPorRacha(dias: number): number {
  return Math.min(MULTIPLICADOR_MAXIMO, Math.round((1 + INCREMENTO_POR_DIA * Math.max(0, dias)) * 100) / 100);
}

/**
 * Reinicio perezoso: si el último día logrado es anterior a ayer, ya pasó un día calendario sin
 * lograrlo y la racha vale 0 (el multiplicador, 1.0). Se conserva el récord.
 */
export function rachaVigente(racha: EstadoRacha, hoy: string): EstadoRacha {
  if (racha.ultimoDiaLogrado === null || racha.ultimoDiaLogrado < diaAnterior(hoy)) {
    return { ...racha, dias: 0 };
  }
  return racha;
}

/** ¿El puntaje del reto diario (aciertos ÷ 10) alcanza el 50 % que exige la racha? */
export function alcanzaRacha(aciertos: number, total = PREGUNTAS_RETO_DIARIO): boolean {
  return (aciertos / total) * 100 >= PORCENTAJE_MINIMO_RACHA;
}

/**
 * Racha después de terminar el reto diario del día `diaDelReto` (el día del propio reto, aunque
 * se cierre después): con ≥ 50 %, `dias = (ultimoDiaLogrado == ayer) ? dias + 1 : 1`; con menos,
 * la racha no aumenta.
 */
export function rachaTrasRetoDiario(racha: EstadoRacha, diaDelReto: string, aciertos: number): EstadoRacha {
  const base = rachaVigente(racha, diaDelReto);
  if (!alcanzaRacha(aciertos) || base.ultimoDiaLogrado === diaDelReto) return base;
  const dias = base.ultimoDiaLogrado === diaAnterior(diaDelReto) ? base.dias + 1 : 1;
  return { dias, record: Math.max(base.record, dias), ultimoDiaLogrado: diaDelReto };
}

/** XP y QP del reto diario (RN-29): 2 XP y 5 QP por acierto; los QP se multiplican por la racha. */
export const XP_POR_ACIERTO_DIARIO = 2;
export const QP_POR_ACIERTO_DIARIO = 5;

export function recompensaRetoDiario(aciertos: number, multiplicador: number): { xp: number; qpBase: number; qp: number } {
  const qpBase = QP_POR_ACIERTO_DIARIO * aciertos;
  return { xp: XP_POR_ACIERTO_DIARIO * aciertos, qpBase, qp: Math.round(qpBase * multiplicador) };
}

// ---------------------------------------------------------------------

export interface RachaLeida extends EstadoRacha {
  multiplicador: number;
}

/**
 * Lee la racha del estudiante aplicando el reinicio perezoso: si caducó, la guarda en 0 y 1.0.
 * Se usa en toda lectura de la racha (perfil, reto diario, recompensas de los retos).
 */
export async function leerRachaVigente(db: Db, estudianteId: number, hoy = diaCalendarioMx()): Promise<RachaLeida> {
  const fila = await db.rachaEstudio.upsert({ where: { estudianteId }, update: {}, create: { estudianteId } });
  const actual: EstadoRacha = {
    dias: fila.diasActuales,
    record: fila.diasRecord,
    ultimoDiaLogrado: fila.ultimaActividad ? dateADia(fila.ultimaActividad) : null,
  };
  const vigente = rachaVigente(actual, hoy);
  const multiplicador = multiplicadorPorRacha(vigente.dias);
  if (vigente.dias !== actual.dias || Number(fila.multiplicadorQP) !== multiplicador) {
    await db.rachaEstudio.update({
      where: { estudianteId },
      data: { diasActuales: vigente.dias, multiplicadorQP: multiplicador },
    });
  }
  return { ...vigente, multiplicador };
}

/** Guarda la racha tras terminar un reto diario. */
export async function guardarRacha(db: Db, estudianteId: number, racha: EstadoRacha): Promise<number> {
  const multiplicador = multiplicadorPorRacha(racha.dias);
  await db.rachaEstudio.upsert({
    where: { estudianteId },
    update: {
      diasActuales: racha.dias,
      diasRecord: racha.record,
      multiplicadorQP: multiplicador,
      ultimaActividad: racha.ultimoDiaLogrado ? diaADate(racha.ultimoDiaLogrado) : null,
    },
    create: {
      estudianteId,
      diasActuales: racha.dias,
      diasRecord: racha.record,
      multiplicadorQP: multiplicador,
      ultimaActividad: racha.ultimoDiaLogrado ? diaADate(racha.ultimoDiaLogrado) : null,
    },
  });
  return multiplicador;
}
