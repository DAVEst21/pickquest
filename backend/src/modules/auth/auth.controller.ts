import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { EstudianteActual } from './decorators/estudiante-actual.decorator';
import { LoginDto } from './dto/login.dto';
import { PerfilEstudianteDto, SesionDto } from './dto/perfil-estudiante.dto';
import { RegistroDto } from './dto/registro.dto';
import { EstudianteAutenticado } from './estudiante-autenticado';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('registro')
  @ApiOperation({ summary: 'Registrar un estudiante y devolver su sesión' })
  @ApiBadRequestResponse({ description: 'Datos inválidos' })
  @ApiConflictResponse({ description: 'Email o nombreAventurero ya en uso' })
  registrar(@Body() dto: RegistroDto): Promise<SesionDto> {
    return this.auth.registrar(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Iniciar sesión con email y contraseña' })
  @ApiUnauthorizedResponse({ description: 'Credenciales inválidas' })
  login(@Body() dto: LoginDto): Promise<SesionDto> {
    return this.auth.login(dto);
  }

  @Get('perfil')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Perfil del estudiante autenticado' })
  @ApiUnauthorizedResponse({ description: 'Token ausente o inválido' })
  perfil(
    @EstudianteActual() estudiante: EstudianteAutenticado,
  ): Promise<PerfilEstudianteDto> {
    return this.auth.perfil(estudiante.id);
  }
}
