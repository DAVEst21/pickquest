import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Estrellas } from '../../components/Estrellas';
import { PantallaCarga, PantallaError } from '../../components/EstadoPantalla';
import { Pagina } from '../../components/Pagina';
import { esError, mensajeDeError } from '../../services/errores';
import { useFaseDetalle, useIntento } from '../../services/queries';
import { GuiaTecnica } from '../reto/GuiaTecnica';
import { etiquetaFase, umbralPorcentaje } from '../fases/presentacion';

const CIRCUNFERENCIA = 2 * Math.PI * 50;

export const ResultadoPage: React.FC = () => {
  const intentoId = Number(useParams<{ intentoId: string }>().intentoId);
  const navigate = useNavigate();
  const { data: intento, isPending, isError, error } = useIntento(intentoId);
  const { data: detalle } = useFaseDetalle(intento?.faseId);
  const [guiaAbierta, setGuiaAbierta] = useState(false);
  const [offsetAnimado, setOffsetAnimado] = useState(CIRCUNFERENCIA);

  const porcentaje = intento?.porcentaje ?? 0;
  useEffect(() => {
    const timer = setTimeout(() => setOffsetAnimado(CIRCUNFERENCIA * (1 - porcentaje / 100)), 150);
    return () => clearTimeout(timer);
  }, [porcentaje]);

  if (!Number.isInteger(intentoId) || intentoId <= 0 || esError(error, 404)) {
    return (
      <Pagina>
        <PantallaError
          titulo="Intento no encontrado"
          mensaje="Este intento no existe o no te pertenece."
          icono="search_off"
        />
      </Pagina>
    );
  }
  if (isPending) {
    return (
      <Pagina>
        <PantallaCarga mensaje="Cargando resultado..." />
      </Pagina>
    );
  }
  if (isError) {
    return (
      <Pagina>
        <PantallaError titulo="No se pudo cargar el resultado" mensaje={mensajeDeError(error)} />
      </Pagina>
    );
  }

  const reto = detalle?.reto ?? null;
  const umbral = reto ? umbralPorcentaje(reto.calificacionMinima) : null;
  const brecha = umbral === null ? null : Math.max(0, umbral - porcentaje);
  const contenidos = detalle?.contenidosApoyo ?? [];

  return (
    <Pagina>
      <div className="relative w-full max-w-5xl mx-auto px-gutter py-space-xl">
        {/* Breadcrumb */}
        <div className="flex flex-wrap items-center justify-between gap-space-sm mb-space-lg">
          <div className="flex items-center gap-space-xs text-on-surface-variant font-label-md text-label-md">
            <Link to="/" className="hover:text-primary transition-colors flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">map</span>
              Overworld
            </Link>
            <span className="opacity-40">/</span>
            {detalle && (
              <>
                <Link to={`/mision/${detalle.fase.id}`} className="hover:text-primary transition-colors">
                  {etiquetaFase(detalle.fase.orden)}: {detalle.fase.nombre}
                </Link>
                <span className="opacity-40">/</span>
              </>
            )}
            <span className="text-primary font-bold">Resultado</span>
          </div>
          <span className="font-code-md text-label-md text-primary font-bold bg-surface-container-high px-space-md py-space-xs rounded-full">
            Intento #{intento.id}
          </span>
        </div>

        <div className="w-full bg-surface-container-low rounded-xl shadow-xl overflow-hidden mb-space-lg border border-surface-container-high/40">
          <div className="w-full h-1.5 bg-gradient-to-r from-primary-container via-secondary to-tertiary"></div>
          <div className="p-space-lg sm:p-space-xl flex flex-col items-center text-center gap-space-lg">
            <div>
              <h1 className="font-headline-lg text-headline-lg text-on-surface mb-space-xs" id="resultado-titulo">
                {intento.aprobado ? '¡Reto Superado!' : '¡Reto No Superado!'}
              </h1>
              <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl mx-auto">
                {intento.aprobado
                  ? intento.xpGanado > 0 || intento.qpGanado > 0
                    ? 'Primera aprobación: la recompensa quedó acreditada en tu perfil.'
                    : 'Ya habías aprobado este reto antes: este intento no otorga XP ni QP.'
                  : 'Te faltaron criterios para aprobar. Revisa la guía y vuelve a intentarlo.'}
              </p>
            </div>

            <Estrellas cantidad={intento.calificacionEstrellas} className="text-headline-lg" />

            <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-space-lg items-center text-left">
              {/* Medidor radial */}
              <div className="bg-surface-container rounded-xl p-space-lg flex flex-col items-center shadow-md border border-surface-container-highest/40">
                <div className="relative w-44 h-44 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                    <circle className="text-surface-container-highest stroke-current" cx="60" cy="60" fill="transparent" r="50" strokeWidth="10" />
                    {umbral !== null && (
                      <circle
                        className="text-error/30 stroke-current"
                        cx="60"
                        cy="60"
                        fill="transparent"
                        r="50"
                        strokeDasharray={CIRCUNFERENCIA}
                        strokeDashoffset={CIRCUNFERENCIA * (1 - umbral / 100)}
                        strokeWidth="10"
                      />
                    )}
                    <circle
                      className="text-primary-container stroke-current transition-all duration-1000 ease-out"
                      cx="60"
                      cy="60"
                      fill="transparent"
                      r="50"
                      strokeDasharray={CIRCUNFERENCIA}
                      strokeDashoffset={offsetAnimado}
                      strokeLinecap="round"
                      strokeWidth="10"
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center">
                    <span className="font-headline-lg text-headline-lg text-primary font-bold" id="resultado-porcentaje">
                      {porcentaje}%
                    </span>
                    <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                      Score Final
                    </span>
                  </div>
                </div>
                {umbral !== null && (
                  <span className="mt-space-md font-title-md text-title-md text-on-surface-variant">
                    Mínimo exigido: <strong className="text-error">{umbral}%</strong>
                  </span>
                )}
              </div>

              {/* Resumen del intento, tal como lo calculó el backend */}
              <dl className="bg-surface-container rounded-xl p-space-lg grid grid-cols-2 gap-space-md shadow-md border border-surface-container-highest/40">
                <div>
                  <dt className="font-label-sm text-label-sm text-on-surface-variant uppercase">XP ganado</dt>
                  <dd className="font-headline-sm text-headline-sm text-secondary font-bold">+{intento.xpGanado}</dd>
                </div>
                <div>
                  <dt className="font-label-sm text-label-sm text-on-surface-variant uppercase">QP ganado</dt>
                  <dd className="font-headline-sm text-headline-sm text-primary font-bold">+{intento.qpGanado}</dd>
                </div>
                <div>
                  <dt className="font-label-sm text-label-sm text-on-surface-variant uppercase">Estrellas</dt>
                  <dd className="font-title-lg text-title-lg text-on-surface">{intento.calificacionEstrellas} / 3</dd>
                </div>
                <div>
                  <dt className="font-label-sm text-label-sm text-on-surface-variant uppercase">Usó ayuda</dt>
                  <dd className="font-title-lg text-title-lg text-on-surface">{intento.usoAyuda ? 'Sí' : 'No'}</dd>
                </div>
                {!intento.aprobado && brecha !== null && (
                  <div className="col-span-2 pt-space-sm border-t border-surface-container-high/40 font-body-sm text-body-sm text-on-surface-variant">
                    Te faltó <strong className="text-on-surface">+{brecha}%</strong> para aprobar.
                    {reto && ` Al aprobar por primera vez ganas +${reto.recompensaXp} XP y +${reto.recompensaQp} QP.`}
                  </div>
                )}
              </dl>
            </div>

            <div className="w-full flex flex-col sm:flex-row items-center justify-center gap-space-md">
              <button
                onClick={() => navigate(`/reto/${intento.faseId}`)}
                id="retry-btn"
                className="w-full sm:w-auto px-space-xl py-space-md bg-primary-container text-on-primary-container font-title-lg text-title-lg rounded-lg shadow-lg hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-space-xs font-bold"
              >
                <span className="material-symbols-outlined">replay</span>
                <span>{intento.aprobado ? 'Repetir Reto' : 'Reintentar Reto'}</span>
              </button>
              {contenidos.length > 0 && (
                <button
                  onClick={() => setGuiaAbierta(true)}
                  className="w-full sm:w-auto px-space-lg py-space-md bg-surface-container-highest text-on-surface font-title-md text-title-md rounded-lg shadow hover:bg-surface-bright transition-all flex items-center justify-center gap-space-xs border border-outline-variant/30 font-semibold"
                >
                  <span className="material-symbols-outlined text-tertiary">menu_book</span>
                  <span>Guía Técnica</span>
                </button>
              )}
              <Link
                to="/"
                className="w-full sm:w-auto px-space-lg py-space-md text-on-surface-variant font-title-md text-title-md rounded-lg hover:bg-surface-container-high hover:text-on-surface transition-all flex items-center justify-center gap-space-xs"
              >
                <span className="material-symbols-outlined">map</span>
                <span>Volver al Overworld</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
      {guiaAbierta && <GuiaTecnica contenidos={contenidos} onCerrar={() => setGuiaAbierta(false)} />}
    </Pagina>
  );
};
