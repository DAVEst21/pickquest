import React from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { PantallaCarga, PantallaError } from '../../components/EstadoPantalla';
import { Pagina } from '../../components/Pagina';
import { esError, esRecuperable, mensajeDeError } from '../../services/errores';
import { useIniciarRepaso, useMaterialTema, useRegistrarConsulta } from '../../services/queries';

/** Material de apoyo del tema (CU-09, pasos 2 y 3, FA1 y FE1). */
export const MaterialPage: React.FC = () => {
  const faseId = Number(useParams<{ faseId: string }>().faseId);
  const navigate = useNavigate();
  const { data, isPending, isError, error, refetch, isFetching } = useMaterialTema(faseId);
  const iniciar = useIniciarRepaso();
  const consulta = useRegistrarConsulta();

  if (isPending) {
    return (
      <Pagina>
        <PantallaCarga mensaje="Abriendo el tema..." />
      </Pagina>
    );
  }
  if (isError) {
    const acceso = (
      <Link
        to="/estudio"
        className="px-space-lg py-space-sm rounded-lg bg-primary-container hover:bg-primary text-on-primary-container font-title-md"
      >
        Volver a la biblioteca
      </Link>
    );
    return (
      <Pagina>
        {esError(error, 403) ? (
          // FE1: el mensaje del servidor explica que se desbloquea al completar la fase anterior (RN-01).
          <PantallaError titulo="Tema bloqueado" mensaje={mensajeDeError(error)} icono="lock" accion={acceso} />
        ) : esError(error, 404) ? (
          <PantallaError titulo="Tema no encontrado" mensaje="Este tema no existe." icono="travel_explore" accion={acceso} />
        ) : (
          <PantallaError
            titulo="No se pudo abrir el tema"
            mensaje={mensajeDeError(error)}
            accion={acceso}
            onReintentar={esRecuperable(error) ? () => void refetch() : undefined}
            reintentando={isFetching}
          />
        )}
      </Pagina>
    );
  }

  const repasar = () =>
    iniciar.mutate(faseId, { onSuccess: (sesion) => navigate(`/estudio/repaso/${sesion.sesionId}`) });
  // FA1: cerrar el material sin repasar registra el tema como consultado.
  const cerrar = () => consulta.mutate(faseId, { onSettled: () => navigate('/estudio') });

  return (
    <Pagina>
      <article className="max-w-3xl mx-auto px-gutter py-space-xl flex flex-col gap-space-lg">
        <div className="flex items-start justify-between gap-space-md">
          <div>
            <p className="font-label-md text-label-md text-on-surface-variant uppercase tracking-widest">Tema</p>
            <h1 className="font-headline-md text-headline-md text-on-surface">{data.nombre}</h1>
          </div>
          <button
            type="button"
            onClick={cerrar}
            disabled={consulta.isPending}
            className="px-space-md py-space-sm rounded-lg bg-surface-container-high hover:bg-surface-bright text-on-surface font-title-md text-title-md"
          >
            Cerrar material
          </button>
        </div>

        <section aria-labelledby="explicacion" className="flex flex-col gap-space-sm">
          <h2 id="explicacion" className="font-title-md text-title-md text-primary">
            Explicación
          </h2>
          {data.explicacion.split('\n\n').map((parrafo, i) => (
            <p key={i} className="font-body-md text-body-md text-on-surface">
              {parrafo}
            </p>
          ))}
        </section>

        <section aria-labelledby="ejemplos" className="flex flex-col gap-space-sm">
          <h2 id="ejemplos" className="font-title-md text-title-md text-primary">
            Ejemplos
          </h2>
          <ul className="flex flex-col gap-space-sm">
            {data.ejemplos.map((e) => (
              <li key={e.orden} className="bg-surface-container-low rounded-xl p-space-md">
                <h3 className="font-title-md text-title-md text-on-surface">{e.titulo}</h3>
                <p className="font-body-md text-body-md text-on-surface-variant">{e.texto}</p>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="glosario" className="flex flex-col gap-space-sm">
          <h2 id="glosario" className="font-title-md text-title-md text-primary">
            Glosario
          </h2>
          <dl className="grid gap-space-sm">
            {data.glosario.map((g) => (
              <div key={g.termino} className="bg-surface-container-low rounded-xl p-space-md">
                <dt className="font-title-md text-title-md text-on-surface">{g.termino}</dt>
                <dd className="font-body-md text-body-md text-on-surface-variant">{g.definicion}</dd>
              </div>
            ))}
          </dl>
        </section>

        {(iniciar.isError || consulta.isError) && (
          <p className="font-body-md text-body-md text-error" role="alert">
            {mensajeDeError(iniciar.error ?? consulta.error)}
          </p>
        )}

        <div className="sticky bottom-space-md flex justify-end">
          <button
            type="button"
            onClick={repasar}
            disabled={iniciar.isPending || data.totalTarjetas === 0}
            className="px-space-xl py-space-md rounded-xl bg-primary-container hover:bg-primary disabled:opacity-60 text-on-primary-container font-title-md text-title-md font-bold shadow-xl flex items-center gap-space-xs"
          >
            <span className="material-symbols-outlined">style</span>
            {iniciar.isPending ? 'Preparando...' : data.sesionPendiente ? 'Continuar el repaso' : 'Repasar con tarjetas'}
          </button>
        </div>
      </article>
    </Pagina>
  );
};
