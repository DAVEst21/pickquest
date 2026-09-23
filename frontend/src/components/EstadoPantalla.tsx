import React from 'react';
import { Link } from 'react-router-dom';

export const PantallaCarga: React.FC<{ mensaje?: string }> = ({ mensaje = 'Cargando...' }) => (
  <div className="flex flex-col items-center justify-center gap-space-sm py-32 text-on-surface-variant" role="status">
    <span className="material-symbols-outlined animate-spin text-headline-lg text-primary">progress_activity</span>
    <span className="font-label-md text-label-md">{mensaje}</span>
  </div>
);

interface PantallaErrorProps {
  titulo: string;
  mensaje: string;
  icono?: string;
  /** Acción principal; por defecto, volver al mapa. */
  accion?: React.ReactNode;
}

/** Panel para errores esperados del backend (403 fase bloqueada, 404 inexistente...). */
export const PantallaError: React.FC<PantallaErrorProps> = ({ titulo, mensaje, icono = 'error', accion }) => (
  <div className="max-w-xl mx-auto px-gutter py-24" role="alert">
    <div className="bg-surface-container-low rounded-xl p-space-xl shadow-xl flex flex-col items-center text-center gap-space-md border border-surface-container-high/40">
      <div className="w-14 h-14 rounded-full bg-error-container/30 text-error flex items-center justify-center">
        <span className="material-symbols-outlined text-headline-md">{icono}</span>
      </div>
      <h1 className="font-headline-sm text-headline-sm text-on-surface">{titulo}</h1>
      <p className="font-body-md text-body-md text-on-surface-variant">{mensaje}</p>
      {accion ?? (
        <Link
          to="/"
          className="px-space-lg py-space-sm rounded-lg bg-primary-container hover:bg-primary text-on-primary-container font-title-md text-title-md flex items-center gap-space-xs transition-colors"
        >
          <span className="material-symbols-outlined text-title-md">map</span>
          <span>Volver al mapa</span>
        </Link>
      )}
    </div>
  </div>
);
