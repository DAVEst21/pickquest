import React from 'react';
import { Estrellas } from '../../components/Estrellas';
import type { EstadoFase, Fase } from '../../types';
import { etiquetaFase, presentacionFase } from '../fases/presentacion';

interface TarjetaFaseProps {
  fase: Fase;
  /** Es la fase en_progreso destacada con el banner "TÚ ESTÁS AQUÍ" (mockup). */
  esActiva: boolean;
  onAbrir: () => void;
  onInspeccionar: () => void;
}

const ESTILO: Record<EstadoFase, { tarjeta: string; acento: string; icono: string; iconoCaja: string }> = {
  completada: {
    tarjeta: 'bg-surface-container hover:bg-surface-container-high cursor-pointer border-tertiary/20',
    acento: 'text-tertiary',
    icono: 'verified',
    iconoCaja: 'bg-tertiary-container/30 text-tertiary',
  },
  en_progreso: {
    tarjeta:
      'bg-surface-container-high hover:scale-[1.02] cursor-pointer border-2 border-primary-container/60 shadow-2xl',
    acento: 'text-primary',
    icono: 'pending',
    iconoCaja: 'bg-primary-container/20 text-primary-container',
  },
  desbloqueada: {
    tarjeta: 'bg-surface-container hover:bg-surface-container-high cursor-pointer border-secondary/30',
    acento: 'text-secondary',
    icono: 'lock_open',
    iconoCaja: 'bg-secondary-container/30 text-secondary',
  },
  bloqueada: {
    tarjeta: 'bg-surface-container-low/60 cursor-not-allowed opacity-75 shadow-inner border-outline-variant/20',
    acento: 'text-on-surface-variant/60',
    icono: 'lock',
    iconoCaja: 'bg-surface-container-highest/40 text-on-surface-variant/50',
  },
};

export const TarjetaFase: React.FC<TarjetaFaseProps> = ({ fase, esActiva, onAbrir, onInspeccionar }) => {
  const { icono, subtitulo } = presentacionFase(fase);
  const estilo = ESTILO[fase.estado];
  const bloqueada = fase.estado === 'bloqueada';
  const esBoss = fase.dificultad === 'Boss Raid';
  const sinRetoTodavia = fase.retoId === null;

  return (
    <div
      role="button"
      tabIndex={bloqueada ? -1 : 0}
      aria-disabled={bloqueada}
      data-fase-orden={fase.orden}
      data-estado={fase.estado}
      onClick={onAbrir}
      onKeyDown={(e) => e.key === 'Enter' && onAbrir()}
      className={`group relative w-full rounded-xl shadow-md transition-all border ${
        esActiva ? 'p-space-lg' : 'p-space-md'
      } ${estilo.tarjeta}`}
    >
      {esActiva && (
        <div className="absolute -top-4 left-space-md flex items-center gap-space-xs bg-primary-container text-on-primary-container px-space-sm py-1 rounded-full shadow-lg">
          <span className="material-symbols-outlined text-label-md animate-bounce">location_on</span>
          <span className="font-label-sm text-label-sm font-bold tracking-wider uppercase">TÚ ESTÁS AQUÍ</span>
        </div>
      )}

      <div className={`flex items-center justify-between mb-space-xs ${esActiva ? 'mt-space-xs' : ''}`}>
        <span className={`font-label-sm text-label-sm uppercase font-bold ${estilo.acento}`}>
          {etiquetaFase(fase.orden)} ·{' '}
          {esBoss && bloqueada
            ? 'Boss Raid'
            : fase.estado === 'completada'
              ? '100%'
              : fase.estado === 'desbloqueada'
                ? 'Disponible'
                : fase.estado === 'bloqueada'
                  ? 'Bloqueada'
                  : 'En progreso'}
        </span>
        {/* En progreso: badge de % separado (mockup: "65% Progreso"), no el ícono de estado. */}
        {fase.estado === 'en_progreso' && fase.progreso !== null ? (
          <span className="font-code-md text-label-sm text-primary-fixed-dim bg-primary/10 px-space-xs py-0.5 rounded">
            {fase.progreso}% Progreso
          </span>
        ) : (
          <span
            className={`material-symbols-outlined text-title-md ${estilo.acento}`}
            style={{ fontVariationSettings: fase.estado === 'completada' ? "'FILL' 1" : "'FILL' 0" }}
          >
            {estilo.icono}
          </span>
        )}
      </div>

      <div className={`flex items-center gap-space-sm ${esActiva ? 'mb-space-md' : 'mb-space-sm'}`}>
        <div
          className={`rounded-lg flex items-center justify-center shrink-0 ${estilo.iconoCaja} ${
            esActiva ? 'w-12 h-12' : 'w-10 h-10'
          }`}
        >
          <span className={`material-symbols-outlined ${esActiva ? 'text-headline-sm' : 'text-headline-sm'}`}>
            {icono}
          </span>
        </div>
        <div className="min-w-0">
          <h2
            className={`font-title-md truncate ${esActiva ? 'font-headline-sm text-headline-sm' : 'text-title-md'} ${
              bloqueada ? 'text-on-surface-variant/80' : 'text-on-surface'
            }`}
          >
            {fase.nombre}
          </h2>
          <span className="font-body-sm text-body-sm text-on-surface-variant">{subtitulo}</span>
        </div>
      </div>

      {/* Barra de progreso: solo la fase en_progreso (mockup). */}
      {fase.estado === 'en_progreso' && fase.progreso !== null && (
        <div className="w-full bg-surface-container-lowest h-2 rounded-full mb-space-md overflow-hidden">
          <div
            className="bg-gradient-to-r from-primary-container to-primary h-full rounded-full shadow-[0_0_8px_rgba(245,158,11,0.6)] transition-all duration-700"
            style={{ width: `${fase.progreso}%` }}
          />
        </div>
      )}

      <div
        className={`flex items-center justify-between gap-space-sm rounded-lg min-h-9 ${
          esActiva ? '' : 'bg-surface-container-low px-space-sm py-space-xs'
        }`}
      >
        {bloqueada ? (
          <span className="flex items-center gap-space-xs font-label-sm text-label-sm text-on-surface-variant/70">
            <span className="material-symbols-outlined text-label-sm text-error">info</span>
            Requiere fase anterior
          </span>
        ) : sinRetoTodavia ? (
          <span className="font-label-sm text-label-sm text-on-surface-variant">Reto próximamente</span>
        ) : fase.estado === 'completada' ? (
          // Fase 5: una fase completada muestra estrellas Y recompensa en QP juntas.
          <>
            <div className="flex items-center gap-space-xs">
              <span className="font-label-sm text-label-sm text-on-surface-variant">Calificación:</span>
              <Estrellas cantidad={fase.calificacionEstrellasFase} />
            </div>
            {fase.recompensaQpFase !== null && (
              <span className="flex items-center gap-1 font-label-sm text-label-sm text-primary font-bold shrink-0">
                <span className="material-symbols-outlined text-label-md">token</span>+{fase.recompensaQpFase} QP
              </span>
            )}
          </>
        ) : fase.estado === 'en_progreso' ? (
          <span className="flex items-center gap-space-xs text-on-surface-variant font-label-sm text-label-sm">
            <span className="material-symbols-outlined text-label-md text-secondary">token</span>
            {fase.retosAprobados} de {fase.totalRetos} {fase.totalRetos === 1 ? 'reto aprobado' : 'retos aprobados'}
          </span>
        ) : (
          <span className="font-label-sm text-label-sm text-secondary font-semibold">Listo para iniciar</span>
        )}

        {esActiva ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onInspeccionar();
            }}
            className="px-space-md py-space-xs bg-primary-container hover:bg-primary text-on-primary-container font-title-md text-title-md rounded-lg shadow transition-colors flex items-center gap-1 shrink-0"
          >
            <span>Ver objetivos y recompensas</span>
            <span className="material-symbols-outlined text-title-md">arrow_forward</span>
          </button>
        ) : (
          !bloqueada && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onInspeccionar();
              }}
              className="shrink-0 px-space-sm py-0.5 rounded bg-surface-container-high hover:bg-surface-bright text-on-surface font-label-sm text-label-sm"
            >
              Detalles
            </button>
          )
        )}
      </div>
    </div>
  );
};
