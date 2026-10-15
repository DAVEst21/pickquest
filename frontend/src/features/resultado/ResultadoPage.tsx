import React, { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { PantallaCarga, PantallaError } from '../../components/EstadoPantalla';
import { Estrellas } from '../../components/Estrellas';
import { ModalConfirmar } from '../../components/ModalConfirmar';
import { Pagina } from '../../components/Pagina';
import { Toast } from '../../components/Toast';
import { esError, esRecuperable, mensajeDeError } from '../../services/errores';
import { useIniciarIntento, useIntento, useLibreta, useTablon } from '../../services/queries';
import { UMBRAL_APROBACION } from '../../types';
import { etiquetaFase, MECANICA } from '../fases/presentacion';
import { GuiaTecnica } from '../reto/GuiaTecnica';
import { Retroalimentacion } from './Retroalimentacion';

const CIRCUNFERENCIA = 2 * Math.PI * 50;

export const ResultadoPage: React.FC = () => {
  const intentoId = Number(useParams<{ intentoId: string }>().intentoId);
  const navigate = useNavigate();
  const { data: intento, isPending, isError, error, refetch, isFetching } = useIntento(intentoId);
  const tablon = useTablon(intento?.fase.id);
  const iniciar = useIniciarIntento();
  const libreta = useLibreta(intento?.estado === 'CALIFICADO' && intento.reto.mecanica === 'DIALOGO_STAKEHOLDER' ? intento.reto.id : undefined);
  const [guiaAbierta, setGuiaAbierta] = useState(false);
  const [confirmarReintento, setConfirmarReintento] = useState(false);
  const [offsetAnimado, setOffsetAnimado] = useState(CIRCUNFERENCIA);
  const [aviso, setAviso] = useState<string | null>(null);

  const porcentaje = intento?.estado === 'CALIFICADO' ? intento.resultado.porcentaje : 0;
  useEffect(() => {
    const timer = setTimeout(() => setOffsetAnimado(CIRCUNFERENCIA * (1 - porcentaje / 100)), 150);
    return () => clearTimeout(timer);
  }, [porcentaje]);

  if (!Number.isInteger(intentoId) || intentoId <= 0 || esError(error, 404)) {
    return (
      <Pagina>
        <PantallaError titulo="Intento no encontrado" mensaje="Este intento no existe o no te pertenece." icono="search_off" />
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
        <PantallaError titulo="No se pudo cargar el resultado" mensaje={mensajeDeError(error)} onReintentar={esRecuperable(error) ? () => void refetch() : undefined} reintentando={isFetching} />
      </Pagina>
    );
  }
  // Un intento sin enviar todavía se resuelve en la pantalla del reto.
  if (intento.estado === 'EN_CURSO') return <Navigate to={`/intento/${intentoId}`} replace />;

  const { resultado, reto, fase, retroalimentacion, contenidosApoyo } = intento;
  const brecha = Math.max(0, UMBRAL_APROBACION - resultado.porcentaje);
  const retoTablon = tablon.data?.retos.find((r) => r.id === reto.id);
  const yaAprobado = resultado.aprobado || retoTablon?.estado === 'APROBADO';
  const siguiente = tablon.data?.retos.find((r) => r.orden === reto.orden + 1);
  const siguienteDisponible = siguiente && (siguiente.estado === 'DISPONIBLE' || siguiente.estado === 'EN_CURSO');

  const abrir = (retoId: number) =>
    iniciar.mutate(retoId, {
      onSuccess: (nuevo) => navigate(`/intento/${nuevo.intentoId}`),
      onError: (e) => {
        setConfirmarReintento(false);
        setAviso(mensajeDeError(e));
        setTimeout(() => setAviso(null), 3500);
      },
    });

  const alReintentar = () => {
    // FA1: si el reto ya estaba aprobado se avisa de RN-05 y RN-07 antes de empezar otro intento.
    if (yaAprobado) setConfirmarReintento(true);
    else abrir(reto.id);
  };

  return (
    <Pagina>
      <div className="relative w-full max-w-5xl mx-auto px-gutter py-space-xl">
        <div className="flex flex-wrap items-center justify-between gap-space-sm mb-space-lg">
          <div className="flex items-center gap-space-xs text-on-surface-variant font-label-md text-label-md">
            <Link to="/" className="hover:text-primary transition-colors flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">map</span>
              Overworld
            </Link>
            <span className="opacity-40">/</span>
            <Link to={`/mision/${fase.id}`} className="hover:text-primary transition-colors">
              {etiquetaFase(fase.orden)}: {fase.nombre}
            </Link>
            <span className="opacity-40">/</span>
            <span className="text-primary font-bold">Resultado</span>
          </div>
          <span className="font-code-md text-label-md text-primary font-bold bg-surface-container-high px-space-md py-space-xs rounded-full">
            Intento #{intento.intentoId}
          </span>
        </div>

        <div className="w-full bg-surface-container-low rounded-xl shadow-xl overflow-hidden mb-space-lg border border-surface-container-high/40">
          <div className="w-full h-1.5 bg-gradient-to-r from-primary-container via-secondary to-tertiary"></div>
          <div className="p-space-lg sm:p-space-xl flex flex-col items-center text-center gap-space-lg">
            <div>
              <p className="font-label-md text-label-md text-secondary uppercase tracking-wider mb-1 flex items-center justify-center gap-space-xs">
                <span className="material-symbols-outlined text-title-md">{MECANICA[reto.mecanica].icono}</span>
                {reto.titulo}
              </p>
              <h1 className="font-headline-lg text-headline-lg text-on-surface mb-space-xs" id="resultado-titulo">
                {resultado.aprobado ? '¡Reto Superado!' : '¡Reto No Superado!'}
              </h1>
              <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl mx-auto">
                {resultado.aprobado
                  ? resultado.xpGanado > 0 || resultado.qpGanado > 0
                    ? 'Primera aprobación: la recompensa quedó acreditada en tu perfil.'
                    : 'Ya habías aprobado este reto antes: este intento no otorga XP ni QP (se conserva tu mejor calificación).'
                  : 'Te faltaron puntos para aprobar. Revisa la retroalimentación y vuelve a intentarlo.'}
              </p>
            </div>

            <Estrellas cantidad={resultado.calificacionEstrellas} className="text-headline-lg" />
            {resultado.usoAyuda && (
              <p className="font-body-sm text-body-sm text-on-surface-variant -mt-space-sm">
                Usaste una ayuda en este intento: el máximo posible eran 2 estrellas.
              </p>
            )}

            <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-space-lg items-center text-left">
              <div className="bg-surface-container rounded-xl p-space-lg flex flex-col items-center shadow-md border border-surface-container-highest/40">
                <div className="relative w-44 h-44 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                    <circle className="text-surface-container-highest stroke-current" cx="60" cy="60" fill="transparent" r="50" strokeWidth="10" />
                    <circle
                      className="text-error/30 stroke-current"
                      cx="60"
                      cy="60"
                      fill="transparent"
                      r="50"
                      strokeDasharray={CIRCUNFERENCIA}
                      strokeDashoffset={CIRCUNFERENCIA * (1 - UMBRAL_APROBACION / 100)}
                      strokeWidth="10"
                    />
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
                <span className="mt-space-md font-title-md text-title-md text-on-surface-variant">
                  Mínimo exigido: <strong className="text-error">{UMBRAL_APROBACION}%</strong>
                </span>
              </div>

              <dl className="bg-surface-container rounded-xl p-space-lg grid grid-cols-2 gap-space-md shadow-md border border-surface-container-highest/40">
                <div>
                  <dt className="font-label-sm text-label-sm text-on-surface-variant uppercase">XP ganado</dt>
                  <dd className="font-headline-sm text-headline-sm text-secondary font-bold" id="resultado-xp">+{resultado.xpGanado}</dd>
                </div>
                <div>
                  <dt className="font-label-sm text-label-sm text-on-surface-variant uppercase">QP ganado</dt>
                  <dd className="font-headline-sm text-headline-sm text-primary font-bold" id="resultado-qp">+{resultado.qpGanado}</dd>
                </div>
                <div>
                  <dt className="font-label-sm text-label-sm text-on-surface-variant uppercase">Estrellas</dt>
                  <dd className="font-title-lg text-title-lg text-on-surface">{resultado.calificacionEstrellas} / 3</dd>
                </div>
                <div>
                  <dt className="font-label-sm text-label-sm text-on-surface-variant uppercase">Usó ayuda</dt>
                  <dd className="font-title-lg text-title-lg text-on-surface">{resultado.usoAyuda ? 'Sí' : 'No'}</dd>
                </div>
                {retoTablon?.mejorPorcentaje != null && (
                  <div className="col-span-2 flex items-center gap-space-sm font-body-sm text-body-sm text-on-surface-variant">
                    Mejor marca de este reto: <strong className="text-on-surface">{retoTablon.mejorPorcentaje}%</strong>
                    <Estrellas cantidad={retoTablon.mejorCalificacionEstrellas} />
                  </div>
                )}
                {!resultado.aprobado && (
                  <div className="col-span-2 pt-space-sm border-t border-surface-container-high/40 font-body-sm text-body-sm text-on-surface-variant">
                    Te faltó <strong className="text-on-surface">+{brecha}%</strong> para aprobar.
                    {!yaAprobado && ` Al aprobar por primera vez ganas +${reto.recompensaXp} XP y +${reto.recompensaQp} QP.`}
                  </div>
                )}
              </dl>
            </div>

            <div className="w-full flex flex-col sm:flex-row flex-wrap items-center justify-center gap-space-md">
              {resultado.aprobado && siguienteDisponible && (
                <button
                  onClick={() => abrir(siguiente.id)}
                  disabled={iniciar.isPending}
                  id="siguiente-btn"
                  className="w-full sm:w-auto px-space-xl py-space-md bg-primary-container text-on-primary-container font-title-lg text-title-lg rounded-lg shadow-lg hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-space-xs font-bold"
                >
                  <span>Siguiente reto</span>
                  <span className="material-symbols-outlined">arrow_forward</span>
                </button>
              )}
              <button
                onClick={alReintentar}
                disabled={iniciar.isPending}
                id="retry-btn"
                className={`w-full sm:w-auto px-space-xl py-space-md font-title-lg text-title-lg rounded-lg shadow-lg hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-space-xs font-bold ${
                  resultado.aprobado && siguienteDisponible
                    ? 'bg-surface-container-highest text-on-surface'
                    : 'bg-primary-container text-on-primary-container'
                }`}
              >
                <span className="material-symbols-outlined">replay</span>
                <span>{yaAprobado ? 'Repetir reto' : 'Reintentar reto'}</span>
              </button>
              <Link
                to={`/mision/${fase.id}`}
                className="w-full sm:w-auto px-space-lg py-space-md bg-surface-container-highest text-on-surface font-title-md text-title-md rounded-lg shadow hover:bg-surface-bright transition-all flex items-center justify-center gap-space-xs border border-outline-variant/30 font-semibold"
              >
                <span className="material-symbols-outlined text-secondary">dashboard</span>
                <span>Volver al tablón</span>
              </Link>
              {contenidosApoyo.length > 0 && (
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

        <h2 className="font-headline-sm text-headline-sm text-on-surface mb-space-md flex items-center gap-space-xs">
          <div className="w-2 h-5 rounded-full bg-primary"></div>
          Retroalimentación
        </h2>
        <Retroalimentacion retro={retroalimentacion} />

        {libreta.data && libreta.data.length > 0 && (
          <section className="mt-space-md bg-surface-container rounded-xl p-space-lg shadow-md border border-surface-container-highest/40 text-left" aria-label="Libreta acumulada">
            <h3 className="font-title-lg text-title-lg text-on-surface font-bold flex items-center gap-space-xs mb-space-sm">
              <span className="material-symbols-outlined text-tertiary">menu_book</span>
              Tu libreta acumulada ({libreta.data.length})
            </h3>
            <p className="font-body-sm text-body-sm text-on-surface-variant mb-space-xs">
              Requerimientos que descubriste en todos tus intentos calificados de este reto.
            </p>
            <ul className="list-disc pl-space-lg font-body-md text-body-md text-on-surface space-y-1">
              {libreta.data.map((r) => (
                <li key={r.codigo}>
                  <strong>{r.codigo}:</strong> {r.descripcion}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      {confirmarReintento && (
        <ModalConfirmar
          titulo="Repetir un reto aprobado"
          icono="replay"
          textoConfirmar="Repetir reto"
          cargando={iniciar.isPending}
          mensaje={
            <p>
              Este reto ya está aprobado. Si lo repites se conserva tu mejor calificación y{' '}
              <strong>no se otorgan XP ni QP de nuevo</strong>: la recompensa solo se entrega la primera vez que se aprueba.
            </p>
          }
          onConfirmar={() => abrir(reto.id)}
          onCancelar={() => setConfirmarReintento(false)}
        />
      )}
      {guiaAbierta && <GuiaTecnica contenidos={contenidosApoyo} onCerrar={() => setGuiaAbierta(false)} />}
      <Toast visible={aviso !== null} message={aviso ?? ''} icon="error" />
    </Pagina>
  );
};
