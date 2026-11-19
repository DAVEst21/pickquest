import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma, TemaFase } from '@prisma/client';

type Db = Prisma.TransactionClient;

export interface ObjetoEquipado {
  objetoId: number;
  nombre: string;
  tipo: string;
  efecto: string;
  rareza: string;
  cantidad: number;
  /** null: sirve en cualquier reto; con valor, solo en los retos de esa fase. */
  tema: TemaFase | null;
}

/**
 * Módulo de economía (RNF-MA-01): ayudas (RF-03, RN-10), tienda y compra
 * (RF-15, RN-11, RN-28) y cinto de objetos equipados (RN-10).
 */
@Injectable()
export class EconomiaService {
  /**
   * Objetos equipados del estudiante, con su cantidad (para el cinto de ayudas).
   * Con `tema` solo devuelve los aplicables a un reto de esa fase (RN-10, CU-12).
   */
  async equipados(db: Db, estudianteId: number, tema?: TemaFase): Promise<ObjetoEquipado[]> {
    const filas = await db.inventarioObjeto.findMany({
      where: {
        estudianteId,
        equipado: true,
        ...(tema ? { objeto: { OR: [{ tema: null }, { tema }] } } : {}),
      },
      include: { objeto: true },
      orderBy: { objetoId: 'asc' },
    });
    return filas.map((f) => ({
      objetoId: f.objetoId,
      nombre: f.objeto.nombre,
      tipo: f.objeto.tipo,
      efecto: f.objeto.efecto,
      rareza: f.objeto.rareza,
      cantidad: f.cantidad,
      tema: f.objeto.tema,
    }));
  }

  /**
   * RN-10: solo se pueden usar objetos EQUIPADOS con cantidad mayor a 0.
   * Valida que el objeto sea del estudiante, esté equipado y tenga cantidad, y
   * descuenta una unidad.
   */
  async consumirObjetoEquipado(
    db: Db,
    estudianteId: number,
    objetoId: number,
    temaDelReto?: TemaFase,
  ): Promise<void> {
    const fila = await db.inventarioObjeto.findUnique({
      where: { estudianteId_objetoId: { estudianteId, objetoId } },
      include: { objeto: true },
    });
    if (!fila) {
      throw new BadRequestException('Ese objeto no está en tu inventario');
    }
    if (!fila.equipado) {
      throw new BadRequestException('Solo puedes usar objetos equipados');
    }
    if (temaDelReto && fila.objeto.tema && fila.objeto.tema !== temaDelReto) {
      // CU-12 / FA2 paso 2: solo se ofrecen y aceptan ayudas aplicables al reto.
      throw new BadRequestException('Ese objeto no se puede usar en este reto');
    }
    if (fila.cantidad <= 0) {
      throw new BadRequestException('Ya no te quedan unidades de ese objeto');
    }
    // Condición en el WHERE: si otra petición gastó la última unidad, no descuenta de más.
    const { count } = await db.inventarioObjeto.updateMany({
      where: { estudianteId, objetoId, equipado: true, cantidad: { gt: 0 } },
      data: { cantidad: { decrement: 1 } },
    });
    if (count === 0) {
      throw new BadRequestException('Ya no te quedan unidades de ese objeto');
    }
  }
}
