import React from 'react';
import { Link } from 'react-router-dom';
import { buscarFaseActiva } from '../features/fases/presentacion';
import { useFases } from '../services/queries';

export const Footer: React.FC = () => {
  const { data: fases } = useFases();
  const faseActiva = buscarFaseActiva(fases);

  return (
    <footer className="w-full bg-surface-container-lowest py-space-xl border-t border-surface-container-high/40">
      <div className="w-full px-gutter max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-space-md">
        <div className="flex flex-col items-center md:items-start gap-space-xs">
          <div className="flex items-center gap-space-xs">
            <span className="font-headline-sm text-headline-sm text-primary">PickQuest</span>
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase">
              · SDLC Quest Engine
            </span>
          </div>
          <p className="font-body-sm text-body-sm text-on-surface-variant text-center md:text-left">
            Entrena patrones de arquitectura, pipelines de entrega continua y despliegues épicos sin bugs.
          </p>
        </div>

        <div className="flex items-center gap-space-lg">
          <Link
            to="/"
            className="font-label-md text-label-md text-on-surface-variant hover:text-primary transition-colors"
          >
            Overworld
          </Link>
          <Link
            to={faseActiva ? `/mision/${faseActiva.id}` : '/'}
            className="font-label-md text-label-md text-on-surface-variant hover:text-primary transition-colors"
          >
            Misiones
          </Link>
          <span className="font-label-md text-label-md text-on-surface-variant/60 cursor-not-allowed">
            Gremio
          </span>
          <span className="font-label-md text-label-md text-on-surface-variant/60 cursor-not-allowed">
            Bóveda QP
          </span>
        </div>

        <div className="font-label-sm text-label-sm text-on-surface-variant text-center md:text-right">
          © 2025 PickQuest Academy. Código limpio y gloria eterna.
        </div>
      </div>
    </footer>
  );
};
