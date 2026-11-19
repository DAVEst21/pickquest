import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { EstudianteActual } from '../../auth/decorators/estudiante-actual.decorator';
import { EstudianteAutenticado } from '../../auth/estudiante-autenticado';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ActualizarPerfilDto, PerfilCompletoDto } from './perfil.dto';
import { PerfilService } from './perfil.service';

@ApiTags('Perfil (RF-19)')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Token ausente o inválido' })
@UseGuards(JwtAuthGuard)
@Controller('perfil')
export class PerfilController {
  constructor(private readonly perfil: PerfilService) {}

  @Get()
  @ApiOperation({
    summary: 'RF-19: perfil completo del propio estudiante',
    description:
      'Nivel, XP, QP, racha real con multiplicador, inventario, estrellas por fase, avatar, nombre y plan de estudio activo con su avance.',
  })
  obtener(@EstudianteActual() estudiante: EstudianteAutenticado): Promise<PerfilCompletoDto> {
    return this.perfil.perfil(estudiante.id);
  }

  @Patch()
  @ApiOperation({ summary: 'RF-19: cambia el nombre de aventurero y/o el avatar' })
  @ApiBadRequestResponse({ description: 'Nombre o avatar no válidos' })
  @ApiConflictResponse({ description: 'Ya existe un estudiante con ese nombre de aventurero' })
  actualizar(
    @EstudianteActual() estudiante: EstudianteAutenticado,
    @Body() cambios: ActualizarPerfilDto,
  ): Promise<PerfilCompletoDto> {
    return this.perfil.actualizar(estudiante.id, cambios);
  }
}
