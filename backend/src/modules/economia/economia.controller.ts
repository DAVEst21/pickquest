import { BadRequestException, Body, Controller, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Post, Query, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { PrismaService } from '../../common/prisma/prisma.service';
import { EstudianteActual } from '../auth/decorators/estudiante-actual.decorator';
import { EstudianteAutenticado } from '../auth/estudiante-autenticado';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ObjetoEquipadoDto } from './economia.dto';
import { EconomiaService } from './economia.service';
import {
  CompraRealizadaDto,
  ComprarDto,
  EquiparDto,
  InventarioObjetoDto,
  ObjetoDetalleDto,
  TiendaDto,
} from './tienda.dto';
import { TiendaService } from './tienda.service';

@ApiTags('Economía')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Token ausente o inválido' })
@UseGuards(JwtAuthGuard)
@Controller()
export class EconomiaController {
  constructor(
    private readonly economia: EconomiaService,
    private readonly tienda: TiendaService,
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

  // ------------------------------------------------------------------
  // CU-12 Tienda (RF-15, RN-10, RN-11, RN-28)
  // ------------------------------------------------------------------

  @Get('tienda')
  @ApiOperation({
    summary: 'CU-12: catálogo de la tienda con saldo de QP y unidades que ya tiene el estudiante',
    description: 'Cada objeto trae precio, efecto, rareza, tipo y dónde se usa (tema nulo = cualquier reto).',
  })
  verTienda(@EstudianteActual() estudiante: EstudianteAutenticado): Promise<TiendaDto> {
    return this.tienda.tienda(estudiante.id);
  }

  @Get('tienda/objetos/:objetoId')
  @ApiOperation({ summary: 'CU-12: detalle de un objeto y los retos en los que puede usarse' })
  @ApiNotFoundResponse({ description: 'El objeto no existe' })
  detalleObjeto(
    @EstudianteActual() estudiante: EstudianteAutenticado,
    @Param('objetoId', ParseIntPipe) objetoId: number,
  ): Promise<ObjetoDetalleDto> {
    return this.tienda.detalle(estudiante.id, objetoId);
  }

  @Post('tienda/compras')
  @ApiOperation({
    summary: 'CU-12: comprar un objeto con QP',
    description:
      'Una sola transacción: verifica el saldo (FE1, 400 con qpFaltantes) y el máximo de 5 unidades (FE2, 400 con el límite), descuenta los QP, suma las unidades y registra la compra (RN-11, RN-28).',
  })
  @ApiBadRequestResponse({ description: 'FE1: saldo insuficiente · FE2: máximo de unidades' })
  @ApiNotFoundResponse({ description: 'El objeto no existe' })
  comprar(
    @EstudianteActual() estudiante: EstudianteAutenticado,
    @Body() dto: ComprarDto,
  ): Promise<CompraRealizadaDto> {
    return this.tienda.comprar(estudiante.id, dto.objetoId, dto.cantidad);
  }

  @Get('inventario')
  @ApiOperation({ summary: 'Inventario del estudiante con sus unidades y si cada objeto está equipado' })
  inventario(@EstudianteActual() estudiante: EstudianteAutenticado): Promise<InventarioObjetoDto[]> {
    return this.tienda.inventario(this.prisma, estudiante.id);
  }

  @Post('inventario/:objetoId/equipar')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'CU-12: equipar un objeto en el cinto (máximo 2, RN-10)',
    description:
      'Si ya hay 2 equipados y no viene reemplazaObjetoId responde 409 con los equipados (FA2); con reemplazaObjetoId desequipa ese y equipa el nuevo en la misma transacción.',
  })
  @ApiConflictResponse({ description: 'FA2: el cinto está lleno; elegir cuál reemplazar' })
  @ApiBadRequestResponse({ description: 'El objeto no está en el inventario o el reemplazo no está equipado' })
  equipar(
    @EstudianteActual() estudiante: EstudianteAutenticado,
    @Param('objetoId', ParseIntPipe) objetoId: number,
    @Body() dto: EquiparDto,
  ): Promise<InventarioObjetoDto[]> {
    return this.tienda.equipar(estudiante.id, objetoId, dto.reemplazaObjetoId);
  }

  @Post('inventario/:objetoId/desequipar')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Quitar un objeto del cinto (regresa al inventario)' })
  desequipar(
    @EstudianteActual() estudiante: EstudianteAutenticado,
    @Param('objetoId', ParseIntPipe) objetoId: number,
  ): Promise<InventarioObjetoDto[]> {
    return this.tienda.desequipar(estudiante.id, objetoId);
  }
}
