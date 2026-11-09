import React from 'react';
import { Link } from 'react-router-dom';
import { PantallaCarga, PantallaError } from '../../components/EstadoPantalla';
import { Pagina } from '../../components/Pagina';
import { esRecuperable, mensajeDeError } from '../../services/errores';
import { useTemasEstudio } from '../../services/queries';

/** Biblioteca de estudio (CU-09, paso 1): un tema por fase. */
export const BibliotecaPage: React.FC = () => {
  const { data, isPending, isError, error, refetch, isFetching } = useTemasEstudio();

  if (isPending) {
    return (
      <Pagina>
        <PantallaCarga mensaje="Abriendo la biblioteca..." />
      </Pagina>
    );
  }
  if (isError) {
    return (
      <Pagina>
        <PantallaError
          titulo="No se pudo abrir la biblioteca"
          mensaje={mensajeDeError(error)}
          onReintentar={esRecuperable(error) ? () => void refetch() : undefined}
          reintentando={isFetching}
        />
      </Pagina>
    );
  }

  return (
    <Pagina>
      <div className="max-w-5xl mx-auto px-gutter py-space-xl flex flex-col gap-space-lg">
        <div>
          <h1 className="font-headline-md text-headline-md text-on-surface">Biblioteca de estudio</h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Lee el material de cada tema y repásalo con tarjetas. Completar un repaso te da 10 XP una vez al día por tema.
          </p>
        </div>
        <ul className="grid gap-space-md md:grid-cols-3" aria-label="Temas de estudio">
          {data.map((t) => (
            <li key={t.faseId}>
              {t.bloqueado ? (
                <div
                  className="h-full bg-surface-container-low/60 rounded-xl p-space-lg border border-outline-variant/30 flex flex-col gap-space-sm opacity-80"
                  aria-disabled="true"
                >
                  <span className="material-symbols-outlined text-on-surface-variant">lock</span>
                  <h2 className="font-title-md text-title-md text-on-surface">{t.nombre}</h2>
                  <p className="font-body-md text-body-md text-on-surface-variant">
                    Este tema se desbloquea al completar la fase anterior.
                  </p>
                </div>
              ) : (
                <Link
                  to={`/estudio/${t.faseId}`}
                  className="h-full bg-surface-container-low hover:bg-surface-container rounded-xl p-space-lg border border-outline-variant/40 flex flex-col gap-space-sm transition-colors"
                >
                  <span className="material-symbols-outlined text-primary">menu_book</span>
                  <h2 className="font-title-md text-title-md text-on-surface">{t.nombre}</h2>
                  <p className="font-body-md text-body-md text-on-surface-variant">
                    {t.totalTarjetas} tarjetas · {t.tarjetasParaHoy} para hoy
                  </p>
                  <div className="flex flex-wrap gap-space-xs mt-auto">
                    {t.sesionPendiente && (
                      <span className="px-space-sm py-1 rounded-full bg-primary-container/20 text-primary font-label-sm text-label-sm">
                        Repaso pendiente
                      </span>
                    )}
                    <span className="px-space-sm py-1 rounded-full bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm">
                      Dominio: {t.dominio === null ? 'sin calcular' : `${t.dominio} %`}
                    </span>
                  </div>
                </Link>
              )}
            </li>
          ))}
        </ul>
      </div>
    </Pagina>
  );
};
