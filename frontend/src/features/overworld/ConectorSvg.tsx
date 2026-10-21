import React from 'react';
import type { EstadoFase, Fase } from '../../types';

/**
 * Líneas conectoras entre las tarjetas del camino del Overworld. El camino
 * alterna izquierda/derecha una fase por fila, así que se dibuja para N fases
 * (las que devuelva el backend). Las coordenadas van pegadas al layout de
 * OverworldPage (grid de 12 columnas, viewBox de ancho 1000, ALTO_FILA px por
 * fila). El color de cada tramo se toma del estado de la fase de ORIGEN
 * (completada -> cian recorrido; en_progreso -> ámbar animado, "aquí vas";
 * desbloqueada/bloqueada -> gris, todavía sin recorrer).
 */
export const ALTO_FILA = 236;
const X_IZQUIERDA = 208; // centro de las columnas 1-5 de 12
const X_DERECHA = 792; // centro de las columnas 8-12 de 12
const MEDIA_TARJETA = 78;

const ESTILO_TRAMO: Record<EstadoFase, { stroke: string; dash: string; clase?: string }> = {
  completada: { stroke: '#54ddfc', dash: '6 6' },
  en_progreso: { stroke: '#f59e0b', dash: '8 6', clase: 'animate-pulse' },
  desbloqueada: { stroke: '#2d3449', dash: '6 6' },
  bloqueada: { stroke: '#2d3449', dash: '6 6' },
};

const xDe = (indice: number) => (indice % 2 === 0 ? X_IZQUIERDA : X_DERECHA);
const yDe = (indice: number) => indice * ALTO_FILA + ALTO_FILA / 2;

export const ConectorSvg: React.FC<{ fases: Fase[] }> = ({ fases }) => (
  <svg
    className="absolute inset-0 w-full pointer-events-none"
    style={{ height: fases.length * ALTO_FILA }}
    fill="none"
    preserveAspectRatio="none"
    viewBox={`0 0 1000 ${fases.length * ALTO_FILA}`}
    aria-hidden="true"
  >
    {fases.slice(0, -1).map((origen, i) => {
      const x1 = xDe(i);
      const y1 = yDe(i) + MEDIA_TARJETA;
      const x2 = xDe(i + 1);
      const y2 = yDe(i + 1) - MEDIA_TARJETA;
      const estilo = ESTILO_TRAMO[origen.estado];
      return (
        <path
          key={origen.id}
          className={estilo.clase}
          d={`M ${x1} ${y1} C ${x1} ${y1 + 50}, ${x2} ${y2 - 50}, ${x2} ${y2}`}
          stroke={estilo.stroke}
          strokeDasharray={estilo.dash}
          strokeLinecap="round"
          strokeWidth="4"
        />
      );
    })}
  </svg>
);
