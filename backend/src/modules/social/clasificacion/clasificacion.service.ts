import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { estrellasTotales, ordenarClasificacion } from './clasificacion.reglas';

export class FilaClasificacionDto {
  posicion: number;
  /** El único identificador público de un estudiante (RNF-SE-04): nunca correo ni id. */
  nombreAventurero: string;
  nivel: number;
  xpTotal: number;
  estrellas: number;
  /** Resalta la fila del estudiante que consulta. */
  esYo: boolean;
}

export class ClasificacionDto {
  /** La tabla se calcula al consultar (RNF-PE-05). */
  calculadaEn: Date;
  totalEstudiantes: number;
  /** Los primeros lugares; si el estudiante no está entre ellos, su fila se agrega al final. */
  filas: FilaClasificacionDto[];
  miPosicion: number;
}

/** Cuántos lugares se muestran en la tabla. */
export const LIMITE_CLASIFICACION = 50;

/** RF-20 Clasificación: XP total, desempate por estrellas totales y por quien alcanzó antes esa XP (RN-30). */
@Injectable()
export class ClasificacionService {
  constructor(private readonly prisma: PrismaService) {}

  async clasificacion(estudianteId: number): Promise<ClasificacionDto> {
    const estudiantes = await this.prisma.estudiante.findMany({
      select: { id: true, nombreAventurero: true, nivel: true, xpTotal: true, xpAlcanzadaEn: true },
    });
    // Mejor calificación (estrellas) de cada reto por estudiante; solo intentos calificados.
    const mejores = await this.prisma.intentoReto.groupBy({
      by: ['estudianteId', 'retoId'],
      where: { estado: 'CALIFICADO' },
      _max: { calificacionEstrellas: true },
    });
    const estrellasDe = new Map<number, number[]>();
    for (const m of mejores) {
      const lista = estrellasDe.get(m.estudianteId) ?? [];
      lista.push(m._max.calificacionEstrellas ?? 0);
      estrellasDe.set(m.estudianteId, lista);
    }

    const ordenados = ordenarClasificacion(
      estudiantes.map((e) => ({ ...e, estrellasTotales: estrellasTotales(estrellasDe.get(e.id) ?? []) })),
    );
    const filas: FilaClasificacionDto[] = ordenados.map((e, i) => ({
      posicion: i + 1,
      nombreAventurero: e.nombreAventurero,
      nivel: e.nivel,
      xpTotal: e.xpTotal,
      estrellas: e.estrellasTotales,
      esYo: e.id === estudianteId,
    }));
    const mia = filas.find((f) => f.esYo);
    const visibles = filas.slice(0, LIMITE_CLASIFICACION);
    if (mia && !visibles.includes(mia)) visibles.push(mia);
    return {
      calculadaEn: new Date(),
      totalEstudiantes: filas.length,
      filas: visibles,
      miPosicion: mia?.posicion ?? 0,
    };
  }
}
