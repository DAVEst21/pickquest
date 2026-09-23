import React from 'react';
import { Estrellas } from '../../components/Estrellas';
import type { EstadoFase, Fase } from '../../types';
import { ETIQUETA_ESTADO, etiquetaFase, presentacionFase } from '../fases/presentacion';

interface TarjetaFaseProps {
  fase: Fase;
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
    tarjeta: 'bg-surface-container-high hover:scale-[1.02] cursor-pointer border-2 border-primary-container/60 shadow-2xl',
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

  return (
    <div
      role="button"
      tabIndex={bloqueada ? -1 : 0}
      aria-disabled={bloqueada}
      data-fase-orden={fase.orden}
      data-estado={fase.estado}
      onClick={onAbrir}
      onKeyDown={(e) => e.key === 'Enter' && onAbrir()}
      className={`group relative w-full rounded-xl p-space-md shadow-md transition-all border ${estilo.tarjeta}`}
    >
      {esActiva && (
        <div className="absolute -top-4 left-space-md flex items-center gap-space-xs bg-primary-container text-on-primary-container px-space-sm py-1 rounded-full shadow-lg">
          <span className="material-symbols-outlined text-label-md animate-bounce">location_on</span>
          <span className="font-label-sm text-label-sm font-bold tracking-wider uppercase">TÚ ESTÁS AQUÍ</span>
        </div>
      )}

      <div className="flex items-center justify-between mb-space-xs mt-space-xs">
        <span className={`font-label-sm text-label-sm uppercase ${estilo.acento}`}>
          {etiquetaFase(fase.orden)} · {esBoss && bloqueada ? 'Boss Raid' : ETIQUETA_ESTADO[fase.estado]}
        </span>
        <span
          className={`material-symbols-outlined text-title-md ${estilo.acento}`}
          style={{ fontVariationSettings: fase.estado === 'completada' ? "'FILL' 1" : "'FILL' 0" }}
        >
          {estilo.icono}
        </span>
      </div>

      <div className="flex items-center gap-space-sm mb-space-sm">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${estilo.iconoCaja}`}>
          <span className="material-symbols-outlined text-headline-sm">{icono}</span>
        </div>
        <div className="min-w-0">
          <h2 className={`font-title-md text-title-md truncate ${bloqueada ? 'text-on-surface-variant/80' : 'text-on-surface'}`}>
            {fase.nombre}
          </h2>
          <span className="font-body-sm text-body-sm text-on-surface-variant">{subtitulo}</span>
        </div>
      </div>

      <div className="flex items-center justify-between gap-space-sm bg-surface-container-low px-space-sm py-space-xs rounded-lg min-h-9">
        {bloqueada ? (
          <span className="flex items-center gap-space-xs font-label-sm text-label-sm text-on-surface-variant/70">
            <span className="material-symbols-outlined text-label-sm text-error">info</span>
            Requiere fase anterior
          </span>
        ) : fase.retoId === null ? (
          <span className="font-label-sm text-label-sm text-on-surface-variant">Reto próximamente</span>
        ) : fase.estado === 'completada' ? (
          <>
            <span className="font-label-sm text-label-sm text-on-surface-variant">Mejor calificación:</span>
            <Estrellas cantidad={fase.mejorCalificacionEstrellas} />
          </>
        ) : fase.estado === 'en_progreso' ? (
          <span className="font-label-sm text-label-sm text-on-surface-variant">
            Mejor intento: <strong className="text-primary">{fase.mejorPorcentaje}%</strong> · {fase.intentosRealizados}{' '}
            {fase.intentosRealizados === 1 ? 'intento' : 'intentos'}
          </span>
        ) : (
          <span className="font-label-sm text-label-sm text-secondary font-semibold">Listo para iniciar</span>
        )}
        {!bloqueada && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onInspeccionar();
            }}
            className="shrink-0 px-space-sm py-0.5 rounded bg-surface-container-high hover:bg-surface-bright text-on-surface font-label-sm text-label-sm"
          >
            Detalles
          </button>
        )}
      </div>
    </div>
  );
};
