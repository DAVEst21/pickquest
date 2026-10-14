import { BadRequestException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { ValidationError, validateSync } from 'class-validator';

function aplanar(errores: ValidationError[], prefijo = ''): string[] {
  return errores.flatMap((e) => {
    const ruta = prefijo ? `${prefijo}.${e.property}` : e.property;
    const propios = Object.values(e.constraints ?? {}).map((m) => `${ruta}: ${m}`);
    return [...propios, ...aplanar(e.children ?? [], ruta)];
  });
}

/**
 * Valida el cuerpo de `PUT /intentos/:id/borrador`, cuyo formato depende de
 * la mecánica del reto (el ValidationPipe global no puede saberlo). Rechaza
 * campos desconocidos.
 */
export function validarCuerpo<T extends object>(
  clase: new () => T,
  cuerpo: unknown,
): T {
  const instancia = plainToInstance(clase, cuerpo ?? {});
  const errores = validateSync(instancia, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  if (errores.length > 0) {
    throw new BadRequestException(aplanar(errores));
  }
  return instancia;
}
