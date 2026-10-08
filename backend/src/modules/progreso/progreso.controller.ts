import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { EstudianteActual } from '../auth/decorators/estudiante-actual.decorator';
import { EstudianteAutenticado } from '../auth/estudiante-autenticado';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProgresoService } from './progreso.service';

@ApiTags('Progreso')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Token ausente o inválido' })
@UseGuards(JwtAuthGuard)
@Controller('progreso')
export class ProgresoController {
  constructor(private readonly progreso: ProgresoService) {}

  @Get()
  @ApiOperation({
    summary:
      'Consultar progreso propio sin modificarlo; null indica una definición o dato pendiente',
  })
  consultar(@EstudianteActual() estudiante: EstudianteAutenticado) {
    return this.progreso.consultar(estudiante.id);
  }
}
