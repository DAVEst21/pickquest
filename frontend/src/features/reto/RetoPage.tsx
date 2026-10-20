import { RetoHistorias } from './historias/RetoHistorias';
import type { ContenidoHistorias, BorradorHistorias } from '../../types';
import React, { useCallback, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { PantallaCarga, PantallaError } from '../../components/EstadoPantalla';
import { ModalConfirmar } from '../../components/ModalConfirmar';
import { Pagina } from '../../components/Pagina';
import { Toast } from '../../components/Toast';
import { esError, esRecuperable, mensajeDeError } from '../../services/errores';
import { getIntento } from '../../services/api';
import { useEnviarIntento, useEquipados, useIntento, useUsarAyuda } from '../../services/queries';
import {
  type ContenidoDialogo,
  type ContenidoInspeccion,
  type ContenidoLineaTiempo,
  type ContenidoMoscow,
  type ContenidoPresupuesto,
  type EstadoDialogo,
  type BorradorInspeccion,
  type BorradorLineaTiempo,
  type BorradorMoscow,
  type BorradorPresupuesto,
  type IntentoEnCurso,
  type Pista,
  UMBRAL_APROBACION,
} from '../../types';
import { etiquetaFase, MECANICA } from '../fases/presentacion';
import { RetoDialogo } from './dialogo/RetoDialogo';
import { GuiaTecnica } from './GuiaTecnica';
import { RetoInspeccion } from './inspeccion/RetoInspeccion';
import { RetoLineaTiempo } from './lineatiempo/RetoLineaTiempo';
import { RetoTableroMoscow } from './moscow/RetoTableroMoscow';
import { RetoPresupuesto } from './presupuesto/RetoPresupuesto';
import { type EstadoEnvio, mismoEstado } from './tipos';
import { type EstadoGuardado, useAutoguardado } from './useAutoguardado';

/** Pantalla de un intento en curso: elige el componente por la mecánica del reto. */
export const RetoPage: React.FC = () => {
  const intentoId = Number(useParams<{ intentoId: string }>().intentoId);
  const { data, isPending, isError, error, refetch, isFetching } = useIntento(intentoId);

  if (!Number.isInteger(intentoId) || intentoId <= 0 || esError(error, 404)) {
    return (
      <Pagina>
        <PantallaError titulo="Intento no encontrado" mensaje="Este intento no existe o no te pertenece." icono="travel_explore" />
      </Pagina>
    );
  }
  if (isPending) {
    return (
      <Pagina>
        <PantallaCarga mensaje="Preparando el reto..." />
      </Pagina>
    );
  }
  if (isError) {
    return (
      <Pagina>
        <PantallaError titulo="No se pudo cargar el reto" mensaje={mensajeDeError(error)} onReintentar={esRecuperable(error) ? () => void refetch() : undefined} reintentando={isFetching} />
      </Pagina>
    );
  }
  // Un intento ya calificado se ve en la pantalla de resultado.
  if (data.estado === 'CALIFICADO') return <Navigate to={`/resultado/${intentoId}`} replace />;

  return <ResolverReto key={data.intentoId} intento={data} />;
};

const TEXTO_GUARDADO: Record<EstadoGuardado, string> = {
  inactivo: 'Tu avance se guarda automáticamente',
  pendiente: 'Cambios sin guardar...',
  guardando: 'Guardando...',
  guardado: 'Avance guardado en el servidor',
  error: 'No se pudo guardar; se reintentará',
};

const ResolverReto: React.FC<{ intento: IntentoEnCurso }> = ({ intento }) => {
  const navigate = useNavigate();
  const { reto, fase, intentoId } = intento;
  const autoguardado = useAutoguardado(intentoId);
  const equipados = useEquipados();
  const usarAyuda = useUsarAyuda(intentoId);
  const enviarIntento = useEnviarIntento();

  // La pista de la ayuda ya usada la devuelve el servidor, así que sobrevive a recargar el intento.
  const [operando, setOperando] = useState(false);
  const [falloEnvio, setFalloEnvio] = useState(false);
  const [borradorAyuda, setBorradorAyuda] = useState<BorradorMoscow | null>(null);
  const [pista, setPista] = useState<Pista | null>(intento.pista);
  const [ayudaUsada, setAyudaUsada] = useState(intento.ayudaUsada);
  const [estadoEnvio, setEstadoEnvio] = useState<EstadoEnvio>({ faltantes: [] });
  const [confirmando, setConfirmando] = useState(false);
  const [guiaAbierta, setGuiaAbierta] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', icon: 'check_circle' });

  const mostrarToast = useCallback((message: string, icon = 'check_circle') => {
    setToast({ visible: true, message, icon });
    window.setTimeout(() => setToast((prev) => ({ ...prev, visible: false })), 4200);
  }, []);

  const alCambiarEstado = useCallback(
    (nuevo: EstadoEnvio) => setEstadoEnvio((previo) => (mismoEstado(previo, nuevo) ? previo : nuevo)),
    [],
  );

  const usar = async (objetoId: number) => {
    if (operando) return;
    setOperando(true);
    try {
      await autoguardado.vaciar();
      const res = await usarAyuda.mutateAsync(objetoId);
      if (res.borradorActualizado) setBorradorAyuda(res.borradorActualizado);
      setPista(res.pista);
      setAyudaUsada(true);
      mostrarToast('Ayuda usada: el avance y la pista quedaron guardados', 'auto_awesome');
    } catch (e) {
      mostrarToast(mensajeDeError(e), 'error');
    } finally {
      setOperando(false);
    }
  };

  /** Consulta antes de guardar: una respuesta perdida puede corresponder a un intento ya calificado. */
  const enviar = async () => {
    if (operando) return;
    setConfirmando(false);
    setOperando(true);
    try {
      const actual = await getIntento(intentoId);
      if (actual.estado === 'EN_CURSO') await autoguardado.vaciar();
      await enviarIntento.mutateAsync(intentoId);
      setFalloEnvio(false);
      navigate(`/resultado/${intentoId}`);
    } catch (e) {
      setFalloEnvio(true);
      mostrarToast(mensajeDeError(e), 'error');
    } finally {
      setOperando(false);
    }
  };

  const alPulsarEnviar = () => {
    if (estadoEnvio.faltantes.length > 0) return;
    if (estadoEnvio.confirmacion) setConfirmando(true);
    else void enviar();
  };

  const comun = {
    pista,
    deshabilitado: operando,
    onCambio: autoguardado.guardar,
    onEstado: alCambiarEstado,
  };
  const m = MECANICA[reto.mecanica];

  const ejercicio = (() => {
    switch (reto.mecanica) {
      case 'ARMADO_PIEZAS':
        return <RetoHistorias {...comun} contenido={intento.contenido as ContenidoHistorias} borrador={intento.borrador as BorradorHistorias} />;
      case 'LINEA_TIEMPO':
        return (
          <RetoLineaTiempo
            {...comun}
            contenido={intento.contenido as ContenidoLineaTiempo}
            borrador={intento.borrador as BorradorLineaTiempo}
          />
        );
      case 'TABLERO_MOSCOW':
        return (
          <RetoTableroMoscow
            key={borradorAyuda ? 'ayuda-aplicada' : 'inicial'}
            {...comun}
            contenido={intento.contenido as ContenidoMoscow}
            borrador={borradorAyuda ?? intento.borrador as BorradorMoscow}
          />
        );
      case 'INSPECCION_SISTEMA':
        return (
          <RetoInspeccion
            {...comun}
            contenido={intento.contenido as ContenidoInspeccion}
            borrador={intento.borrador as BorradorInspeccion}
          />
        );
      case 'REPARTO_PRESUPUESTO':
        return (
          <RetoPresupuesto
            {...comun}
            contenido={intento.contenido as ContenidoPresupuesto}
            borrador={intento.borrador as BorradorPresupuesto}
          />
        );
      case 'DIALOGO_STAKEHOLDER':
        return (
          <RetoDialogo
            intentoId={intentoId}
            contenido={intento.contenido as ContenidoDialogo}
            estadoInicial={intento.borrador as EstadoDialogo}
            pista={pista}
            deshabilitado={enviarIntento.isPending}
            onEstado={alCambiarEstado}
            onEnviarAutomatico={() => void enviar()}
            onError={(mensaje) => mostrarToast(mensaje, 'error')}
          />
        );
      default:
        return (
          <div className="bg-surface-container-low rounded-xl p-space-xl text-center border border-surface-container-high/40">
            <span className="material-symbols-outlined text-headline-lg text-on-surface-variant">hourglass_empty</span>
            <p className="font-title-md text-title-md text-on-surface mt-space-sm">
              Este reto estará disponible próximamente
            </p>
          </div>
        );
    }
  })();

  const bloqueaEnvio = estadoEnvio.faltantes.length > 0;

  return (
    <Pagina>
      {/* HUD superior del reto */}
      <div className="w-full bg-surface-container-low/80 backdrop-blur-md px-gutter py-space-md shadow-lg sticky top-20 z-30 border-b border-surface-container-high/40">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-space-md">
          <div className="flex items-center gap-space-md w-full md:w-auto">
            <div className="w-12 h-12 rounded-xl bg-surface-container-high flex items-center justify-center shrink-0 shadow-md">
              <span className="material-symbols-outlined text-primary text-headline-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
                {m.icono}
              </span>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="flex items-center gap-space-xs self-start flex-wrap">
                <Link
                  to={`/mision/${fase.id}`}
                  className="px-space-xs py-0.5 rounded bg-tertiary-container/20 text-tertiary font-label-sm text-label-sm uppercase font-bold hover:bg-tertiary-container/40"
                >
                  {etiquetaFase(fase.orden)}: {fase.nombre}
                </Link>
                <span className="px-space-xs py-0.5 rounded bg-surface-container-highest text-on-surface-variant font-label-sm text-label-sm font-bold">
                  Reto {reto.orden} de {fase.totalRetos}
                </span>
              </span>
              <h1 className="font-headline-sm text-headline-sm text-on-surface truncate">{reto.titulo}</h1>
            </div>
          </div>
          <div className="flex items-center gap-space-md">
            <span
              className={`font-label-sm text-label-sm flex items-center gap-1 ${
                autoguardado.estado === 'error' ? 'text-error' : 'text-on-surface-variant'
              }`}
              role="status"
            >
              <span className="material-symbols-outlined text-label-md">
                {autoguardado.estado === 'guardando'
                  ? 'sync'
                  : autoguardado.estado === 'error'
                    ? 'cloud_off'
                    : 'cloud_done'}
              </span>
              {TEXTO_GUARDADO[autoguardado.estado]}
            </span>
            {intento.contenidosApoyo.length > 0 && (
              <button
                onClick={() => setGuiaAbierta(true)}
                className="flex items-center gap-space-xs px-space-md py-2 rounded-lg bg-surface-container-high hover:bg-surface-bright text-on-surface transition-all shadow-sm group border border-outline-variant/30"
                id="guide-modal-btn"
              >
                <span className="material-symbols-outlined text-secondary text-title-md group-hover:rotate-12 transition-transform">
                  menu_book
                </span>
                <span className="font-label-md text-label-md font-semibold">Guía Técnica</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="w-full max-w-7xl mx-auto px-gutter py-space-xl flex flex-col lg:flex-row gap-space-lg pb-40">
        {/* Columna izquierda: contexto y cinto de ayudas */}
        <aside className="w-full lg:w-80 flex flex-col gap-space-lg shrink-0">
          <div className="bg-surface-container-low rounded-xl p-space-lg shadow-xl border border-surface-container-high/40">
            <div className="flex items-center gap-space-xs mb-space-sm">
              <span className="material-symbols-outlined text-tertiary text-title-lg">flag</span>
              <h2 className="font-title-lg text-title-lg text-on-surface font-bold">Misión</h2>
            </div>
            <p className="font-body-md text-body-md text-on-surface-variant">{reto.contexto}</p>
            <div className="mt-space-md pt-space-md border-t border-surface-container-high/40 flex items-center justify-between text-on-surface-variant font-label-sm text-[11px]">
              <span>Recompensa: +{reto.recompensaXp} XP</span>
              <span className="text-primary font-bold">+{reto.recompensaQp} QP</span>
            </div>
          </div>

          <div className="bg-surface-container-low rounded-xl p-space-lg shadow-xl border border-surface-container-high/40">
            <div className="flex items-center justify-between mb-space-sm">
              <div className="flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-primary text-title-lg">shield</span>
                <h2 className="font-title-lg text-title-lg text-on-surface font-bold">Cinto de ayudas</h2>
              </div>
              <span className="px-space-xs py-0.5 rounded bg-surface-container-high text-primary font-label-sm text-label-sm font-bold">
                {ayudaUsada ? '0' : '1'}/1
              </span>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant mb-space-md">
              Una ayuda por intento. Si la usas, la calificación máxima del intento son 2 estrellas aunque saques 100%.
            </p>

            {equipados.isPending && (
              <p className="font-body-sm text-body-sm text-on-surface-variant">Cargando objetos...</p>
            )}
            {equipados.data?.length === 0 && (
              <p className="font-body-sm text-body-sm text-on-surface-variant">No tienes objetos equipados.</p>
            )}
            <ul className="space-y-space-sm">
              {equipados.data?.map((objeto) => {
                const sinUnidades = objeto.cantidad <= 0;
                const bloqueado = ayudaUsada || sinUnidades || operando;
                return (
                  <li
                    key={objeto.objetoId}
                    className="p-space-md rounded-xl bg-surface-container-high shadow-md border border-surface-container-highest/50"
                  >
                    <div className="flex items-center gap-space-sm mb-space-xs">
                      <div className="w-9 h-9 rounded-lg bg-tertiary-container/30 flex items-center justify-center text-tertiary shrink-0">
                        <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                          {objeto.tipo === 'POCION' ? 'science' : objeto.tipo === 'PERGAMINO' ? 'history_edu' : 'diamond'}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-title-md text-title-md text-on-surface leading-snug truncate">{objeto.nombre}</h3>
                        <span className="font-label-sm text-label-sm text-on-surface-variant">
                          {objeto.rareza} · x{objeto.cantidad}
                        </span>
                      </div>
                    </div>
                    <p className="font-body-sm text-body-sm text-on-surface-variant mb-space-sm">{objeto.efecto}</p>
                    <button
                      type="button"
                      disabled={bloqueado}
                      onClick={() => usar(objeto.objetoId)}
                      data-objeto-id={objeto.objetoId}
                      className="w-full py-2 px-space-md rounded-lg font-title-md text-title-md font-bold flex items-center justify-center gap-space-xs bg-tertiary text-on-tertiary hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      <span className="material-symbols-outlined text-title-md">{ayudaUsada ? 'check' : 'auto_awesome'}</span>
                      <span>{ayudaUsada ? 'Ayuda usada' : sinUnidades ? 'Sin unidades' : 'Usar ayuda'}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
            {ayudaUsada && !pista && (
              <p className="mt-space-sm font-body-sm text-body-sm text-on-surface-variant">
                Ya usaste la ayuda de este intento.
              </p>
            )}
          </div>
        </aside>

        {/* Ejercicio de la mecánica */}
        <section className="flex-1 min-w-0 flex flex-col gap-space-lg" aria-label={m.nombre}>
          {ejercicio}
        </section>
      </div>

      {/* Barra inferior de acción */}
      <div className="fixed bottom-0 left-0 w-full z-40 bg-surface-container-lowest/95 backdrop-blur-xl py-space-md px-gutter shadow-[0_-8px_24px_rgba(0,0,0,0.6)] border-t border-surface-container-high/40">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-space-md">
          <div className="flex flex-col min-w-0">
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
              Criterio de aprobación mínima
            </span>
            <span className="font-body-sm text-body-sm text-on-surface font-semibold">
              Para aprobar: <strong className="text-primary font-bold">{UMBRAL_APROBACION}% de precisión</strong>
            </span>
            {bloqueaEnvio && (
              <span className="font-body-sm text-body-sm text-error truncate" id="aviso-faltantes">
                {estadoEnvio.faltantes[0]}
                {estadoEnvio.faltantes.length > 1 ? ` (y ${estadoEnvio.faltantes.length - 1} más)` : ''}
              </span>
            )}
          </div>
          <button
            type="button"
            id="btn-enviar"
            onClick={falloEnvio ? () => void enviar() : alPulsarEnviar}
            disabled={operando || (bloqueaEnvio && !falloEnvio)}
            className="px-space-xl py-2.5 rounded-lg bg-primary-container hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed text-on-primary-container font-title-md text-title-md font-bold transition-all shadow-[0_4px_16px_rgba(245,158,11,0.35)] flex items-center gap-space-xs"
          >
            {operando ? (
              <>
                <span className="material-symbols-outlined animate-spin text-title-md">progress_activity</span>
                <span>Evaluando...</span>
              </>
            ) : (
              <>
                <span>{falloEnvio ? 'Reintentar envío' : reto.mecanica === 'DIALOGO_STAKEHOLDER' ? 'Terminar entrevista' : 'Enviar solución'}</span>
                <span className="material-symbols-outlined text-title-md font-bold">arrow_forward</span>
              </>
            )}
          </button>
        </div>
      </div>

      {confirmando && (
        <ModalConfirmar
          titulo="¿Enviar de todos modos?"
          icono="warning"
          textoConfirmar="Enviar"
          textoCancelar="Seguir editando"
          mensaje={<p>{estadoEnvio.confirmacion}</p>}
          onConfirmar={() => void enviar()}
          onCancelar={() => setConfirmando(false)}
        />
      )}
      {guiaAbierta && <GuiaTecnica contenidos={intento.contenidosApoyo} onCerrar={() => setGuiaAbierta(false)} />}
      <Toast visible={toast.visible} message={toast.message} icon={toast.icon} />
    </Pagina>
  );
};
