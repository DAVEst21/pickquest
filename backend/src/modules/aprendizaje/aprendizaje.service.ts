import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { IntentoReto, Mecanica, Prisma, Reto, TecnicaElicitacion } from '@prisma/client';
import { esConflictoTransaccion } from '../../common/prisma/prisma-errores';
import { PrismaService } from '../../common/prisma/prisma.service';
import { EconomiaService } from '../economia/economia.service';
import { ProgresoService } from '../progreso/progreso.service';
import { ContenidoApoyoDto, FaseDto, FaseTablonDto, RetoTablonDto } from './dto/fase.dto';
import {
  AyudaAplicadaDto,
  BorradorGuardadoDto,
  FaseIntentoDto,
  IntentoCalificadoDto,
  IntentoEnCursoDto,
  LibretaDto,
  ResultadoIntentoDto,
  RetoIntentoDto,
} from './dto/intento.dto';
import {
  calcularEstadoReto,
  calcularEstadosFases,
  calcularProgresoFase,
  EstadoFase,
  ResumenReto,
  resumirIntentos,
  retoActual,
  retoDesbloqueado,
} from './estado-fases';
import { calificarPorPorcentaje } from './calificacion-estrellas';
import { MecanicasRegistro } from './mecanicas/mecanicas.registro';
import { columnasAPista, pistaAColumnas } from './mecanicas/pista';
import { redactarRetroalimentacion } from './mecanicas/retroalimentacion';
import { Db, EvaluadorMecanica, PistaDto } from './mecanicas/tipos';

const SELECCION_FASE = {
  id: true,
  nombre: true,
  tema: true,
  dificultad: true,
  orden: true,
  descripcion: true,
  retos: { select: { id: true, orden: true, mecanica: true }, orderBy: { orden: 'asc' } },
} satisfies Prisma.FaseSelect;

type FaseSeleccionada = Prisma.FaseGetPayload<{ select: typeof SELECCION_FASE }>;

interface ProgresoEstudiante {
  fases: FaseSeleccionada[];
  estados: Map<number, EstadoFase>;
  resumen: Map<number, ResumenReto>;
}

type IntentoConReto = IntentoReto & { reto: Reto };

@Injectable()
export class AprendizajeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mecanicas: MecanicasRegistro,
    private readonly progreso: ProgresoService,
    private readonly economia: EconomiaService,
  ) {}

  // ===================================================================
  // Mapa de fases y tablón (CU-01 del SRS: RF-18)
  // ===================================================================

  async listarFases(estudianteId: number): Promise<FaseDto[]> {
    const { fases, estados, resumen } = await this.cargarProgreso(estudianteId, this.prisma);
    return fases.map((fase) => aFaseDto(fase, estados, resumen));
  }

  /** Tablón de la fase: todos sus retos con su estado, objetivo y recompensas (RF-18, RN-02). */
  async tablonFase(estudianteId: number, faseId: number): Promise<FaseTablonDto> {
    const fase = await this.prisma.fase.findUnique({
      where: { id: faseId },
      include: {
        retos: { orderBy: { orden: 'asc' } },
        contenidoApoyo: true,
      },
    });
    if (!fase) throw new NotFoundException(`La fase ${faseId} no existe`);

    const { estados, resumen } = await this.cargarProgreso(estudianteId, this.prisma);
    const multiplicador = await this.progreso.multiplicadorVigente(this.prisma, estudianteId);
    const enCurso = new Set(
      (
        await this.prisma.intentoReto.findMany({
          where: { estudianteId, estado: 'EN_CURSO', reto: { faseId } },
          select: { retoId: true },
        })
      ).map((i) => i.retoId),
    );
    const faseBloqueada = estados.get(faseId) === 'bloqueada';

    const retos: RetoTablonDto[] = fase.retos.map((reto) => {
      const r = resumen.get(reto.id);
      const bloqueado = faseBloqueada || !retoDesbloqueado(reto, fase.retos, resumen);
      return {
        id: reto.id,
        orden: reto.orden,
        titulo: reto.titulo,
        objetivo: reto.objetivo,
        mecanica: reto.mecanica,
        recompensaXp: reto.recompensaXp,
        recompensaQp: this.progreso.qpConMultiplicador(reto.recompensaQp, multiplicador),
        estado: calcularEstadoReto(bloqueado, r?.aprobado ?? false, enCurso.has(reto.id)),
        mejorPorcentaje: r?.mejorPorcentaje ?? null,
        mejorCalificacionEstrellas: r?.mejorEstrellas ?? null,
      };
    });

    return {
      fase: aFaseDto(fase, estados, resumen),
      retos,
      contenidosApoyo: aContenidosApoyo(fase.contenidoApoyo),
    };
  }

  // ===================================================================
  // Ciclo de vida de un intento
  // ===================================================================

  /** Inicia un intento o retoma el EN_CURSO existente (FA3). Valida RN-01 y RN-08. */
  iniciarIntento(estudianteId: number, retoId: number): Promise<IntentoEnCursoDto> {
    return this.enTransaccion(estudianteId, async (tx) => {
      const reto = await tx.reto.findUnique({ where: { id: retoId } });
      if (!reto) throw new NotFoundException(`El reto ${retoId} no existe`);
      await this.validarRetoDisponible(tx, estudianteId, reto);
      this.mecanicas.obtener(reto.mecanica); // 501 si la mecánica no está implementada

      // Un solo intento EN_CURSO por estudiante y reto (se controla aquí, bajo el bloqueo del estudiante).
      const existente = await tx.intentoReto.findFirst({
        where: { estudianteId, retoId, estado: 'EN_CURSO' },
        orderBy: { id: 'asc' },
      });
      const intento =
        existente ??
        (await tx.intentoReto.create({ data: { estudianteId, retoId, estado: 'EN_CURSO' } }));
      return this.construirEnCurso(tx, { ...intento, reto });
    });
  }

  async obtenerIntento(
    estudianteId: number,
    intentoId: number,
  ): Promise<IntentoEnCursoDto | IntentoCalificadoDto> {
    const intento = await this.obtenerIntentoPropio(this.prisma, estudianteId, intentoId);
    if (intento.estado === 'EN_CURSO') return this.construirEnCurso(this.prisma, intento);
    return this.construirCalificado(this.prisma, intento);
  }

  /** RF-01: guarda el avance del intento en el servidor. */
  async guardarBorrador(
    estudianteId: number,
    intentoId: number,
    cuerpo: unknown,
  ): Promise<BorradorGuardadoDto> {
    return this.enTransaccion(estudianteId, async (tx) => {
      const intento = await this.intentoEnCurso(tx, estudianteId, intentoId);
      await this.mecanicas.obtener(intento.reto.mecanica).guardarBorrador(tx, intentoId, cuerpo);
      const { actualizadoEn } = await tx.intentoReto.update({
        where: { id: intentoId },
        data: { actualizadoEn: new Date() },
        select: { actualizadoEn: true },
      });
      return { actualizadoEn };
    });
  }

  /** CU-01: registra la técnica de elicitación elegida. */
  registrarTecnica(estudianteId: number, intentoId: number, tecnica: TecnicaElicitacion) {
    return this.enTransaccion(estudianteId, async (tx) => {
      await this.intentoDialogoEnCurso(tx, estudianteId, intentoId);
      return this.mecanicas.dialogo.registrarTecnica(tx, intentoId, tecnica);
    });
  }

  /** CU-01: registra un turno del diálogo y devuelve el nuevo estado. */
  registrarTurno(estudianteId: number, intentoId: number, opcionId: number) {
    return this.enTransaccion(estudianteId, async (tx) => {
      await this.intentoDialogoEnCurso(tx, estudianteId, intentoId);
      return this.mecanicas.dialogo.registrarTurno(tx, intentoId, opcionId);
    });
  }

  /** CU-01: requerimientos descubiertos por el estudiante en intentos calificados. */
  async libreta(estudianteId: number, retoId: number): Promise<LibretaDto[]> {
    const reto = await this.prisma.reto.findUnique({ where: { id: retoId } });
    if (!reto) throw new NotFoundException(`El reto ${retoId} no existe`);
    if (reto.mecanica !== Mecanica.DIALOGO_STAKEHOLDER) return [];
    return this.mecanicas.dialogo.libreta(this.prisma, estudianteId, retoId);
  }

  /** RF-03, RN-10: usa un objeto equipado como ayuda (máximo 1 por intento). */
  registrarAyuda(
    estudianteId: number,
    intentoId: number,
    objetoId: number,
  ): Promise<AyudaAplicadaDto> {
    return this.enTransaccion(estudianteId, async (tx) => {
      const intento = await this.intentoEnCurso(tx, estudianteId, intentoId);
      if (intento.usoAyuda) {
        throw new ConflictException('Ya usaste una ayuda en este intento (máximo 1)');
      }
      await this.economia.consumirObjetoEquipado(tx, estudianteId, objetoId);
      const pista = await this.mecanicas.obtener(intento.reto.mecanica).aplicarAyuda(tx, intentoId);
      // La pista se guarda de forma relacional para volver a dibujarla al retomar el intento.
      await tx.usoAyuda.create({ data: { intentoId, objetoId, ...pistaAColumnas(pista) } });
      await tx.intentoReto.update({ where: { id: intentoId }, data: { usoAyuda: true } });
      const borradorActualizado = intento.reto.mecanica === Mecanica.TABLERO_MOSCOW
        ? await this.mecanicas.obtener(intento.reto.mecanica).borrador(tx, intentoId)
        : undefined;
      return { intentoId, objetoId, pista, borradorActualizado };
    });
  }

  /**
   * RF-01: califica el intento. Aplica RN-04 y RN-06 (estrellas), RN-07
   * (recompensas solo en la primera aprobación) y RN-13 (multiplicador de QP).
   * El bloqueo del estudiante evita que dos envíos simultáneos cobren dos veces.
   */
  enviarIntento(estudianteId: number, intentoId: number): Promise<IntentoCalificadoDto> {
    return this.enTransaccion(estudianteId, async (tx) => {
      const intento = await this.obtenerIntentoPropio(tx, estudianteId, intentoId);
      // Un reenvío recupera el resultado si la primera respuesta se perdió en la red.
      if (intento.estado === 'CALIFICADO') return this.construirCalificado(tx, intento);
      const evaluador = this.mecanicas.obtener(intento.reto.mecanica);

      const faltantes = await evaluador.faltantes(tx, intentoId);
      if (faltantes.length > 0) {
        throw new BadRequestException({
          statusCode: 400,
          error: 'Bad Request',
          message: `No se puede enviar todavía: ${faltantes.join('; ')}`,
          faltantes,
        });
      }

      const { porcentaje } = await evaluador.calificar(tx, intentoId);
      const { calificacionEstrellas, aprobado } = calificarPorPorcentaje(
        porcentaje,
        intento.usoAyuda,
      );

      // RN-07: solo la primera aprobación (intento CALIFICADO y aprobado) otorga XP y QP.
      const aprobadoAntes = await tx.intentoReto.count({
        where: { estudianteId, retoId: intento.retoId, estado: 'CALIFICADO', aprobado: true },
      });
      let xpGanado = 0;
      let qpGanado = 0;
      if (aprobado && aprobadoAntes === 0) {
        const recompensa = await this.progreso.otorgarRecompensa(
          tx,
          estudianteId,
          intento.reto.recompensaXp,
          intento.reto.recompensaQp,
        );
        xpGanado = recompensa.xp;
        qpGanado = recompensa.qp;
      }

      const calificado = await tx.intentoReto.update({
        where: { id: intentoId },
        data: {
          estado: 'CALIFICADO',
          porcentaje,
          calificacionEstrellas,
          aprobado,
          xpGanado,
          qpGanado,
          calificadoEn: new Date(),
        },
      });
      return this.construirCalificado(tx, { ...calificado, reto: intento.reto });
    });
  }

  // ===================================================================
  // Apoyo
  // ===================================================================

  /** Serializa las escrituras de cada estudiante sin conflictos de predicado entre alumnos.
   * READ COMMITTED toma una vista fresca después de adquirir el bloqueo de la fila.
   * Ante un conflicto transitorio (p. ej. deadlock), reintenta una vez y luego responde 409.
   */
  private async enTransaccion<T>(estudianteId: number, trabajo: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    const opciones = { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted };
    for (let intento = 1; ; intento++) {
      try {
        return await this.prisma.$transaction(async (tx) => {
          await tx.$queryRaw`SELECT id FROM estudiante WHERE id = ${estudianteId} FOR UPDATE`;
          return trabajo(tx);
        }, opciones);
      } catch (error) {
        if (!esConflictoTransaccion(error)) throw error;
        if (intento >= 2) {
          throw new ConflictException(
            'Se procesó otra operación al mismo tiempo; vuelve a intentarlo',
          );
        }
      }
    }
  }

  /** El intento existe y es del estudiante; si no, 404 (no se revela si es de otro). */
  private async obtenerIntentoPropio(
    db: Db,
    estudianteId: number,
    intentoId: number,
  ): Promise<IntentoConReto> {
    const intento = await db.intentoReto.findFirst({
      where: { id: intentoId, estudianteId },
      include: { reto: true },
    });
    if (!intento) throw new NotFoundException(`El intento ${intentoId} no existe`);
    return intento;
  }

  private async intentoEnCurso(
    db: Db,
    estudianteId: number,
    intentoId: number,
  ): Promise<IntentoConReto> {
    const intento = await this.obtenerIntentoPropio(db, estudianteId, intentoId);
    if (intento.estado !== 'EN_CURSO') {
      throw new ConflictException('Este intento ya fue calificado');
    }
    return intento;
  }

  private async intentoDialogoEnCurso(db: Db, estudianteId: number, intentoId: number) {
    const intento = await this.intentoEnCurso(db, estudianteId, intentoId);
    if (intento.reto.mecanica !== Mecanica.DIALOGO_STAKEHOLDER) {
      throw new BadRequestException('Este reto no es un diálogo con un stakeholder');
    }
    return intento;
  }

  /**
   * RN-01 (403 si la fase está bloqueada) y RN-08 (403 si falta aprobar un
   * reto anterior de la fase). Repetir un reto ya aprobado sigue permitido.
   */
  private async validarRetoDisponible(db: Db, estudianteId: number, reto: Reto): Promise<void> {
    const { estados, fases, resumen } = await this.cargarProgreso(estudianteId, db);
    if (estados.get(reto.faseId) === 'bloqueada') {
      throw new ForbiddenException(
        'La fase de este reto está bloqueada: primero completa la fase anterior',
      );
    }
    const retosDeLaFase = fases.find((f) => f.id === reto.faseId)?.retos ?? [];
    if (!retoDesbloqueado(reto, retosDeLaFase, resumen)) {
      throw new ForbiddenException(
        'Debes aprobar los retos anteriores de esta fase, en orden, antes que este',
      );
    }
  }

  /** Solo cuentan los intentos CALIFICADO (progreso, mejor calificación, aprobación). */
  private async cargarProgreso(estudianteId: number, db: Db): Promise<ProgresoEstudiante> {
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

  // ===================================================================
  // Construcción de respuestas
  // ===================================================================

  private async cabecera(db: Db, intento: IntentoConReto) {
    const fase = await db.fase.findUniqueOrThrow({
      where: { id: intento.reto.faseId },
      include: { retos: { select: { id: true } }, contenidoApoyo: true },
    });
    const multiplicador = await this.progreso.multiplicadorVigente(db, intento.estudianteId);
    const reto: RetoIntentoDto = {
      id: intento.reto.id,
      orden: intento.reto.orden,
      titulo: intento.reto.titulo,
      objetivo: intento.reto.objetivo,
      contexto: intento.reto.contexto,
      mecanica: intento.reto.mecanica,
      recompensaXp: intento.reto.recompensaXp,
      recompensaQp: this.progreso.qpConMultiplicador(intento.reto.recompensaQp, multiplicador),
    };
    const faseDto: FaseIntentoDto = {
      id: fase.id,
      nombre: fase.nombre,
      orden: fase.orden,
      totalRetos: fase.retos.length,
    };
    return { reto, fase: faseDto, contenidosApoyo: aContenidosApoyo(fase.contenidoApoyo) };
  }

  /** Pista de la ayuda de este intento, reconstruida desde UsoAyuda (null si no usó ayuda). */
  private async pistaGuardada(db: Db, intentoId: number): Promise<PistaDto | null> {
    const uso = await db.usoAyuda.findUnique({
      where: { intentoId },
      include: {
        tarjeta: { select: { columnaCorrecta: true } },
        atributoEscenario: { select: { minimoObligatorio: true } },
      },
    });
    return columnasAPista(uso);
  }

  private async construirEnCurso(db: Db, intento: IntentoConReto): Promise<IntentoEnCursoDto> {
    const evaluador: EvaluadorMecanica = this.mecanicas.obtener(intento.reto.mecanica);
    return {
      estado: 'EN_CURSO',
      intentoId: intento.id,
      ...(await this.cabecera(db, intento)),
      contenido: await evaluador.contenidoPublico(db, intento.retoId),
      borrador: await evaluador.borrador(db, intento.id),
      ayudaUsada: intento.usoAyuda,
      pista: await this.pistaGuardada(db, intento.id),
      creadoEn: intento.creadoEn,
      actualizadoEn: intento.actualizadoEn,
    };
  }

  private async construirCalificado(db: Db, intento: IntentoConReto): Promise<IntentoCalificadoDto> {
    const evaluador = this.mecanicas.obtener(intento.reto.mecanica);
    const { retroalimentacion: completa } = await evaluador.calificar(db, intento.id);
    // Solo un intento aprobado recibe la respuesta de referencia completa.
    const retroalimentacion = redactarRetroalimentacion(completa, intento.aprobado);
    return {
      estado: 'CALIFICADO',
      intentoId: intento.id,
      ...(await this.cabecera(db, intento)),
      resultado: aResultado(intento),
      retroalimentacion,
    };
  }
}

function aResultado(intento: IntentoConReto): ResultadoIntentoDto {
  return {
    id: intento.id,
    retoId: intento.retoId,
    faseId: intento.reto.faseId,
    porcentaje: intento.porcentaje ?? 0,
    calificacionEstrellas: intento.calificacionEstrellas ?? 0,
    aprobado: intento.aprobado,
    xpGanado: intento.xpGanado,
    qpGanado: intento.qpGanado,
    usoAyuda: intento.usoAyuda,
    creadoEn: intento.creadoEn,
    calificadoEn: intento.calificadoEn ?? intento.actualizadoEn,
  };
}

function aContenidosApoyo(
  apoyo: { id: number; contenidoTeorico: string; ejemplos: string; glosario: string } | null,
): ContenidoApoyoDto[] {
  return apoyo
    ? [
        {
          id: apoyo.id,
          contenidoTeorico: apoyo.contenidoTeorico,
          ejemplos: apoyo.ejemplos,
          glosario: apoyo.glosario,
        },
      ]
    : [];
}

function aFaseDto(
  fase: FaseSeleccionada,
  estados: Map<number, EstadoFase>,
  resumenPorReto: Map<number, ResumenReto>,
): FaseDto {
  // retoId es el "reto actual" de la fase (el siguiente sin aprobar, o el
  // último si ya se aprobaron todos).
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
    descripcion: fase.descripcion,
    mecanicas: fase.retos.map((r) => r.mecanica),
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
