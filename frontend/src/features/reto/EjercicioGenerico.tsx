import React from 'react';

interface EjercicioGenericoProps {
  preguntas: string[];
  criteriosAceptacion: string;
  respuestas: Record<string, string>;
  onResponder: (preguntaId: string, respuesta: string) => void;
}

/**
 * Respaldo para retos que no tienen una interfaz propia en el frontend (por
 * ejemplo, los retos de ejemplo de las fases 1 y 2 del seed): una respuesta de
 * texto por pregunta. El backend no guarda todavía el enunciado de cada
 * pregunta, así que solo se muestran su identificador y los criterios del reto.
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
    {preguntas.map((preguntaId) => (
      <label key={preguntaId} className="flex flex-col gap-space-xs" htmlFor={`pregunta-${preguntaId}`}>
        <span className="font-label-md text-label-md text-on-surface-variant">Pregunta «{preguntaId}»</span>
        <input
          id={`pregunta-${preguntaId}`}
          data-pregunta={preguntaId}
          value={respuestas[preguntaId] ?? ''}
          onChange={(e) => onResponder(preguntaId, e.target.value)}
          className="px-space-md py-space-sm rounded-lg bg-surface-container-lowest border border-outline-variant/40 text-on-surface font-body-md text-body-md focus:outline-none focus:border-primary"
        />
      </label>
    ))}
  </div>
);
