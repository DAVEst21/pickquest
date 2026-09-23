import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { EstudianteAutenticado } from '../estudiante-autenticado';

/** Inyecta el estudiante autenticado (requiere JwtAuthGuard en la ruta). */
export const EstudianteActual = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): EstudianteAutenticado =>
    ctx.switchToHttp().getRequest().user,
);
