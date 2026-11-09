import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { Mecanica, ParteEscenario, Prisma } from '@prisma/client';
import {
  BorradorDto,
  ContenidoPublicoDto,
  Db,
  EvaluadorMecanica,
  PistaDto,
  ResultadoCalificacion,
  retoIdDeIntento,
} from '../tipos';
import { validarCuerpo } from '../validar-cuerpo';
import { BorradorEscenarioDto } from './simulador-escenarios.dto';
import {
  calificarEscenario,
  escenarioSeCumple,
  faltantesEscenario,
  LIMITE_SIMULACIONES,
  medidaDentroDelRango,
  NOMBRE_PARTE,
  PARTES_ESCENARIO,
  valorDeLaApp,
} from './simulador-escenarios.calificacion';

const num = (d: Prisma.Decimal | number): number => Number(d);

/** Resultado de una simulación (RNF-PE-03: se calcula en el servidor, en milisegundos). */
export interface SimulacionDto {
  numero: number;
  valor: number;
  carga: number;
  valorApp: number;
  cumple: boolean;
  restantes: number;
  /** Respuesta de la app a distintas cargas, para dibujar la gráfica frente al umbral. */
  curva: { carga: number; valorApp: number }[];
}

/** CU-05 Simulador de escenarios de calidad (RF-08, RN-20, RN-31). */
@Injectable()
export class SimuladorEscenariosEvaluador implements EvaluadorMecanica {
  readonly mecanica = Mecanica.SIMULADOR_ESCENARIOS;

  private async escenario(db: Db, retoId: number) {
    return db.escenarioCalidad.findUniqueOrThrow({ where: { retoId } });
  }

  async contenidoPublico(db: Db, retoId: number): Promise<ContenidoPublicoDto> {
    const e = await this.escenario(db, retoId);
    const unidades = await db.unidadEscenario.findMany({ where: { retoId }, orderBy: { id: 'asc' } });
    const opciones = await db.opcionParteEscenario.findMany({
      where: { retoId },
      orderBy: [{ parte: 'asc' }, { orden: 'asc' }],
    });
    // Sin `correcta`, sin rango aceptable y sin el modelo de la simulación (RNF-SE-02).
    return {
      necesidadVaga: e.necesidadVaga,
      contextoApp: e.contextoApp,
      nombreMetrica: e.nombreMetrica,
      nombreCarga: e.nombreCarga,
      unidades: unidades.map((u) => ({ id: u.id, nombre: u.nombre })),
      deslizadores: {
        valorMin: num(e.valorMinSlider),
        valorMax: num(e.valorMaxSlider),
        paso: num(e.pasoSlider),
        cargaMin: e.cargaMinSlider,
        cargaMax: e.cargaMaxSlider,
        pasoCarga: e.pasoCarga,
      },
      limiteSimulaciones: LIMITE_SIMULACIONES,
      partes: PARTES_ESCENARIO.map((parte) => ({
        parte,
        nombre: NOMBRE_PARTE[parte],
        opciones: opciones
          .filter((o) => o.parte === parte)
          .map((o) => ({ id: o.id, orden: o.orden, texto: o.texto })),
      })),
    };
  }

  async borrador(db: Db, intentoId: number): Promise<BorradorDto> {
    const elecciones = await db.eleccionParteEscenario.findMany({ where: { intentoId } });
    const respuesta = await db.respuestaEscenario.findUnique({ where: { intentoId } });
    const simulaciones = await db.simulacionEscenario.findMany({
      where: { intentoId },
      orderBy: { numero: 'asc' },
    });
    return {
      elecciones: elecciones.map((e) => ({ parte: e.parte, opcionId: e.opcionId })),
      valor: respuesta?.valor === null || respuesta?.valor === undefined ? null : num(respuesta.valor),
      unidadId: respuesta?.unidadId ?? null,
      carga: respuesta?.carga ?? null,
      simulaciones: simulaciones.map((s) => ({
        numero: s.numero,
        valor: num(s.valor),
        carga: s.carga,
        valorApp: num(s.valorApp),
        cumple: s.cumple,
      })),
      simulacionesRestantes: LIMITE_SIMULACIONES - simulaciones.length,
    };
  }

  async guardarBorrador(db: Db, intentoId: number, cuerpo: unknown): Promise<void> {
    const dto = validarCuerpo(BorradorEscenarioDto, cuerpo);
    const retoId = await retoIdDeIntento(db, intentoId);
    const e = await this.escenario(db, retoId);

    const opciones = await db.opcionParteEscenario.findMany({ where: { retoId } });
    for (const el of dto.elecciones) {
      const opcion = opciones.find((o) => o.id === el.opcionId);
      if (!opcion) throw new BadRequestException(`La opción ${el.opcionId} no pertenece a este reto`);
      if (opcion.parte !== el.parte) {
        throw new BadRequestException(`La opción ${el.opcionId} no es de la parte «${NOMBRE_PARTE[el.parte]}»`);
      }
    }
    if (dto.unidadId != null) {
      const unidad = await db.unidadEscenario.findFirst({ where: { id: dto.unidadId, retoId } });
      if (!unidad) throw new BadRequestException(`La unidad ${dto.unidadId} no pertenece a este reto`);
    }
    if (dto.valor != null && (dto.valor < num(e.valorMinSlider) || dto.valor > num(e.valorMaxSlider))) {
      throw new BadRequestException(
        `El valor debe estar entre ${num(e.valorMinSlider)} y ${num(e.valorMaxSlider)}`,
      );
    }
    if (dto.carga != null && (dto.carga < e.cargaMinSlider || dto.carga > e.cargaMaxSlider)) {
      throw new BadRequestException(`La carga debe estar entre ${e.cargaMinSlider} y ${e.cargaMaxSlider}`);
    }

    await db.eleccionParteEscenario.deleteMany({ where: { intentoId } });
    await db.eleccionParteEscenario.createMany({
      data: dto.elecciones.map((el) => ({ intentoId, parte: el.parte, opcionId: el.opcionId })),
    });
    const datos = { valor: dto.valor ?? null, unidadId: dto.unidadId ?? null, carga: dto.carga ?? null };
    await db.respuestaEscenario.upsert({
      where: { intentoId },
      update: datos,
      create: { intentoId, ...datos },
    });
  }

  private async faltantesDelBorrador(db: Db, intentoId: number): Promise<string[]> {
    const b = (await this.borrador(db, intentoId)) as {
      elecciones: { parte: ParteEscenario }[];
      valor: number | null;
      unidadId: number | null;
      carga: number | null;
    };
    return faltantesEscenario(new Set(b.elecciones.map((e) => e.parte)), b);
  }

  /** FE1: partes vacías o medida incompleta. */
  faltantes(db: Db, intentoId: number): Promise<string[]> {
    return this.faltantesDelBorrador(db, intentoId);
  }

  /**
   * Paso 5 y 6 del flujo normal: ejecuta la simulación con lo que el estudiante
   * tiene guardado. FE1: partes vacías (400). FE2: ya hizo 5 simulaciones (409).
   */
  async simular(db: Db, intentoId: number): Promise<SimulacionDto> {
    const faltantes = await this.faltantesDelBorrador(db, intentoId);
    if (faltantes.length > 0) {
      throw new BadRequestException({
        statusCode: 400,
        error: 'Bad Request',
        message: `No se puede simular todavía: ${faltantes.join('; ')}`,
        faltantes,
      });
    }
    const hechas = await db.simulacionEscenario.count({ where: { intentoId } });
    if (hechas >= LIMITE_SIMULACIONES) {
      throw new ConflictException(
        `Ya usaste las ${LIMITE_SIMULACIONES} simulaciones de este intento: envía el escenario`,
      );
    }
    const retoId = await retoIdDeIntento(db, intentoId);
    const e = await this.escenario(db, retoId);
    const respuesta = await db.respuestaEscenario.findUniqueOrThrow({ where: { intentoId } });
    const valor = num(respuesta.valor!);
    const carga = respuesta.carga!;
    const unidadCorrecta = respuesta.unidadId === e.unidadCorrectaId;
    const base = num(e.simBase);
    const pendiente = num(e.simPendiente);
    const valorApp = valorDeLaApp(base, pendiente, carga);
    const cumple = escenarioSeCumple(valorApp, valor, unidadCorrecta);
    const numero = hechas + 1;
    await db.simulacionEscenario.create({
      data: { intentoId, numero, valor, carga, valorApp, cumple },
    });
    const puntos = 12;
    const curva = Array.from({ length: puntos }, (_, i) => {
      const c = Math.round(e.cargaMinSlider + ((e.cargaMaxSlider - e.cargaMinSlider) * i) / (puntos - 1));
      return { carga: c, valorApp: valorDeLaApp(base, pendiente, c) };
    });
    return { numero, valor, carga, valorApp, cumple, restantes: LIMITE_SIMULACIONES - numero, curva };
  }

  async calificar(db: Db, intentoId: number): Promise<ResultadoCalificacion> {
    const retoId = await retoIdDeIntento(db, intentoId);
    const e = await this.escenario(db, retoId);
    const opciones = await db.opcionParteEscenario.findMany({ where: { retoId } });
    const elecciones = await db.eleccionParteEscenario.findMany({ where: { intentoId } });
    const respuesta = await db.respuestaEscenario.findUnique({ where: { intentoId }, include: { unidad: true } });
    const unidadCorrecta = e.unidadCorrectaId
      ? await db.unidadEscenario.findUnique({ where: { id: e.unidadCorrectaId } })
      : null;
    const usadas = await db.simulacionEscenario.count({ where: { intentoId } });

    const partes = PARTES_ESCENARIO.map((parte) => {
      const elegida = opciones.find((o) => o.id === elecciones.find((x) => x.parte === parte)?.opcionId);
      const correcta = opciones.find((o) => o.parte === parte && o.correcta);
      return {
        parte,
        nombre: NOMBRE_PARTE[parte],
        elegida: elegida?.texto ?? null,
        acertada: !!elegida && elegida.correcta,
        correcta: correcta?.texto ?? null,
      };
    });
    const medida = {
      valor: respuesta?.valor == null ? null : num(respuesta.valor),
      unidadId: respuesta?.unidadId ?? null,
      carga: respuesta?.carga ?? null,
    };
    const unidadAcertada = medida.unidadId !== null && medida.unidadId === e.unidadCorrectaId;
    const rango = {
      valorMin: num(e.valorMinAceptable),
      valorMax: num(e.valorMaxAceptable),
      cargaMin: e.cargaMinAceptable,
      cargaMax: e.cargaMaxAceptable,
    };
    const dentro = medidaDentroDelRango(medida, unidadAcertada, rango);
    const partesCorrectas = partes.filter((p) => p.acertada).length;

    return {
      porcentaje: calificarEscenario(partesCorrectas, dentro),
      retroalimentacion: {
        mecanica: this.mecanica,
        necesidadVaga: e.necesidadVaga,
        nombreMetrica: e.nombreMetrica,
        nombreCarga: e.nombreCarga,
        partes,
        medida: {
          valor: medida.valor,
          unidad: respuesta?.unidad?.nombre ?? null,
          carga: medida.carga,
          unidadAcertada,
          dentroDelRango: dentro,
        },
        simulacionesUsadas: usadas,
        limiteSimulaciones: LIMITE_SIMULACIONES,
        // Referencia (RN-31): se recorta si el estudiante todavía no puede verla.
        rangoAceptable: { ...rango, unidad: unidadCorrecta?.nombre ?? null },
      },
    };
  }

  /** La ayuda no escribe: la pista se guarda como tipo y el rango se lee del escenario (FA2). */
  async aplicarAyuda(db: Db, intentoId: number): Promise<PistaDto> {
    const retoId = await retoIdDeIntento(db, intentoId);
    return this.pistaDeRango(db, retoId);
  }

  /** Pista de la ayuda de CU-05: el rango aceptable de la medida de respuesta (valor, unidad y carga). */
  async pistaDeRango(db: Db, retoId: number): Promise<PistaDto> {
    const e = await this.escenario(db, retoId);
    const unidad = e.unidadCorrectaId
      ? await db.unidadEscenario.findUnique({ where: { id: e.unidadCorrectaId } })
      : null;
    return {
      tipo: 'RANGO_ESCENARIO',
      valorMin: num(e.valorMinAceptable),
      valorMax: num(e.valorMaxAceptable),
      unidad: unidad?.nombre ?? null,
      cargaMin: e.cargaMinAceptable,
      cargaMax: e.cargaMaxAceptable,
    };
  }
}

