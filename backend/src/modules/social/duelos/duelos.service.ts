import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, TemaFase } from '@prisma/client';
import { NOMBRE_TEMA } from '../../../common/temas';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { transaccionDeDuelo } from '../../../common/prisma/transaccion-duelo';
import {
  llegoATiempo,
  SEGUNDOS_POR_PREGUNTA,
  segundosRestantes,
  segundosUsados,
} from '../../../common/tiempo/tiempo-pregunta';
import { elegirAlAzar } from '../../aprendizaje/plan/plan.reglas';
import { temasDesbloqueados } from '../../aprendizaje/progreso-fases';
import { ProgresoService } from '../../progreso/progreso.service';
import {
  calcularExpiracion,
  decidirGanador,
  limiteDePendientes,
  MAX_DUELOS_PENDIENTES,
  PREGUNTAS_POR_DUELO,
  porcentajeDeRonda,
  temasEnComun,
  xpDelDuelo,
} from './duelo.reglas';
import {
  AvisoDueloDto,
  DueloDto,
  ListaDuelosDto,
  PreguntaDueloDto,
  RespuestaDueloDto,
  ResultadoParticipanteDto,
  RivalDto,
  RondaEstadoDto,
} from './duelos.dto';

type Tx = Prisma.TransactionClient;
type Db = Tx | PrismaService;

const ACTIVOS = ['PENDIENTE', 'ACEPTADO'] as const;

const INCLUIR = {
  retador: { select: { id: true, nombreAventurero: true, nivel: true } },
  retado: { select: { id: true, nombreAventurero: true, nivel: true } },
} satisfies Prisma.DueloInclude;

type DueloCompleto = Prisma.DueloGetPayload<{ include: typeof INCLUIR }>;

/**
 * CU-13 Duelos (RF-16, RN-14, RN-15, RNF-SE-04, RNF-SE-05).
 * Los dos estudiantes resuelven la misma ronda de 5 preguntas; el reloj lo lleva el servidor. Nunca se
 * exponen correos ni ids de otros estudiantes, y el resultado de uno no se muestra al otro hasta el final.
 */
@Injectable()
export class DuelosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly progreso: ProgresoService,
  ) {}

  // ------------------------------------------------------------------
  // Pasos 1 a 3: rivales disponibles y temas en común
  // ------------------------------------------------------------------

  async rivales(estudianteId: number): Promise<RivalDto[]> {
    const otros = await this.prisma.estudiante.findMany({
      where: { id: { not: estudianteId } },
      select: { id: true, nombreAventurero: true, nivel: true },
      orderBy: [{ nivel: 'desc' }, { nombreAventurero: 'asc' }],
      take: 200,
    });
    const mapa = await temasDesbloqueados(this.prisma, [estudianteId, ...otros.map((o) => o.id)]);
    const propios = mapa.get(estudianteId) ?? [];
    const terminados = await this.prisma.duelo.findMany({
      where: { estado: 'TERMINADO', OR: [{ retadorId: { in: otros.map((o) => o.id) } }, { retadoId: { in: otros.map((o) => o.id) } }] },
      select: { retadorId: true, retadoId: true, ganadorId: true, empate: true },
    });
    const orden: TemaFase[] = ['CICLO_VIDA', 'ELICITACION', 'ATRIBUTOS_CALIDAD'];

    return otros
      .map((o) => {
        const comunes = temasEnComun(propios, mapa.get(o.id) ?? []);
        const suyos = terminados.filter((d) => d.retadorId === o.id || d.retadoId === o.id);
        return {
          nombreAventurero: o.nombreAventurero,
          nivel: o.nivel,
          temasEnComun: orden
            .filter((t) => comunes.includes(t))
            .map((t) => ({ tema: t, nombre: NOMBRE_TEMA[t] })),
          duelos: {
            ganados: suyos.filter((d) => d.ganadorId === o.id).length,
            perdidos: suyos.filter((d) => !d.empate && d.ganadorId !== o.id).length,
            empatados: suyos.filter((d) => d.empate).length,
          },
        };
      })
      // Solo quienes comparten al menos un tema desbloqueado (RN-15).
      .filter((r) => r.temasEnComun.length > 0);
  }

  // ------------------------------------------------------------------
  // Pasos 3 y 4, FE2: crear el duelo
  // ------------------------------------------------------------------

  async crear(estudianteId: number, nombreRival: string, tema: TemaFase): Promise<DueloDto> {
    await this.expirarVencidos();
    const rival = await this.prisma.estudiante.findUnique({
      where: { nombreAventurero: nombreRival },
      select: { id: true },
    });
    if (!rival) throw new NotFoundException('No existe un estudiante con ese nombre de aventurero');
    if (rival.id === estudianteId) throw new BadRequestException('No puedes retarte a ti mismo');

    const dueloId = await transaccionDeDuelo(this.prisma, null, [estudianteId, rival.id], async (tx) => {
      await this.expirarVencidos(tx);
      // RN-15: el tema debe estar desbloqueado para ambos.
      const temas = await temasDesbloqueados(tx, [estudianteId, rival.id]);
      if (!(temas.get(estudianteId) ?? []).includes(tema) || !(temas.get(rival.id) ?? []).includes(tema)) {
        throw new ForbiddenException('Solo puedes retar sobre un tema que ambos tengan desbloqueado');
      }
      // FE2: máximo de 3 duelos pendientes por estudiante, como retador o como retado.
      const quien = limiteDePendientes(await this.activos(tx, estudianteId), await this.activos(tx, rival.id));
      if (quien) {
        throw new ConflictException({
          statusCode: 409,
          error: 'Conflict',
          message:
            quien === 'RETADOR'
              ? `Ya tienes ${MAX_DUELOS_PENDIENTES} duelos pendientes: termina o rechaza alguno antes de retar a otro estudiante`
              : `Ese estudiante ya tiene el máximo de ${MAX_DUELOS_PENDIENTES} duelos pendientes`,
          limite: MAX_DUELOS_PENDIENTES,
          quien,
        });
      }
      const banco = await tx.preguntaBanco.findMany({ where: { tema, activa: true }, select: { id: true } });
      if (banco.length < PREGUNTAS_POR_DUELO) {
        throw new ConflictException('El banco de preguntas todavía no tiene suficientes preguntas para este tema');
      }
      const creadoEn = new Date();
      const duelo = await tx.duelo.create({
        data: {
          retadorId: estudianteId,
          retadoId: rival.id,
          tema,
          creadoEn,
          expiraEn: calcularExpiracion(creadoEn),
          preguntas: {
            create: elegirAlAzar(banco.map((p) => p.id), PREGUNTAS_POR_DUELO).map((preguntaId, i) => ({
              numero: i + 1,
              preguntaId,
            })),
          },
        },
      });
      return duelo.id;
    });
    return this.detalle(estudianteId, dueloId);
  }

  // ------------------------------------------------------------------
  // Listas y avisos
  // ------------------------------------------------------------------

  async listar(estudianteId: number): Promise<ListaDuelosDto> {
    await this.expirarVencidos();
    await this.cerrarRondasVencidas(estudianteId);
    const duelos = await this.prisma.duelo.findMany({
      where: { OR: [{ retadorId: estudianteId }, { retadoId: estudianteId }] },
      include: INCLUIR,
      orderBy: { creadoEn: 'desc' },
    });
    const dtos = await Promise.all(duelos.map((d) => this.aDto(this.prisma, d, estudianteId)));
    return {
      pendientes: dtos.filter((d) => d.accion === 'ACEPTAR_O_RECHAZAR'),
      porJugar: dtos.filter((d) => d.accion === 'JUGAR_RONDA'),
      enEspera: dtos.filter((d) => d.accion === 'ESPERAR_RIVAL'),
      historial: dtos.filter((d) => ['TERMINADO', 'RECHAZADO', 'EXPIRADO'].includes(d.estado)),
      limitePendientes: MAX_DUELOS_PENDIENTES,
      activos: dtos.filter((d) => d.estado === 'PENDIENTE' || d.estado === 'ACEPTADO').length,
    };
  }

  /**
   * Avisos al iniciar sesión: las invitaciones pendientes recibidas y (D-001) los cierres, sin XP, de los duelos
   * propios como retador que el rival rechazó o que expiraron y cuyo aviso aún no se ha visto.
   */
  async avisos(estudianteId: number): Promise<AvisoDueloDto[]> {
    await this.expirarVencidos();
    const [pendientes, cerrados] = await Promise.all([
      this.prisma.duelo.findMany({
        where: { retadoId: estudianteId, estado: 'PENDIENTE' },
        include: INCLUIR,
        orderBy: { creadoEn: 'asc' },
      }),
      this.prisma.duelo.findMany({
        where: { retadorId: estudianteId, estado: { in: ['RECHAZADO', 'EXPIRADO'] }, avisoCierreVisto: false },
        include: INCLUIR,
        orderBy: { creadoEn: 'asc' },
      }),
    ]);
    const comun = (d: DueloCompleto) => ({
      dueloId: d.id,
      retador: { nombreAventurero: d.retador.nombreAventurero, nivel: d.retador.nivel },
      xpOtorgada: 0,
      tema: d.tema,
      temaNombre: NOMBRE_TEMA[d.tema],
      expiraEn: d.expiraEn,
    });
    return [
      ...pendientes.map(
        (d): AvisoDueloDto => ({
          ...comun(d),
          tipo: 'INVITACION',
          estado: 'PENDIENTE',
          rival: { nombreAventurero: d.retador.nombreAventurero, nivel: d.retador.nivel },
        }),
      ),
      ...cerrados.map(
        (d): AvisoDueloDto => ({
          ...comun(d),
          tipo: 'CIERRE',
          estado: d.estado as 'RECHAZADO' | 'EXPIRADO',
          rival: { nombreAventurero: d.retado.nombreAventurero, nivel: d.retado.nivel },
        }),
      ),
    ];
  }

  /** D-001: el retador cierra el aviso de un duelo rechazado o expirado; no vuelve a aparecer (idempotente). */
  async marcarAvisoVisto(estudianteId: number, dueloId: number): Promise<void> {
    await this.expirarVencidos();
    const duelo = await this.dueloPropio(this.prisma, estudianteId, dueloId);
    if (duelo.retadorId !== estudianteId) throw new ForbiddenException('Solo el retador tiene aviso de cierre');
    if (duelo.estado !== 'RECHAZADO' && duelo.estado !== 'EXPIRADO') {
      throw new ConflictException('Este duelo no tiene aviso de cierre');
    }
    await this.prisma.duelo.update({ where: { id: dueloId }, data: { avisoCierreVisto: true } });
  }

  async detalle(estudianteId: number, dueloId: number): Promise<DueloDto> {
    await this.expirarVencidos();
    await this.cerrarRondasVencidas(estudianteId);
    const duelo = await this.dueloPropio(this.prisma, estudianteId, dueloId);
    return this.aDto(this.prisma, duelo, estudianteId);
  }

  // ------------------------------------------------------------------
  // Paso 7 y FA1: aceptar o rechazar
  // ------------------------------------------------------------------

  async aceptar(estudianteId: number, dueloId: number): Promise<DueloDto> {
    await this.cambiarEstado(estudianteId, dueloId, 'ACEPTADO');
    return this.detalle(estudianteId, dueloId);
  }

  /** FA1: el duelo queda RECHAZADO (no realizado) y no se otorga XP. */
  async rechazar(estudianteId: number, dueloId: number): Promise<DueloDto> {
    await this.cambiarEstado(estudianteId, dueloId, 'RECHAZADO');
    return this.detalle(estudianteId, dueloId);
  }

  private async cambiarEstado(estudianteId: number, dueloId: number, nuevo: 'ACEPTADO' | 'RECHAZADO') {
    await this.expirarVencidos();
    const previo = await this.dueloPropio(this.prisma, estudianteId, dueloId);
    await transaccionDeDuelo(this.prisma, dueloId, [previo.retadorId, previo.retadoId], async (tx) => {
      await this.expirarVencidos(tx);
      const duelo = await this.dueloPropio(tx, estudianteId, dueloId);
      if (duelo.retadoId !== estudianteId) throw new ForbiddenException('Solo el estudiante retado puede aceptar o rechazar');
      if (duelo.estado === 'EXPIRADO') throw new ConflictException('Este duelo expiró');
      if (duelo.estado !== 'PENDIENTE') throw new ConflictException('Este duelo ya no está pendiente');
      await tx.duelo.update({ where: { id: dueloId }, data: { estado: nuevo } });
    });
  }

  // ------------------------------------------------------------------
  // Pasos 5 y 8: la ronda de preguntas
  // ------------------------------------------------------------------

  /** Habilita la pregunta y arranca su reloj en el servidor; sin la opción correcta. */
  async entregar(estudianteId: number, dueloId: number, numero: number): Promise<PreguntaDueloDto> {
    await this.expirarVencidos();
    this.validarNumero(numero);
    const previo = await this.dueloPropio(this.prisma, estudianteId, dueloId);
    return transaccionDeDuelo(this.prisma, dueloId, [previo.retadorId, previo.retadoId], async (tx) => {
      await this.expirarVencidos(tx);
      const duelo = await this.dueloJugable(tx, estudianteId, dueloId);
      const ahora = new Date();
      await this.resolverVencidas(tx, dueloId, estudianteId, ahora);
      await this.cerrarRondaSiCompleta(tx, duelo, estudianteId);

      const filas = await tx.respuestaDuelo.findMany({ where: { dueloId, estudianteId }, orderBy: { numero: 'asc' } });
      if (await tx.resultadoDuelo.findUnique({ where: { dueloId_estudianteId: { dueloId, estudianteId } } })) {
        throw new ConflictException('Ya terminaste tu ronda de este duelo');
      }
      const existente = filas.find((f) => f.numero === numero);
      if (existente?.respondidaEn) throw new ConflictException('Esta pregunta ya se resolvió');
      // Las preguntas se entregan en orden.
      if (numero !== filas.filter((f) => f.respondidaEn).length + 1) {
        throw new ConflictException('Primero resuelve la pregunta anterior');
      }
      const entregadaEn = existente?.entregadaEn ?? ahora;
      if (!existente) {
        await tx.respuestaDuelo.create({ data: { dueloId, estudianteId, numero, entregadaEn } });
      }
      const fila = await tx.preguntaDuelo.findUniqueOrThrow({
        where: { dueloId_numero: { dueloId, numero } },
        include: { pregunta: { include: { opciones: { orderBy: { orden: 'asc' } } } } },
      });
      return {
        numero,
        total: PREGUNTAS_POR_DUELO,
        enunciado: fila.pregunta.enunciado,
        opciones: fila.pregunta.opciones.map((o) => ({ opcionId: o.id, texto: o.texto })),
        limiteSegundos: SEGUNDOS_POR_PREGUNTA,
        segundosRestantes: segundosRestantes(entregadaEn, ahora),
      };
    });
  }

  /**
   * Registra la respuesta. Es correcta solo si la opción lo es y llegó dentro de 20 s + 1 s de tolerancia
   * (RNF-SE-05). Tiempo usado = segundos hasta responder, o 20 si se agotó. No se revela si acertó.
   */
  async responder(
    estudianteId: number,
    dueloId: number,
    numero: number,
    opcionId: number | null,
  ): Promise<RespuestaDueloDto> {
    await this.expirarVencidos();
    this.validarNumero(numero);
    const previo = await this.dueloPropio(this.prisma, estudianteId, dueloId);
    const rondaTerminada = await transaccionDeDuelo(
      this.prisma,
      dueloId,
      [previo.retadorId, previo.retadoId],
      async (tx) => {
        await this.expirarVencidos(tx);
        const duelo = await this.dueloJugable(tx, estudianteId, dueloId);
        const fila = await tx.respuestaDuelo.findUnique({
          where: { dueloId_estudianteId_numero: { dueloId, estudianteId, numero } },
        });
        if (!fila) throw new ConflictException('Primero solicita la pregunta');
        if (fila.respondidaEn) throw new ConflictException('Esta pregunta ya se resolvió');

        const pregunta = await tx.preguntaDuelo.findUniqueOrThrow({
          where: { dueloId_numero: { dueloId, numero } },
          include: { pregunta: { include: { opciones: true } } },
        });
        const elegida = opcionId === null ? null : pregunta.pregunta.opciones.find((o) => o.id === opcionId);
        if (opcionId !== null && !elegida) throw new BadRequestException('La opción no pertenece a esta pregunta');

        const ahora = new Date();
        const enTiempo = llegoATiempo(fila.entregadaEn, ahora);
        const correcta = !!elegida && elegida.correcta && enTiempo;
        await tx.respuestaDuelo.update({
          where: { dueloId_estudianteId_numero: { dueloId, estudianteId, numero } },
          data: {
            respondidaEn: ahora,
            opcionId: elegida?.id ?? null,
            correcta,
            segundos: elegida && enTiempo ? segundosUsados(fila.entregadaEn, ahora) : SEGUNDOS_POR_PREGUNTA,
          },
        });
        return this.cerrarRondaSiCompleta(tx, duelo, estudianteId);
      },
    );
    const duelo = await this.dueloPropio(this.prisma, estudianteId, dueloId);
    return { numero, registrada: true, rondaTerminada, duelo: await this.aDto(this.prisma, duelo, estudianteId) };
  }

  // ------------------------------------------------------------------

  private validarNumero(numero: number) {
    if (!Number.isInteger(numero) || numero < 1 || numero > PREGUNTAS_POR_DUELO) {
      throw new BadRequestException(`El número de pregunta debe estar entre 1 y ${PREGUNTAS_POR_DUELO}`);
    }
  }

  private activos(db: Db, estudianteId: number) {
    return db.duelo.count({
      where: { estado: { in: [...ACTIVOS] }, OR: [{ retadorId: estudianteId }, { retadoId: estudianteId }] },
    });
  }

  /**
   * FE1 (RN-15): todo duelo pendiente o aceptado cuyo plazo de 48 horas ya pasó expira, sin XP. Como un duelo
   * solo termina cuando ambos terminan su ronda, un duelo vencido siempre tiene al menos una ronda sin terminar
   * (la del retado o la del retador).
   */
  private async expirarVencidos(db: Db = this.prisma): Promise<void> {
    await db.duelo.updateMany({
      where: { estado: { in: [...ACTIVOS] }, expiraEn: { lt: new Date() } },
      data: { estado: 'EXPIRADO' },
    });
  }

  /** El duelo existe y el estudiante participa; si no, 404 (no se revela si es de otros). */
  private async dueloPropio(db: Db, estudianteId: number, dueloId: number): Promise<DueloCompleto> {
    const duelo = await db.duelo.findFirst({
      where: { id: dueloId, OR: [{ retadorId: estudianteId }, { retadoId: estudianteId }] },
      include: INCLUIR,
    });
    if (!duelo) throw new NotFoundException('El duelo no existe');
    return duelo;
  }

  /** El estudiante puede jugar su ronda ahora: el retador desde que se crea; el retado, después de aceptar. */
  private async dueloJugable(tx: Tx, estudianteId: number, dueloId: number): Promise<DueloCompleto> {
    const duelo = await this.dueloPropio(tx, estudianteId, dueloId);
    if (duelo.estado === 'EXPIRADO') throw new ConflictException('Este duelo expiró');
    if (duelo.estado === 'RECHAZADO') throw new ConflictException('Este duelo fue rechazado');
    if (duelo.estado === 'TERMINADO') throw new ConflictException('Este duelo ya terminó');
    if (duelo.retadoId === estudianteId && duelo.estado !== 'ACEPTADO') {
      throw new ConflictException('Primero acepta el duelo');
    }
    return duelo;
  }

  /** Las preguntas entregadas cuyo tiempo venció cuentan como incorrectas con 20 segundos usados. */
  private async resolverVencidas(tx: Tx, dueloId: number, estudianteId: number, ahora: Date) {
    const sinResolver = await tx.respuestaDuelo.findMany({ where: { dueloId, estudianteId, respondidaEn: null } });
    for (const f of sinResolver) {
      if (!llegoATiempo(f.entregadaEn, ahora)) {
        await tx.respuestaDuelo.update({
          where: { dueloId_estudianteId_numero: { dueloId, estudianteId, numero: f.numero } },
          data: { respondidaEn: ahora, opcionId: null, correcta: false, segundos: SEGUNDOS_POR_PREGUNTA },
        });
      }
    }
  }

  /** Cierra las rondas que quedaron con la última pregunta vencida (navegador cerrado). */
  private async cerrarRondasVencidas(estudianteId: number) {
    const limite = new Date(Date.now() - (SEGUNDOS_POR_PREGUNTA + 1) * 1000);
    const vencidas = await this.prisma.respuestaDuelo.findMany({
      where: { estudianteId, respondidaEn: null, entregadaEn: { lt: limite }, duelo: { estado: { in: [...ACTIVOS] } } },
      select: { dueloId: true },
      distinct: ['dueloId'],
    });
    for (const { dueloId } of vencidas) {
      const previo = await this.prisma.duelo.findUnique({ where: { id: dueloId } });
      if (!previo) continue;
      await transaccionDeDuelo(this.prisma, dueloId, [previo.retadorId, previo.retadoId], async (tx) => {
        const duelo = await this.dueloPropio(tx, estudianteId, dueloId);
        if (duelo.estado !== 'PENDIENTE' && duelo.estado !== 'ACEPTADO') return;
        await this.resolverVencidas(tx, dueloId, estudianteId, new Date());
        await this.cerrarRondaSiCompleta(tx, duelo, estudianteId);
      });
    }
  }

  /**
   * Si el estudiante resolvió las 5 preguntas, guarda su resultado (sin mostrárselo al rival). Cuando ya están
   * los dos resultados, termina el duelo. Devuelve si la ronda del estudiante quedó terminada.
   */
  private async cerrarRondaSiCompleta(tx: Tx, duelo: DueloCompleto, estudianteId: number): Promise<boolean> {
    const dueloId = duelo.id;
    const ya = await tx.resultadoDuelo.findUnique({ where: { dueloId_estudianteId: { dueloId, estudianteId } } });
    if (ya) return true;
    const filas = await tx.respuestaDuelo.findMany({ where: { dueloId, estudianteId, respondidaEn: { not: null } } });
    if (filas.length < PREGUNTAS_POR_DUELO) return false;
    await tx.resultadoDuelo.create({
      data: {
        dueloId,
        estudianteId,
        porcentaje: porcentajeDeRonda(filas.filter((f) => f.correcta).length),
        segundosTotales: Math.round(filas.reduce((suma, f) => suma + Number(f.segundos), 0) * 100) / 100,
      },
    });
    await this.terminarSiAmbosTerminaron(tx, duelo);
    return true;
  }

  /** RN-14: gana el mayor porcentaje y, en empate, el menor tiempo; XP sin QP. */
  private async terminarSiAmbosTerminaron(tx: Tx, duelo: DueloCompleto) {
    const resultados = await tx.resultadoDuelo.findMany({ where: { dueloId: duelo.id } });
    const delRetador = resultados.find((r) => r.estudianteId === duelo.retadorId);
    const delRetado = resultados.find((r) => r.estudianteId === duelo.retadoId);
    if (!delRetador || !delRetado) return;

    const veredicto = decidirGanador(
      { porcentaje: delRetador.porcentaje, segundosTotales: Number(delRetador.segundosTotales) },
      { porcentaje: delRetado.porcentaje, segundosTotales: Number(delRetado.segundosTotales) },
    );
    const xp = xpDelDuelo(veredicto);
    // Multiplicador fijo 1 y QP base 0: los duelos no otorgan QP (RN-14).
    await this.progreso.otorgarRecompensa(tx, duelo.retadorId, xp.a, 0, 1);
    await this.progreso.otorgarRecompensa(tx, duelo.retadoId, xp.b, 0, 1);
    await tx.resultadoDuelo.update({
      where: { dueloId_estudianteId: { dueloId: duelo.id, estudianteId: duelo.retadorId } },
      data: { xpOtorgada: xp.a },
    });
    await tx.resultadoDuelo.update({
      where: { dueloId_estudianteId: { dueloId: duelo.id, estudianteId: duelo.retadoId } },
      data: { xpOtorgada: xp.b },
    });
    await tx.duelo.update({
      where: { id: duelo.id },
      data: {
        estado: 'TERMINADO',
        terminadoEn: new Date(),
        empate: veredicto.empate,
        ganadorId: veredicto.empate ? null : veredicto.ganador === 'A' ? duelo.retadorId : duelo.retadoId,
      },
    });
  }

  // ------------------------------------------------------------------

  private async aDto(db: Db, duelo: DueloCompleto, miId: number): Promise<DueloDto> {
    const soyRetador = duelo.retadorId === miId;
    const rival = soyRetador ? duelo.retado : duelo.retador;
    const resultados = await db.resultadoDuelo.findMany({ where: { dueloId: duelo.id } });
    const mio = resultados.find((r) => r.estudianteId === miId);
    const filas = await db.respuestaDuelo.findMany({
      where: { dueloId: duelo.id, estudianteId: miId },
      orderBy: { numero: 'asc' },
    });
    const resueltas = filas.filter((f) => f.respondidaEn).length;
    const enPantalla = filas.find((f) => !f.respondidaEn);
    const terminada = !!mio;
    const ronda: RondaEstadoDto = {
      total: PREGUNTAS_POR_DUELO,
      resueltas,
      siguiente: terminada ? null : resueltas + 1,
      terminada,
      segundosRestantes: enPantalla ? segundosRestantes(enPantalla.entregadaEn, new Date()) : null,
    };

    const activo = duelo.estado === 'PENDIENTE' || duelo.estado === 'ACEPTADO';
    let accion: DueloDto['accion'] = null;
    if (duelo.estado === 'TERMINADO') accion = 'VER_RESULTADO';
    else if (activo && !soyRetador && duelo.estado === 'PENDIENTE') accion = 'ACEPTAR_O_RECHAZAR';
    else if (activo && !terminada) accion = 'JUGAR_RONDA';
    else if (activo && terminada) accion = 'ESPERAR_RIVAL';

    let resultado: DueloDto['resultado'] = null;
    if (duelo.estado === 'TERMINADO' && mio) {
      const otro = resultados.find((r) => r.estudianteId !== miId)!;
      const aPublico = (r: typeof mio): ResultadoParticipanteDto => ({
        porcentaje: r.porcentaje,
        segundosTotales: Number(r.segundosTotales),
        xpOtorgada: r.xpOtorgada,
      });
      const preguntas = await db.preguntaDuelo.findMany({
        where: { dueloId: duelo.id },
        orderBy: { numero: 'asc' },
        include: { pregunta: { include: { opciones: true } } },
      });
      resultado = {
        yo: aPublico(mio),
        rival: aPublico(otro),
        ganador: duelo.empate ? 'EMPATE' : duelo.ganadorId === miId ? 'YO' : 'RIVAL',
        revision: preguntas.map((p) => {
          const mia = filas.find((f) => f.numero === p.numero);
          return {
            numero: p.numero,
            enunciado: p.pregunta.enunciado,
            opcionElegidaId: mia?.opcionId ?? null,
            opcionCorrectaId: p.pregunta.opciones.find((o) => o.correcta)!.id,
            correcta: mia?.correcta ?? false,
            explicacion: p.pregunta.explicacion,
          };
        }),
      };
    }

    return {
      dueloId: duelo.id,
      tema: duelo.tema,
      temaNombre: NOMBRE_TEMA[duelo.tema],
      estado: duelo.estado,
      rol: soyRetador ? 'RETADOR' : 'RETADO',
      rival: { nombreAventurero: rival.nombreAventurero, nivel: rival.nivel },
      creadoEn: duelo.creadoEn,
      expiraEn: duelo.expiraEn,
      miRonda: ronda,
      // El rival nunca ve mi resultado antes del final; yo veo el mío al terminar mi ronda.
      miResultado: mio
        ? { porcentaje: mio.porcentaje, segundosTotales: Number(mio.segundosTotales), xpOtorgada: mio.xpOtorgada }
        : null,
      accion,
      resultado,
    };
  }
}
