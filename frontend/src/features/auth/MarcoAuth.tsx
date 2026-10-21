import React from 'react';

/** Marco minimalista de las pantallas de inicio de sesión y registro. */
export const MarcoAuth: React.FC<{ titulo: string; children: React.ReactNode }> = ({ titulo, children }) => (
  <div className="bg-background min-h-screen flex items-center justify-center px-gutter py-space-xl text-on-surface">
    <div className="w-full max-w-md bg-surface-container-low rounded-xl shadow-2xl p-space-xl border border-surface-container-high/40">
      <div className="flex items-center gap-space-sm mb-space-lg">
        <div className="w-10 h-10 rounded-lg bg-surface-container-high flex items-center justify-center text-primary">
          <span className="material-symbols-outlined text-headline-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
            swords
          </span>
        </div>
        <div className="flex flex-col">
          <span className="font-headline-sm text-headline-sm text-primary leading-none">PickQuest</span>
          <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest mt-space-xs">
            {titulo}
          </span>
        </div>
      </div>
      {children}
    </div>
  </div>
);

interface CampoProps {
  etiqueta: string;
  nombre: string;
  tipo?: string;
  valor: string;
  onCambio: (valor: string) => void;
  autoComplete?: string;
  ayuda?: string;
}

export const Campo: React.FC<CampoProps> = ({ etiqueta, nombre, tipo = 'text', valor, onCambio, autoComplete, ayuda }) => (
  <label className="flex flex-col gap-space-xs" htmlFor={nombre}>
    <span className="font-label-md text-label-md text-on-surface-variant">{etiqueta}</span>
    <input
      id={nombre}
      name={nombre}
      type={tipo}
      value={valor}
      required
      autoComplete={autoComplete}
      onChange={(e) => onCambio(e.target.value)}
      className="px-space-md py-space-sm rounded-lg bg-surface-container-lowest border border-outline-variant/40 text-on-surface font-body-md text-body-md focus:outline-none focus:border-primary"
    />
    {ayuda && <span className="font-body-sm text-body-sm text-on-surface-variant/70">{ayuda}</span>}
  </label>
);

export const MensajeError: React.FC<{ mensaje: string | null }> = ({ mensaje }) =>
  mensaje ? (
    <p role="alert" className="p-space-sm rounded-lg bg-error-container/30 text-error font-body-sm text-body-sm">
      {mensaje}
    </p>
  ) : null;

export const BotonEnviar: React.FC<{ cargando: boolean; texto: string }> = ({ cargando, texto }) => (
  <button
    type="submit"
    disabled={cargando}
    className="w-full py-space-sm rounded-lg bg-primary-container hover:bg-primary disabled:opacity-60 text-on-primary-container font-title-md text-title-md font-bold transition-colors"
  >
    {cargando ? 'Un momento...' : texto}
  </button>
);
