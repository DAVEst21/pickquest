import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
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
import { FaseDto, FaseTablonDto } from './dto/fase.dto';
import {
  AyudaAplicadaDto,
  BorradorGuardadoDto,
  IntentoCalificadoDto,
  IntentoEnCursoDto,
  LibretaDto,
  RegistrarAyudaDto,
} from './dto/intento.dto';
import { ElegirTecnicaDto, RegistrarTurnoDto } from './mecanicas/dialogo-stakeholder/dialogo-stakeholder.dto';

@ApiTags('Aprendizaje')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Token ausente o inválido' })
@UseGuards(JwtAuthGuard)
@Controller()
export class AprendizajeController {
  constructor(private readonly aprendizaje: AprendizajeService) {}

  @Get('fases')
  @ApiOperation({ summary: 'Listar las fases con su estado para el estudiante autenticado' })
  listarFases(@EstudianteActual() estudiante: EstudianteAutenticado): Promise<FaseDto[]> {
    return this.aprendizaje.listarFases(estudiante.id);
  }

  @Get('fases/:faseId')
  @ApiOperation({
    summary: 'Tablón de la fase (RF-18): sus retos con estado, objetivo y recompensas',
    description:
      'recompensaQp ya incluye el multiplicador de racha vigente (RN-02/RN-13): coincide con lo que se otorga.',
  })
  @ApiNotFoundResponse({ description: 'La fase no existe' })
  tablonFase(
    @EstudianteActual() estudiante: EstudianteAutenticado,
    @Param('faseId', ParseIntPipe) faseId: number,
  ): Promise<FaseTablonDto> {
    return this.aprendizaje.tablonFase(estudiante.id, faseId);
  }

  @Post('retos/:retoId/intentos')
  @ApiOperation({
    summary: 'Iniciar un intento, o retomar el que está en curso (FA3)',
    description:
      'Valida RN-01 y RN-08. Devuelve el contenido público de la mecánica (sin respuestas) y el borrador guardado.',
  })
  @ApiForbiddenResponse({ description: 'La fase o el reto están bloqueados (RN-01, RN-08)' })
  @ApiNotFoundResponse({ description: 'El reto no existe' })
  @ApiConflictResponse({ description: 'Conflicto de concurrencia; reintentar' })
  iniciarIntento(
    @EstudianteActual() estudiante: EstudianteAutenticado,
    @Param('retoId', ParseIntPipe) retoId: number,
  ): Promise<IntentoEnCursoDto> {
    return this.aprendizaje.iniciarIntento(estudiante.id, retoId);
  }

  @Get('retos/:retoId/libreta')
  @ApiOperation({
    summary: 'CU-01: requerimientos descubiertos por el estudiante en intentos calificados',
  })
  @ApiNotFoundResponse({ description: 'El reto no existe' })
  libreta(
    @EstudianteActual() estudiante: EstudianteAutenticado,
    @Param('retoId', ParseIntPipe) retoId: number,
  ): Promise<LibretaDto[]> {
    return this.aprendizaje.libreta(estudiante.id, retoId);
  }

  @Get('intentos/:intentoId')
  @ApiOperation({
    summary: 'Consultar un intento propio',
    description:
      'EN_CURSO: contenido público y borrador. CALIFICADO: resultado y retroalimentación de la mecánica.',
  })
  @ApiNotFoundResponse({ description: 'El intento no existe o no pertenece al estudiante' })
  obtenerIntento(
    @EstudianteActual() estudiante: EstudianteAutenticado,
    @Param('intentoId', ParseIntPipe) intentoId: number,
  ): Promise<IntentoEnCursoDto | IntentoCalificadoDto> {
    return this.aprendizaje.obtenerIntento(estudiante.id, intentoId);
  }

  @Put('intentos/:intentoId/borrador')
  @ApiOperation({
    summary: 'Guardar el avance del intento (RF-01; CU-02, CU-03, CU-04, CU-06 y CU-08)',
    description:
      'El cuerpo depende de la mecánica del reto: CU-02 {colocaciones: [{casillaId, piezaId}]}, CU-03 {tarjetas}, CU-04 {marcas}, CU-06 {asignaciones, justificacionId}, CU-08 {posiciones, asociaciones}.',
  })
  @ApiBody({ schema: { type: 'object' } })
  @ApiBadRequestResponse({ description: 'Cuerpo inválido para la mecánica del reto' })
  @ApiNotFoundResponse({ description: 'El intento no existe o no pertenece al estudiante' })
  @ApiConflictResponse({ description: 'El intento ya está calificado' })
  guardarBorrador(
    @EstudianteActual() estudiante: EstudianteAutenticado,
    @Param('intentoId', ParseIntPipe) intentoId: number,
    @Body() cuerpo: unknown,
  ): Promise<BorradorGuardadoDto> {
    return this.aprendizaje.guardarBorrador(estudiante.id, intentoId, cuerpo);
  }

  @Post('intentos/:intentoId/dialogo/tecnica')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'CU-01: registrar la técnica de elicitación elegida' })
  @ApiNotFoundResponse({ description: 'El intento no existe o no pertenece al estudiante' })
  @ApiConflictResponse({ description: 'El intento ya está calificado' })
  elegirTecnica(
    @EstudianteActual() estudiante: EstudianteAutenticado,
    @Param('intentoId', ParseIntPipe) intentoId: number,
    @Body() dto: ElegirTecnicaDto,
  ) {
    return this.aprendizaje.registrarTecnica(estudiante.id, intentoId, dto.tecnica);
  }

  @Post('intentos/:intentoId/dialogo/turnos')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'CU-01: registrar un turno del diálogo',
    description:
      'Devuelve la respuesta del stakeholder, el requerimiento revelado (si hay), el siguiente nodo con sus opciones y los turnos restantes.',
  })
  @ApiBadRequestResponse({ description: 'Sin técnica, sin turnos o pregunta no disponible' })
  @ApiNotFoundResponse({ description: 'El intento no existe o no pertenece al estudiante' })
  registrarTurno(
    @EstudianteActual() estudiante: EstudianteAutenticado,
    @Param('intentoId', ParseIntPipe) intentoId: number,
    @Body() dto: RegistrarTurnoDto,
  ) {
    return this.aprendizaje.registrarTurno(estudiante.id, intentoId, dto.opcionId);
  }

  @Post('intentos/:intentoId/ayuda')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Usar una ayuda en el intento (RF-03, RN-10)',
    description:
      'Consume una unidad de un objeto equipado, marca el intento con usoAyuda y devuelve la pista de la mecánica; en MoSCoW también mueve la tarjeta y devuelve borradorActualizado.',
  })
  @ApiBadRequestResponse({ description: 'Objeto no equipado, sin unidades o que no es del estudiante' })
  @ApiNotFoundResponse({ description: 'El intento no existe o no pertenece al estudiante' })
  @ApiConflictResponse({ description: 'Ya se usó una ayuda en este intento, o el intento está calificado' })
  registrarAyuda(
    @EstudianteActual() estudiante: EstudianteAutenticado,
    @Param('intentoId', ParseIntPipe) intentoId: number,
    @Body() dto: RegistrarAyudaDto,
  ): Promise<AyudaAplicadaDto> {
    return this.aprendizaje.registrarAyuda(estudiante.id, intentoId, dto.objetoId);
  }

  @Post('intentos/:intentoId/enviar')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Enviar el intento para calificarlo (RF-01)',
    description:
      'Si ya está calificado, recupera el resultado existente con 200 sin otorgar recompensas otra vez. Si hay faltantes responde 400 con la lista. Si no, califica (RN-16/18/19/21/23), aplica RN-04, RN-06 y RN-07 y otorga las recompensas.',
  })
  @ApiBadRequestResponse({ description: 'Faltan elementos para enviar (campo "faltantes")' })
  @ApiNotFoundResponse({ description: 'El intento no existe o no pertenece al estudiante' })
  @ApiConflictResponse({ description: 'Conflicto de concurrencia: vuelve a intentar' })
  enviarIntento(
    @EstudianteActual() estudiante: EstudianteAutenticado,
    @Param('intentoId', ParseIntPipe) intentoId: number,
  ): Promise<IntentoCalificadoDto> {
    return this.aprendizaje.enviarIntento(estudiante.id, intentoId);
  }
}
