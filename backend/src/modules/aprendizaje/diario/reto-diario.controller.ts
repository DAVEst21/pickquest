import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { EstudianteActual } from '../../auth/decorators/estudiante-actual.decorator';
import { EstudianteAutenticado } from '../../auth/estudiante-autenticado';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import {
  EstadoRetoDiarioDto,
  HoyDto,
  PreguntaEntregadaDto,
  RespuestaRetoDiarioDto,
  ResponderPreguntaDto,
} from './reto-diario.dto';
import { RetoDiarioService } from './reto-diario.service';

@ApiTags('Reto diario (CU-11)')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Token ausente o inválido' })
@UseGuards(JwtAuthGuard)
@Controller('reto-diario')
export class RetoDiarioController {
  constructor(private readonly diario: RetoDiarioService) {}

  @Get('hoy')
  @ApiOperation({
    summary: 'CU-11: racha, multiplicador y reglas; si ya hay reto del día, su estado o resultado y el tiempo al siguiente (FE1)',
  })
  hoy(@EstudianteActual() estudiante: EstudianteAutenticado): Promise<HoyDto> {
    return this.diario.hoy(estudiante.id);
  }

  @Post()
  @ApiOperation({
    summary: 'CU-11: inicia el reto diario (10 preguntas de los temas desbloqueados) o retoma el del día',
  })
  @ApiConflictResponse({ description: 'FE1: ya se realizó el reto de hoy; incluye el resultado y los segundos al siguiente' })
  iniciar(@EstudianteActual() estudiante: EstudianteAutenticado): Promise<EstadoRetoDiarioDto> {
    return this.diario.iniciar(estudiante.id);
  }

  @Post(':retoDiarioId/preguntas/:numero/entregar')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'CU-11: el servidor habilita la pregunta y arranca su reloj; devuelve la pregunta sin la opción correcta',
  })
  @ApiNotFoundResponse({ description: 'El reto no existe o no es del estudiante' })
  @ApiConflictResponse({ description: 'Falta resolver la anterior, ya se resolvió o el reto terminó' })
  entregar(
    @EstudianteActual() estudiante: EstudianteAutenticado,
    @Param('retoDiarioId', ParseIntPipe) retoDiarioId: number,
    @Param('numero', ParseIntPipe) numero: number,
  ): Promise<PreguntaEntregadaDto> {
    return this.diario.entregar(estudiante.id, retoDiarioId, numero);
  }

  @Post(':retoDiarioId/preguntas/:numero/respuesta')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'CU-11: responde una pregunta; es correcta solo si la opción lo es y llegó en 20 s + 1 s de tolerancia (RNF-SE-05)',
    description: 'opcionId null significa que se agotó el tiempo (FA1). Después de la décima respuesta el reto termina solo.',
  })
  @ApiBadRequestResponse({ description: 'Opción de otra pregunta' })
  responder(
    @EstudianteActual() estudiante: EstudianteAutenticado,
    @Param('retoDiarioId', ParseIntPipe) retoDiarioId: number,
    @Param('numero', ParseIntPipe) numero: number,
    @Body() cuerpo: ResponderPreguntaDto,
  ): Promise<RespuestaRetoDiarioDto> {
    return this.diario.responder(estudiante.id, retoDiarioId, numero, cuerpo.opcionId);
  }

  @Post(':retoDiarioId/abandonar')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'CU-11 FA2: abandona; lo no respondido cuenta como incorrecto y el reto del día queda realizado' })
  abandonar(
    @EstudianteActual() estudiante: EstudianteAutenticado,
    @Param('retoDiarioId', ParseIntPipe) retoDiarioId: number,
  ): Promise<EstadoRetoDiarioDto> {
    return this.diario.abandonar(estudiante.id, retoDiarioId);
  }
}
