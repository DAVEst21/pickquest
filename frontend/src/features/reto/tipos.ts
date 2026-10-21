import type { Pista } from '../../types';

/**
 * Lo que cada mecánica le avisa a RetoPage sobre el envío:
 * - faltantes: impiden enviar (flujos de excepción tipo FE1; el servidor también los valida).
 * - confirmacion: advertencia que pide confirmar antes de enviar, pero NO impide hacerlo.
 */
export interface EstadoEnvio {
  faltantes: string[];
  confirmacion?: string;
}

/** Contrato común de los componentes de reto que guardan su avance con PUT /intentos/:id/borrador. */
export interface PropsMecanica<C, B, P extends Pista = Pista> {
  contenido: C;
  /** Avance guardado en el servidor cuando se abrió el intento. */
  borrador: B;
  /** Efecto de la ayuda usada en este intento (si hay). */
  pista: P | null;
  deshabilitado: boolean;
  /** Pasa el avance actual; RetoPage lo guarda en el servidor con debounce (~800 ms). */
  onCambio: (cuerpo: unknown) => void;
  onEstado: (estado: EstadoEnvio) => void;
}

export function mismoEstado(a: EstadoEnvio, b: EstadoEnvio): boolean {
  return (
    a.confirmacion === b.confirmacion &&
    a.faltantes.length === b.faltantes.length &&
    a.faltantes.every((f, i) => f === b.faltantes[i])
  );
}
