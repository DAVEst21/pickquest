import React from 'react';

interface ModalConfirmarProps {
  titulo: string;
  mensaje: React.ReactNode;
  textoConfirmar?: string;
  textoCancelar?: string;
  icono?: string;
  cargando?: boolean;
  onConfirmar: () => void;
  onCancelar: () => void;
}

/** Diálogo de confirmación (avisos de reintento, envío con advertencias...). */
export const ModalConfirmar: React.FC<ModalConfirmarProps> = ({
  titulo,
  mensaje,
  textoConfirmar = 'Continuar',
  textoCancelar = 'Cancelar',
  icono = 'help',
  cargando = false,
  onConfirmar,
  onCancelar,
}) => (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center p-gutter bg-surface-container-lowest/80 backdrop-blur-md"
    role="dialog"
    aria-modal="true"
    aria-labelledby="confirmar-titulo"
    onClick={onCancelar}
  >
    <div
      className="bg-surface-container max-w-md w-full rounded-2xl p-space-xl shadow-2xl border border-primary-container/40 flex flex-col gap-space-md"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center gap-space-sm">
        <div className="w-10 h-10 rounded-full bg-primary-container/20 text-primary flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined">{icono}</span>
        </div>
        <h2 id="confirmar-titulo" className="font-headline-sm text-headline-sm text-on-surface">
          {titulo}
        </h2>
      </div>
      <div className="font-body-md text-body-md text-on-surface-variant">{mensaje}</div>
      <div className="flex justify-end gap-space-sm">
        <button
          type="button"
          onClick={onCancelar}
          className="px-space-md py-space-sm rounded-lg bg-surface-container-high hover:bg-surface-bright text-on-surface font-title-md text-title-md transition-colors"
        >
          {textoCancelar}
        </button>
        <button
          type="button"
          onClick={onConfirmar}
          disabled={cargando}
          className="px-space-lg py-space-sm rounded-lg bg-primary-container hover:bg-primary disabled:opacity-60 text-on-primary-container font-title-md text-title-md font-bold transition-colors"
        >
          {cargando ? 'Un momento...' : textoConfirmar}
        </button>
      </div>
    </div>
  </div>
);
