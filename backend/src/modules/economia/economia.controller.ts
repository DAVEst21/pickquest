import { BadRequestException, Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
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
    description:
      'Con retoId solo devuelve los objetos aplicables a ese reto (RN-10, CU-12): los de tema nulo y los de la fase del reto.',
  })
  @ApiQuery({ name: 'retoId', required: false, type: Number })
  async equipados(
    @EstudianteActual() estudiante: EstudianteAutenticado,
    @Query('retoId') retoIdTexto?: string,
  ): Promise<ObjetoEquipadoDto[]> {
    let tema;
    if (retoIdTexto !== undefined) {
      const retoId = Number(retoIdTexto);
      if (!Number.isInteger(retoId) || retoId <= 0) throw new BadRequestException('retoId no es válido');
      const reto = await this.prisma.reto.findUnique({
        where: { id: retoId },
        select: { fase: { select: { tema: true } } },
      });
      tema = reto?.fase.tema;
    }
    return this.economia.equipados(this.prisma, estudiante.id, tema);
  }
}
