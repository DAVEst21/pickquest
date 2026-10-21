/** Contenido del JWT. */
export interface JwtPayload {
  sub: number;
  email: string;
}

/** Lo que el guard deja en request.user. */
export interface EstudianteAutenticado {
  id: number;
  email: string;
}
