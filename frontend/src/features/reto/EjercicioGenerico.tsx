import React from 'react';
import type { Pregunta } from '../../types';

interface EjercicioGenericoProps {
  preguntas: Pregunta[];
  criteriosAceptacion: string;
  respuestas: Record<string, string>;
  onResponder: (preguntaId: string, respuesta: string) => void;
}

/**
 * Respaldo de último recurso: una respuesta de texto libre por pregunta,
 * para el caso (hoy no ocurre con el contenido real del seed) de que una
 * pregunta no traiga `opciones`. Para preguntas con opciones se usa
 * EjercicioOpciones en su lugar.
 */
export const EjercicioGenerico: React.FC<EjercicioGenericoProps> = ({
  preguntas,
  criteriosAceptacion,
  respuestas,
  onResponder,
}) => (
  <div className="bg-surface-container-low rounded-xl p-space-lg shadow-xl flex flex-col gap-space-md border border-surface-container-high/40">
    <div>
      <h3 className="font-title-lg text-title-lg text-on-surface font-bold flex items-center gap-space-xs">
        <span className="material-symbols-outlined text-tertiary text-title-lg">edit_note</span>
        Responde el reto
      </h3>
      <p className="font-body-md text-body-md text-on-surface-variant mt-space-xs">{criteriosAceptacion}</p>
    </div>
    {preguntas.map((pregunta) => (
      <label key={pregunta.preguntaId} className="flex flex-col gap-space-xs" htmlFor={`pregunta-${pregunta.preguntaId}`}>
        <span className="font-label-md text-label-md text-on-surface-variant">{pregunta.texto}</span>
        <input
          id={`pregunta-${pregunta.preguntaId}`}
          data-pregunta={pregunta.preguntaId}
          value={respuestas[pregunta.preguntaId] ?? ''}
          onChange={(e) => onResponder(pregunta.preguntaId, e.target.value)}
          className="px-space-md py-space-sm rounded-lg bg-surface-container-lowest border border-outline-variant/40 text-on-surface font-body-md text-body-md focus:outline-none focus:border-primary"
        />
      </label>
    ))}
  </div>
);
