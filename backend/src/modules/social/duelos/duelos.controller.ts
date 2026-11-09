import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import {
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
import {
  AvisoDueloDto,
  CrearDueloDto,
  DueloDto,
  ListaDuelosDto,
  PreguntaDueloDto,
  ResponderDueloDto,
  RespuestaDueloDto,
  RivalDto,
} from './duelos.dto';
import { DuelosService } from './duelos.service';

@ApiTags('Duelos (CU-13)')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Token ausente o inválido' })
@UseGuards(JwtAuthGuard)
@Controller('duelos')
export class DuelosController {
  constructor(private readonly duelos: DuelosService) {}

  @Get('rivales')
  @ApiOperation({
    summary: 'CU-13: estudiantes con un tema desbloqueado en común y esos temas (RN-15)',
    description: 'De los demás solo se exponen nombre de aventurero, nivel y resultados de duelos (RNF-SE-04).',
  })
  rivales(@EstudianteActual() estudiante: EstudianteAutenticado): Promise<RivalDto[]> {
    return this.duelos.rivales(estudiante.id);
  }

  @Get('avisos')
  @ApiOperation({ summary: 'CU-13: duelos pendientes en los que el estudiante es el retado (aviso al iniciar sesión)' })
  avisos(@EstudianteActual() estudiante: EstudianteAutenticado): Promise<AvisoDueloDto[]> {
    return this.duelos.avisos(estudiante.id);
  }

  @Get()
  @ApiOperation({
    summary: 'CU-13: mis duelos agrupados en pendientes, por jugar, en espera e historial; expira los vencidos (FE1)',
  })
  listar(@EstudianteActual() estudiante: EstudianteAutenticado): Promise<ListaDuelosDto> {
    return this.duelos.listar(estudiante.id);
  }

  @Post()
  @ApiOperation({
    summary: 'CU-13: crea el duelo con 5 preguntas al azar del tema; el rival se identifica por nombre de aventurero',
  })
  @ApiForbiddenResponse({ description: 'RN-15: el tema no está desbloqueado para ambos' })
  @ApiConflictResponse({ description: 'FE2: alguno de los dos ya tiene 3 duelos pendientes' })
  @ApiNotFoundResponse({ description: 'No existe ese estudiante' })
  crear(@EstudianteActual() estudiante: EstudianteAutenticado, @Body() cuerpo: CrearDueloDto): Promise<DueloDto> {
    return this.duelos.crear(estudiante.id, cuerpo.rival, cuerpo.tema);
  }

  @Get(':dueloId')
  @ApiOperation({ summary: 'CU-13: un duelo propio; el resultado del rival solo aparece cuando el duelo terminó' })
  @ApiNotFoundResponse({ description: 'El duelo no existe o el estudiante no participa' })
  detalle(
    @EstudianteActual() estudiante: EstudianteAutenticado,
    @Param('dueloId', ParseIntPipe) dueloId: number,
  ): Promise<DueloDto> {
    return this.duelos.detalle(estudiante.id, dueloId);
  }

  @Post(':dueloId/aceptar')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'CU-13: el estudiante retado acepta el duelo (si no expiró)' })
  aceptar(
    @EstudianteActual() estudiante: EstudianteAutenticado,
    @Param('dueloId', ParseIntPipe) dueloId: number,
  ): Promise<DueloDto> {
    return this.duelos.aceptar(estudiante.id, dueloId);
  }

  @Post(':dueloId/rechazar')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'CU-13 FA1: el estudiante retado rechaza el duelo; queda RECHAZADO sin XP' })
  rechazar(
    @EstudianteActual() estudiante: EstudianteAutenticado,
    @Param('dueloId', ParseIntPipe) dueloId: number,
  ): Promise<DueloDto> {
    return this.duelos.rechazar(estudiante.id, dueloId);
  }

  @Post(':dueloId/preguntas/:numero/entregar')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'CU-13: el servidor habilita la pregunta y arranca su reloj; sin la opción correcta' })
  entregar(
    @EstudianteActual() estudiante: EstudianteAutenticado,
    @Param('dueloId', ParseIntPipe) dueloId: number,
    @Param('numero', ParseIntPipe) numero: number,
  ): Promise<PreguntaDueloDto> {
    return this.duelos.entregar(estudiante.id, dueloId, numero);
  }

  @Post(':dueloId/preguntas/:numero/respuesta')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'CU-13: responde una pregunta (20 s + 1 s de tolerancia, RNF-SE-05); no revela si acertó hasta el final',
  })
  responder(
    @EstudianteActual() estudiante: EstudianteAutenticado,
    @Param('dueloId', ParseIntPipe) dueloId: number,
    @Param('numero', ParseIntPipe) numero: number,
    @Body() cuerpo: ResponderDueloDto,
  ): Promise<RespuestaDueloDto> {
    return this.duelos.responder(estudiante.id, dueloId, numero, cuerpo.opcionId);
  }
}
