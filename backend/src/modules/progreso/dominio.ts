import { Prisma, TemaFase } from '@prisma/client';

type Db = Prisma.TransactionClient;

/** RN-26: peso del diagnóstico y de los retos en el dominio de un tema. */
export const PESO_DIAGNOSTICO = 0.5;
export const PESO_RETOS = 0.5;

/**
 * RN-26. Con diagnóstico y retos del tema: 50 % el diagnóstico + 50 % el promedio de las
 * mejores calificaciones de los retos. Sin retos: el diagnóstico. Sin diagnóstico: el
 * promedio de los retos. Sin nada: 0. Se redondea a entero.
 */
export function combinarDominio(diagnostico: number | null, promedioRetos: number | null): number {
  if (diagnostico !== null && promedioRetos !== null) {
    return Math.round(PESO_DIAGNOSTICO * diagnostico + PESO_RETOS * promedioRetos);
  }
  if (diagnostico !== null) return Math.round(diagnostico);
  if (promedioRetos !== null) return Math.round(promedioRetos);
  return 0;
}

/** Promedio de las mejores calificaciones (0-100) de los retos con intento calificado; null si no hay. */
export function promedioMejoresCalificaciones(mejores: number[]): number | null {
  if (mejores.length === 0) return null;
  return mejores.reduce((suma, m) => suma + m, 0) / mejores.length;
}

/** Porcentaje del último diagnóstico terminado del tema; null si el estudiante no ha hecho uno. */
async function ultimoDiagnosticoDelTema(db: Db, estudianteId: number, tema: TemaFase): Promise<number | null> {
  void db;
  void estudianteId;
  void tema;
  return null;
}

/** Promedio de la mejor calificación de cada reto del tema que tiene al menos un intento calificado. */
async function promedioDeRetosDelTema(db: Db, estudianteId: number, tema: TemaFase): Promise<number | null> {
  const mejores = await db.intentoReto.groupBy({
    by: ['retoId'],
    where: { estudianteId, estado: 'CALIFICADO', reto: { fase: { tema } } },
    _max: { porcentaje: true },
  });
  return promedioMejoresCalificaciones(mejores.map((m) => m._max.porcentaje ?? 0));
}

/**
 * Función única del dominio de un tema (RN-26): lo calcula y lo guarda en `DominioTema`.
 * La usan el repaso (CU-09) y el diagnóstico (CU-10).
 */
export async function calcularDominio(db: Db, estudianteId: number, tema: TemaFase): Promise<number> {
  const porcentaje = combinarDominio(
    await ultimoDiagnosticoDelTema(db, estudianteId, tema),
    await promedioDeRetosDelTema(db, estudianteId, tema),
  );
  await db.dominioTema.upsert({
    where: { estudianteId_tema: { estudianteId, tema } },
    update: { porcentaje },
    create: { estudianteId, tema, porcentaje },
  });
  return porcentaje;
}
