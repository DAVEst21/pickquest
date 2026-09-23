import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
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
import { EstudianteActual } from '../auth/decorators/estudiante-actual.decorator';
import { EstudianteAutenticado } from '../auth/estudiante-autenticado';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AprendizajeService } from './aprendizaje.service';
import { EnviarIntentoDto } from './dto/enviar-intento.dto';
import { FaseDetalleDto, FaseDto } from './dto/fase.dto';
import { AyudaRegistradaDto, IntentoDto } from './dto/intento.dto';

@ApiTags('Aprendizaje')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Token ausente o inválido' })
@UseGuards(JwtAuthGuard)
@Controller()
export class AprendizajeController {
  constructor(private readonly aprendizaje: AprendizajeService) {}

  @Get('fases')
  @ApiOperation({
    summary: 'Listar las fases con su estado para el estudiante autenticado',
  })
  listarFases(
    @EstudianteActual() estudiante: EstudianteAutenticado,
  ): Promise<FaseDto[]> {
    return this.aprendizaje.listarFases(estudiante.id);
  }

  @Get('fases/:faseId')
  @ApiOperation({
    summary: 'Detalle de una fase con su reto y su contenido de apoyo',
  })
  @ApiNotFoundResponse({ description: 'La fase no existe' })
  detalleFase(
    @EstudianteActual() estudiante: EstudianteAutenticado,
    @Param('faseId', ParseIntPipe) faseId: number,
  ): Promise<FaseDetalleDto> {
    return this.aprendizaje.detalleFase(estudiante.id, faseId);
  }

  @Post('retos/:retoId/ayuda')
  @ApiOperation({
    summary: 'Registrar el uso de una ayuda en un reto',
    description:
      'La ayuda queda pendiente y se asocia al próximo intento que se envíe, que quedará con usoAyuda = true.',
  })
  @ApiNotFoundResponse({ description: 'El reto no existe' })
  @ApiForbiddenResponse({ description: 'La fase del reto está bloqueada' })
  registrarAyuda(
    @EstudianteActual() estudiante: EstudianteAutenticado,
    @Param('retoId', ParseIntPipe) retoId: number,
  ): Promise<AyudaRegistradaDto> {
    return this.aprendizaje.registrarAyuda(estudiante.id, retoId);
  }

  @Post('retos/:retoId/intentos')
  @ApiOperation({
    summary: 'Enviar la solución de un reto',
    description:
      'El servidor calcula porcentaje, calificacionEstrellas, aprobado, xpGanado, qpGanado y usoAyuda. Solo se acepta la respuesta.',
  })
  @ApiBadRequestResponse({
    description: 'Cuerpo inválido o preguntas que no existen en el reto',
  })
  @ApiNotFoundResponse({ description: 'El reto no existe' })
  @ApiForbiddenResponse({ description: 'La fase del reto está bloqueada' })
  @ApiConflictResponse({ description: 'Envío concurrente; reintentar' })
  enviarIntento(
    @EstudianteActual() estudiante: EstudianteAutenticado,
    @Param('retoId', ParseIntPipe) retoId: number,
    @Body() dto: EnviarIntentoDto,
  ): Promise<IntentoDto> {
    return this.aprendizaje.enviarIntento(estudiante.id, retoId, dto);
  }

  @Get('intentos/:intentoId')
  @ApiOperation({ summary: 'Consultar un intento propio' })
  @ApiNotFoundResponse({
    description: 'El intento no existe o no pertenece al estudiante',
  })
  obtenerIntento(
    @EstudianteActual() estudiante: EstudianteAutenticado,
    @Param('intentoId', ParseIntPipe) intentoId: number,
  ): Promise<IntentoDto> {
    return this.aprendizaje.obtenerIntento(estudiante.id, intentoId);
  }
}
