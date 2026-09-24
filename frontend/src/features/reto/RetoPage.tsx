import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { PantallaCarga, PantallaError } from '../../components/EstadoPantalla';
import { Pagina } from '../../components/Pagina';
import { Toast } from '../../components/Toast';
import { esError, mensajeDeError } from '../../services/errores';
import { useEnviarIntento, useFaseDetalle, useRegistrarAyuda } from '../../services/queries';
import type { ContenidoApoyo, Fase, IntentoReto, Reto } from '../../types';
import { etiquetaFase, umbralPorcentaje } from '../fases/presentacion';
import { EjercicioGenerico } from './EjercicioGenerico';
import { EjercicioIso25010 } from './EjercicioIso25010';
import { GuiaTecnica } from './GuiaTecnica';
import { esRetoIso25010, OPCION_DESCARTABLE } from './retoIso25010';

export const RetoPage: React.FC = () => {
  const faseId = Number(useParams<{ faseId: string }>().faseId);
  const { data, isPending, isError, error } = useFaseDetalle(faseId);

  if (!Number.isInteger(faseId) || faseId <= 0 || esError(error, 404)) {
    return (
      <Pagina>
        <PantallaError titulo="Reto no encontrado" mensaje="Esta fase no existe." icono="travel_explore" />
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
        <PantallaError titulo="No se pudo cargar el reto" mensaje={mensajeDeError(error)} />
      </Pagina>
    );
  }
  if (data.fase.estado === 'bloqueada') {
    return (
      <Pagina>
        <PantallaError
          titulo="Fase bloqueada"
          mensaje="Primero completa la fase anterior para poder resolver este reto."
          icono="lock"
        />
      </Pagina>
    );
  }
  if (!data.reto) {
    return (
      <Pagina>
        <PantallaError titulo="Reto no disponible" mensaje="Esta fase todavía no tiene un reto." icono="hourglass_empty" />
      </Pagina>
    );
  }

  // key: al cambiar de reto se reinicia todo el estado del formulario.
  return (
    <ResolverReto key={data.reto.id} fase={data.fase} reto={data.reto} contenidos={data.contenidosApoyo} />
  );
};

const claveBorrador = (retoId: number) => `borrador_reto_${retoId}`;

function leerBorrador(retoId: number): Record<string, string> {
  try {
    const guardado = JSON.parse(localStorage.getItem(claveBorrador(retoId)) ?? '{}');
    return typeof guardado === 'object' && guardado !== null ? guardado : {};
  } catch {
    return {};
  }
}

interface ResolverRetoProps {
  fase: Fase;
  reto: Reto;
  contenidos: ContenidoApoyo[];
}

const ResolverReto: React.FC<ResolverRetoProps> = ({ fase, reto, contenidos }) => {
  const navigate = useNavigate();
  const enviarIntento = useEnviarIntento();
  const registrarAyuda = useRegistrarAyuda();
  const esIso = esRetoIso25010(reto);
  const umbral = umbralPorcentaje(reto.calificacionMinima);

  // Sin respuestas precargadas: el formulario arranca vacío (o con el borrador del estudiante).
  const [respuestas, setRespuestas] = useState<Record<string, string>>(() => leerBorrador(reto.id));
  const [pistaUsada, setPistaUsada] = useState(false);
  const [descarteUsado, setDescarteUsado] = useState(false);
  const [guiaAbierta, setGuiaAbierta] = useState(false);
  const [intentoAprobado, setIntentoAprobado] = useState<IntentoReto | null>(null);
  const [toast, setToast] = useState({ visible: false, message: '', icon: 'check_circle' });

  const mostrarToast = (message: string, icon = 'check_circle') => {
    setToast({ visible: true, message, icon });
    setTimeout(() => setToast((prev) => ({ ...prev, visible: false })), 3200);
  };

  const responder = (preguntaId: string, respuesta: string) =>
    setRespuestas((prev) => ({ ...prev, [preguntaId]: respuesta }));

  const completas = reto.preguntas.every((p) => (respuestas[p] ?? '').trim() !== '');

  const avisarError = (error: unknown) => {
    // 403: la fase está bloqueada, o (Fase 4) este reto no es el que sigue en
    // el orden de la fase. La UI normalmente solo pide el "reto actual" que
    // ya manda el backend, así que esto no debería verse en el uso normal.
    if (esError(error, 403)) {
      mostrarToast('Este reto todavía no está disponible: revisa el orden de la fase.', 'lock');
    } else {
      mostrarToast(mensajeDeError(error), 'error');
    }
  };

  // Cada consumible registra de verdad la ayuda en el backend ANTES del envío;
  // el backend marca con usoAyuda el próximo intento.
  const usarAyuda = (aplicar: () => void, mensaje: string, icono: string) => {
    registrarAyuda.mutate(reto.id, {
      onSuccess: () => {
        aplicar();
        mostrarToast(mensaje, icono);
      },
      onError: avisarError,
    });
  };

  const guardarBorrador = () => {
    localStorage.setItem(claveBorrador(reto.id), JSON.stringify(respuestas));
    mostrarToast('Borrador guardado en este navegador', 'bookmark');
  };

  const enviar = () => {
    enviarIntento.mutate(
      {
        retoId: reto.id,
        respuestas: reto.preguntas.map((preguntaId) => ({ preguntaId, respuesta: respuestas[preguntaId].trim() })),
      },
      {
        onSuccess: (intento) => {
          localStorage.removeItem(claveBorrador(reto.id));
          if (intento.aprobado) {
            setIntentoAprobado(intento);
          } else {
            navigate(`/resultado/${intento.id}`);
          }
        },
        onError: avisarError,
      },
    );
  };

  const usosRestantes = (esIso ? 2 : 1) - Number(pistaUsada) - Number(descarteUsado);

  return (
    <Pagina>
      {/* HUD superior del reto */}
      <div className="w-full bg-surface-container-low/80 backdrop-blur-md px-gutter py-space-md shadow-lg sticky top-20 z-30 border-b border-surface-container-high/40">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-space-md">
          <div className="flex items-center gap-space-md w-full md:w-auto">
            <div className="w-12 h-12 rounded-xl bg-surface-container-high flex items-center justify-center shrink-0 shadow-md">
              <span className="material-symbols-outlined text-primary text-headline-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
                balance
              </span>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="flex items-center gap-space-xs self-start">
                <span className="px-space-xs py-0.5 rounded bg-tertiary-container/20 text-tertiary font-label-sm text-label-sm uppercase font-bold">
                  {etiquetaFase(fase.orden)}: {fase.nombre}
                </span>
                {/* Fase 4: dentro de una fase con varios retos, cuál es el actual */}
                {fase.totalRetos > 1 && (
                  <span
                    id="reto-actual-indicador"
                    className="px-space-xs py-0.5 rounded bg-surface-container-highest text-on-surface-variant font-label-sm text-label-sm font-bold"
                  >
                    Reto {reto.orden} de {fase.totalRetos}
                  </span>
                )}
              </span>
              <h1 className="font-headline-sm text-headline-sm text-on-surface truncate">Reto de {fase.nombre}</h1>
            </div>
          </div>
          {contenidos.length > 0 && (
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

      {/* Modal de éxito: recompensas tal como las devolvió el backend */}
      {intentoAprobado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-gutter bg-surface-container-lowest/80 backdrop-blur-md">
          <div
            className="bg-surface-container max-w-lg w-full rounded-2xl p-space-xl shadow-2xl border border-tertiary/40 flex flex-col items-center text-center"
            role="dialog"
            aria-modal="true"
            aria-labelledby="exito-titulo"
            id="modal-exito"
          >
            <div className="w-16 h-16 rounded-full bg-tertiary/20 flex items-center justify-center text-tertiary mb-space-md shadow-[0_0_24px_rgba(84,221,252,0.4)]">
              <span className="material-symbols-outlined text-display-lg" style={{ fontVariationSettings: "'FILL' 1" }}>
                military_tech
              </span>
            </div>
            <h2 id="exito-titulo" className="font-headline-md text-headline-md text-on-surface font-bold mb-space-sm">
              ¡Reto Aprobado! ({intentoAprobado.porcentaje}%)
            </h2>
            <p className="font-body-md text-body-md text-on-surface-variant mb-space-lg">
              {intentoAprobado.xpGanado > 0 || intentoAprobado.qpGanado > 0
                ? 'Primera aprobación de este reto: la recompensa ya está acreditada en tu perfil.'
                : 'Ya habías aprobado este reto antes: esta vez no se otorgan XP ni QP.'}
            </p>
            <div className="grid grid-cols-2 gap-space-md w-full mb-space-lg">
              <div className="bg-surface-container-low p-space-md rounded-xl flex flex-col items-center">
                <span className="font-label-sm text-label-sm text-secondary font-bold uppercase">XP Ganado</span>
                <span className="font-headline-sm text-headline-sm text-secondary font-bold" id="exito-xp">
                  +{intentoAprobado.xpGanado} XP
                </span>
              </div>
              <div className="bg-surface-container-low p-space-md rounded-xl flex flex-col items-center">
                <span className="font-label-sm text-label-sm text-primary font-bold uppercase">QP Ganado</span>
                <span className="font-headline-sm text-headline-sm text-primary font-bold" id="exito-qp">
                  +{intentoAprobado.qpGanado} QP
                </span>
              </div>
            </div>
            <div className="flex gap-space-md w-full">
              <button
                onClick={() => navigate('/')}
                className="flex-1 py-3 rounded-xl bg-primary-container hover:bg-primary text-on-primary-container font-title-md font-bold transition-all shadow-lg"
              >
                Volver al Overworld
              </button>
              <Link
                to={`/resultado/${intentoAprobado.id}`}
                className="py-3 px-space-md rounded-xl bg-surface-container-high hover:bg-surface-bright text-on-surface font-title-md transition-all"
              >
                Ver resultado
              </Link>
            </div>
          </div>
        </div>
      )}

      <div className="w-full max-w-7xl mx-auto px-gutter py-space-xl flex flex-col lg:flex-row gap-space-lg pb-40">
        {/* Cinto de Combate: consumibles que registran ayuda en el backend */}
        <div className="w-full lg:w-80 flex flex-col gap-space-lg shrink-0">
          <div className="bg-surface-container-low rounded-xl p-space-lg shadow-xl relative overflow-hidden border border-surface-container-high/40">
            <div className="flex items-center justify-between mb-space-md">
              <div className="flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-primary text-title-lg">shield</span>
                <h2 className="font-title-lg text-title-lg text-on-surface font-bold">Cinto de Combate</h2>
              </div>
              <span className="px-space-xs py-0.5 rounded bg-surface-container-high text-primary font-label-sm text-label-sm font-bold">
                Usos: {usosRestantes}/{esIso ? 2 : 1}
              </span>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant mb-space-md">
              Usar una ayuda queda registrado en tu intento.
            </p>

            <div className="space-y-space-md">
              <Consumible
                nombre="Poción de Pistas"
                icono="science"
                descripcion={esIso ? 'Revela el atributo ISO 25010 para una métrica crítica.' : 'Te da una pista para el reto.'}
                usado={pistaUsada}
                cargando={registrarAyuda.isPending}
                textoBoton="Usar Ayuda"
                onUsar={() => usarAyuda(() => setPistaUsada(true), 'Poción de Pistas consumida', 'science')}
              >
                {pistaUsada && (
                  <div className="mt-space-sm p-space-xs bg-tertiary-container/20 rounded text-tertiary font-label-sm text-label-sm border border-tertiary/30">
                    💡 <strong>Pista:</strong>{' '}
                    {esIso
                      ? "El cifrado E2E penaliza el pipeline de CPU, impactando en 'Desempeño' (Comportamiento Temporal)."
                      : 'Relee con calma los criterios de aceptación del reto.'}
                  </div>
                )}
              </Consumible>

              {esIso && (
                <Consumible
                  nombre="Pergamino de Descarte"
                  icono="history_edu"
                  descripcion="Descarta una opción errónea del trade-off de arquitectura."
                  usado={descarteUsado}
                  cargando={registrarAyuda.isPending}
                  textoBoton="Activar Descarte"
                  onUsar={() =>
                    usarAyuda(
                      () => {
                        setDescarteUsado(true);
                        if (respuestas.tradeoff === OPCION_DESCARTABLE) responder('tradeoff', '');
                      },
                      `Pergamino de Descarte: opción ${OPCION_DESCARTABLE} inhabilitada`,
                      'history_edu',
                    )
                  }
                />
              )}
            </div>

            <div className="mt-space-lg pt-space-md border-t border-surface-container-high/40 flex items-center justify-between text-on-surface-variant font-label-sm text-[11px]">
              <span>Recompensa: +{reto.recompensaXp} XP</span>
              <span className="text-primary font-bold">+{reto.recompensaQp} QP</span>
            </div>
          </div>
        </div>

        {/* Ejercicio */}
        <div className="flex-1 flex flex-col gap-space-lg">
          {esIso ? (
            <EjercicioIso25010
              respuestas={respuestas}
              onResponder={responder}
              opcionDescartada={descarteUsado ? OPCION_DESCARTABLE : null}
            />
          ) : (
            <EjercicioGenerico
              preguntas={reto.preguntas}
              criteriosAceptacion={reto.criteriosAceptacion}
              respuestas={respuestas}
              onResponder={responder}
            />
          )}
        </div>
      </div>

      {/* Barra inferior de acción */}
      <div className="fixed bottom-0 left-0 w-full z-40 bg-surface-container-lowest/95 backdrop-blur-xl py-space-md px-gutter shadow-[0_-8px_24px_rgba(0,0,0,0.6)] border-t border-surface-container-high/40">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-space-md">
          <div className="flex flex-col">
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
              Criterio de Aprobación Mínima
            </span>
            <span className="font-body-sm text-body-sm text-on-surface font-semibold">
              Umbral de pase: <strong className="text-primary font-bold">{umbral}% de precisión</strong>
              {!completas && <span className="text-on-surface-variant"> · Responde todas las preguntas para enviar</span>}
            </span>
          </div>
          <div className="flex items-center gap-space-md w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={guardarBorrador}
              className="px-space-lg py-2.5 rounded-lg bg-surface-container-high hover:bg-surface-bright text-on-surface font-title-md text-title-md font-semibold transition-all shadow-sm flex items-center gap-space-xs border border-outline-variant/30"
            >
              <span className="material-symbols-outlined text-title-md">bookmark</span>
              <span>Guardar Borrador</span>
            </button>
            <button
              type="button"
              id="btn-enviar"
              onClick={enviar}
              disabled={!completas || enviarIntento.isPending}
              className="px-space-xl py-2.5 rounded-lg bg-primary-container hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed text-on-primary-container font-title-md text-title-md font-bold transition-all shadow-[0_4px_16px_rgba(245,158,11,0.35)] flex items-center gap-space-xs"
            >
              {enviarIntento.isPending ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-title-md">progress_activity</span>
                  <span>Evaluando...</span>
                </>
              ) : (
                <>
                  <span>Enviar Solución</span>
                  <span className="material-symbols-outlined text-title-md font-bold">arrow_forward</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {guiaAbierta && <GuiaTecnica contenidos={contenidos} onCerrar={() => setGuiaAbierta(false)} />}
      <Toast visible={toast.visible} message={toast.message} icon={toast.icon} />
    </Pagina>
  );
};

interface ConsumibleProps {
  nombre: string;
  icono: string;
  descripcion: string;
  usado: boolean;
  cargando: boolean;
  textoBoton: string;
  onUsar: () => void;
  children?: React.ReactNode;
}

const Consumible: React.FC<ConsumibleProps> = ({
  nombre,
  icono,
  descripcion,
  usado,
  cargando,
  textoBoton,
  onUsar,
  children,
}) => (
  <div className="p-space-md rounded-xl bg-surface-container-high shadow-md border border-surface-container-highest/50">
    <div className="flex items-center gap-space-sm mb-space-xs">
      <div className="w-10 h-10 rounded-lg bg-tertiary-container/30 flex items-center justify-center text-tertiary shrink-0 shadow-sm">
        <span className="material-symbols-outlined text-headline-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
          {icono}
        </span>
      </div>
      <div>
        <span className="font-label-sm text-[10px] text-tertiary uppercase font-bold">Consumible</span>
        <h3 className="font-title-md text-title-md text-on-surface leading-snug">{nombre}</h3>
      </div>
    </div>
    <p className="font-body-sm text-body-sm text-on-surface-variant mb-space-sm">{descripcion}</p>
    <button
      onClick={onUsar}
      disabled={usado || cargando}
      className={`w-full py-2 px-space-md rounded-lg font-title-md text-title-md font-bold transition-all flex items-center justify-center gap-space-xs shadow-md ${
        usado
          ? 'opacity-60 cursor-not-allowed bg-surface-container-highest text-on-surface-variant'
          : 'bg-tertiary text-on-tertiary hover:brightness-110 active:scale-[0.98] disabled:opacity-60'
      }`}
    >
      <span className="material-symbols-outlined text-title-md">{usado ? 'check' : 'auto_awesome'}</span>
      <span>{usado ? 'Consumido' : textoBoton}</span>
    </button>
    {children}
  </div>
);
