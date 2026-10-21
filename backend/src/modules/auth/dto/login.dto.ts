import { Transform } from 'class-transformer';
import { IsEmail, IsString, MaxLength } from 'class-validator';

export class LoginDto {
  /** @example "demo@pickquest.dev" */
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  email: string;

  /** @example "pickquest123" */
  @IsString()
  @MaxLength(72)
  password: string;
}
