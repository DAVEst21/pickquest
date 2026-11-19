/** Error de una llamada al backend, con el código HTTP (0 si no hubo respuesta). */
export class ApiError extends Error {
  readonly status: number;
  /** Cuerpo completo de la respuesta de error (qpFaltantes, equipados...). */
  readonly datos: Record<string, unknown>;

  constructor(status: number, message: string, datos: Record<string, unknown> = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.datos = datos;
  }
}

export function esError(error: unknown, status: number): boolean {
  return error instanceof ApiError && error.status === status;
}

export function mensajeDeError(error: unknown): string {
  return error instanceof Error ? error.message : 'Ocurrió un error inesperado';
}

/** Errores transitorios: red o servidor; repetir un 4xx requiere corregir la petición. */
export function esRecuperable(error: unknown): boolean {
  return !(error instanceof ApiError) || error.status === 0 || error.status >= 500;
}
