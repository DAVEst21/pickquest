import React from 'react';
import type { EstadoFase, Fase } from '../../types';

/**
 * Líneas conectoras entre las tarjetas del camino del Overworld (mockup,
 * Fase 5). Las coordenadas son fijas: van pegadas al layout en zigzag de
 * OverworldPage.tsx (grid-cols-12, viewBox 1000x680), no al contenido de
 * cada fase. El color de cada tramo sí es real: se toma del estado de la
 * fase de ORIGEN (completada -> cian recorrido; en_progreso -> ámbar
 * animado, "aquí vas"; desbloqueada/bloqueada -> gris, todavía sin recorrer).
 */
const TRAMOS: { d: string }[] = [
  { d: 'M 200 110 L 460 110' }, // 1 -> 2
  { d: 'M 540 110 C 720 110, 780 200, 780 280' }, // 2 -> 3
  { d: 'M 720 330 C 580 330, 480 380, 480 440' }, // 3 -> 4
  { d: 'M 400 470 C 260 470, 220 520, 220 570' }, // 4 -> 5
  { d: 'M 300 600 L 520 600' }, // 5 -> 6
  { d: 'M 600 600 L 820 600' }, // 6 -> 7
];

const ESTILO_TRAMO: Record<EstadoFase, { stroke: string; dash: string; clase?: string }> = {
  completada: { stroke: '#54ddfc', dash: '6 6' },
  en_progreso: { stroke: '#f59e0b', dash: '8 6', clase: 'animate-pulse' },
  desbloqueada: { stroke: '#2d3449', dash: '6 6' },
  bloqueada: { stroke: '#2d3449', dash: '6 6' },
};

export const ConectorSvg: React.FC<{ fases: (Fase | undefined)[] }> = ({ fases }) => (
  <svg
    className="absolute inset-0 w-full h-full pointer-events-none"
    fill="none"
    preserveAspectRatio="none"
    viewBox="0 0 1000 680"
    aria-hidden="true"
  >
    {TRAMOS.map((tramo, i) => {
      const origen = fases[i];
      const destino = fases[i + 1];
      if (!origen || !destino) return null;
      const estilo = ESTILO_TRAMO[origen.estado];
      return (
        <path
          key={tramo.d}
          className={estilo.clase}
          d={tramo.d}
          stroke={estilo.stroke}
          strokeDasharray={estilo.dash}
          strokeLinecap="round"
          strokeWidth="4"
        />
      );
    })}
  </svg>
);
