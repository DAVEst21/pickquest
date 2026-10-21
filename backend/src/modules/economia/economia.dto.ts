export class ObjetoEquipadoDto {
  objetoId: number;
  nombre: string;
  /** POCION, PERGAMINO o RELIQUIA. */
  tipo: string;
  efecto: string;
  rareza: string;
  /** Unidades disponibles; con 0 el objeto no se puede usar (RN-10). */
  cantidad: number;
}
