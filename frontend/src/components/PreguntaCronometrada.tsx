import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { PreguntaCronometrada as Pregunta, RetroPregunta } from '../types';

interface Props {
  pregunta: Pregunta;
  /**
   * Envía la respuesta al servidor (`null` = se agotó el tiempo). El servidor es quien decide si llegó a tiempo;
   * este temporizador solo es visual. Devuelve la retroalimentación, o undefined si no se muestra (duelos).
   */
  responder: (opcionId: number | null) => Promise<RetroPregunta | undefined>;
  /** Avanza a la siguiente pregunta o al resumen. */
  alSiguiente: () => void;
  textoSiguiente: string;
  /** Mensaje cuando no se muestra la retroalimentación de la respuesta. */
  mensajeSinRetro?: string;
}

/**
 * Pregunta con temporizador (CU-11 y CU-13). El tiempo visible cambia de color en los últimos 5 segundos;
 * al llegar a 0 se envía `null` (FA1). Las opciones se eligen con clic o con las teclas 1 a 4.
 */
export const PreguntaCronometrada: React.FC<Props> = ({ pregunta, responder, alSiguiente, textoSiguiente, mensajeSinRetro }) => {
  // Fin del tiempo según lo que dijo el servidor al entregar la pregunta (solo el reloj visible).
  const [finEn] = useState(() => Date.now() + pregunta.segundosRestantes * 1000);
  const [restante, setRestante] = useState(pregunta.segundosRestantes);
  const [elegida, setElegida] = useState<number | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [retro, setRetro] = useState<RetroPregunta | null>(null);
  const [respondida, setRespondida] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Evita enviar dos veces (clic + fin del tiempo en el mismo instante).
  const bloqueo = useRef(false);

  const enviar = useCallback(
    async (opcionId: number | null) => {
      if (bloqueo.current) return;
      bloqueo.current = true;
      setEnviando(true);
      setError(null);
      try {
        const r = await responder(opcionId);
        setRetro(r ?? null);
        setRespondida(true);
      } catch (e) {
        bloqueo.current = false;
        setError(e instanceof Error ? e.message : 'No se pudo enviar la respuesta');
      } finally {
        setEnviando(false);
      }
    },
    [responder],
  );
  const enviarRef = useRef(enviar);
  useEffect(() => {
    enviarRef.current = enviar;
  });

  useEffect(() => {
    if (respondida) return;
    const id = window.setInterval(() => {
      const faltan = Math.max(0, (finEn - Date.now()) / 1000);
      setRestante(faltan);
      // FA1: tiempo agotado → se envía null y cuenta como incorrecta.
      if (faltan <= 0) void enviarRef.current(null);
    }, 100);
    return () => window.clearInterval(id);
  }, [finEn, respondida]);

  useEffect(() => {
    const alPresionar = (e: KeyboardEvent) => {
      if (respondida || enviando) return;
      const indice = Number(e.key) - 1;
      const opcion = pregunta.opciones[indice];
      if (opcion) {
        setElegida(opcion.opcionId);
        void enviar(opcion.opcionId);
      }
    };
    window.addEventListener('keydown', alPresionar);
    return () => window.removeEventListener('keydown', alPresionar);
  }, [pregunta, respondida, enviando, enviar]);

  const segundos = Math.ceil(restante);
  const urgente = restante <= 5;
  const proporcion = Math.max(0, Math.min(1, restante / pregunta.limiteSegundos));
  return (
    <section className="flex flex-col gap-space-md" aria-label={`Pregunta ${pregunta.numero} de ${pregunta.total}`}>
      <div className="flex items-center justify-between gap-space-md">
        <span className="font-label-md text-label-md text-on-surface-variant" id="numero-pregunta">
          Pregunta {pregunta.numero} de {pregunta.total}
        </span>
        <span
          id="temporizador"
          role="timer"
          aria-live="off"
          className={`px-space-md py-space-xs rounded-full font-code-md text-title-md font-bold tabular-nums ${
            urgente && !respondida ? 'bg-error-container text-error animate-pulse' : 'bg-surface-container-high text-on-surface'
          }`}
          data-urgente={urgente && !respondida ? 'true' : 'false'}
        >
          {respondida ? '—' : `${segundos} s`}
        </span>
      </div>
      <div className="w-full h-2 rounded-full bg-surface-container-highest overflow-hidden">
        <div
          className={`h-full transition-[width] duration-100 ${urgente && !respondida ? 'bg-error' : 'bg-gradient-to-r from-tertiary to-secondary'}`}
          style={{ width: `${respondida ? 0 : proporcion * 100}%` }}
        />
      </div>

      <h2 className="font-headline-sm text-headline-sm text-on-surface">{pregunta.enunciado}</h2>
      <ul className="flex flex-col gap-space-sm">
        {pregunta.opciones.map((o, i) => {
          const esElegida = elegida === o.opcionId;
          let estilo = 'bg-surface-container-low hover:bg-surface-container-high border-outline-variant/30';
          if (respondida && retro) {
            // Solo se marca la opción elegida: nunca se señala cuál era la correcta.
            if (esElegida) estilo = retro.correcta ? 'bg-tertiary-container/30 border-tertiary' : 'bg-error-container/30 border-error';
            else estilo = 'bg-surface-container-low border-outline-variant/20 opacity-70';
          } else if (esElegida) {
            estilo = 'bg-primary-container/30 border-primary';
          }
          return (
            <li key={o.opcionId}>
              <button
                type="button"
                disabled={respondida || enviando}
                onClick={() => {
                  setElegida(o.opcionId);
                  void enviar(o.opcionId);
                }}
                className={`w-full text-left rounded-xl border px-space-md py-space-md flex items-start gap-space-sm transition-colors disabled:cursor-default ${estilo}`}
              >
                <kbd className="px-2 rounded bg-surface-container-lowest/60 font-code-md text-on-surface-variant">{i + 1}</kbd>
                <span className="font-body-md text-body-md text-on-surface">{o.texto}</span>
              </button>
            </li>
          );
        })}
      </ul>

      {error && (
        <p className="font-body-md text-body-md text-error" role="alert">
          {error}
        </p>
      )}

      {respondida && (
        <div className="flex flex-col gap-space-sm" role="status" aria-live="polite">
          {retro ? (
            <div
              className={`rounded-xl p-space-md ${retro.correcta ? 'bg-tertiary-container/20 text-tertiary' : 'bg-error-container/20 text-error'}`}
              id="retro-pregunta"
            >
              <p className="font-title-md text-title-md">
                {retro.correcta ? 'Correcto' : retro.tiempoAgotado ? 'Se acabó el tiempo: cuenta como incorrecta' : 'Incorrecto'}
              </p>
            </div>
          ) : (
            <p className="font-body-md text-body-md text-on-surface-variant">{mensajeSinRetro ?? 'Respuesta registrada.'}</p>
          )}
          <button
            type="button"
            onClick={alSiguiente}
            className="self-end px-space-lg py-space-sm rounded-lg bg-primary-container hover:bg-primary text-on-primary-container font-title-md font-bold"
          >
            {textoSiguiente}
          </button>
        </div>
      )}
    </section>
  );
};
