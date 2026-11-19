import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { EstudianteActual } from '../../auth/decorators/estudiante-actual.decorator';
import { EstudianteAutenticado } from '../../auth/estudiante-autenticado';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AutoevaluarDto, MaterialTemaDto, SesionRepasoDto, TemaEstudioDto } from './estudio.dto';
import { EstudioService } from './estudio.service';

@ApiTags('Estudio (CU-09)')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Token ausente o inválido' })
@UseGuards(JwtAuthGuard)
@Controller('estudio')
export class EstudioController {
  constructor(private readonly estudio: EstudioService) {}

  @Get('temas')
  @ApiOperation({ summary: 'CU-09: biblioteca de estudio, un tema por fase con su estado (RF-12)' })
  temas(@EstudianteActual() estudiante: EstudianteAutenticado): Promise<TemaEstudioDto[]> {
    return this.estudio.temas(estudiante.id);
  }

  @Get('temas/:faseId')
  @ApiOperation({ summary: 'CU-09: explicación, ejemplos y glosario del tema' })
  @ApiForbiddenResponse({ description: 'FE1: el tema se desbloquea al completar la fase anterior (RN-01)' })
  @ApiNotFoundResponse({ description: 'La fase no existe' })
  material(
    @EstudianteActual() estudiante: EstudianteAutenticado,
    @Param('faseId', ParseIntPipe) faseId: number,
  ): Promise<MaterialTemaDto> {
    return this.estudio.material(estudiante.id, faseId);
  }

  @Post('temas/:faseId/consultas')
  @ApiOperation({ summary: 'CU-09 FA1: registra que el estudiante cerró el material sin repasar' })
  @ApiForbiddenResponse({ description: 'FE1: fase bloqueada' })
  registrarConsulta(
    @EstudianteActual() estudiante: EstudianteAutenticado,
    @Param('faseId', ParseIntPipe) faseId: number,
  ): Promise<{ consultaId: number }> {
    return this.estudio.registrarConsulta(estudiante.id, faseId);
  }

  @Post('temas/:faseId/sesiones')
  @ApiOperation({
    summary: 'CU-09: inicia el repaso o retoma la sesión sin terminar (FA2)',
    description: 'Incluye las tarjetas nuevas y las vencidas; si ninguna toca hoy, todo el mazo (RN-24).',
  })
  @ApiForbiddenResponse({ description: 'FE1: fase bloqueada' })
  iniciarSesion(
    @EstudianteActual() estudiante: EstudianteAutenticado,
    @Param('faseId', ParseIntPipe) faseId: number,
  ): Promise<SesionRepasoDto> {
    return this.estudio.iniciarSesion(estudiante.id, faseId);
  }

  @Get('sesiones/:sesionId')
  @ApiOperation({ summary: 'CU-09: estado de una sesión de repaso propia' })
  @ApiNotFoundResponse({ description: 'La sesión no existe o no es del estudiante' })
  sesion(
    @EstudianteActual() estudiante: EstudianteAutenticado,
    @Param('sesionId', ParseIntPipe) sesionId: number,
  ): Promise<SesionRepasoDto> {
    return this.estudio.sesion(estudiante.id, sesionId);
  }

  @Post('sesiones/:sesionId/tarjetas/:tarjetaId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'CU-09: autoevaluación de una tarjeta (RN-24); al terminar la sesión otorga 10 XP una vez al día (RN-25)',
  })
  @ApiBadRequestResponse({ description: 'Autoevaluación no válida' })
  @ApiNotFoundResponse({ description: 'La sesión o la tarjeta no existen' })
  @ApiConflictResponse({ description: 'La sesión ya terminó o la tarjeta ya se evaluó' })
  autoevaluar(
    @EstudianteActual() estudiante: EstudianteAutenticado,
    @Param('sesionId', ParseIntPipe) sesionId: number,
    @Param('tarjetaId', ParseIntPipe) tarjetaId: number,
    @Body() cuerpo: AutoevaluarDto,
  ): Promise<SesionRepasoDto> {
    return this.estudio.autoevaluar(estudiante.id, sesionId, tarjetaId, cuerpo.autoevaluacion);
  }
}
