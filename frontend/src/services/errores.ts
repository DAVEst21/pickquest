/** Error de una llamada al backend, con el código HTTP (0 si no hubo respuesta). */
export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export function esError(error: unknown, status: number): boolean {
  return error instanceof ApiError && error.status === status;
}

export function mensajeDeError(error: unknown): string {
  return error instanceof Error ? error.message : 'Ocurrió un error inesperado';
}
