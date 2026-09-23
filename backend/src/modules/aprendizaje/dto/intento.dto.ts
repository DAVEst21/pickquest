export class IntentoDto {
  id: number;
  retoId: number;
  faseId: number;
  /** 0-100 */
  porcentaje: number;
  /** 0-3 */
  calificacionEstrellas: number;
  aprobado: boolean;
  /** Solo la primera aprobación de un reto otorga recompensa. */
  xpGanado: number;
  qpGanado: number;
  /** Calculado por el servidor: hubo ayuda registrada antes de este envío. */
  usoAyuda: boolean;
  createdAt: Date;
}

export class AyudaRegistradaDto {
  retoId: number;
  /** Ayudas registradas que se asociarán al próximo intento enviado. */
  ayudasPendientes: number;
}
