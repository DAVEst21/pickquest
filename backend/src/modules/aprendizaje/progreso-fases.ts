import { Prisma } from '@prisma/client';
import {
  calcularEstadosFases,
  EstadoFase,
  ResumenReto,
  resumirIntentos,
} from './estado-fases';
import { Db } from './mecanicas/tipos';

export const SELECCION_FASE = {
  id: true,
  nombre: true,
  tema: true,
  dificultad: true,
  orden: true,
  descripcion: true,
  retos: { select: { id: true, orden: true, mecanica: true }, orderBy: { orden: 'asc' } },
} satisfies Prisma.FaseSelect;

export type FaseSeleccionada = Prisma.FaseGetPayload<{ select: typeof SELECCION_FASE }>;

export interface ProgresoEstudiante {
  fases: FaseSeleccionada[];
  estados: Map<number, EstadoFase>;
  resumen: Map<number, ResumenReto>;
}

/**
 * Fases del estudiante con su estado (RN-01) y el resumen de sus retos. Función única
 * que comparten el mapa, el estudio (CU-09), el plan (CU-10), el reto diario (CU-11)
 * y los duelos (CU-13) para decidir qué fases están desbloqueadas.
 */
export async function cargarProgresoFases(db: Db, estudianteId: number): Promise<ProgresoEstudiante> {
  const fases = await db.fase.findMany({
    select: SELECCION_FASE,
    orderBy: { orden: 'asc' },
  });
  const grupos = await db.intentoReto.groupBy({
    by: ['retoId', 'aprobado'],
    where: { estudianteId, estado: 'CALIFICADO' },
    _count: { _all: true },
    _max: { porcentaje: true, calificacionEstrellas: true },
    _sum: { qpGanado: true },
  });

  const resumen = resumirIntentos(
    grupos.map((g) => ({
      retoId: g.retoId,
      aprobado: g.aprobado,
      intentos: g._count._all,
      maxPorcentaje: g._max.porcentaje,
      maxEstrellas: g._max.calificacionEstrellas,
      sumaQpGanado: g._sum.qpGanado ?? 0,
    })),
  );
  const estados = calcularEstadosFases(
    fases.map((f) => ({
      id: f.id,
      orden: f.orden,
      retoIds: f.retos.map((r) => r.id),
    })),
    resumen,
  );
  return { fases, estados, resumen };
}
