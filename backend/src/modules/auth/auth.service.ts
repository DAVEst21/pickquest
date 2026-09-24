import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Estudiante, RachaEstudio } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { esErrorUnico } from '../../common/prisma/prisma-errores';
import { PrismaService } from '../../common/prisma/prisma.service';
import { calcularNivel } from '../progreso/nivel';
import { LoginDto } from './dto/login.dto';
import { PerfilEstudianteDto, SesionDto } from './dto/perfil-estudiante.dto';
import { RegistroDto } from './dto/registro.dto';
import { JwtPayload } from './estudiante-autenticado';

const RONDAS_BCRYPT = 12;

// Hash de relleno para que un email inexistente tarde lo mismo que una
// contraseña incorrecta (no revela qué emails están registrados).
const HASH_DE_RELLENO = bcrypt.hashSync('relleno-no-usable', RONDAS_BCRYPT);

type EstudianteConRacha = Estudiante & { racha: RachaEstudio | null };

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async registrar(dto: RegistroDto): Promise<SesionDto> {
    const passwordHash = await bcrypt.hash(dto.password, RONDAS_BCRYPT);
    try {
      const estudiante = await this.prisma.estudiante.create({
        data: {
          email: dto.email,
          passwordHash,
          nombreAventurero: dto.nombreAventurero,
          avatar: dto.avatar ?? '',
          racha: { create: {} },
        },
        include: { racha: true },
      });
      return this.crearSesion(estudiante);
    } catch (error) {
      if (esErrorUnico(error)) {
        const campos = (error.meta?.target as string[] | undefined) ?? [];
        const campo = campos.includes('email') ? 'email' : 'nombreAventurero';
        throw new ConflictException(`Ya existe un estudiante con ese ${campo}`);
      }
      throw error;
    }
  }

  async login(dto: LoginDto): Promise<SesionDto> {
    const estudiante = await this.prisma.estudiante.findUnique({
      where: { email: dto.email },
      include: { racha: true },
    });
    const valida = await bcrypt.compare(
      dto.password,
      estudiante?.passwordHash ?? HASH_DE_RELLENO,
    );
    if (!estudiante || !valida) {
      throw new UnauthorizedException('Credenciales inválidas');
    }
    return this.crearSesion(estudiante);
  }

  async perfil(estudianteId: number): Promise<PerfilEstudianteDto> {
    const estudiante = await this.prisma.estudiante.findUnique({
      where: { id: estudianteId },
      include: { racha: true },
    });
    if (!estudiante) {
      throw new NotFoundException('Estudiante no encontrado');
    }
    return aPerfil(estudiante);
  }

  private async crearSesion(
    estudiante: EstudianteConRacha,
  ): Promise<SesionDto> {
    const payload: JwtPayload = { sub: estudiante.id, email: estudiante.email };
    return {
      accessToken: await this.jwt.signAsync(payload),
      estudiante: aPerfil(estudiante),
    };
  }
}

function aPerfil(estudiante: EstudianteConRacha): PerfilEstudianteDto {
  return {
    id: estudiante.id,
    email: estudiante.email,
    nombreAventurero: estudiante.nombreAventurero,
    avatar: estudiante.avatar,
    nivel: estudiante.nivel,
    xpTotal: estudiante.xpTotal,
    xpSiguienteNivel: calcularNivel(estudiante.xpTotal).xpSiguienteNivel,
    qpTotal: estudiante.qpTotal,
    racha: estudiante.racha
      ? {
          diasActuales: estudiante.racha.diasActuales,
          diasRecord: estudiante.racha.diasRecord,
          multiplicadorQP: estudiante.racha.multiplicadorQP,
        }
      : null,
  };
}
