import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { EstudianteAutenticado, JwtPayload } from '../estudiante-autenticado';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  // Un token válido de un estudiante que ya no existe se rechaza.
  async validate(payload: JwtPayload): Promise<EstudianteAutenticado> {
    const estudiante = await this.prisma.estudiante.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true },
    });
    if (!estudiante) {
      throw new UnauthorizedException();
    }
    return estudiante;
  }
}
