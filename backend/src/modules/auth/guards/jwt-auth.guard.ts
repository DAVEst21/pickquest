import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/** Guard reutilizable: exige un JWT válido en "Authorization: Bearer <token>". */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
