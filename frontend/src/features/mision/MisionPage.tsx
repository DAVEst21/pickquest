import React from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Estrellas } from '../../components/Estrellas';
import { PantallaCarga, PantallaError } from '../../components/EstadoPantalla';
import { Pagina } from '../../components/Pagina';
import { esError, mensajeDeError } from '../../services/errores';
import { useFaseDetalle } from '../../services/queries';
import { ETIQUETA_ESTADO, ETIQUETA_TEMA, etiquetaFase, presentacionFase, umbralPorcentaje } from '../fases/presentacion';

export const MisionPage: React.FC = () => {
  const faseId = Number(useParams<{ faseId: string }>().faseId);
  const navigate = useNavigate();
  const { data, isPending, isError, error } = useFaseDetalle(faseId);

  if (!Number.isInteger(faseId) || faseId <= 0 || esError(error, 404)) {
    return (
      <Pagina>
        <PantallaError titulo="Misión no encontrada" mensaje="Esta fase no existe." icono="travel_explore" />
      </Pagina>
    );
  }
  if (isPending) {
    return (
      <Pagina>
        <PantallaCarga mensaje="Cargando la misión..." />
      </Pagina>
    );
  }
  if (isError) {
    return (
      <Pagina>
        <PantallaError titulo="No se pudo cargar la misión" mensaje={mensajeDeError(error)} />
      </Pagina>
    );
  }

  const { fase, reto } = data;
  const { descripcion } = presentacionFase(fase);
  const bloqueada = fase.estado === 'bloqueada';
  const puedeIniciar = !bloqueada && reto !== null;
  const umbral = reto ? umbralPorcentaje(reto.calificacionMinima) : null;

  return (
    <Pagina>
      <div className="flex flex-col w-full px-gutter py-space-lg max-w-7xl mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-space-xs text-on-surface-variant font-label-md text-label-md mb-space-md">
          <Link to="/" className="hover:text-primary transition-colors flex items-center gap-1">
            <span className="material-symbols-outlined text-[16px]">map</span>
            Overworld
          </Link>
          <span className="text-surface-bright">/</span>
          <span className="text-tertiary">{ETIQUETA_TEMA[fase.tema]}</span>
          <span className="text-surface-bright">/</span>
          <span className="text-primary font-bold">Tablón de Misiones</span>
        </div>

        {bloqueada && (
          <div
            role="alert"
            className="mb-space-md p-space-md rounded-xl bg-error-container/20 border border-error/30 flex items-center gap-space-sm text-on-surface"
          >
            <span className="material-symbols-outlined text-error">lock</span>
            <span className="font-body-md text-body-md">
              Esta fase está bloqueada: primero completa la fase anterior para poder iniciar su reto.
            </span>
          </div>
        )}

        <div className="relative w-full rounded-xl bg-surface-container-low shadow-xl overflow-hidden mb-space-lg border border-surface-container-high/40">
          <div className="absolute -top-32 -right-32 w-96 h-96 bg-primary-container/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute -bottom-24 -left-20 w-80 h-80 bg-secondary-container/20 rounded-full blur-3xl pointer-events-none"></div>

          <div className="relative p-space-lg md:p-space-xl flex flex-col gap-space-lg">
            {/* Header Banner & Metadata */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md pb-space-md border-b border-surface-container-high/40">
              <div className="flex flex-col gap-space-xs">
                <div className="flex flex-wrap items-center gap-space-xs">
                  <span className="px-space-sm py-0.5 rounded bg-primary-container/20 text-primary-fixed font-label-sm uppercase tracking-wider font-bold">
                    {ETIQUETA_ESTADO[fase.estado]}
                  </span>
                  <span className="px-space-sm py-0.5 rounded bg-tertiary/15 text-tertiary font-label-sm flex items-center gap-1 font-semibold">
                    <span className="material-symbols-outlined text-[14px]">bolt</span>
                    Dificultad {fase.dificultad}
                  </span>
                </div>
                <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight mt-space-xs">
                  {etiquetaFase(fase.orden)}: {fase.nombre}
                </h1>
                {descripcion && (
                  <p className="font-body-lg text-body-lg text-on-surface-variant max-w-3xl">{descripcion}</p>
                )}
              </div>

              {/* Mejor calificación del estudiante */}
              <div className="flex flex-row lg:flex-col items-center justify-center p-space-md rounded-xl bg-surface-container-highest/60 backdrop-blur-md self-start lg:self-auto shrink-0 min-w-[200px] gap-2 border border-outline-variant/30 shadow-md">
                <span className="font-label-sm text-label-sm uppercase tracking-widest text-on-surface-variant">
                  Tu mejor calificación
                </span>
                <Estrellas cantidad={fase.mejorCalificacionEstrellas} className="text-headline-sm" />
                <span className="font-code-md text-label-sm text-tertiary">
                  {fase.mejorPorcentaje === null ? 'Sin intentos todavía' : `Mejor intento: ${fase.mejorPorcentaje}%`}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg">
              {/* Criterios del reto */}
              <div className="lg:col-span-7 flex flex-col gap-space-md">
                <div className="flex items-center gap-space-xs">
                  <div className="w-2 h-5 rounded-full bg-primary"></div>
                  <h2 className="font-headline-sm text-headline-sm text-on-surface">Objetivos de la Misión</h2>
                </div>

                {reto ? (
                  <div className="flex flex-col gap-space-sm">
                    <div className="p-space-md rounded-xl bg-surface-container border border-surface-container-highest/40">
                      <span className="font-label-sm text-label-sm text-tertiary uppercase font-bold">
                        Criterios de aceptación
                      </span>
                      <p className="font-body-md text-body-md text-on-surface mt-1">{reto.criteriosAceptacion}</p>
                    </div>
                    <div className="p-space-md rounded-xl bg-surface-container border border-surface-container-highest/40">
                      <div className="flex items-center justify-between gap-space-xs">
                        <span className="font-title-md text-title-md text-on-surface">
                          Alcanzar una precisión mínima del {umbral}%
                        </span>
                        <span className="shrink-0 px-space-xs py-0.5 rounded bg-surface-container-highest text-primary font-label-sm text-label-sm font-bold">
                          Umbral Crítico
                        </span>
                      </div>
                      <div className="mt-space-sm flex items-center gap-space-sm">
                        <div className="flex-1 h-2 rounded-full bg-surface-container-lowest overflow-hidden p-[1px]">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-primary to-tertiary"
                            style={{ width: `${umbral}%` }}
                          ></div>
                        </div>
                        <span className="font-code-md text-label-sm text-primary font-bold">{umbral}% Requerido</span>
                      </div>
                      <p className="font-body-sm text-body-sm text-on-surface-variant mt-space-sm">
                        {reto.preguntas.length} {reto.preguntas.length === 1 ? 'pregunta' : 'preguntas'} a resolver.
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="p-space-md rounded-xl bg-surface-container font-body-md text-body-md text-on-surface-variant">
                    Esta fase todavía no tiene un reto disponible.
                  </p>
                )}
              </div>

              {/* Recompensas del reto (Reto.recompensaXp / recompensaQp) */}
              <div className="lg:col-span-5 flex flex-col gap-space-md">
                <div className="flex items-center gap-space-xs">
                  <div className="w-2 h-5 rounded-full bg-secondary"></div>
                  <h2 className="font-headline-sm text-headline-sm text-on-surface">Botín y Recompensas</h2>
                </div>

                {reto && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-space-sm">
                    <div className="p-space-md rounded-xl bg-surface-container flex items-center gap-space-md border border-surface-container-highest/40">
                      <div className="w-12 h-12 rounded-xl bg-secondary-container/40 flex items-center justify-center shrink-0 shadow-inner">
                        <span className="material-symbols-outlined text-secondary text-[26px]">psychology</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="font-headline-sm text-headline-sm text-secondary font-bold" id="mision-xp">
                          +{reto.recompensaXp} XP
                        </span>
                        <span className="font-body-sm text-body-sm text-on-surface-variant">Experiencia de Desarrollador</span>
                      </div>
                    </div>
                    <div className="p-space-md rounded-xl bg-surface-container flex items-center gap-space-md border border-surface-container-highest/40">
                      <div className="w-12 h-12 rounded-xl bg-primary-container/20 flex items-center justify-center shrink-0 shadow-inner">
                        <span className="material-symbols-outlined text-primary text-[26px]">toll</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="font-headline-sm text-headline-sm text-primary font-bold" id="mision-qp">
                          +{reto.recompensaQp} QP
                        </span>
                        <span className="font-body-sm text-body-sm text-on-surface-variant">Puntos de Calidad</span>
                      </div>
                    </div>
                  </div>
                )}
                <p className="p-space-md rounded-xl bg-surface-container-lowest font-body-sm text-body-sm text-on-surface-variant border border-surface-container-high/40">
                  {fase.estado === 'completada'
                    ? 'Ya aprobaste este reto: puedes repetirlo para mejorar tu calificación, pero no vuelve a otorgar XP ni QP.'
                    : 'La recompensa se otorga solo la primera vez que apruebas el reto.'}
                </p>
              </div>
            </div>

            {/* Acciones */}
            <div className="pt-space-lg flex flex-col sm:flex-row items-center justify-between gap-space-md border-t border-surface-container-high/40">
              <Link
                to="/"
                className="w-full sm:w-auto px-space-lg py-space-sm rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-title-md text-title-md flex items-center justify-center gap-space-xs transition-all shadow-md group border border-outline-variant/30"
              >
                <span className="material-symbols-outlined text-[20px] group-hover:-translate-x-1 transition-transform">
                  arrow_back
                </span>
                <span>Regresar al Mapa</span>
              </Link>

              <button
                onClick={() => navigate(`/reto/${fase.id}`)}
                disabled={!puedeIniciar}
                id="btn-iniciar-reto"
                className="w-full sm:w-auto px-space-xl py-3 rounded-xl bg-primary-container hover:brightness-110 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:brightness-100 text-on-primary-container font-title-lg text-title-lg font-bold flex items-center justify-center gap-space-sm transition-all shadow-[0_8px_20px_-4px_rgba(245,158,11,0.5)]"
              >
                <span>{bloqueada ? 'Fase bloqueada' : 'Iniciar Reto'}</span>
                <span className="material-symbols-outlined text-[22px]">{bloqueada ? 'lock' : 'play_arrow'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </Pagina>
  );
};
