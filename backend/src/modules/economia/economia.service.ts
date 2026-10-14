import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

type Db = Prisma.TransactionClient;

export interface ObjetoEquipado {
  objetoId: number;
  nombre: string;
  tipo: string;
  efecto: string;
  rareza: string;
  cantidad: number;
}

/**
 * Módulo de economía (RNF-MA-01). En este sprint solo cubre lo que necesita
 * la ayuda (RF-03, RN-10); tienda, compra y equipar son del Sprint 3.
 */
@Injectable()
export class EconomiaService {
  /** Objetos equipados del estudiante, con su cantidad (para el cinto de ayudas). */
  async equipados(db: Db, estudianteId: number): Promise<ObjetoEquipado[]> {
    const filas = await db.inventarioObjeto.findMany({
      where: { estudianteId, equipado: true },
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
    }));
  }

  /**
   * RN-10: solo se pueden usar objetos EQUIPADOS con cantidad mayor a 0.
   * Valida que el objeto sea del estudiante, esté equipado y tenga cantidad, y
   * descuenta una unidad.
   */
  async consumirObjetoEquipado(db: Db, estudianteId: number, objetoId: number): Promise<void> {
    const fila = await db.inventarioObjeto.findUnique({
      where: { estudianteId_objetoId: { estudianteId, objetoId } },
    });
    if (!fila) {
      throw new BadRequestException('Ese objeto no está en tu inventario');
    }
    if (!fila.equipado) {
      throw new BadRequestException('Solo puedes usar objetos equipados');
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
