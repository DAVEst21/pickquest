import { IsOptional, IsString, Length, Matches, MaxLength } from 'class-validator';
import { InventarioObjetoDto } from '../../economia/tienda.dto';
import { PlanEstudioDto } from '../../aprendizaje/plan/plan.dto';

/** PATCH /perfil: nombre de aventurero y/o avatar (RF-19). */
export class ActualizarPerfilDto {
  /** Nombre visible y único: letras, números, guion o guion bajo. */
  @IsOptional()
  @IsString()
  @Length(3, 30)
  @Matches(/^[\p{L}\p{N}_-]+$/u, {
    message: 'nombreAventurero solo puede contener letras, números, guion o guion bajo',
  })
  nombreAventurero?: string;

  /** URL http(s) de la imagen; cadena vacía para quitar el avatar. */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Matches(/^(https?:\/\/\S+)?$/, { message: 'avatar debe ser una URL http(s) o estar vacío' })
  avatar?: string;
}

export class EstrellasFaseDto {
  faseId: number;
  orden: number;
  nombre: string;
  tema: string;
  retosAprobados: number;
  totalRetos: number;
  /** Suma de las mejores estrellas de cada reto de la fase. */
  estrellas: number;
  estrellasMaximas: number;
  /** Solo con la fase completada: promedio de sus mejores marcas. */
  calificacionEstrellasFase: number | null;
}

/** RF-19: el perfil completo del propio estudiante. */
export class PerfilCompletoDto {
  nombreAventurero: string;
  email: string;
  avatar: string | null;
  nivel: number;
  xpTotal: number;
  /** XP acumulada necesaria para el siguiente nivel. */
  xpSiguienteNivel: number;
  /** XP acumulada con la que empezó el nivel actual. */
  xpNivelActual: number;
  qpTotal: number;
  racha: { diasActuales: number; diasRecord: number; multiplicadorQP: number };
  estrellasTotales: number;
  estrellasPorFase: EstrellasFaseDto[];
  inventario: InventarioObjetoDto[];
  maxEquipados: number;
  /** Plan de estudio activo con su avance, o null. */
  planActivo: PlanEstudioDto | null;
}
