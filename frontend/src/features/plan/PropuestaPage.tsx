import React, { useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { PantallaCarga, PantallaError } from '../../components/EstadoPantalla';
import { Pagina } from '../../components/Pagina';
import { esError, esRecuperable, mensajeDeError } from '../../services/errores';
import { useAceptarPlan, usePlan } from '../../services/queries';
import type { ResultadoTema } from '../../types';
import { ActividadItem } from './ActividadItem';

/** Plan propuesto: resultados por tema, ajuste de actividades y aceptación (CU-10, pasos 4 a 8, FA1, FE2). */
export const PropuestaPage: React.FC = () => {
  const planId = Number(useParams<{ planId: string }>().planId);
  const navigate = useNavigate();
  const location = useLocation();
  const resultados = (location.state as { resultados?: ResultadoTema[] } | null)?.resultados;
  const { data: plan, isPending, isError, error, refetch, isFetching } = usePlan(planId);
  const aceptar = useAceptarPlan(planId);
  // null: sin ajustes; se parte de las actividades del plan tal como llegan.
  const [orden, setOrden] = useState<number[] | null>(null);

  if (isPending) {
    return (
      <Pagina>
        <PantallaCarga mensaje="Cargando tu plan..." />
      </Pagina>
    );
  }
  if (isError) {
    return (
      <Pagina>
        <PantallaError
          titulo={esError(error, 404) ? 'Plan no encontrado' : 'No se pudo cargar el plan'}
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

  const ids = orden ?? plan.actividades.map((a) => a.actividadId);
  const actividades = ids.map((id) => plan.actividades.find((a) => a.actividadId === id)!).filter(Boolean);
  const mover = (indice: number, delta: -1 | 1) => {
    const copia = [...ids];
    const destino = indice + delta;
    if (destino < 0 || destino >= copia.length) return;
    [copia[indice], copia[destino]] = [copia[destino], copia[indice]];
    setOrden(copia);
  };
  const quitar = (id: number) => setOrden(ids.filter((x) => x !== id));
  const confirmar = () =>
    aceptar.mutate(ids, { onSuccess: () => navigate('/plan') });

  if (plan.estado !== 'PROPUESTO') {
    return (
      <Pagina>
        <PantallaError
          titulo="Este plan ya no es una propuesta"
          mensaje="Ya lo aceptaste o fue reemplazado. Tu plan activo está en la página del plan."
          icono="route"
          accion={
            <Link to="/plan" className="px-space-lg py-space-sm rounded-lg bg-primary-container text-on-primary-container font-title-md">
              Ver mi plan
            </Link>
          }
        />
      </Pagina>
    );
  }

  const botonMini =
    'w-9 h-9 rounded-lg bg-surface-container-high hover:bg-surface-bright text-on-surface flex items-center justify-center disabled:opacity-40';
  return (
    <Pagina>
      <div className="max-w-3xl mx-auto px-gutter py-space-xl flex flex-col gap-space-lg">
        <div>
          <h1 className="font-headline-md text-headline-md text-on-surface">Tu plan de estudio</h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Revisa las actividades, quita las que no quieras o cámbialas de orden y acepta el plan.
          </p>
        </div>

        {resultados && (
          <section aria-labelledby="dominio" className="flex flex-col gap-space-sm">
            <h2 id="dominio" className="font-title-md text-title-md text-primary">
              Tu dominio por tema
            </h2>
            <ul className="grid gap-space-sm sm:grid-cols-3">
              {resultados.map((r) => (
                <li key={r.tema} className="bg-surface-container-low rounded-xl p-space-md flex flex-col gap-space-xs">
                  <span className="font-title-md text-title-md text-on-surface">{r.nombre}</span>
                  <span className="font-body-md text-body-md text-on-surface-variant">
                    Diagnóstico: {r.aciertos} de {r.preguntas} ({r.porcentaje} %)
                  </span>
                  <span className={`font-title-md ${r.debil ? 'text-error' : 'text-tertiary'}`}>
                    Dominio {r.dominio} % · {r.debil ? 'por reforzar' : 'sólido'}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {plan.esPlanMejora && (
          <p className="bg-tertiary-container/20 text-tertiary rounded-xl p-space-md font-body-md text-body-md" role="status">
            No tienes temas débiles: este es un plan de mejora con retos que aún no tienes en 3 estrellas y duelos sugeridos.
          </p>
        )}

        <section aria-labelledby="actividades" className="flex flex-col gap-space-sm">
          <h2 id="actividades" className="font-title-md text-title-md text-primary">
            Actividades ({actividades.length})
          </h2>
          <ol className="flex flex-col gap-space-sm">
            {actividades.map((a, i) => (
              <ActividadItem
                key={a.actividadId}
                actividad={a}
                acciones={
                  <div className="flex gap-space-xs">
                    <button type="button" className={botonMini} onClick={() => mover(i, -1)} disabled={i === 0} aria-label={`Subir ${a.motivo}`} title="Subir">
                      <span className="material-symbols-outlined">arrow_upward</span>
                    </button>
                    <button type="button" className={botonMini} onClick={() => mover(i, 1)} disabled={i === actividades.length - 1} aria-label={`Bajar ${a.motivo}`} title="Bajar">
                      <span className="material-symbols-outlined">arrow_downward</span>
                    </button>
                    <button type="button" className={botonMini} onClick={() => quitar(a.actividadId)} aria-label={`Quitar ${a.motivo}`} title="Quitar">
                      <span className="material-symbols-outlined">close</span>
                    </button>
                  </div>
                }
              />
            ))}
          </ol>
          {actividades.length === 0 && (
            <p className="font-body-md text-body-md text-error" role="alert">
              Conserva al menos una actividad en tu plan.
            </p>
          )}
        </section>

        {aceptar.isError && (
          <p className="font-body-md text-body-md text-error" role="alert">
            {mensajeDeError(aceptar.error)}
          </p>
        )}
        <div className="flex justify-end gap-space-sm">
          <Link to="/plan" className="px-space-md py-space-sm rounded-lg bg-surface-container-high text-on-surface font-title-md">
            Ahora no
          </Link>
          <button
            type="button"
            onClick={confirmar}
            disabled={aceptar.isPending || actividades.length === 0}
            className="px-space-lg py-space-sm rounded-lg bg-primary-container hover:bg-primary disabled:opacity-60 text-on-primary-container font-title-md font-bold"
          >
            {aceptar.isPending ? 'Guardando...' : 'Aceptar plan'}
          </button>
        </div>
      </div>
    </Pagina>
  );
};
