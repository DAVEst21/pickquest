import React from 'react';
import { Link } from 'react-router-dom';
import type { ActividadPlan } from '../../types';

const ICONO = { RETO: 'swords', REPASO: 'style', DUELO: 'sports_kabaddi' } as const;
const ETIQUETA = { RETO: 'Reto', REPASO: 'Repaso', DUELO: 'Duelo' } as const;

/** Acceso directo de cada actividad del plan al reto, al repaso o a los duelos (CU-10, paso 8). */
function rutaDeActividad(a: ActividadPlan): string {
  switch (a.tipo) {
    case 'RETO':
      return `/mision/${a.faseId}`;
    case 'REPASO':
      return `/estudio/${a.faseId}`;
    default:
      return '/duelos';
  }
}

interface Props {
  actividad: ActividadPlan;
  /** Controles de ajuste (FA1) para un plan propuesto. */
  acciones?: React.ReactNode;
}

/** Una actividad del plan: tipo, tema, motivo, estado y acceso directo. */
export const ActividadItem: React.FC<Props> = ({ actividad: a, acciones }) => (
  <li
    className={`flex flex-wrap items-center gap-space-md rounded-xl p-space-md border ${
      a.hecha ? 'bg-tertiary-container/10 border-tertiary/30' : 'bg-surface-container-low border-outline-variant/30'
    }`}
  >
    <span className={`material-symbols-outlined ${a.hecha ? 'text-tertiary' : 'text-primary'}`} aria-hidden="true">
      {a.hecha ? 'check_circle' : ICONO[a.tipo]}
    </span>
    <div className="flex-1 min-w-[12rem]">
      <p className="font-title-md text-title-md text-on-surface">
        {ETIQUETA[a.tipo]}
        {a.retoTitulo ? `: ${a.retoTitulo}` : ` · ${a.temaNombre}`}
        {a.hecha && <span className="ml-space-sm font-label-md text-tertiary">Hecha</span>}
      </p>
      <p className="font-body-md text-body-md text-on-surface-variant">{a.motivo}</p>
    </div>
    {acciones}
    <Link
      to={rutaDeActividad(a)}
      className="px-space-md py-space-sm rounded-lg bg-primary-container hover:bg-primary text-on-primary-container font-title-md text-title-md"
    >
      Ir
    </Link>
  </li>
);
