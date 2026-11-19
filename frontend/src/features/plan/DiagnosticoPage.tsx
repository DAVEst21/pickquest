import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { PantallaCarga, PantallaError } from '../../components/EstadoPantalla';
import { Pagina } from '../../components/Pagina';
import { ApiError, esError, esRecuperable, mensajeDeError } from '../../services/errores';
import { useDiagnostico, useResponderDiagnostico } from '../../services/queries';

/** Diagnóstico de nueve preguntas, tres por tema (CU-10, pasos 2 y 3, FE1). */
export const DiagnosticoPage: React.FC = () => {
  const diagnosticoId = Number(useParams<{ diagnosticoId: string }>().diagnosticoId);
  const navigate = useNavigate();
  const { data, isPending, isError, error, refetch, isFetching } = useDiagnostico(diagnosticoId);
  const enviar = useResponderDiagnostico(diagnosticoId);
  const [elegidas, setElegidas] = useState<Record<number, number>>({});
  const [pendientes, setPendientes] = useState<number[]>([]);
  const [aviso, setAviso] = useState<string | null>(null);

  if (isPending) {
    return (
      <Pagina>
        <PantallaCarga mensaje="Preparando tu diagnóstico..." />
      </Pagina>
    );
  }
  if (isError) {
    return (
      <Pagina>
        <PantallaError
          titulo={esError(error, 404) ? 'Diagnóstico no encontrado' : 'No se pudo abrir el diagnóstico'}
          mensaje={mensajeDeError(error)}
          onReintentar={esRecuperable(error) ? () => void refetch() : undefined}
          reintentando={isFetching}
          accion={
            <Link to="/plan" className="px-space-lg py-space-sm rounded-lg bg-primary-container text-on-primary-container font-title-md">
              Volver al plan
            </Link>
          }
        />
      </Pagina>
    );
  }

  const respondidas = Object.keys(elegidas).length;
  const terminar = () => {
    setAviso(null);
    const respuestas = Object.entries(elegidas).map(([preguntaId, opcionId]) => ({
      preguntaId: Number(preguntaId),
      opcionId,
    }));
    enviar.mutate(respuestas, {
      onSuccess: (resultado) =>
        navigate(`/plan/propuesta/${resultado.plan.planId}`, {
          state: { resultados: resultado.resultados, revision: resultado.revision },
        }),
      onError: (e) => {
        // FE1: el servidor devuelve cuáles preguntas faltan y no genera el plan.
        if (e instanceof ApiError && e.status === 400 && Array.isArray(e.datos.pendientes)) {
          setPendientes(e.datos.pendientes as number[]);
          setAviso(e.message);
        } else {
          setAviso(mensajeDeError(e));
        }
      },
    });
  };

  return (
    <Pagina>
      <div className="max-w-3xl mx-auto px-gutter py-space-xl flex flex-col gap-space-lg">
        <div>
          <h1 className="font-headline-md text-headline-md text-on-surface">Diagnóstico</h1>
          <p className="font-body-md text-body-md text-on-surface-variant" id="progreso-diagnostico">
            {respondidas} de {data.preguntas.length} preguntas respondidas
          </p>
        </div>

        <ol className="flex flex-col gap-space-md">
          {data.preguntas.map((p) => {
            const falta = pendientes.includes(p.preguntaId) && elegidas[p.preguntaId] === undefined;
            return (
              <li
                key={p.preguntaId}
                id={`pregunta-${p.preguntaId}`}
                className={`rounded-xl p-space-lg border ${
                  falta ? 'border-error bg-error-container/10' : 'border-outline-variant/30 bg-surface-container-low'
                }`}
              >
                <fieldset className="flex flex-col gap-space-sm">
                  <legend className="font-title-md text-title-md text-on-surface mb-space-sm">
                    {p.orden}. {p.enunciado}
                  </legend>
                  {p.opciones.map((o) => (
                    <label
                      key={o.opcionId}
                      className={`flex items-start gap-space-sm rounded-lg px-space-md py-space-sm cursor-pointer ${
                        elegidas[p.preguntaId] === o.opcionId ? 'bg-primary-container/20' : 'hover:bg-surface-container-high'
                      }`}
                    >
                      <input
                        type="radio"
                        name={`pregunta-${p.preguntaId}`}
                        checked={elegidas[p.preguntaId] === o.opcionId}
                        onChange={() => setElegidas((prev) => ({ ...prev, [p.preguntaId]: o.opcionId }))}
                        className="mt-1"
                      />
                      <span className="font-body-md text-body-md text-on-surface">{o.texto}</span>
                    </label>
                  ))}
                  {falta && (
                    <p className="font-label-md text-label-md text-error" role="alert">
                      Esta pregunta está pendiente
                    </p>
                  )}
                </fieldset>
              </li>
            );
          })}
        </ol>

        {aviso && (
          <p className="font-body-md text-body-md text-error" role="alert">
            {aviso}
          </p>
        )}
        <div className="flex justify-end gap-space-sm">
          <Link to="/plan" className="px-space-md py-space-sm rounded-lg bg-surface-container-high text-on-surface font-title-md">
            Cancelar
          </Link>
          <button
            type="button"
            onClick={terminar}
            disabled={enviar.isPending}
            className="px-space-lg py-space-sm rounded-lg bg-primary-container hover:bg-primary disabled:opacity-60 text-on-primary-container font-title-md font-bold"
          >
            {enviar.isPending ? 'Calificando...' : 'Terminar diagnóstico'}
          </button>
        </div>
      </div>
    </Pagina>
  );
};
