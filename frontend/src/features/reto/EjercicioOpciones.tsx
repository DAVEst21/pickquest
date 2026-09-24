import React from 'react';
import type { Pregunta } from '../../types';

interface EjercicioOpcionesProps {
  enunciado?: string;
  preguntas: Pregunta[];
  respuestas: Record<string, string>;
  onResponder: (preguntaId: string, respuesta: string) => void;
}

const ETIQUETA_PARTE: Record<string, string> = {
  A: 'Parte A',
  B: 'Parte B',
  C: 'Parte C',
};

/**
 * Ejercicio genérico de opciones: cada pregunta trae su texto real y sus
 * opciones (backend, RetoDto.preguntas), el estudiante elige una por
 * pregunta con un botón. Cubre OPCION_MULTIPLE, y también DRAG_AND_DROP
 * (ordenar/clasificar/emparejar) reformulado como "elegir la opción correcta
 * para cada posición/ítem/pareja" en vez de una interacción de arrastre
 * literal — construir arrastrar-y-soltar real es un trabajo de UI aparte,
 * fuera de lo pedido aquí; lo que se pidió es que la calificación sea
 * correcta al resolver el reto, y esa mecánica de clasificación por punto se
 * evalúa exactamente igual (server-side, por preguntaId).
 */
export const EjercicioOpciones: React.FC<EjercicioOpcionesProps> = ({
  enunciado,
  preguntas,
  respuestas,
  onResponder,
}) => {
  const partes = [...new Set(preguntas.map((p) => p.parte).filter((p): p is string => !!p))];
  const grupos = partes.length > 0 ? partes.map((parte) => ({ parte, preguntas: preguntas.filter((p) => p.parte === parte) })) : [{ parte: undefined, preguntas }];

  return (
    <div className="bg-surface-container-low rounded-xl p-space-lg shadow-xl flex flex-col gap-space-lg border border-surface-container-high/40">
      {enunciado && (
        <div className="flex items-start gap-space-sm">
          <span className="material-symbols-outlined text-primary text-title-md shrink-0 mt-0.5">terminal</span>
          <p className="font-body-md text-body-md text-on-surface">{enunciado}</p>
        </div>
      )}

      {grupos.map(({ parte, preguntas: preguntasDeLaParte }) => (
        <div key={parte ?? 'unica'} className="flex flex-col gap-space-md">
          {parte && (
            <span className="px-space-xs py-0.5 rounded bg-primary-container text-on-primary-container font-label-sm text-label-sm font-bold self-start uppercase">
              {ETIQUETA_PARTE[parte] ?? `Parte ${parte}`}
            </span>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
            {preguntasDeLaParte.map((pregunta) => (
              <div
                key={pregunta.preguntaId}
                className="bg-surface-container-high rounded-xl p-space-md flex flex-col gap-space-sm shadow-md border border-surface-container-highest/40"
              >
                <p className="font-body-md text-body-md text-on-surface font-semibold">{pregunta.texto}</p>
                {pregunta.opciones ? (
                  <div className="flex flex-col gap-1" role="radiogroup" aria-label={pregunta.texto}>
                    {pregunta.opciones.map((opcion) => {
                      const elegida = respuestas[pregunta.preguntaId] === opcion.valor;
                      return (
                        <button
                          key={opcion.valor}
                          type="button"
                          role="radio"
                          aria-checked={elegida}
                          data-pregunta={pregunta.preguntaId}
                          data-valor={opcion.valor}
                          onClick={() => onResponder(pregunta.preguntaId, opcion.valor)}
                          className={`px-space-sm py-1.5 rounded text-left font-label-sm text-[12px] font-semibold transition-all ${
                            elegida
                              ? 'bg-primary text-on-primary shadow-sm'
                              : 'bg-surface-container text-on-surface-variant hover:bg-surface-bright hover:text-on-surface'
                          }`}
                        >
                          {opcion.texto}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <input
                    data-pregunta={pregunta.preguntaId}
                    value={respuestas[pregunta.preguntaId] ?? ''}
                    onChange={(e) => onResponder(pregunta.preguntaId, e.target.value)}
                    className="px-space-sm py-1.5 rounded-lg bg-surface-container-lowest border border-outline-variant/40 text-on-surface font-body-sm text-body-sm focus:outline-none focus:border-primary"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
