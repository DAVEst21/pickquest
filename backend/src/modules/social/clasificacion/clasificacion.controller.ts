import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { EstudianteActual } from '../../auth/decorators/estudiante-actual.decorator';
import { EstudianteAutenticado } from '../../auth/estudiante-autenticado';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ClasificacionDto, ClasificacionService } from './clasificacion.service';

@ApiTags('Clasificación (RF-20)')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Token ausente o inválido' })
@UseGuards(JwtAuthGuard)
@Controller('clasificacion')
export class ClasificacionController {
  constructor(private readonly clasificacion: ClasificacionService) {}

  @Get()
  @ApiOperation({
    summary: 'RF-20: tabla de clasificación por XP total, con desempate por estrellas y por quien llegó antes (RN-30)',
    description: 'Solo expone nombre de aventurero, nivel, XP y estrellas (RNF-SE-04). Se calcula al consultar (RNF-PE-05).',
  })
  consultar(@EstudianteActual() estudiante: EstudianteAutenticado): Promise<ClasificacionDto> {
    return this.clasificacion.clasificacion(estudiante.id);
  }
}
