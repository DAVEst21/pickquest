import React from 'react';
import { useNavigate } from 'react-router-dom';
import { mensajeDeError } from '../../services/errores';
import { useTablon } from '../../services/queries';
import type { Fase } from '../../types';
import { etiquetaFase, MECANICA } from '../fases/presentacion';

/** Vista rápida de una fase: su descripción y los retos con sus recompensas reales. */
export const ModalFase: React.FC<{ fase: Fase; onCerrar: () => void }> = ({ fase, onCerrar }) => {
  const navigate = useNavigate();
  const { data, isPending, isError, error } = useTablon(fase.id);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-gutter bg-surface-container-lowest/80 backdrop-blur-md"
      onClick={onCerrar}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className="relative w-full max-w-xl bg-surface-container rounded-xl shadow-2xl p-space-lg overflow-hidden border border-outline-variant/30 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-space-md">
          <div className="flex items-center gap-space-sm">
            <span className="material-symbols-outlined text-primary text-headline-sm">token</span>
            <div>
              <span className="font-label-sm text-label-sm text-primary uppercase">{etiquetaFase(fase.orden)}</span>
              <h3 id="modal-title" className="font-title-lg text-title-lg text-on-surface">
                {fase.nombre}
              </h3>
            </div>
          </div>
          <button
            onClick={onCerrar}
            className="w-8 h-8 rounded-lg bg-surface-container-high hover:bg-surface-bright flex items-center justify-center text-on-surface-variant"
            aria-label="Cerrar modal"
          >
            <span className="material-symbols-outlined text-title-md">close</span>
          </button>
        </div>

        <div className="space-y-space-md mb-space-lg">
          <div className="bg-surface-container-low p-space-md rounded-lg">
            <span className="font-label-sm text-label-sm text-tertiary uppercase">Descripción</span>
            <p className="font-body-md text-body-md text-on-surface mt-1">{fase.descripcion}</p>
          </div>
          {isPending && <p className="font-body-sm text-body-sm text-on-surface-variant">Cargando retos...</p>}
          {isError && <p className="font-body-sm text-body-sm text-error">{mensajeDeError(error)}</p>}
          {data && (
            <ul className="space-y-space-sm">
              {data.retos.map((reto) => (
                <li key={reto.id} className="bg-surface-container-low p-space-md rounded-lg flex flex-col gap-1">
                  <div className="flex items-center justify-between gap-space-sm">
                    <span className="font-title-md text-title-md text-on-surface flex items-center gap-space-xs">
                      <span className="material-symbols-outlined text-secondary text-title-md">
                        {MECANICA[reto.mecanica].icono}
                      </span>
                      {reto.orden}. {reto.titulo}
                    </span>
                    <span className="font-label-sm text-label-sm text-on-surface-variant shrink-0">
                      {MECANICA[reto.mecanica].nombre}
                    </span>
                  </div>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">{reto.objetivo}</p>
                  <div className="flex gap-space-md font-label-sm text-label-sm font-bold">
                    <span className="text-tertiary">+{reto.recompensaXp} XP</span>
                    <span className="text-primary">+{reto.recompensaQp} QP</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex items-center justify-end gap-space-sm">
          <button
            onClick={onCerrar}
            className="px-space-md py-space-sm rounded-lg bg-surface-container-high text-on-surface font-title-md text-title-md hover:bg-surface-bright transition-colors"
          >
            Cerrar
          </button>
          <button
            onClick={() => navigate(`/mision/${fase.id}`)}
            className="px-space-lg py-space-sm rounded-lg bg-primary-container hover:bg-primary text-on-primary-container font-title-md text-title-md flex items-center gap-space-xs transition-colors"
          >
            <span>Ir al tablón</span>
            <span className="material-symbols-outlined text-title-md">arrow_forward</span>
          </button>
        </div>
      </div>
    </div>
  );
};
