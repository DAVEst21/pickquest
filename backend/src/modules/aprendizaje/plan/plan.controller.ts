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
  AceptarPlanDto,
  DiagnosticoIniciadoDto,
  DiagnosticoTerminadoDto,
  PlanActivoDto,
  PlanEstudioDto,
  ResponderDiagnosticoDto,
} from './plan.dto';
import { PlanService } from './plan.service';

@ApiTags('Plan de estudio (CU-10)')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Token ausente o inválido' })
@UseGuards(JwtAuthGuard)
@Controller('plan')
export class PlanController {
  constructor(private readonly plan: PlanService) {}

  @Post('diagnosticos')
  @ApiOperation({
    summary: 'CU-10: crea un diagnóstico de 9 preguntas al azar (3 por tema) sin la opción correcta',
    description:
      'Si el estudiante ya tiene un plan activo, el cliente muestra primero su avance (GET /plan/activo) y pide confirmación (FA2).',
  })
  iniciarDiagnostico(@EstudianteActual() estudiante: EstudianteAutenticado): Promise<DiagnosticoIniciadoDto> {
    return this.plan.iniciarDiagnostico(estudiante.id);
  }

  @Get('diagnosticos/:diagnosticoId')
  @ApiOperation({ summary: 'CU-10: preguntas de un diagnóstico propio (para retomarlo)' })
  @ApiNotFoundResponse({ description: 'El diagnóstico no existe o no es del estudiante' })
  diagnostico(
    @EstudianteActual() estudiante: EstudianteAutenticado,
    @Param('diagnosticoId', ParseIntPipe) diagnosticoId: number,
  ): Promise<DiagnosticoIniciadoDto> {
    return this.plan.obtenerDiagnostico(estudiante.id, diagnosticoId);
  }

  @Post('diagnosticos/:diagnosticoId/respuestas')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'CU-10: termina el diagnóstico, calcula el dominio por tema (RN-26) y propone un plan (RN-27)',
  })
  @ApiBadRequestResponse({ description: 'FE1: preguntas pendientes (lista en `pendientes`) o respuestas no válidas' })
  @ApiNotFoundResponse({ description: 'El diagnóstico no existe o no es del estudiante' })
  @ApiConflictResponse({ description: 'El diagnóstico ya se terminó' })
  responder(
    @EstudianteActual() estudiante: EstudianteAutenticado,
    @Param('diagnosticoId', ParseIntPipe) diagnosticoId: number,
    @Body() cuerpo: ResponderDiagnosticoDto,
  ): Promise<DiagnosticoTerminadoDto> {
    return this.plan.responderDiagnostico(estudiante.id, diagnosticoId, cuerpo.respuestas);
  }

  @Get('activo')
  @ApiOperation({ summary: 'CU-10: plan activo con su avance (null si no tiene)' })
  activo(@EstudianteActual() estudiante: EstudianteAutenticado): Promise<PlanActivoDto> {
    return this.plan.planActivo(estudiante.id);
  }

  @Get(':planId')
  @ApiOperation({ summary: 'CU-10: un plan propio (propuesto o activo)' })
  @ApiNotFoundResponse({ description: 'El plan no existe o no es del estudiante' })
  obtener(
    @EstudianteActual() estudiante: EstudianteAutenticado,
    @Param('planId', ParseIntPipe) planId: number,
  ): Promise<PlanEstudioDto> {
    return this.plan.obtenerPlan(estudiante.id, planId);
  }

  @Post(':planId/aceptar')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'CU-10: acepta el plan con las actividades conservadas y su orden (FA1); reemplaza al plan activo (FA2)',
  })
  @ApiBadRequestResponse({ description: 'Actividades repetidas, ajenas al plan o lista vacía' })
  @ApiNotFoundResponse({ description: 'El plan no existe o no es del estudiante' })
  @ApiConflictResponse({ description: 'El plan ya no es una propuesta' })
  aceptar(
    @EstudianteActual() estudiante: EstudianteAutenticado,
    @Param('planId', ParseIntPipe) planId: number,
    @Body() cuerpo: AceptarPlanDto,
  ): Promise<PlanEstudioDto> {
    return this.plan.aceptarPlan(estudiante.id, planId, cuerpo.actividadIds);
  }
}
