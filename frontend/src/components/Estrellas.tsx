import React from 'react';

interface EstrellasProps {
  /** 0-3; null si todavía no hay intentos. */
  cantidad: number | null;
  className?: string;
}

/** Calificación de 0 a 3 estrellas. */
export const Estrellas: React.FC<EstrellasProps> = ({ cantidad, className = 'text-label-md' }) => (
  <div
    className="flex items-center text-primary-container"
    aria-label={cantidad === null ? 'Sin calificación' : `${cantidad} de 3 estrellas`}
  >
    {[1, 2, 3].map((n) => (
      <span
        key={n}
        className={`material-symbols-outlined ${className} ${cantidad !== null && n <= cantidad ? '' : 'opacity-30'}`}
        style={{ fontVariationSettings: cantidad !== null && n <= cantidad ? "'FILL' 1" : "'FILL' 0" }}
      >
        star
      </span>
    ))}
  </div>
);
