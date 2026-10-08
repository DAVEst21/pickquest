import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  calcularEstadosFases,
  resumirIntentos,
} from '../aprendizaje/estado-fases';
import { calcularNivel } from './nivel';

export const CATEGORIAS = [
  ['PLANIFICACION', 'Planificación'],
  ['ANALISIS', 'Análisis'],
  ['DISENO', 'Diseño'],
  ['IMPLEMENTACION', 'Implementación'],
  ['TESTING', 'Testing'],
  ['DESPLIEGUE', 'Despliegue'],
  ['MANTENIMIENTO', 'Mantenimiento'],
] as const;

@Injectable()
export class ProgresoService {
  constructor(private readonly prisma: PrismaService) {}

  consultar(estudianteId: number) {
    // Una instantánea coherente; la consulta no escribe ni concede recompensas.
    return this.prisma.$transaction(
      async (db) => {
        const estudiante = await db.estudiante.findUnique({
          where: { id: estudianteId },
          select: {
            xpTotal: true,
            qpTotal: true,
            habilidades: true,
            logros: {
              include: { logro: true },
              orderBy: { fechaObtenido: 'desc' },
            },
          },
        });
        if (!estudiante)
          throw new NotFoundException('Estudiante no encontrado');
        const fases = await db.fase.findMany({
          orderBy: { orden: 'asc' },
          select: {
            id: true,
            nombre: true,
            orden: true,
            retos: { select: { id: true } },
            habilidades: true,
          },
        });
        const grupos = await db.intentoReto.groupBy({
          by: ['retoId', 'aprobado'],
          where: { estudianteId },
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
          fases.map((f) => ({ ...f, retoIds: f.retos.map((r) => r.id) })),
          resumen,
        );
        const marcas = [...resumen.values()];
        return {
          sinHistorial: marcas.length === 0,
          ...calcularNivel(estudiante.xpTotal),
          nivelProvisional: true,
          xpTotal: estudiante.xpTotal,
          qpTotal: estudiante.qpTotal,
          fasesCompletadas: [...estados.values()].filter(
            (e) => e === 'completada',
          ).length,
          totalFases: fases.length,
          // Misma base de estrellas que CU-01: mejor marca por reto (RN-05).
          promedioEstrellas: marcas.length
            ? marcas.reduce((s, r) => s + (r.mejorEstrellas ?? 0), 0) /
              marcas.length
            : null,
          precision: null,
          tiempoPromedioSegundos: null,
          habilidades: CATEGORIAS.map(([categoria, nombre]) => ({
            categoria,
            nombre,
            nivel:
              estudiante.habilidades.find((h) => h.categoria === categoria)
                ?.nivelAlcanzado ?? null,
            dominio: null,
            fases: fases
              .filter((f) =>
                f.habilidades.some((h) => h.categoria === categoria),
              )
              .map((f) => ({ id: f.id, nombre: f.nombre, dominio: null })),
          })),
          logros: estudiante.logros.map(({ logro, fechaObtenido }) => ({
            id: logro.id,
            nombre: logro.nombre,
            descripcion: logro.condicionDesbloqueo,
            rareza: logro.rareza,
            fechaObtenido: fechaObtenido.toISOString().slice(0, 10),
          })),
          // Los contadores almacenados no demuestran vigencia. No se presenta
          // una racha ni un multiplicador hasta acordar actividad, zona y política.
          racha: {
            diasActuales: null,
            diasRecord: null,
            multiplicadorQP: null,
            zonaHoraria: null,
          },
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
  }
}
