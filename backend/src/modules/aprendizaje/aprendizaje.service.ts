import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { IntentoReto, Prisma, Reto } from '@prisma/client';
import { esConflictoTransaccion } from '../../common/prisma/prisma-errores';
import { PrismaService } from '../../common/prisma/prisma.service';
import { calcularNivel } from '../progreso/nivel';
import { EnviarIntentoDto } from './dto/enviar-intento.dto';
import { FaseDetalleDto, FaseDto, RetoDto } from './dto/fase.dto';
import { AyudaRegistradaDto, IntentoDto } from './dto/intento.dto';
import {
  calcularEstadosFases,
  EstadoFase,
  ResumenReto,
  resumirIntentos,
} from './estado-fases';
import {
  evaluarRespuestas,
  parsearClave,
  RespuestaInvalidaError,
} from './evaluacion';

type ClienteDb = PrismaService | Prisma.TransactionClient;

const SELECCION_FASE = {
  id: true,
  nombre: true,
  tema: true,
  dificultad: true,
  orden: true,
  reto: { select: { id: true } },
} satisfies Prisma.FaseSelect;

type FaseSeleccionada = Prisma.FaseGetPayload<{
  select: typeof SELECCION_FASE;
}>;

interface ProgresoEstudiante {
  fases: FaseSeleccionada[];
  estados: Map<number, EstadoFase>;
  resumen: Map<number, ResumenReto>;
}

@Injectable()
export class AprendizajeService {
  constructor(private readonly prisma: PrismaService) {}

  async listarFases(estudianteId: number): Promise<FaseDto[]> {
    const { fases, estados, resumen } = await this.cargarProgreso(estudianteId);
    return fases.map((fase) => aFaseDto(fase, estados, resumen));
  }

  async detalleFase(
    estudianteId: number,
    faseId: number,
  ): Promise<FaseDetalleDto> {
    const fase = await this.prisma.fase.findUnique({
      where: { id: faseId },
      include: { reto: true, contenidos: { orderBy: { id: 'asc' } } },
    });
    if (!fase) {
      throw new NotFoundException(`La fase ${faseId} no existe`);
    }
    const { estados, resumen } = await this.cargarProgreso(estudianteId);

    return {
      fase: aFaseDto(
        { ...fase, reto: fase.reto ? { id: fase.reto.id } : null },
        estados,
        resumen,
      ),
      reto: fase.reto ? aRetoDto(fase.reto) : null,
      contenidosApoyo: fase.contenidos.map((c) => ({
        id: c.id,
        contenidoTeorico: c.contenidoTeorico,
        ejemplos: c.ejemplos,
        glosario: c.glosario,
      })),
    };
  }

  /**
   * Registra que el estudiante usó una ayuda en el reto. Queda pendiente y se
   * asocia al próximo intento que envíe (Corrección d).
   */
  async registrarAyuda(
    estudianteId: number,
    retoId: number,
  ): Promise<AyudaRegistradaDto> {
    await this.obtenerRetoDisponible(this.prisma, estudianteId, retoId);
    await this.prisma.usoAyuda.create({ data: { estudianteId, retoId } });
    const ayudasPendientes = await this.prisma.usoAyuda.count({
      where: { estudianteId, retoId, intentoId: null },
    });
    return { retoId, ayudasPendientes };
  }

  async enviarIntento(
    estudianteId: number,
    retoId: number,
    dto: EnviarIntentoDto,
  ): Promise<IntentoDto> {
    try {
      // Serializable: dos envíos simultáneos no pueden cobrar dos veces la
      // recompensa de la primera aprobación ni repartirse las mismas ayudas.
      return await this.prisma.$transaction(
        (tx) => this.registrarIntento(tx, estudianteId, retoId, dto),
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (esConflictoTransaccion(error)) {
        throw new ConflictException(
          'Se procesó otro intento al mismo tiempo; vuelve a enviarlo',
        );
      }
      throw error;
    }
  }

  async obtenerIntento(
    estudianteId: number,
    intentoId: number,
  ): Promise<IntentoDto> {
    // Un intento de otro estudiante responde igual que uno inexistente.
    const intento = await this.prisma.intentoReto.findFirst({
      where: { id: intentoId, estudianteId },
      include: { reto: { select: { faseId: true } } },
    });
    if (!intento) {
      throw new NotFoundException(`El intento ${intentoId} no existe`);
    }
    return aIntentoDto(intento, intento.reto.faseId);
  }

  private async registrarIntento(
    tx: Prisma.TransactionClient,
    estudianteId: number,
    retoId: number,
    dto: EnviarIntentoDto,
  ): Promise<IntentoDto> {
    const reto = await this.obtenerRetoDisponible(tx, estudianteId, retoId);

    let resultado: ReturnType<typeof evaluarRespuestas>;
    try {
      resultado = evaluarRespuestas(
        parsearClave(reto.claveRespuestas),
        dto.respuestas,
        reto.calificacionMinima,
      );
    } catch (error) {
      if (error instanceof RespuestaInvalidaError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }

    const aprobadoAntes = await tx.intentoReto.count({
      where: { estudianteId, retoId, aprobado: true },
    });
    const otorgaRecompensa = resultado.aprobado && aprobadoAntes === 0;
    const xpGanado = otorgaRecompensa ? reto.recompensaXp : 0;
    const qpGanado = otorgaRecompensa ? reto.recompensaQp : 0;

    const ayudasPendientes = await tx.usoAyuda.count({
      where: { estudianteId, retoId, intentoId: null },
    });

    const intento = await tx.intentoReto.create({
      data: {
        estudianteId,
        retoId,
        ...resultado,
        xpGanado,
        qpGanado,
        usoAyuda: ayudasPendientes > 0,
      },
    });

    if (ayudasPendientes > 0) {
      await tx.usoAyuda.updateMany({
        where: { estudianteId, retoId, intentoId: null },
        data: { intentoId: intento.id },
      });
    }
    if (otorgaRecompensa) {
      const estudiante = await tx.estudiante.update({
        where: { id: estudianteId },
        data: {
          xpTotal: { increment: xpGanado },
          qpTotal: { increment: qpGanado },
        },
        select: { xpTotal: true, nivel: true },
      });
      const { nivel } = calcularNivel(estudiante.xpTotal);
      if (nivel !== estudiante.nivel) {
        await tx.estudiante.update({
          where: { id: estudianteId },
          data: { nivel },
        });
      }
    }

    return aIntentoDto(intento, reto.faseId);
  }

  /** El reto existe y su fase no está bloqueada para el estudiante (404 / 403). */
  private async obtenerRetoDisponible(
    db: ClienteDb,
    estudianteId: number,
    retoId: number,
  ): Promise<Reto> {
    const reto = await db.reto.findUnique({ where: { id: retoId } });
    if (!reto) {
      throw new NotFoundException(`El reto ${retoId} no existe`);
    }
    const { estados } = await this.cargarProgreso(estudianteId, db);
    if (estados.get(reto.faseId) === 'bloqueada') {
      throw new ForbiddenException(
        'La fase de este reto está bloqueada: primero completa la fase anterior',
      );
    }
    return reto;
  }

  private async cargarProgreso(
    estudianteId: number,
    db: ClienteDb = this.prisma,
  ): Promise<ProgresoEstudiante> {
    const fases = await db.fase.findMany({
      select: SELECCION_FASE,
      orderBy: { orden: 'asc' },
    });
    const grupos = await db.intentoReto.groupBy({
      by: ['retoId', 'aprobado'],
      where: { estudianteId },
      _count: { _all: true },
      _max: { porcentaje: true, calificacionEstrellas: true },
    });

    const resumen = resumirIntentos(
      grupos.map((g) => ({
        retoId: g.retoId,
        aprobado: g.aprobado,
        intentos: g._count._all,
        maxPorcentaje: g._max.porcentaje,
        maxEstrellas: g._max.calificacionEstrellas,
      })),
    );
    const estados = calcularEstadosFases(
      fases.map((f) => ({
        id: f.id,
        orden: f.orden,
        retoId: f.reto?.id ?? null,
      })),
      resumen,
    );
    return { fases, estados, resumen };
  }
}

function aFaseDto(
  fase: FaseSeleccionada,
  estados: Map<number, EstadoFase>,
  resumenPorReto: Map<number, ResumenReto>,
): FaseDto {
  const retoId = fase.reto?.id ?? null;
  const resumen = retoId === null ? undefined : resumenPorReto.get(retoId);
  return {
    id: fase.id,
    nombre: fase.nombre,
    tema: fase.tema,
    dificultad: fase.dificultad,
    orden: fase.orden,
    estado: estados.get(fase.id) ?? 'bloqueada',
    retoId,
    intentosRealizados: resumen?.intentos ?? 0,
    mejorPorcentaje: resumen?.mejorPorcentaje ?? null,
    mejorCalificacionEstrellas: resumen?.mejorEstrellas ?? null,
  };
}

function aRetoDto(reto: Reto): RetoDto {
  return {
    id: reto.id,
    faseId: reto.faseId,
    criteriosAceptacion: reto.criteriosAceptacion,
    calificacionMinima: reto.calificacionMinima.toNumber(),
    recompensaXp: reto.recompensaXp,
    recompensaQp: reto.recompensaQp,
    preguntas: parsearClave(reto.claveRespuestas).map((p) => p.preguntaId),
  };
}

function aIntentoDto(intento: IntentoReto, faseId: number): IntentoDto {
  return {
    id: intento.id,
    retoId: intento.retoId,
    faseId,
    porcentaje: intento.porcentaje,
    calificacionEstrellas: intento.calificacionEstrellas,
    aprobado: intento.aprobado,
    xpGanado: intento.xpGanado,
    qpGanado: intento.qpGanado,
    usoAyuda: intento.usoAyuda,
    createdAt: intento.createdAt,
  };
}
