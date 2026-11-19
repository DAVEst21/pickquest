import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { PantallaCarga, PantallaError } from '../../components/EstadoPantalla';
import { Pagina } from '../../components/Pagina';
import { esError, esRecuperable, mensajeDeError } from '../../services/errores';
import { useAutoevaluarTarjeta, useSesionRepaso } from '../../services/queries';
import type { Autoevaluacion } from '../../types';

const OPCIONES: { valor: Autoevaluacion; tecla: string; texto: string; estilo: string }[] = [
  { valor: 'NO_LO_SABIA', tecla: '1', texto: 'No lo sabía', estilo: 'bg-error-container/40 text-error hover:bg-error-container/60' },
  { valor: 'DUDE', tecla: '2', texto: 'Dudé', estilo: 'bg-primary-container/30 text-primary hover:bg-primary-container/50' },
  { valor: 'LO_SABIA', tecla: '3', texto: 'Lo sabía', estilo: 'bg-tertiary-container/40 text-tertiary hover:bg-tertiary-container/60' },
];

/**
 * Repaso con tarjetas (CU-09, pasos 4 a 10). Se voltea con clic o barra espaciadora y se
 * autoevalúa con los botones o con las teclas 1, 2 y 3 (RNF-US-06).
 */
export const RepasoPage: React.FC = () => {
  const sesionId = Number(useParams<{ sesionId: string }>().sesionId);
  const { data: sesion, isPending, isError, error, refetch, isFetching } = useSesionRepaso(sesionId);
  const autoevaluar = useAutoevaluarTarjeta(sesionId);
  const tarjetaId = sesion?.tarjetaActual?.tarjetaId;
  // La tarjeta volteada se identifica por su id: al cambiar de tarjeta vuelve a mostrar el frente.
  const [volteadaId, setVolteadaId] = useState<number | null>(null);
  const volteada = tarjetaId !== undefined && volteadaId === tarjetaId;
  const alternar = useCallback(() => {
    if (tarjetaId !== undefined) setVolteadaId((v) => (v === tarjetaId ? null : tarjetaId));
  }, [tarjetaId]);

  const evaluar = useCallback(
    (valor: Autoevaluacion) => {
      if (tarjetaId === undefined || autoevaluar.isPending) return;
      autoevaluar.mutate({ tarjetaId, autoevaluacion: valor });
    },
    [tarjetaId, autoevaluar],
  );

  useEffect(() => {
    const alPresionar = (e: KeyboardEvent) => {
      if (tarjetaId === undefined || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        alternar();
        return;
      }
      // Solo se puede autoevaluar una tarjeta ya volteada.
      const opcion = OPCIONES.find((o) => o.tecla === e.key);
      if (opcion && volteada) evaluar(opcion.valor);
    };
    window.addEventListener('keydown', alPresionar);
    return () => window.removeEventListener('keydown', alPresionar);
  }, [tarjetaId, volteada, evaluar, alternar]);

  if (isPending) {
    return (
      <Pagina>
        <PantallaCarga mensaje="Preparando tus tarjetas..." />
      </Pagina>
    );
  }
  if (isError) {
    return (
      <Pagina>
        <PantallaError
          titulo={esError(error, 404) ? 'Sesión no encontrada' : 'No se pudo abrir el repaso'}
          mensaje={mensajeDeError(error)}
          onReintentar={esRecuperable(error) ? () => void refetch() : undefined}
          reintentando={isFetching}
          accion={
            <Link to="/estudio" className="px-space-lg py-space-sm rounded-lg bg-primary-container text-on-primary-container font-title-md">
              Volver a la biblioteca
            </Link>
          }
        />
      </Pagina>
    );
  }

  if (sesion.terminada && sesion.resumen) {
    const r = sesion.resumen;
    return (
      <Pagina>
        <div className="max-w-xl mx-auto px-gutter py-space-xl">
          <div className="bg-surface-container-low rounded-2xl p-space-xl flex flex-col gap-space-md items-center text-center">
            <span className="material-symbols-outlined text-headline-lg text-tertiary">task_alt</span>
            <h1 className="font-headline-sm text-headline-sm text-on-surface">Repaso terminado</h1>
            <p className="font-body-md text-body-md text-on-surface-variant">{sesion.nombre}</p>
            <dl className="grid grid-cols-3 gap-space-md w-full">
              <div>
                <dt className="font-label-md text-on-surface-variant">Sabidas</dt>
                <dd className="font-headline-sm text-tertiary" id="resumen-sabidas">{r.sabidas}</dd>
              </div>
              <div>
                <dt className="font-label-md text-on-surface-variant">Dudadas</dt>
                <dd className="font-headline-sm text-primary" id="resumen-dudadas">{r.dudadas}</dd>
              </div>
              <div>
                <dt className="font-label-md text-on-surface-variant">No sabidas</dt>
                <dd className="font-headline-sm text-error" id="resumen-no-sabidas">{r.noSabidas}</dd>
              </div>
            </dl>
            <p className="font-body-md text-body-md text-on-surface" id="resumen-xp">
              {r.xpOtorgada > 0
                ? `Ganaste ${r.xpOtorgada} XP por este repaso.`
                : 'Hoy ya recibiste la XP de repaso de este tema; vuelve mañana para ganar más.'}
            </p>
            <p className="font-body-md text-body-md text-on-surface-variant">Tu dominio de este tema: {r.dominio} %</p>
            <div className="flex gap-space-sm">
              <Link to="/estudio" className="px-space-lg py-space-sm rounded-lg bg-surface-container-high text-on-surface font-title-md">
                Biblioteca
              </Link>
              <Link to="/" className="px-space-lg py-space-sm rounded-lg bg-primary-container text-on-primary-container font-title-md">
                Volver al mapa
              </Link>
            </div>
          </div>
        </div>
      </Pagina>
    );
  }

  const tarjeta = sesion.tarjetaActual;
  const avance = sesion.total === 0 ? 0 : Math.round((sesion.completadas / sesion.total) * 100);
  return (
    <Pagina>
      <div className="max-w-2xl mx-auto px-gutter py-space-xl flex flex-col gap-space-lg">
        <div className="flex items-center justify-between gap-space-md">
          <div>
            <h1 className="font-title-md text-title-md text-on-surface">{sesion.nombre}</h1>
            <p className="font-label-md text-label-md text-on-surface-variant" id="progreso-repaso">
              {sesion.completadas} de {sesion.total} tarjetas{sesion.retomada ? ' · repaso retomado' : ''}
            </p>
          </div>
          <Link to="/estudio" className="px-space-md py-space-sm rounded-lg bg-surface-container-high text-on-surface font-title-md text-title-md">
            Salir (se guarda tu avance)
          </Link>
        </div>
        <div
          className="w-full h-2 rounded-full bg-surface-container-highest overflow-hidden"
          role="progressbar"
          aria-valuenow={avance}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div className="h-full bg-gradient-to-r from-tertiary to-secondary transition-all" style={{ width: `${avance}%` }} />
        </div>

        {tarjeta && (
          <>
            <button
              type="button"
              onClick={alternar}
              aria-label={volteada ? 'Ver el frente de la tarjeta' : 'Voltear la tarjeta'}
              className="min-h-[16rem] bg-surface-container hover:bg-surface-container-high rounded-2xl p-space-xl border border-primary-container/40 flex flex-col items-center justify-center gap-space-sm text-center transition-colors"
            >
              <span className="font-label-md text-label-md text-on-surface-variant uppercase tracking-widest">
                {volteada ? 'Reverso' : 'Frente'}
              </span>
              <span className="font-headline-sm text-headline-sm text-on-surface" id="texto-tarjeta">
                {volteada ? tarjeta.reverso : tarjeta.frente}
              </span>
              <span className="font-label-sm text-label-sm text-on-surface-variant">
                {volteada ? 'Haz clic o presiona la barra espaciadora para volver' : 'Haz clic o presiona la barra espaciadora para voltear'}
              </span>
            </button>

            <div
              className={`grid grid-cols-3 gap-space-sm transition-opacity ${volteada ? 'opacity-100' : 'opacity-40'}`}
              role="group"
              aria-label="Autoevaluación"
            >
              {OPCIONES.map((o) => (
                <button
                  key={o.valor}
                  type="button"
                  disabled={!volteada || autoevaluar.isPending}
                  onClick={() => evaluar(o.valor)}
                  className={`px-space-md py-space-md rounded-xl font-title-md text-title-md disabled:cursor-not-allowed ${o.estilo}`}
                >
                  {o.texto} <kbd className="ml-space-xs px-1 rounded bg-surface-container-lowest/60 font-code-md">{o.tecla}</kbd>
                </button>
              ))}
            </div>
            <p className="font-label-sm text-label-sm text-on-surface-variant text-center">
              Voltea la tarjeta y evalúate con los botones o las teclas 1, 2 y 3.
            </p>
            {autoevaluar.isError && (
              <p className="font-body-md text-body-md text-error text-center" role="alert">
                {mensajeDeError(autoevaluar.error)}
              </p>
            )}
          </>
        )}
      </div>
    </Pagina>
  );
};
