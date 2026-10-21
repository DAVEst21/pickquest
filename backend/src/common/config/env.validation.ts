const VARIABLES_REQUERIDAS = ['DATABASE_URL', 'JWT_SECRET'] as const;

/**
 * Validación del entorno al arrancar: falla rápido si falta una variable
 * obligatoria en lugar de fallar en la primera petición que la use.
 */
export function validarEntorno(
  config: Record<string, unknown>,
): Record<string, unknown> {
  const faltantes = VARIABLES_REQUERIDAS.filter((clave) => !config[clave]);
  if (faltantes.length > 0) {
    throw new Error(
      `Faltan variables de entorno obligatorias: ${faltantes.join(', ')}`,
    );
  }
  return config;
}
