import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegistroDto {
  /** @example "aventurero@pickquest.dev" */
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  email: string;

  /**
   * Entre 8 y 72 caracteres (72 es el límite efectivo de bcrypt).
   * @example "contrasena-segura"
   */
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password: string;

  /**
   * Nombre visible y único del estudiante: letras, números, guion o guion bajo.
   * @example "dev_aventurero"
   */
  @IsString()
  @Length(3, 30)
  @Matches(/^[\p{L}\p{N}_-]+$/u, {
    message:
      'nombreAventurero solo puede contener letras, números, guion o guion bajo',
  })
  nombreAventurero: string;

  /** URL de la imagen de avatar. */
  @IsOptional()
  @IsUrl()
  avatar?: string;
}
