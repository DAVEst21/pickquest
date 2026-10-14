import { useCallback, useEffect, useRef, useState } from 'react';
import { guardarBorrador } from '../../services/api';

export type EstadoGuardado = 'inactivo' | 'pendiente' | 'guardando' | 'guardado' | 'error';

const ESPERA_MS = 800;

/**
 * RF-01: guarda el avance del intento en el servidor (PUT /intentos/:id/borrador).
 * - Debounce de ~800 ms entre cambios.
 * - Las peticiones se encadenan: nunca se pisan entre sí.
 * - Al salir de la página (desmontar, cerrar la pestaña, ocultarla) se guarda lo pendiente.
 * - `vaciar()` espera a que todo esté guardado; hay que llamarla antes de enviar,
 *   porque el servidor califica lo que tiene guardado.
 */
export function useAutoguardado(intentoId: number) {
  const [estado, setEstado] = useState<EstadoGuardado>('inactivo');
  const pendiente = useRef<unknown>(undefined);
  const temporizador = useRef<number | undefined>(undefined);
  const cola = useRef<Promise<void>>(Promise.resolve());

  const escribir = useCallback(
    (keepalive: boolean) => {
      const cuerpo = pendiente.current;
      if (cuerpo === undefined) return cola.current;
      pendiente.current = undefined;
      setEstado('guardando');
      cola.current = cola.current.then(async () => {
        try {
          await guardarBorrador(intentoId, cuerpo, keepalive);
          setEstado(pendiente.current === undefined ? 'guardado' : 'pendiente');
        } catch {
          // Se conserva para reintentarlo (con el siguiente cambio o al enviar).
          if (pendiente.current === undefined) pendiente.current = cuerpo;
          setEstado('error');
        }
      });
      return cola.current;
    },
    [intentoId],
  );

  const guardar = useCallback(
    (cuerpo: unknown) => {
      pendiente.current = cuerpo;
      setEstado('pendiente');
      window.clearTimeout(temporizador.current);
      temporizador.current = window.setTimeout(() => void escribir(false), ESPERA_MS);
    },
    [escribir],
  );

  /** Espera a que todo el avance esté en el servidor; lanza si no se pudo guardar. */
  const vaciar = useCallback(async () => {
    window.clearTimeout(temporizador.current);
    await escribir(false);
    await cola.current;
    if (pendiente.current !== undefined) {
      await escribir(false);
      await cola.current;
    }
    if (pendiente.current !== undefined) throw new Error('No se pudo guardar tu avance. Revisa tu conexión.');
  }, [escribir]);

  useEffect(() => {
    const alSalir = () => {
      window.clearTimeout(temporizador.current);
      void escribir(true);
    };
    const alOcultar = () => {
      if (document.visibilityState === 'hidden') alSalir();
    };
    window.addEventListener('pagehide', alSalir);
    document.addEventListener('visibilitychange', alOcultar);
    return () => {
      window.removeEventListener('pagehide', alSalir);
      document.removeEventListener('visibilitychange', alOcultar);
      alSalir(); // al salir de la pantalla del reto
    };
  }, [escribir]);

  return { estado, guardar, vaciar };
}
