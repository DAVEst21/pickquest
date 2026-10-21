import React from 'react';
import type { ContenidoApoyo } from '../../types';

/** Contenido de apoyo de la fase (GET /fases/:faseId → contenidosApoyo). */
export const GuiaTecnica: React.FC<{ contenidos: ContenidoApoyo[]; onCerrar: () => void }> = ({
  contenidos,
  onCerrar,
}) => (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center p-gutter bg-surface-container-lowest/80 backdrop-blur-md"
    role="dialog"
    aria-modal="true"
    aria-labelledby="guide-title"
    onClick={onCerrar}
  >
    <div
      className="bg-surface-container-low max-w-2xl w-full rounded-2xl p-space-xl shadow-2xl relative flex flex-col gap-space-md max-h-[85vh] overflow-y-auto border border-outline-variant/40"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-space-sm">
          <div className="w-10 h-10 rounded-lg bg-secondary-container text-secondary flex items-center justify-center">
            <span className="material-symbols-outlined text-headline-sm">menu_book</span>
          </div>
          <div>
            <span className="font-label-sm text-label-sm text-secondary uppercase font-bold">Compendio SDLC</span>
            <h3 id="guide-title" className="font-headline-sm text-headline-sm text-on-surface">
              Guía Técnica
            </h3>
          </div>
        </div>
        <button
          onClick={onCerrar}
          className="w-8 h-8 rounded-lg bg-surface-container-high hover:bg-surface-bright text-on-surface flex items-center justify-center transition-colors"
          aria-label="Cerrar guía"
        >
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>

      {contenidos.map((contenido) => (
        <div key={contenido.id} className="space-y-space-md">
          {[
            { titulo: 'Teoría', texto: contenido.contenidoTeorico, color: 'text-primary' },
            { titulo: 'Ejemplos', texto: contenido.ejemplos, color: 'text-tertiary' },
            { titulo: 'Glosario', texto: contenido.glosario, color: 'text-secondary' },
          ].map(({ titulo, texto, color }) => (
            <div
              key={titulo}
              className="p-space-md rounded-xl bg-surface-container-high space-y-2 border border-surface-container-highest/40"
            >
              <h4 className={`font-title-md text-title-md font-bold ${color}`}>{titulo}</h4>
              <p className="font-body-sm text-body-sm text-on-surface whitespace-pre-line">{texto}</p>
            </div>
          ))}
        </div>
      ))}

      <div className="pt-space-md flex justify-end">
        <button
          onClick={onCerrar}
          className="px-space-lg py-2 rounded-lg bg-primary-container text-on-primary-container font-title-md text-title-md font-bold hover:brightness-110 transition-all"
        >
          Comprendido, Volver al Combate
        </button>
      </div>
    </div>
  </div>
);
