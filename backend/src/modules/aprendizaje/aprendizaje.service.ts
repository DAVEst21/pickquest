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
import { FaseDetalleDto, FaseDto, PreguntaDto, RetoDto } from './dto/fase.dto';
import { AyudaRegistradaDto, IntentoDto } from './dto/intento.dto';
import {
  calcularEstadosFases,
  calcularProgresoFase,
  EstadoFase,
  ResumenReto,
  resumirIntentos,
  retoActual,
  retoDesbloqueado,
} from './estado-fases';
import { calificarPorPorcentaje } from './calificacion-estrellas';
import {
  evaluarPorcentaje,
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
  retos: { select: { id: true, orden: true }, orderBy: { orden: 'asc' } },
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
      include: {
        retos: { orderBy: { orden: 'asc' } },
        contenidoApoyo: true,
      },
    });
    if (!fase) {
      throw new NotFoundException(`La fase ${faseId} no existe`);
    }
    const { estados, resumen } = await this.cargarProgreso(estudianteId);
    // (Fase 4) El "reto actual" de la fase, no siempre el primero: el
    // estudiante avanza sus retos en orden, sin poder saltarse ninguno.
    const idRetoActual = retoActual(fase.retos, resumen);
    const retoParaMostrar =
      fase.retos.find((r) => r.id === idRetoActual) ?? null;

    return {
      fase: aFaseDto(fase, estados, resumen),
      reto: retoParaMostrar ? aRetoDto(retoParaMostrar) : null,
      contenidosApoyo: fase.contenidoApoyo
        ? [
            {
              id: fase.contenidoApoyo.id,
              contenidoTeorico: fase.contenidoApoyo.contenidoTeorico,
              ejemplos: fase.contenidoApoyo.ejemplos,
              glosario: fase.contenidoApoyo.glosario,
            },
          ]
        : [],
    };
  }

  /**
   * Registra que el estudiante usó una ayuda en el reto. Queda pendiente y se
   * asocia al próximo intento que envíe (CU-03 paso 4b).
   */
  async registrarAyuda(
    estudianteId: number,
    retoId: number,
    objetoId?: number,
  ): Promise<AyudaRegistradaDto> {
    await this.obtenerRetoDisponible(this.prisma, estudianteId, retoId);

    let idObjeto = objetoId;
    if (!idObjeto) {
      const inventario = await this.prisma.inventarioObjeto.findFirst({
        where: { estudianteId, cantidad: { gt: 0 } },
        select: { objetoId: true },
      });
      if (inventario) {
        idObjeto = inventario.objetoId;
      } else {
        const obj = await this.prisma.objeto.findFirst({
          where: { tipo: 'POCION' },
          select: { id: true },
        });
        if (obj) {
          idObjeto = obj.id;
        } else {
          const defaultObj = await this.prisma.objeto.upsert({
            where: { nombre: 'Poción de Ayuda' },
            update: {},
            create: {
              nombre: 'Poción de Ayuda',
              tipo: 'POCION',
              costoQP: 50,
              efecto: 'Revela una pista sobre el reto',
              rareza: 'Común',
            },
          });
          idObjeto = defaultObj.id;
        }
      }
    }

    await this.prisma.usoAyuda.create({
      data: {
        estudianteId,
        retoId,
        objetoId: idObjeto,
      },
    });

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

    let porcentaje: number;
    try {
      porcentaje = evaluarPorcentaje(
        parsearClave(reto.contenido),
        dto.respuestas,
      );
    } catch (error) {
      if (error instanceof RespuestaInvalidaError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }

    // Se determina ANTES de calificar: la penalización de la Fase 2 (tope de
    // 2 estrellas) depende de si este intento usó ayuda.
    const ayudasPendientes = await tx.usoAyuda.count({
      where: { estudianteId, retoId, intentoId: null },
    });
    const usoAyuda = ayudasPendientes > 0;
    const { calificacionEstrellas, aprobado } = calificarPorPorcentaje(
      porcentaje,
      usoAyuda,
    );

    const aprobadoAntes = await tx.intentoReto.count({
      where: { estudianteId, retoId, aprobado: true },
    });
    const otorgaRecompensa = aprobado && aprobadoAntes === 0;
    const xpGanado = otorgaRecompensa ? reto.recompensaXp : 0;
    const qpGanado = otorgaRecompensa ? reto.recompensaQp : 0;

    const intento = await tx.intentoReto.create({
      data: {
        estudianteId,
        retoId,
        respuesta: dto.respuestas as unknown as Prisma.InputJsonValue,
        porcentaje,
        calificacionEstrellas,
        aprobado,
        xpGanado,
        qpGanado,
        usoAyuda,
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

  /**
   * El reto existe (404), su fase no está bloqueada para el estudiante (403),
   * y (Fase 4) el reto está desbloqueado dentro de su fase: no se puede
   * enviar un intento ni pedir ayuda para un reto si sus predecesores (por
   * Reto.orden, dentro de la misma fase) todavía no están aprobados. Repetir
   * un reto ya aprobado (para mejorar la marca) sigue permitido.
   */
  private async obtenerRetoDisponible(
    db: ClienteDb,
    estudianteId: number,
    retoId: number,
  ): Promise<Reto> {
    const reto = await db.reto.findUnique({ where: { id: retoId } });
    if (!reto) {
      throw new NotFoundException(`El reto ${retoId} no existe`);
    }
    const { estados, fases, resumen } = await this.cargarProgreso(
      estudianteId,
      db,
    );
    if (estados.get(reto.faseId) === 'bloqueada') {
      throw new ForbiddenException(
        'La fase de este reto está bloqueada: primero completa la fase anterior',
      );
    }
    const retosDeLaFase = fases.find((f) => f.id === reto.faseId)?.retos ?? [];
    if (!retoDesbloqueado(reto, retosDeLaFase, resumen)) {
      throw new ForbiddenException(
        'Debes completar los retos anteriores de esta fase, en orden, antes que este',
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
}

function aFaseDto(
  fase: FaseSeleccionada,
  estados: Map<number, EstadoFase>,
  resumenPorReto: Map<number, ResumenReto>,
): FaseDto {
  // (Fase 4) retoId es el "reto actual" de la fase (el siguiente sin
  // aprobar, o el último si ya se aprobaron todos), no siempre el primero.
  const retoId = retoActual(fase.retos, resumenPorReto);
  const resumen = retoId === null ? undefined : resumenPorReto.get(retoId);
  const progresoFase = calcularProgresoFase(
    fase.retos.map((r) => r.id),
    resumenPorReto,
  );
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
    totalRetos: progresoFase?.totalRetos ?? 0,
    retosAprobados: progresoFase?.retosAprobados ?? 0,
    progreso: progresoFase?.progreso ?? null,
    calificacionEstrellasFase: progresoFase?.calificacionEstrellasFase ?? null,
    recompensaQpFase: progresoFase?.recompensaQpFase ?? null,
  };
}

function aRetoDto(reto: Reto): RetoDto {
  // `correcta` nunca se manda al cliente: solo preguntaId/texto/opciones/parte.
  let preguntas: PreguntaDto[] = [];
  try {
    preguntas = parsearClave(reto.contenido).map((p) => ({
      preguntaId: p.preguntaId,
      texto: p.texto ?? p.preguntaId,
      opciones: p.opciones,
      parte: p.parte,
    }));
  } catch {
    preguntas = [];
  }
  return {
    id: reto.id,
    faseId: reto.faseId,
    orden: reto.orden,
    criteriosAceptacion: reto.criteriosAceptacion,
    calificacionMinima: Number(reto.calificacionMinima),
    recompensaXp: reto.recompensaXp,
    recompensaQp: reto.recompensaQp,
    preguntas,
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
    createdAt: intento.creadoEn,
    creadoEn: intento.creadoEn,
  };
}
