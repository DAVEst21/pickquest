import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { MAX_UNIDADES_POR_OBJETO } from './tienda.reglas';

/** POST /tienda/compras */
export class ComprarDto {
  @IsInt()
  @Min(1)
  objetoId: number;

  /** Cantidad ≥ 1 (RN-28 limita el total en inventario a 5). */
  @IsInt()
  @Min(1)
  @Max(MAX_UNIDADES_POR_OBJETO)
  cantidad: number;
}

/** POST /inventario/:objetoId/equipar */
export class EquiparDto {
  /** Objeto equipado que se reemplaza cuando el cinto ya tiene 2 (FA2, RN-10). */
  @IsOptional()
  @IsInt()
  @Min(1)
  reemplazaObjetoId?: number;
}

export class ObjetoTiendaDto {
  objetoId: number;
  nombre: string;
  /** POCION, PERGAMINO o RELIQUIA. */
  tipo: string;
  costoQP: number;
  efecto: string;
  rareza: string;
  /** null: sirve en cualquier reto; con valor, solo en los retos de esa fase. */
  tema: string | null;
  dondeSeUsa: string;
  /** Unidades que el estudiante ya tiene. */
  unidades: number;
  equipado: boolean;
}

export class TiendaDto {
  saldoQP: number;
  maxUnidadesPorObjeto: number;
  maxEquipados: number;
  /** Objetos equipados ahora (cinto). */
  equipados: number;
  catalogo: ObjetoTiendaDto[];
}

export class ObjetoDetalleDto extends ObjetoTiendaDto {
  /** Retos en los que puede usarse. */
  retos: { retoId: number; titulo: string; fase: string }[];
}

export class CompraRealizadaDto {
  compraId: number;
  objetoId: number;
  nombre: string;
  cantidad: number;
  qpPagados: number;
  /** Saldo de QP después de la compra. */
  saldoQP: number;
  /** Unidades en el inventario después de la compra. */
  unidades: number;
  equipado: boolean;
}

export class InventarioObjetoDto {
  objetoId: number;
  nombre: string;
  tipo: string;
  efecto: string;
  rareza: string;
  tema: string | null;
  dondeSeUsa: string;
  cantidad: number;
  equipado: boolean;
}
