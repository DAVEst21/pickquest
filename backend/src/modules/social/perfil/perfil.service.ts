import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { esErrorUnico } from '../../../common/prisma/prisma-errores';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { cargarProgresoFases } from '../../aprendizaje/progreso-fases';
import { PlanService } from '../../aprendizaje/plan/plan.service';
import { TiendaService } from '../../economia/tienda.service';
import { MAX_EQUIPADOS } from '../../economia/tienda.reglas';
import { calcularNivel, INCREMENTO_UMBRAL } from '../../progreso/nivel';
import { leerRachaVigente } from '../../progreso/racha';
import { ActualizarPerfilDto, EstrellasFaseDto, PerfilCompletoDto } from './perfil.dto';

/** RF-19 Perfil: nivel, XP, QP, racha real, inventario, estrellas por fase, avatar, nombre y plan activo. */
@Injectable()
export class PerfilService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tienda: TiendaService,
    private readonly plan: PlanService,
  ) {}

  async perfil(estudianteId: number): Promise<PerfilCompletoDto> {
    const estudiante = await this.prisma.estudiante.findUnique({ where: { id: estudianteId } });
    if (!estudiante) throw new NotFoundException('Estudiante no encontrado');
    const racha = await leerRachaVigente(this.prisma, estudianteId);
    const { fases, resumen } = await cargarProgresoFases(this.prisma, estudianteId);

    const estrellasPorFase: EstrellasFaseDto[] = fases.map((f) => {
      const resumenes = f.retos.map((r) => resumen.get(r.id));
      const aprobados = resumenes.filter((r) => r?.aprobado).length;
      const estrellas = resumenes.reduce((suma, r) => suma + (r?.mejorEstrellas ?? 0), 0);
      return {
        faseId: f.id,
        orden: f.orden,
        nombre: f.nombre,
        tema: f.tema,
        retosAprobados: aprobados,
        totalRetos: f.retos.length,
        estrellas,
        estrellasMaximas: f.retos.length * 3,
        calificacionEstrellasFase:
          f.retos.length > 0 && aprobados === f.retos.length ? Math.round(estrellas / f.retos.length) : null,
      };
    });
    const nivel = calcularNivel(estudiante.xpTotal);
    return {
      nombreAventurero: estudiante.nombreAventurero,
      email: estudiante.email,
      avatar: estudiante.avatar || null,
      nivel: nivel.nivel,
      xpTotal: estudiante.xpTotal,
      xpSiguienteNivel: nivel.xpSiguienteNivel,
      xpNivelActual: nivel.xpSiguienteNivel - INCREMENTO_UMBRAL,
      qpTotal: estudiante.qpTotal,
      racha: { diasActuales: racha.dias, diasRecord: racha.record, multiplicadorQP: racha.multiplicador },
      estrellasTotales: estrellasPorFase.reduce((suma, f) => suma + f.estrellas, 0),
      estrellasPorFase,
      inventario: await this.tienda.inventario(this.prisma, estudianteId),
      maxEquipados: MAX_EQUIPADOS,
      planActivo: (await this.plan.planActivo(estudianteId)).plan,
    };
  }

  /** Cambia el nombre de aventurero (único) y/o el avatar. */
  async actualizar(estudianteId: number, cambios: ActualizarPerfilDto): Promise<PerfilCompletoDto> {
    try {
      await this.prisma.estudiante.update({
        where: { id: estudianteId },
        data: {
          ...(cambios.nombreAventurero !== undefined ? { nombreAventurero: cambios.nombreAventurero } : {}),
          ...(cambios.avatar !== undefined ? { avatar: cambios.avatar } : {}),
        },
      });
    } catch (error) {
      if (esErrorUnico(error)) throw new ConflictException('Ya existe un estudiante con ese nombre de aventurero');
      throw error;
    }
    return this.perfil(estudianteId);
  }
}
