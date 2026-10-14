import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { PrismaService } from '../../common/prisma/prisma.service';
import { EstudianteActual } from '../auth/decorators/estudiante-actual.decorator';
import { EstudianteAutenticado } from '../auth/estudiante-autenticado';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ObjetoEquipadoDto } from './economia.dto';
import { EconomiaService } from './economia.service';

@ApiTags('Economía')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Token ausente o inválido' })
@UseGuards(JwtAuthGuard)
@Controller()
export class EconomiaController {
  constructor(
    private readonly economia: EconomiaService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('inventario/equipados')
  @ApiOperation({
    summary: 'Objetos equipados del estudiante con su cantidad (cinto de ayudas, RF-03)',
  })
  equipados(@EstudianteActual() estudiante: EstudianteAutenticado): Promise<ObjetoEquipadoDto[]> {
    return this.economia.equipados(this.prisma, estudiante.id);
  }
}
