import { BadRequestException, Injectable } from '@nestjs/common';
import { Mecanica } from '@prisma/client';
import { Db, EvaluadorMecanica, retoIdDeIntento } from '../tipos';
import { validarCuerpo } from '../validar-cuerpo';
import { BorradorHistoriasDto } from './armado-piezas.dto';
import { calificarHistorias } from './armado-piezas.calificacion';

@Injectable()
export class ArmadoPiezasEvaluador implements EvaluadorMecanica {
  readonly mecanica = Mecanica.ARMADO_PIEZAS;
  async contenidoPublico(db: Db, retoId: number) {
    const historias = await db.historiaUsuario.findMany({
      where: { retoId },
      orderBy: { orden: 'asc' },
      select: {
        id: true,
        orden: true,
        necesidad: true,
        casillas: { select: { id: true, tipo: true }, orderBy: { id: 'asc' } },
      },
    });
    const piezas = await db.piezaHistoria.findMany({
      where: { retoId },
      orderBy: { orden: 'asc' },
      select: { id: true, tipo: true, texto: true },
    });
    return { historias, piezas };
  }
  async borrador(db: Db, intentoId: number) {
    const colocaciones = await db.respuestaCasilla.findMany({
      where: { intentoId },
      select: { casillaId: true, piezaId: true },
      orderBy: { casillaId: 'asc' },
    });
    return { colocaciones };
  }
  async guardarBorrador(db: Db, intentoId: number, cuerpo: unknown) {
    const { colocaciones } = validarCuerpo(BorradorHistoriasDto, cuerpo);
    const retoId = await retoIdDeIntento(db, intentoId);
    const casillas = await db.casillaHistoria.findMany({
      where: { historia: { retoId } },
    });
    const piezas = await db.piezaHistoria.findMany({ where: { retoId } });
    const retiradas = await db.distractorRetirado.findMany({
      where: { usoAyuda: { intentoId } },
    });
    const usadas = new Set<number>();
    for (const c of colocaciones) {
      const casilla = casillas.find((x) => x.id === c.casillaId);
      const pieza = piezas.find((x) => x.id === c.piezaId);
      if (!casilla || !pieza)
        throw new BadRequestException(
          'La casilla o pieza no pertenece a este reto',
        );
      if (casilla.tipo !== pieza.tipo)
        throw new BadRequestException(
          `La casilla acepta piezas de tipo ${casilla.tipo}`,
        );
      if (usadas.has(c.piezaId))
        throw new BadRequestException(
          'Una pieza solo puede ocupar una casilla',
        );
      if (retiradas.some((x) => x.piezaId === c.piezaId))
        throw new BadRequestException('La pieza fue retirada por la ayuda');
      usadas.add(c.piezaId);
    }
    await db.respuestaCasilla.deleteMany({ where: { intentoId } });
    await db.respuestaCasilla.createMany({
      data: colocaciones.map((c) => ({ intentoId, ...c })),
    });
  }
  async faltantes(db: Db, intentoId: number) {
    const retoId = await retoIdDeIntento(db, intentoId);
    const casillas = await db.casillaHistoria.findMany({
      where: { historia: { retoId } },
      include: { historia: true },
      orderBy: { id: 'asc' },
    });
    const { colocaciones } = await this.borrador(db, intentoId);
    return casillas
      .filter((c) => !colocaciones.some((x) => x.casillaId === c.id))
      .map((c) => `Historia ${c.historia.orden}: falta ${c.tipo}`);
  }
  async calificar(db: Db, intentoId: number) {
    const retoId = await retoIdDeIntento(db, intentoId);
    const historias = await db.historiaUsuario.findMany({
      where: { retoId },
      include: { casillas: true },
      orderBy: { orden: 'asc' },
    });
    const respuestas = await db.respuestaCasilla.findMany({
      where: { intentoId },
      include: { pieza: true },
    });
    return {
      porcentaje: calificarHistorias(
        historias.flatMap((h) => h.casillas),
        respuestas,
      ),
      retroalimentacion: {
        mecanica: this.mecanica,
        historias: historias.map((h) => ({
          historiaId: h.id,
          orden: h.orden,
          necesidad: h.necesidad,
          casillas: h.casillas.map((c) => {
            const elegida = respuestas.find((x) => x.casillaId === c.id);
            return {
              casillaId: c.id,
              tipo: c.tipo,
              piezaElegida: elegida?.pieza.texto ?? null,
              acertada: elegida?.piezaId === c.piezaCorrectaId,
            };
          }),
        })),
      },
    };
  }
  async aplicarAyuda(db: Db, intentoId: number) {
    const retoId = await retoIdDeIntento(db, intentoId);
    const piezas = await db.piezaHistoria.findMany({
      where: {
        retoId,
        referencias: { none: {} },
        respuestas: { none: { intentoId } },
      },
      orderBy: { orden: 'asc' },
      take: 2,
    });
    if (piezas.length !== 2)
      throw new BadRequestException(
        'Se necesitan dos distractores disponibles en el banco; no se consumió la ayuda',
      );
    return {
      tipo: 'DISTRACTORES_RETIRADOS',
      piezaIds: piezas.map((p) => p.id),
    };
  }
}
