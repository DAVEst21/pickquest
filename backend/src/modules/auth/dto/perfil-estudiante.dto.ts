export class RachaDto {
  diasActuales: number;
  diasRecord: number;
  /** @example 1 */
  multiplicadorQP: number;
}

export class PerfilEstudianteDto {
  id: number;
  email: string;
  nombreAventurero: string;
  avatar: string | null;
  nivel: number;
  xpTotal: number;
  /** XP acumulada necesaria para pasar al siguiente nivel. */
  xpSiguienteNivel: number;
  qpTotal: number;
  racha: RachaDto | null;
}

export class SesionDto {
  /** JWT para enviar como "Authorization: Bearer <token>". */
  accessToken: string;
  estudiante: PerfilEstudianteDto;
}
