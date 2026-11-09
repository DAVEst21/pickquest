import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PantallaCarga, PantallaError } from '../../components/EstadoPantalla';
import { ModalConfirmar } from '../../components/ModalConfirmar';
import { Pagina } from '../../components/Pagina';
import { esRecuperable, mensajeDeError } from '../../services/errores';
import { useIniciarDiagnostico, usePlanActivo } from '../../services/queries';
import { ActividadItem } from './ActividadItem';

/** Plan de estudio activo y acceso al diagnóstico (CU-10, pasos 1 y 8, FA2). */
export const PlanPage: React.FC = () => {
  const navigate = useNavigate();
  const { data, isPending, isError, error, refetch, isFetching } = usePlanActivo();
  const iniciar = useIniciarDiagnostico();
  const [confirmando, setConfirmando] = useState(false);

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
          titulo="No se pudo cargar tu plan"
          mensaje={mensajeDeError(error)}
          onReintentar={esRecuperable(error) ? () => void refetch() : undefined}
          reintentando={isFetching}
        />
      </Pagina>
    );
  }

  const plan = data.plan;
  const empezar = () =>
    iniciar.mutate(undefined, {
      onSuccess: (d) => navigate(`/plan/diagnostico/${d.diagnosticoId}`),
      onSettled: () => setConfirmando(false),
    });
  // FA2: con un plan activo se muestra su avance y se pide confirmación antes del diagnóstico.
  const pedirDiagnostico = () => (plan ? setConfirmando(true) : empezar());

  return (
    <Pagina>
      <div className="max-w-3xl mx-auto px-gutter py-space-xl flex flex-col gap-space-lg">
        <div className="flex flex-wrap items-end justify-between gap-space-md">
          <div>
            <h1 className="font-headline-md text-headline-md text-on-surface">Plan de estudio</h1>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Responde un diagnóstico de 9 preguntas y recibe actividades ordenadas según los temas que más te cuestan.
            </p>
          </div>
          <button
            type="button"
            onClick={pedirDiagnostico}
            disabled={iniciar.isPending}
            className="px-space-lg py-space-sm rounded-lg bg-primary-container hover:bg-primary disabled:opacity-60 text-on-primary-container font-title-md text-title-md font-bold"
          >
            {iniciar.isPending ? 'Preparando...' : plan ? 'Generar un plan nuevo' : 'Obtener plan de estudio'}
          </button>
        </div>
        {iniciar.isError && (
          <p className="font-body-md text-body-md text-error" role="alert">
            {mensajeDeError(iniciar.error)}
          </p>
        )}

        {plan ? (
          <section aria-labelledby="plan-activo" className="flex flex-col gap-space-md">
            <div className="flex items-center justify-between gap-space-md">
              <h2 id="plan-activo" className="font-title-md text-title-md text-primary">
                {plan.esPlanMejora ? 'Tu plan de mejora' : 'Tu plan activo'}
              </h2>
              <span className="font-label-md text-label-md text-on-surface-variant" id="avance-plan">
                {plan.avance.hechas} de {plan.avance.total} actividades · {plan.avance.porcentaje} %
              </span>
            </div>
            <div
              className="w-full h-2 rounded-full bg-surface-container-highest overflow-hidden"
              role="progressbar"
              aria-valuenow={plan.avance.porcentaje}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div className="h-full bg-gradient-to-r from-tertiary to-secondary" style={{ width: `${plan.avance.porcentaje}%` }} />
            </div>
            <ol className="flex flex-col gap-space-sm">
              {plan.actividades.map((a) => (
                <ActividadItem key={a.actividadId} actividad={a} />
              ))}
            </ol>
          </section>
        ) : (
          <div className="bg-surface-container-low rounded-xl p-space-xl text-center flex flex-col gap-space-sm items-center">
            <span className="material-symbols-outlined text-headline-lg text-primary">route</span>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Todavía no tienes un plan activo. Obtén uno respondiendo el diagnóstico.
            </p>
          </div>
        )}
      </div>

      {confirmando && plan && (
        <ModalConfirmar
          titulo="Ya tienes un plan activo"
          icono="route"
          mensaje={
            <>
              Llevas {plan.avance.hechas} de {plan.avance.total} actividades ({plan.avance.porcentaje} %). Si generas un plan
              nuevo, reemplazará al actual solo cuando lo aceptes. ¿Quieres hacer el diagnóstico?
            </>
          }
          textoConfirmar="Sí, hacer el diagnóstico"
          textoCancelar="Conservar mi plan"
          cargando={iniciar.isPending}
          onConfirmar={empezar}
          onCancelar={() => setConfirmando(false)}
        />
      )}
    </Pagina>
  );
};
