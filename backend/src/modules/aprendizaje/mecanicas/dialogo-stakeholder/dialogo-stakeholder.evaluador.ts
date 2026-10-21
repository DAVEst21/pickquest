import { BadRequestException, Injectable } from '@nestjs/common';
import { Mecanica, TecnicaElicitacion } from '@prisma/client';
import {
  BorradorDto,
  ContenidoPublicoDto,
  Db,
  EvaluadorMecanica,
  PistaDto,
  ResultadoCalificacion,
  retoIdDeIntento,
} from '../tipos';
import {
  calificarDialogo,
  faltantesDialogo,
  opcionesDisponibles,
} from './dialogo-stakeholder.calificacion';

/**
 * CU-01 Diálogo con stakeholder (RF-04, RN-16).
 *
 * El diálogo lo conduce el servidor turno por turno: el árbol completo, la
 * marca `productiva` y los requerimientos ocultos nunca viajan al navegador
 * antes de que el estudiante los descubra.
 */
@Injectable()
export class DialogoStakeholderEvaluador implements EvaluadorMecanica {
  readonly mecanica = Mecanica.DIALOGO_STAKEHOLDER;

  private async cargarArbol(db: Db, retoId: number) {
    const stakeholder = await db.stakeholder.findUniqueOrThrow({ where: { retoId } });
    const nodos = await db.nodoDialogo.findMany({ where: { retoId }, orderBy: { id: 'asc' } });
    const opciones = await db.opcionDialogo.findMany({
      where: { nodo: { retoId } },
      include: { requerimiento: true },
      orderBy: [{ nodoId: 'asc' }, { orden: 'asc' }],
    });
    const requerimientos = await db.requerimientoOculto.findMany({
      where: { retoId },
      orderBy: { codigo: 'asc' },
    });
    const inicial = nodos.find((n) => n.esInicial);
    if (!inicial) throw new Error(`El reto ${retoId} no tiene nodo inicial`);
    return { stakeholder, nodos, opciones, requerimientos, inicial };
  }

  private async cargarProgreso(db: Db, intentoId: number) {
    const respuesta = await db.respuestaDialogo.findUnique({ where: { intentoId } });
    const turnos = await db.turnoDialogo.findMany({
      where: { intentoId },
      orderBy: { numero: 'asc' },
      include: { opcion: { include: { requerimiento: true } } },
    });
    return { tecnica: respuesta?.tecnicaElegida ?? null, turnos };
  }

  async contenidoPublico(db: Db, retoId: number): Promise<ContenidoPublicoDto> {
    const a = await this.cargarArbol(db, retoId);
    // Sin tecnicaCorrecta, sin el árbol y sin los requerimientos ocultos.
    return {
      stakeholder: {
        nombre: a.stakeholder.nombre,
        rol: a.stakeholder.rol,
        retrato: a.stakeholder.retrato,
      },
      turnosMaximos: a.stakeholder.turnosMaximos,
      totalRequerimientos: a.requerimientos.length,
      tecnicas: Object.values(TecnicaElicitacion),
    };
  }

  /** Estado del diálogo: lo que ve el estudiante ahora mismo. */
  async borrador(db: Db, intentoId: number): Promise<BorradorDto> {
    const retoId = await retoIdDeIntento(db, intentoId);
    const a = await this.cargarArbol(db, retoId);
    const p = await this.cargarProgreso(db, intentoId);

    const elegidas = new Set(p.turnos.map((t) => t.opcionId));
    const ultimo = p.turnos[p.turnos.length - 1];
    const nodoActualId = ultimo?.opcion.siguienteNodoId ?? a.inicial.id;
    const turnosRestantes = Math.max(0, a.stakeholder.turnosMaximos - p.turnos.length);

    const { nodoId, opciones } = opcionesDisponibles(nodoActualId, a.inicial.id, a.opciones, elegidas);
    const nodo = a.nodos.find((n) => n.id === nodoId)!;

    const vistos = new Set<number>();
    const libreta = p.turnos.flatMap((t) => {
      const r = t.opcion.requerimiento;
      if (!r || vistos.has(r.id)) return [];
      vistos.add(r.id);
      return [{ codigo: r.codigo, descripcion: r.descripcion }];
    });

    return {
      tecnicaElegida: p.tecnica,
      turnosMaximos: a.stakeholder.turnosMaximos,
      turnosRestantes,
      turnos: p.turnos.map((t) => ({
        numero: t.numero,
        pregunta: t.opcion.pregunta,
        respuesta: t.opcion.respuestaStakeholder,
        requerimiento: t.opcion.requerimiento
          ? { codigo: t.opcion.requerimiento.codigo, descripcion: t.opcion.requerimiento.descripcion }
          : null,
      })),
      libreta,
      // Solo id y texto de la pregunta: sin productiva, sin requerimiento ni siguiente nodo.
      nodoActual:
        turnosRestantes > 0 && p.tecnica !== null
          ? {
              intervencion: nodo.intervencion,
              opciones: opciones.map((o) => ({ id: o.id, pregunta: o.pregunta })),
            }
          : null,
    };
  }

  /** El diálogo usa POST .../dialogo/tecnica y .../dialogo/turnos, no el borrador genérico. */
  async guardarBorrador(): Promise<void> {
    throw new BadRequestException(
      'Este reto es un diálogo: usa los endpoints /dialogo/tecnica y /dialogo/turnos',
    );
  }

  /** CU-01: registra la técnica; solo antes del primer turno. */
  async registrarTecnica(db: Db, intentoId: number, tecnica: TecnicaElicitacion): Promise<BorradorDto> {
    const p = await this.cargarProgreso(db, intentoId);
    if (p.turnos.length > 0) {
      throw new BadRequestException('La técnica solo se puede elegir antes del primer turno');
    }
    await db.respuestaDialogo.upsert({
      where: { intentoId },
      update: { tecnicaElegida: tecnica },
      create: { intentoId, tecnicaElegida: tecnica },
    });
    return this.borrador(db, intentoId);
  }

  /** CU-01: registra un turno y devuelve el nuevo estado del diálogo. */
  async registrarTurno(db: Db, intentoId: number, opcionId: number): Promise<BorradorDto> {
    const estado = await this.borrador(db, intentoId);
    if (estado.tecnicaElegida === null) {
      throw new BadRequestException('Primero elige la técnica de elicitación');
    }
    if ((estado.turnosRestantes as number) <= 0) {
      throw new BadRequestException('Ya no quedan turnos: envía la entrevista');
    }
    const nodo = estado.nodoActual as { opciones: { id: number }[] } | null;
    if (!nodo?.opciones.some((o) => o.id === opcionId)) {
      throw new BadRequestException('Esa pregunta no está disponible en este momento');
    }
    const numero = (estado.turnos as unknown[]).length + 1;
    await db.turnoDialogo.create({ data: { intentoId, numero, opcionId } });

    const nuevo = await this.borrador(db, intentoId);
    const turnos = nuevo.turnos as { numero: number }[];
    return { ...nuevo, turno: turnos[turnos.length - 1] };
  }

  async faltantes(db: Db, intentoId: number): Promise<string[]> {
    const p = await this.cargarProgreso(db, intentoId);
    return faltantesDialogo(p.tecnica);
  }

  async calificar(db: Db, intentoId: number): Promise<ResultadoCalificacion> {
    const retoId = await retoIdDeIntento(db, intentoId);
    const a = await this.cargarArbol(db, retoId);
    const p = await this.cargarProgreso(db, intentoId);

    const descubiertosIds = new Set(
      p.turnos.flatMap((t) => (t.opcion.requerimiento ? [t.opcion.requerimiento.id] : [])),
    );
    const improductivas = p.turnos.filter((t) => !t.opcion.productiva).length;

    return {
      porcentaje: calificarDialogo({
        tecnicaElegida: p.tecnica,
        tecnicaCorrecta: a.stakeholder.tecnicaCorrecta,
        requerimientosDescubiertos: descubiertosIds.size,
        requerimientosOcultos: a.requerimientos.length,
        preguntasImproductivas: improductivas,
      }),
      retroalimentacion: {
        mecanica: this.mecanica,
        tecnicaElegida: p.tecnica,
        tecnicaCorrecta: a.stakeholder.tecnicaCorrecta,
        descubiertos: a.requerimientos
          .filter((r) => descubiertosIds.has(r.id))
          .map((r) => ({ codigo: r.codigo, descripcion: r.descripcion })),
        noDescubiertos: a.requerimientos
          .filter((r) => !descubiertosIds.has(r.id))
          .map((r) => ({ codigo: r.codigo, descripcion: r.descripcion })),
        preguntasImproductivas: improductivas,
        turnosUsados: p.turnos.length,
        turnosMaximos: a.stakeholder.turnosMaximos,
      },
    };
  }

  /**
   * FA2: devuelve el id de una opción disponible del nodo actual que revela un
   * requerimiento aún no descubierto (si no hay, una productiva).
   */
  async aplicarAyuda(db: Db, intentoId: number): Promise<PistaDto> {
    const retoId = await retoIdDeIntento(db, intentoId);
    const a = await this.cargarArbol(db, retoId);
    const p = await this.cargarProgreso(db, intentoId);

    const elegidas = new Set(p.turnos.map((t) => t.opcionId));
    const descubiertos = new Set(
      p.turnos.flatMap((t) => (t.opcion.requerimiento ? [t.opcion.requerimiento.id] : [])),
    );
    const ultimo = p.turnos[p.turnos.length - 1];
    const nodoActualId = ultimo?.opcion.siguienteNodoId ?? a.inicial.id;
    const { opciones } = opcionesDisponibles(nodoActualId, a.inicial.id, a.opciones, elegidas);

    const elegida =
      opciones.find((o) => o.requerimientoId !== null && !descubiertos.has(o.requerimientoId)) ??
      opciones.find((o) => o.productiva) ??
      opciones[0];
    return { tipo: 'OPCION_DIALOGO', opcionId: elegida?.id ?? null };
  }

  /** Requerimientos descubiertos en los intentos CALIFICADOS del estudiante (postcondición 4 del CU-01). */
  async libreta(db: Db, estudianteId: number, retoId: number) {
    const reqs = await db.requerimientoOculto.findMany({
      where: {
        retoId,
        opcionesQueLoRevelan: {
          some: {
            turnos: { some: { intento: { estudianteId, estado: 'CALIFICADO' } } },
          },
        },
      },
      orderBy: { codigo: 'asc' },
    });
    return reqs.map((r) => ({ codigo: r.codigo, descripcion: r.descripcion }));
  }
}
