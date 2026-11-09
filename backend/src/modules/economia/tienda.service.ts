import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Objeto, Prisma, TemaFase } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { transaccionDeEstudiante } from '../../common/prisma/transaccion-estudiante';
import {
  CompraRealizadaDto,
  InventarioObjetoDto,
  ObjetoDetalleDto,
  ObjetoTiendaDto,
  TiendaDto,
} from './tienda.dto';
import { decidirEquipar, evaluarCompra, MAX_EQUIPADOS, MAX_UNIDADES_POR_OBJETO } from './tienda.reglas';

type Db = Prisma.TransactionClient;

const NOMBRE_TEMA: Record<TemaFase, string> = {
  CICLO_VIDA: 'Ciclo de vida del software',
  ELICITACION: 'Elicitación de requerimientos',
  ATRIBUTOS_CALIDAD: 'Atributos de calidad',
};

/**
 * CU-12 Tienda (RF-15): catálogo, compra y equipado de objetos.
 * RN-10 (máx. 2 equipados), RN-11 (compra atómica) y RN-28 (máx. 5 unidades).
 */
@Injectable()
export class TiendaService {
  constructor(private readonly prisma: PrismaService) {}

  /** Texto de «dónde se usa»: tema nulo = cualquier reto (paso 4 del flujo normal). */
  private dondeSeUsa(tema: TemaFase | null): string {
    return tema === null ? 'Cualquier reto' : `Solo en los retos de ${NOMBRE_TEMA[tema]}`;
  }

  private aTienda(o: Objeto, unidades: number, equipado: boolean): ObjetoTiendaDto {
    return {
      objetoId: o.id,
      nombre: o.nombre,
      tipo: o.tipo,
      costoQP: o.costoQP,
      efecto: o.efecto,
      rareza: o.rareza,
      tema: o.tema,
      dondeSeUsa: this.dondeSeUsa(o.tema),
      unidades,
      equipado,
    };
  }

  /** RF-15 paso 2: catálogo con precio, efecto y rareza, saldo de QP y unidades que ya tiene. */
  async tienda(estudianteId: number): Promise<TiendaDto> {
    const estudiante = await this.prisma.estudiante.findUniqueOrThrow({
      where: { id: estudianteId },
      select: { qpTotal: true },
    });
    const objetos = await this.prisma.objeto.findMany({ orderBy: [{ costoQP: 'asc' }, { id: 'asc' }] });
    const inventario = await this.prisma.inventarioObjeto.findMany({ where: { estudianteId } });
    const fila = new Map(inventario.map((i) => [i.objetoId, i]));
    return {
      saldoQP: estudiante.qpTotal,
      maxUnidadesPorObjeto: MAX_UNIDADES_POR_OBJETO,
      maxEquipados: MAX_EQUIPADOS,
      equipados: inventario.filter((i) => i.equipado).length,
      catalogo: objetos.map((o) => this.aTienda(o, fila.get(o.id)?.cantidad ?? 0, fila.get(o.id)?.equipado ?? false)),
    };
  }

  /** Paso 4: detalle del objeto y los retos en los que puede usarse. */
  async detalle(estudianteId: number, objetoId: number): Promise<ObjetoDetalleDto> {
    const objeto = await this.prisma.objeto.findUnique({ where: { id: objetoId } });
    if (!objeto) throw new NotFoundException(`El objeto ${objetoId} no existe`);
    const fila = await this.prisma.inventarioObjeto.findUnique({
      where: { estudianteId_objetoId: { estudianteId, objetoId } },
    });
    const retos = await this.prisma.reto.findMany({
      where: objeto.tema ? { fase: { tema: objeto.tema } } : {},
      orderBy: [{ fase: { orden: 'asc' } }, { orden: 'asc' }],
      select: { id: true, titulo: true, fase: { select: { nombre: true, orden: true } } },
    });
    return {
      ...this.aTienda(objeto, fila?.cantidad ?? 0, fila?.equipado ?? false),
      retos: retos.map((r) => ({ retoId: r.id, titulo: r.titulo, fase: r.fase.nombre })),
    };
  }

  /**
   * Pasos 5 y 6. En una sola transacción: verifica saldo (FE1) y límite (FE2),
   * descuenta los QP, suma las unidades y registra la compra (RN-11, RNF-RE-04).
   */
  comprar(estudianteId: number, objetoId: number, cantidad: number): Promise<CompraRealizadaDto> {
    return transaccionDeEstudiante(this.prisma, estudianteId, async (tx) => {
      const objeto = await tx.objeto.findUnique({ where: { id: objetoId } });
      if (!objeto) throw new NotFoundException(`El objeto ${objetoId} no existe`);
      const estudiante = await tx.estudiante.findUniqueOrThrow({
        where: { id: estudianteId },
        select: { qpTotal: true },
      });
      const fila = await tx.inventarioObjeto.findUnique({
        where: { estudianteId_objetoId: { estudianteId, objetoId } },
      });
      const evaluacion = evaluarCompra(estudiante.qpTotal, objeto.costoQP, cantidad, fila?.cantidad ?? 0);
      if ('motivo' in evaluacion && evaluacion.motivo === 'SALDO_INSUFICIENTE') {
        throw new BadRequestException({
          statusCode: 400,
          error: 'Bad Request',
          message: `Te faltan ${evaluacion.qpFaltantes} QP para comprar ${cantidad} × ${objeto.nombre} (cuesta ${evaluacion.total} QP y tienes ${estudiante.qpTotal})`,
          qpFaltantes: evaluacion.qpFaltantes,
          total: evaluacion.total,
        });
      }
      if ('motivo' in evaluacion && evaluacion.motivo === 'LIMITE_UNIDADES') {
        throw new BadRequestException({
          statusCode: 400,
          error: 'Bad Request',
          message:
            evaluacion.disponibles === 0
              ? `Ya tienes el máximo de ${evaluacion.limite} unidades de ${objeto.nombre}`
              : `Solo puedes tener ${evaluacion.limite} unidades de ${objeto.nombre}: ya tienes ${evaluacion.unidadesActuales} y puedes comprar ${evaluacion.disponibles} más`,
          limite: evaluacion.limite,
          unidadesActuales: evaluacion.unidadesActuales,
          disponibles: evaluacion.disponibles,
        });
      }
      if ('motivo' in evaluacion) throw new BadRequestException('La compra no procede');
      // Condición en el WHERE: nunca deja el saldo negativo, aunque otra operación lo haya gastado.
      const { count } = await tx.estudiante.updateMany({
        where: { id: estudianteId, qpTotal: { gte: evaluacion.total } },
        data: { qpTotal: { decrement: evaluacion.total } },
      });
      if (count === 0) throw new ConflictException('Tu saldo cambió mientras comprabas; vuelve a intentarlo');
      await tx.inventarioObjeto.upsert({
        where: { estudianteId_objetoId: { estudianteId, objetoId } },
        update: { cantidad: { increment: cantidad } },
        create: { estudianteId, objetoId, cantidad, equipado: false },
      });
      const compra = await tx.compraObjeto.create({
        data: { estudianteId, objetoId, cantidad, qpPagados: evaluacion.total },
      });
      return {
        compraId: compra.id,
        objetoId,
        nombre: objeto.nombre,
        cantidad,
        qpPagados: evaluacion.total,
        saldoQP: evaluacion.saldoFinal,
        unidades: evaluacion.unidadesFinales,
        equipado: fila?.equipado ?? false,
      };
    });
  }

  /** Inventario completo del estudiante (perfil, RF-19). */
  async inventario(db: Db | PrismaService, estudianteId: number): Promise<InventarioObjetoDto[]> {
    const filas = await db.inventarioObjeto.findMany({
      where: { estudianteId },
      include: { objeto: true },
      orderBy: { objetoId: 'asc' },
    });
    return filas.map((f) => ({
      objetoId: f.objetoId,
      nombre: f.objeto.nombre,
      tipo: f.objeto.tipo,
      efecto: f.objeto.efecto,
      rareza: f.objeto.rareza,
      tema: f.objeto.tema,
      dondeSeUsa: this.dondeSeUsa(f.objeto.tema),
      cantidad: f.cantidad,
      equipado: f.equipado,
    }));
  }

  /**
   * Pasos 7 a 9 y FA2 (RN-10). Con el cinto lleno responde 409 con los equipados
   * para que el estudiante elija cuál reemplazar; con `reemplazaObjetoId`,
   * desequipa ese y equipa el nuevo en la misma transacción.
   */
  equipar(estudianteId: number, objetoId: number, reemplazaObjetoId?: number): Promise<InventarioObjetoDto[]> {
    return transaccionDeEstudiante(this.prisma, estudianteId, async (tx) => {
      const fila = await tx.inventarioObjeto.findUnique({
        where: { estudianteId_objetoId: { estudianteId, objetoId } },
      });
      if (!fila || fila.cantidad <= 0) throw new BadRequestException('Ese objeto no está en tu inventario');
      const inventario = await this.inventario(tx, estudianteId);
      const equipados = inventario.filter((i) => i.equipado);
      const decision = decidirEquipar(
        equipados.map((e) => e.objetoId),
        objetoId,
        reemplazaObjetoId,
      );
      switch (decision.accion) {
        case 'YA_EQUIPADO':
          return inventario;
        case 'PEDIR_REEMPLAZO':
          throw new ConflictException({
            statusCode: 409,
            error: 'Conflict',
            message: `Tu cinto ya tiene ${MAX_EQUIPADOS} objetos equipados: elige cuál reemplazar`,
            equipados,
          });
        case 'REEMPLAZO_INVALIDO':
          throw new BadRequestException('El objeto que quieres reemplazar no está equipado');
        case 'REEMPLAZAR':
          await tx.inventarioObjeto.update({
            where: { estudianteId_objetoId: { estudianteId, objetoId: decision.desequipar } },
            data: { equipado: false },
          });
          break;
        case 'EQUIPAR':
          break;
      }
      await tx.inventarioObjeto.update({
        where: { estudianteId_objetoId: { estudianteId, objetoId } },
        data: { equipado: true },
      });
      return this.inventario(tx, estudianteId);
    });
  }

  /** Quita un objeto del cinto (regresa al inventario). */
  desequipar(estudianteId: number, objetoId: number): Promise<InventarioObjetoDto[]> {
    return transaccionDeEstudiante(this.prisma, estudianteId, async (tx) => {
      const fila = await tx.inventarioObjeto.findUnique({
        where: { estudianteId_objetoId: { estudianteId, objetoId } },
      });
      if (!fila) throw new BadRequestException('Ese objeto no está en tu inventario');
      await tx.inventarioObjeto.update({
        where: { estudianteId_objetoId: { estudianteId, objetoId } },
        data: { equipado: false },
      });
      return this.inventario(tx, estudianteId);
    });
  }
}
