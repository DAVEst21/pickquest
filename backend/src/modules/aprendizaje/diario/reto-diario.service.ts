import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { dateADia, diaADate, diaCalendarioMx, segundosHastaMedianoche } from '../../../common/fechas/dia-calendario';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { transaccionDeEstudiante } from '../../../common/prisma/transaccion-estudiante';
import { llegoATiempo, SEGUNDOS_POR_PREGUNTA, segundosRestantes } from '../../../common/tiempo/tiempo-pregunta';
import { ProgresoService } from '../../progreso/progreso.service';
import {
  alcanzaRacha,
  guardarRacha,
  leerRachaVigente,
  multiplicadorPorRacha,
  PORCENTAJE_MINIMO_RACHA,
  PREGUNTAS_RETO_DIARIO,
  QP_POR_ACIERTO_DIARIO,
  rachaTrasRetoDiario,
  recompensaRetoDiario,
  XP_POR_ACIERTO_DIARIO,
} from '../../progreso/racha';
import { cargarProgresoFases } from '../progreso-fases';
import { elegirAlAzar } from '../plan/plan.reglas';
import {
  EstadoRetoDiarioDto,
  HoyDto,
  PreguntaEntregadaDto,
  RachaDiariaDto,
  ReglasRetoDiarioDto,
  RespuestaRetoDiarioDto,
  ResultadoRetoDiarioDto,
} from './reto-diario.dto';

type Tx = Prisma.TransactionClient;

const REGLAS: ReglasRetoDiarioDto = {
  preguntas: PREGUNTAS_RETO_DIARIO,
  segundosPorPregunta: SEGUNDOS_POR_PREGUNTA,
  porcentajeRacha: PORCENTAJE_MINIMO_RACHA,
  xpPorAcierto: XP_POR_ACIERTO_DIARIO,
  qpPorAcierto: QP_POR_ACIERTO_DIARIO,
};

type RetoConPreguntas = Prisma.RetoDiarioGetPayload<{ include: { preguntas: true } }>;

/**
 * CU-11 Reto diario contrarreloj (RF-14, RN-12, RN-13, RN-29, RNF-SE-05).
 * El servidor lleva el reloj: registra cuándo habilita cada pregunta y decide si la respuesta llegó
 * a tiempo (20 s + 1 s de tolerancia). No hay cinto de ayudas.
 */
@Injectable()
export class RetoDiarioService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly progreso: ProgresoService,
  ) {}

  // ------------------------------------------------------------------
  // Pasos 1 y 2, FE1: estado del día
  // ------------------------------------------------------------------

  async hoy(estudianteId: number): Promise<HoyDto> {
    await this.cerrarPendientesAnteriores(estudianteId);
    const dia = diaCalendarioMx();
    const racha = await leerRachaVigente(this.prisma, estudianteId, dia);
    const reto = await this.retoDelDia(estudianteId, dia);
    const estado = reto ? await this.estado(estudianteId, reto.id) : null;
    return {
      dia,
      racha: aRachaDto(racha),
      reglas: REGLAS,
      estado: !reto ? 'DISPONIBLE' : estado!.terminado ? 'TERMINADO' : 'EN_CURSO',
      reto: estado,
      segundosHastaSiguiente: estado?.terminado ? segundosHastaMedianoche() : null,
    };
  }

  // ------------------------------------------------------------------
  // Pasos 3 y 4: iniciar (o retomar el del día)
  // ------------------------------------------------------------------

  async iniciar(estudianteId: number): Promise<EstadoRetoDiarioDto> {
    await this.cerrarPendientesAnteriores(estudianteId);
    const dia = diaCalendarioMx();
    const id = await transaccionDeEstudiante(this.prisma, estudianteId, async (tx) => {
      const existente = await tx.retoDiario.findUnique({
        where: { estudianteId_dia: { estudianteId, dia: diaADate(dia) } },
      });
      if (existente) return existente.id;

      // 10 preguntas al azar del banco de los temas de las fases desbloqueadas.
      const { fases, estados } = await cargarProgresoFases(tx, estudianteId);
      const temas = fases.filter((f) => estados.get(f.id) !== 'bloqueada').map((f) => f.tema);
      const banco = await tx.preguntaBanco.findMany({ where: { tema: { in: temas }, activa: true }, select: { id: true } });
      if (banco.length < PREGUNTAS_RETO_DIARIO) {
        throw new ConflictException('El banco de preguntas todavía no tiene suficientes preguntas para el reto diario');
      }
      const elegidas = elegirAlAzar(banco.map((p) => p.id), PREGUNTAS_RETO_DIARIO);
      const { multiplicador } = await leerRachaVigente(tx, estudianteId, dia);
      const creado = await tx.retoDiario.create({
        data: {
          estudianteId,
          dia: diaADate(dia),
          multiplicador,
          preguntas: { create: elegidas.map((preguntaId, i) => ({ preguntaId, numero: i + 1 })) },
        },
      });
      return creado.id;
    });

    const estado = await this.estado(estudianteId, id);
    if (estado.terminado) {
      // FE1: ya realizó el reto de hoy → su resultado y el tiempo que falta para el siguiente.
      throw new ConflictException({
        statusCode: 409,
        error: 'Conflict',
        message: 'Ya realizaste el reto diario de hoy. El siguiente estará disponible mañana.',
        estado: 'TERMINADO',
        reto: estado,
        segundosHastaSiguiente: segundosHastaMedianoche(),
      });
    }
    return estado;
  }

  // ------------------------------------------------------------------
  // Pasos 4 a 7: cada pregunta (entregar y responder)
  // ------------------------------------------------------------------

  /** Habilita la pregunta `numero` y arranca su reloj en el servidor; sin la opción correcta. */
  async entregar(estudianteId: number, retoDiarioId: number, numero: number): Promise<PreguntaEntregadaDto> {
    await this.cerrarPendientesAnteriores(estudianteId);
    return transaccionDeEstudiante(this.prisma, estudianteId, async (tx) => {
      const reto = await this.retoVigente(tx, estudianteId, retoDiarioId);
      this.validarNumero(numero);
      const ahora = new Date();
      await this.vencerSinResponder(tx, reto, ahora);
      const filas = await tx.preguntaRetoDiario.findMany({ where: { retoDiarioId }, orderBy: { numero: 'asc' } });
      const fila = filas.find((p) => p.numero === numero)!;

      if (fila.correcta !== null) {
        throw new ConflictException({
          statusCode: 409,
          error: 'Conflict',
          message: fila.opcionId === null
            ? 'El tiempo de esta pregunta se agotó y cuenta como incorrecta'
            : 'Esta pregunta ya se respondió',
          correcta: fila.correcta,
          tiempoAgotado: fila.opcionId === null,
        });
      }
      // Las preguntas se entregan en orden.
      if (filas.some((p) => p.numero < numero && p.correcta === null)) {
        throw new ConflictException('Primero resuelve la pregunta anterior');
      }
      const entregadaEn = fila.entregadaEn ?? ahora;
      if (!fila.entregadaEn) {
        await tx.preguntaRetoDiario.update({
          where: { retoDiarioId_numero: { retoDiarioId, numero } },
          data: { entregadaEn },
        });
      }
      const pregunta = await tx.preguntaBanco.findUniqueOrThrow({
        where: { id: fila.preguntaId },
        include: { opciones: { orderBy: { orden: 'asc' } } },
      });
      return {
        numero,
        total: filas.length,
        enunciado: pregunta.enunciado,
        // Solo id y texto: nunca cuál es la correcta (RNF-SE-05).
        opciones: pregunta.opciones.map((o) => ({ opcionId: o.id, texto: o.texto })),
        limiteSegundos: SEGUNDOS_POR_PREGUNTA,
        segundosRestantes: segundosRestantes(entregadaEn, ahora),
      };
    });
  }

  /**
   * Registra la respuesta. Es correcta solo si la opción es la correcta Y llegó dentro de 20 s + 1 s
   * de tolerancia (RNF-SE-05). `opcionId = null` significa que se agotó el tiempo (FA1).
   */
  async responder(
    estudianteId: number,
    retoDiarioId: number,
    numero: number,
    opcionId: number | null,
  ): Promise<RespuestaRetoDiarioDto> {
    await this.cerrarPendientesAnteriores(estudianteId);
    const resultado = await transaccionDeEstudiante(this.prisma, estudianteId, async (tx) => {
      const reto = await this.retoVigente(tx, estudianteId, retoDiarioId);
      this.validarNumero(numero);
      const fila = reto.preguntas.find((p) => p.numero === numero)!;
      if (!fila.entregadaEn) throw new ConflictException('Primero solicita la pregunta');
      if (fila.correcta !== null) throw new ConflictException('Esta pregunta ya se resolvió');

      const pregunta = await tx.preguntaBanco.findUniqueOrThrow({
        where: { id: fila.preguntaId },
        include: { opciones: true },
      });
      const elegida = opcionId === null ? null : pregunta.opciones.find((o) => o.id === opcionId);
      if (opcionId !== null && !elegida) {
        throw new BadRequestException('La opción no pertenece a esta pregunta');
      }
      const enTiempo = llegoATiempo(fila.entregadaEn, new Date());
      const correcta = elegida !== null && elegida !== undefined && elegida.correcta && enTiempo;
      await tx.preguntaRetoDiario.update({
        where: { retoDiarioId_numero: { retoDiarioId, numero } },
        data: { opcionId: elegida?.id ?? null, correcta },
      });

      const pendientes = await tx.preguntaRetoDiario.count({ where: { retoDiarioId, correcta: null } });
      if (pendientes === 0) await this.terminar(tx, estudianteId, retoDiarioId);
      return {
        numero,
        correcta,
        tiempoAgotado: elegida === null || elegida === undefined || !enTiempo,
      };
    });
    const estado = await this.estado(estudianteId, retoDiarioId);
    // CU-11 paso 6: solo si fue correcta y lo necesario para continuar; nunca la opción correcta ni la explicación.
    return {
      ...resultado,
      siguiente: estado.siguiente,
      aciertos: estado.preguntas.filter((p) => p.correcta === true).length,
      terminado: estado.terminado,
      estado,
    };
  }

  /** FA2: las preguntas sin responder cuentan como incorrectas y el reto termina. */
  async abandonar(estudianteId: number, retoDiarioId: number): Promise<EstadoRetoDiarioDto> {
    await this.cerrarPendientesAnteriores(estudianteId);
    await transaccionDeEstudiante(this.prisma, estudianteId, async (tx) => {
      await this.retoVigente(tx, estudianteId, retoDiarioId);
      await this.terminar(tx, estudianteId, retoDiarioId);
    });
    return this.estado(estudianteId, retoDiarioId);
  }

  // ------------------------------------------------------------------

  /**
   * Un reto de un día anterior que quedó sin terminar se cierra automáticamente en el siguiente acceso, con las
   * no respondidas como incorrectas; recompensas y racha se aplican a su propio día.
   */
  async cerrarPendientesAnteriores(estudianteId: number): Promise<void> {
    const hoy = diaADate(diaCalendarioMx());
    const viejos = await this.prisma.retoDiario.findMany({
      where: { estudianteId, terminadoEn: null, dia: { lt: hoy } },
      orderBy: { dia: 'asc' },
      select: { id: true },
    });
    for (const { id } of viejos) {
      await transaccionDeEstudiante(this.prisma, estudianteId, async (tx) => {
        const aunAbierto = await tx.retoDiario.findFirst({ where: { id, terminadoEn: null } });
        if (aunAbierto) await this.terminar(tx, estudianteId, id);
      });
    }
    await this.cerrarElDeHoySiYaVencioTodo(estudianteId);
  }

  /**
   * Si el estudiante cerró el navegador con la última pregunta en pantalla, nadie la responde: cuando
   * todas las preguntas del reto de hoy están resueltas o vencidas, el reto se cierra solo.
   */
  private async cerrarElDeHoySiYaVencioTodo(estudianteId: number): Promise<void> {
    const reto = await this.prisma.retoDiario.findFirst({
      where: { estudianteId, terminadoEn: null, dia: diaADate(diaCalendarioMx()) },
      include: { preguntas: true },
    });
    if (!reto) return;
    const ahora = new Date();
    const todoResuelto = reto.preguntas.every(
      (p) => p.correcta !== null || (p.entregadaEn !== null && !llegoATiempo(p.entregadaEn, ahora)),
    );
    if (!todoResuelto) return;
    await transaccionDeEstudiante(this.prisma, estudianteId, async (tx) => {
      const aunAbierto = await tx.retoDiario.findFirst({ where: { id: reto.id, terminadoEn: null } });
      if (aunAbierto) await this.terminar(tx, estudianteId, reto.id);
    });
  }

  private retoDelDia(estudianteId: number, dia: string) {
    return this.prisma.retoDiario.findUnique({ where: { estudianteId_dia: { estudianteId, dia: diaADate(dia) } } });
  }

  /** El reto existe, es del estudiante y no terminó; resuelve las preguntas ya vencidas. */
  private async retoVigente(tx: Tx, estudianteId: number, retoDiarioId: number): Promise<RetoConPreguntas> {
    const reto = await tx.retoDiario.findFirst({
      where: { id: retoDiarioId, estudianteId },
      include: { preguntas: { orderBy: { numero: 'asc' } } },
    });
    if (!reto) throw new NotFoundException('El reto diario no existe');
    if (reto.terminadoEn) throw new ConflictException('Este reto diario ya terminó');
    return reto;
  }

  private validarNumero(numero: number) {
    if (!Number.isInteger(numero) || numero < 1 || numero > PREGUNTAS_RETO_DIARIO) {
      throw new BadRequestException(`El número de pregunta debe estar entre 1 y ${PREGUNTAS_RETO_DIARIO}`);
    }
  }

  /** Las preguntas ya entregadas cuyo tiempo venció cuentan como incorrectas (FA1). */
  private async vencerSinResponder(tx: Tx, reto: RetoConPreguntas, ahora: Date) {
    for (const p of reto.preguntas) {
      if (p.entregadaEn && p.correcta === null && !llegoATiempo(p.entregadaEn, ahora)) {
        await tx.preguntaRetoDiario.update({
          where: { retoDiarioId_numero: { retoDiarioId: reto.id, numero: p.numero } },
          data: { correcta: false },
        });
        p.correcta = false;
      }
    }
  }

  /**
   * Cierra el reto en una transacción: lo no resuelto cuenta como incorrecto, calcula el puntaje y otorga
   * XP y QP (RN-29) con el multiplicador que tenía al iniciar, y actualiza la racha de su propio día (RN-13).
   */
  private async terminar(tx: Tx, estudianteId: number, retoDiarioId: number) {
    await tx.preguntaRetoDiario.updateMany({ where: { retoDiarioId, correcta: null }, data: { correcta: false } });
    const reto = await tx.retoDiario.findUniqueOrThrow({ where: { id: retoDiarioId } });
    const aciertos = await tx.preguntaRetoDiario.count({ where: { retoDiarioId, correcta: true } });
    const multiplicador = Number(reto.multiplicador);
    const { xp, qpBase, qp } = recompensaRetoDiario(aciertos, multiplicador);
    await this.progreso.otorgarRecompensa(tx, estudianteId, xp, qpBase, multiplicador);

    const fila = await tx.rachaEstudio.upsert({ where: { estudianteId }, update: {}, create: { estudianteId } });
    const racha = rachaTrasRetoDiario(
      {
        dias: fila.diasActuales,
        record: fila.diasRecord,
        ultimoDiaLogrado: fila.ultimaActividad ? dateADia(fila.ultimaActividad) : null,
      },
      dateADia(reto.dia),
      aciertos,
    );
    await guardarRacha(tx, estudianteId, racha);
    await tx.retoDiario.update({
      where: { id: retoDiarioId },
      data: { aciertos, xpOtorgada: xp, qpOtorgado: qp, terminadoEn: new Date() },
    });
  }

  private async estado(estudianteId: number, retoDiarioId: number): Promise<EstadoRetoDiarioDto> {
    const ahora = new Date();
    const reto = await this.prisma.retoDiario.findFirstOrThrow({
      where: { id: retoDiarioId, estudianteId },
      include: { preguntas: { orderBy: { numero: 'asc' } } },
    });
    const terminado = reto.terminadoEn !== null;
    // Una pregunta cuyo tiempo ya venció se muestra como incorrecta aunque nadie la haya cerrado todavía.
    const vencida = (p: (typeof reto.preguntas)[number]) =>
      p.correcta === null && p.entregadaEn !== null && !llegoATiempo(p.entregadaEn, ahora);
    const resueltas = reto.preguntas.filter((p) => p.correcta !== null || vencida(p)).length;
    const siguiente = terminado ? null : (reto.preguntas.find((p) => p.correcta === null && !vencida(p))?.numero ?? null);
    const enPantalla = reto.preguntas.find((p) => p.numero === siguiente);

    let resultado: ResultadoRetoDiarioDto | null = null;
    if (terminado) {
      const racha = await leerRachaVigente(this.prisma, estudianteId);
      const aciertos = reto.aciertos ?? 0;
      resultado = {
        aciertos,
        total: reto.preguntas.length,
        porcentaje: Math.round((aciertos / reto.preguntas.length) * 100),
        xpOtorgada: reto.xpOtorgada,
        qpOtorgado: reto.qpOtorgado,
        multiplicadorAplicado: Number(reto.multiplicador),
        logroRacha: alcanzaRacha(aciertos, reto.preguntas.length),
        racha: aRachaDto(racha),
      };
    }
    return {
      retoDiarioId: reto.id,
      dia: dateADia(reto.dia),
      multiplicador: Number(reto.multiplicador),
      total: reto.preguntas.length,
      resueltas: terminado ? reto.preguntas.length : resueltas,
      siguiente,
      segundosRestantes: enPantalla?.entregadaEn ? segundosRestantes(enPantalla.entregadaEn, ahora) : null,
      terminado,
      preguntas: reto.preguntas.map((p) => ({
        numero: p.numero,
        entregada: p.entregadaEn !== null,
        correcta: p.correcta ?? (vencida(p) ? false : null),
      })),
      resultado,
    };
  }
}

function aRachaDto(racha: { dias: number; record: number; multiplicador?: number }): RachaDiariaDto {
  return {
    diasActuales: racha.dias,
    diasRecord: racha.record,
    multiplicadorQP: racha.multiplicador ?? multiplicadorPorRacha(racha.dias),
  };
}
