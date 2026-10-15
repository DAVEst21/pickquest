import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { PantallaCarga, PantallaError } from '../../components/EstadoPantalla';
import { Estrellas } from '../../components/Estrellas';
import { ModalConfirmar } from '../../components/ModalConfirmar';
import { Pagina } from '../../components/Pagina';
import { Toast } from '../../components/Toast';
import { esError, esRecuperable, mensajeDeError } from '../../services/errores';
import { useIniciarIntento, useTablon } from '../../services/queries';
import { type EstadoReto, type RetoTablon, UMBRAL_APROBACION } from '../../types';
import {
  ETIQUETA_ESTADO,
  ETIQUETA_ESTADO_RETO,
  ETIQUETA_TEMA,
  etiquetaFase,
  iconoFase,
  MECANICA,
} from '../fases/presentacion';
import { GuiaTecnica } from '../reto/GuiaTecnica';

const ESTILO_ESTADO: Record<EstadoReto, string> = {
  BLOQUEADO: 'bg-surface-container-highest/50 text-on-surface-variant/70',
  DISPONIBLE: 'bg-secondary-container/40 text-secondary',
  EN_CURSO: 'bg-primary-container/20 text-primary',
  APROBADO: 'bg-tertiary-container/30 text-tertiary',
};

const TEXTO_BOTON: Record<EstadoReto, string> = {
  BLOQUEADO: 'Bloqueado',
  DISPONIBLE: 'Iniciar reto',
  EN_CURSO: 'Continuar intento',
  APROBADO: 'Reintentar',
};

/** Tablón de la fase (RF-18): todos sus retos con estado, objetivo y recompensas. */
export const MisionPage: React.FC = () => {
  const faseId = Number(useParams<{ faseId: string }>().faseId);
  const navigate = useNavigate();
  const { data, isPending, isError, error, refetch, isFetching } = useTablon(faseId);
  const iniciar = useIniciarIntento();
  const [confirmarReintento, setConfirmarReintento] = useState<RetoTablon | null>(null);
  const [guiaAbierta, setGuiaAbierta] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  if (!Number.isInteger(faseId) || faseId <= 0 || esError(error, 404)) {
    return (
      <Pagina>
        <PantallaError titulo="Fase no encontrada" mensaje="Esta fase no existe." icono="travel_explore" />
      </Pagina>
    );
  }
  if (isPending) {
    return (
      <Pagina>
        <PantallaCarga mensaje="Cargando el tablón..." />
      </Pagina>
    );
  }
  if (isError) {
    return (
      <Pagina>
        <PantallaError titulo="No se pudo cargar el tablón" mensaje={mensajeDeError(error)} onReintentar={esRecuperable(error) ? () => void refetch() : undefined} reintentando={isFetching} />
      </Pagina>
    );
  }

  const { fase, retos, contenidosApoyo } = data;
  const bloqueada = fase.estado === 'bloqueada';

  const entrar = (reto: RetoTablon) => {
    iniciar.mutate(reto.id, {
      onSuccess: (intento) => navigate(`/intento/${intento.intentoId}`),
      onError: (e) => {
        setConfirmarReintento(null);
        setAviso(mensajeDeError(e));
        setTimeout(() => setAviso(null), 3500);
      },
    });
  };

  const alPulsar = (reto: RetoTablon) => {
    if (reto.estado === 'BLOQUEADO') return;
    // FA1: reintentar un reto ya aprobado pide confirmación (RN-05 y RN-07).
    if (reto.estado === 'APROBADO') setConfirmarReintento(reto);
    else entrar(reto);
  };

  return (
    <Pagina>
      <div className="flex flex-col w-full px-gutter py-space-lg max-w-5xl mx-auto gap-space-lg">
        <nav className="flex items-center gap-space-xs font-label-md text-label-md text-on-surface-variant">
          <Link to="/" className="hover:text-primary transition-colors flex items-center gap-1">
            <span className="material-symbols-outlined text-title-md">map</span>
            Mapa
          </Link>
          <span>/</span>
          <span className="text-on-surface">{etiquetaFase(fase.orden)}</span>
        </nav>

        <header className="bg-surface-container-low rounded-xl p-space-lg shadow-xl border border-surface-container-high/40 flex flex-col gap-space-md">
          <div className="flex items-start justify-between gap-space-md flex-wrap">
            <div className="flex items-center gap-space-md">
              <div className="w-14 h-14 rounded-xl bg-surface-container-high text-primary flex items-center justify-center shadow-inner shrink-0">
                <span className="material-symbols-outlined text-headline-md">{iconoFase(fase)}</span>
              </div>
              <div>
                <span className="font-label-sm text-label-sm text-tertiary uppercase tracking-wider">
                  {etiquetaFase(fase.orden)} · {ETIQUETA_TEMA[fase.tema]} · {fase.dificultad}
                </span>
                <h1 className="font-headline-md text-headline-md text-on-surface">{fase.nombre}</h1>
              </div>
            </div>
            <div className="flex items-center gap-space-sm">
              <span className="px-space-sm py-1 rounded-full bg-surface-container-high font-label-sm text-label-sm text-on-surface">
                {ETIQUETA_ESTADO[fase.estado]}
              </span>
              {contenidosApoyo.length > 0 && (
                <button
                  onClick={() => setGuiaAbierta(true)}
                  className="flex items-center gap-space-xs px-space-md py-2 rounded-lg bg-surface-container-high hover:bg-surface-bright text-on-surface transition-all border border-outline-variant/30"
                >
                  <span className="material-symbols-outlined text-secondary text-title-md">menu_book</span>
                  <span className="font-label-md text-label-md font-semibold">Guía técnica</span>
                </button>
              )}
            </div>
          </div>
          <p className="font-body-md text-body-md text-on-surface-variant">{fase.descripcion}</p>
          <div className="flex flex-wrap items-center gap-space-md">
            <div className="flex-1 min-w-[200px]">
              <div className="flex justify-between font-label-sm text-label-sm text-on-surface-variant mb-1">
                <span>
                  {fase.retosAprobados} de {fase.totalRetos} retos aprobados
                </span>
                <span>{fase.progreso ?? 0}%</span>
              </div>
              <div className="w-full bg-surface-container-lowest h-2 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-primary-container to-primary h-full rounded-full transition-all duration-700"
                  style={{ width: `${fase.progreso ?? 0}%` }}
                />
              </div>
            </div>
            {fase.estado === 'completada' && (
              <div className="flex items-center gap-space-sm">
                <Estrellas cantidad={fase.calificacionEstrellasFase} className="text-title-lg" />
                {fase.recompensaQpFase !== null && (
                  <span className="font-label-md text-label-md text-primary font-bold">+{fase.recompensaQpFase} QP</span>
                )}
              </div>
            )}
          </div>
        </header>

        {bloqueada && (
          <div className="bg-error-container/20 border border-error/30 rounded-xl p-space-md flex items-center gap-space-sm text-on-surface">
            <span className="material-symbols-outlined text-error">lock</span>
            <span className="font-body-md text-body-md">
              Esta fase está bloqueada: completa todos los retos de la fase anterior para abrirla.
            </span>
          </div>
        )}

        <section aria-label="Retos de la fase" className="flex flex-col gap-space-md">
          <div className="flex items-center gap-space-xs">
            <div className="w-2 h-5 rounded-full bg-primary"></div>
            <h2 className="font-headline-sm text-headline-sm text-on-surface">Tablón de retos</h2>
            <span className="font-label-sm text-label-sm text-on-surface-variant ml-space-sm">
              Se resuelven en orden · mínimo para aprobar {UMBRAL_APROBACION}%
            </span>
          </div>

          <ol className="flex flex-col gap-space-md">
            {retos.map((reto) => {
              const m = MECANICA[reto.mecanica];
              const bloqueado = reto.estado === 'BLOQUEADO';
              return (
                <li
                  key={reto.id}
                  data-reto-id={reto.id}
                  data-estado={reto.estado}
                  className={`rounded-xl p-space-lg shadow-lg border flex flex-col md:flex-row gap-space-md md:items-center justify-between ${
                    bloqueado
                      ? 'bg-surface-container-low/60 border-outline-variant/20 opacity-75'
                      : 'bg-surface-container border-surface-container-high/50'
                  }`}
                >
                  <div className="flex gap-space-md min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-surface-container-high text-secondary flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-headline-sm">
                        {bloqueado ? 'lock' : m.icono}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1 min-w-0">
                      <div className="flex items-center gap-space-sm flex-wrap">
                        <span className="font-label-sm text-label-sm text-on-surface-variant uppercase">
                          Reto {reto.orden} · {m.nombre}
                        </span>
                        <span className={`px-space-xs py-0.5 rounded font-label-sm text-label-sm font-bold ${ESTILO_ESTADO[reto.estado]}`}>
                          {ETIQUETA_ESTADO_RETO[reto.estado]}
                        </span>
                      </div>
                      <h3 className="font-title-lg text-title-lg text-on-surface">{reto.titulo}</h3>
                      <p className="font-body-md text-body-md text-on-surface-variant">{reto.objetivo}</p>
                      <div className="flex items-center gap-space-md flex-wrap mt-1">
                        <span className="flex items-center gap-1 font-label-md text-label-md text-tertiary font-bold">
                          <span className="material-symbols-outlined text-label-md">bolt</span>+{reto.recompensaXp} XP
                        </span>
                        <span className="flex items-center gap-1 font-label-md text-label-md text-primary font-bold">
                          <span className="material-symbols-outlined text-label-md">token</span>+{reto.recompensaQp} QP
                        </span>
                        {reto.mejorPorcentaje !== null && (
                          <span className="flex items-center gap-space-xs font-label-sm text-label-sm text-on-surface-variant">
                            Mejor: {reto.mejorPorcentaje}%
                            <Estrellas cantidad={reto.mejorCalificacionEstrellas} />
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={bloqueado || iniciar.isPending}
                    onClick={() => alPulsar(reto)}
                    className={`shrink-0 px-space-lg py-space-sm rounded-lg font-title-md text-title-md font-bold flex items-center justify-center gap-space-xs transition-all ${
                      bloqueado
                        ? 'bg-surface-container-highest/40 text-on-surface-variant/60 cursor-not-allowed'
                        : reto.estado === 'APROBADO'
                          ? 'bg-surface-container-high hover:bg-surface-bright text-on-surface'
                          : 'bg-primary-container hover:bg-primary text-on-primary-container shadow-lg'
                    }`}
                  >
                    <span className="material-symbols-outlined text-title-md">
                      {bloqueado ? 'lock' : reto.estado === 'APROBADO' ? 'replay' : 'play_arrow'}
                    </span>
                    <span>{TEXTO_BOTON[reto.estado]}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        </section>
      </div>

      {confirmarReintento && (
        <ModalConfirmar
          titulo="Reintentar un reto aprobado"
          icono="replay"
          textoConfirmar="Reintentar"
          cargando={iniciar.isPending}
          mensaje={
            <p>
              Ya aprobaste «{confirmarReintento.titulo}». Si lo reintentas se conserva tu mejor calificación y{' '}
              <strong>no se otorgan XP ni QP de nuevo</strong>: la recompensa solo se entrega la primera vez que se aprueba.
            </p>
          }
          onConfirmar={() => entrar(confirmarReintento)}
          onCancelar={() => setConfirmarReintento(null)}
        />
      )}
      {guiaAbierta && <GuiaTecnica contenidos={contenidosApoyo} onCerrar={() => setGuiaAbierta(false)} />}
      <Toast visible={aviso !== null} message={aviso ?? ''} icon="error" />
    </Pagina>
  );
};
