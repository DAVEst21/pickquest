import React, { useEffect, useRef, useState } from 'react';
import { elegirTecnica, registrarTurno } from '../../../services/api';
import { mensajeDeError } from '../../../services/errores';
import type { ContenidoDialogo, EstadoDialogo, Pista, TecnicaElicitacion } from '../../../types';
import type { EstadoEnvio } from '../tipos';

/**
 * CU-01 Descubrir requerimientos dialogando con un stakeholder (RF-04, RN-16).
 * El diálogo lo conduce el servidor turno por turno: aquí solo llega la
 * intervención del nodo actual y sus preguntas (sin saber cuáles son
 * productivas ni qué requerimiento revela cada una).
 */
const TECNICAS: Record<TecnicaElicitacion, { nombre: string; icono: string; descripcion: string }> = {
  ENTREVISTA: {
    nombre: 'Entrevista',
    icono: 'record_voice_over',
    descripcion: 'Conversación directa y abierta con una persona clave, pregunta por pregunta.',
  },
  CUESTIONARIO: {
    nombre: 'Cuestionario',
    icono: 'quiz',
    descripcion: 'Preguntas escritas y estandarizadas, pensadas para recoger la opinión de muchas personas.',
  },
  OBSERVACION: {
    nombre: 'Observación',
    icono: 'visibility',
    descripcion: 'Ver cómo trabajan realmente los usuarios, sin pedirles que lo expliquen.',
  },
  TALLER: {
    nombre: 'Taller',
    icono: 'groups',
    descripcion: 'Sesión grupal donde varios interesados trabajan y discuten juntos.',
  },
};

const RETRATO: Record<string, string> = { cafetero: 'local_cafe' };

interface Props {
  intentoId: number;
  contenido: ContenidoDialogo;
  estadoInicial: EstadoDialogo;
  pista: Pista | null;
  deshabilitado: boolean;
  onEstado: (estado: EstadoEnvio) => void;
  /** Se llama cuando se agotan los turnos (CU-01 FE2): el envío ocurre automáticamente. */
  onEnviarAutomatico: () => void;
  onError: (mensaje: string) => void;
}

export const RetoDialogo: React.FC<Props> = ({
  intentoId,
  contenido,
  estadoInicial,
  pista,
  deshabilitado,
  onEstado,
  onEnviarAutomatico,
  onError,
}) => {
  const [estado, setEstado] = useState<EstadoDialogo>(estadoInicial);
  const [ocupado, setOcupado] = useState(false);
  const final = useRef<HTMLDivElement>(null);
  const enviado = useRef(false);
  const { stakeholder, turnosMaximos } = contenido;

  const tecnicaElegida = estado.tecnicaElegida;
  const libretaVacia = estado.libreta.length === 0;

  useEffect(() => {
    onEstado({
      faltantes: tecnicaElegida === null ? ['Elige primero la técnica de elicitación'] : [],
      confirmacion:
        tecnicaElegida !== null && libretaVacia
          ? 'Tu libreta está vacía: todavía no descubriste ningún requerimiento. ¿Quieres terminar la entrevista así?'
          : undefined,
    });
  }, [tecnicaElegida, libretaVacia, onEstado]);

  // FE2: al agotarse los turnos la entrevista se envía sola.
  useEffect(() => {
    if (tecnicaElegida !== null && estado.turnosRestantes === 0 && !enviado.current) {
      enviado.current = true;
      onEnviarAutomatico();
    }
  }, [tecnicaElegida, estado.turnosRestantes, onEnviarAutomatico]);

  useEffect(() => {
    final.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [estado.turnos.length, tecnicaElegida]);

  const bloqueado = ocupado || deshabilitado;

  const elegir = async (tecnica: TecnicaElicitacion) => {
    setOcupado(true);
    try {
      setEstado(await elegirTecnica<EstadoDialogo>(intentoId, tecnica));
    } catch (e) {
      onError(mensajeDeError(e));
    } finally {
      setOcupado(false);
    }
  };

  const preguntar = async (opcionId: number) => {
    setOcupado(true);
    try {
      setEstado(await registrarTurno<EstadoDialogo>(intentoId, opcionId));
    } catch (e) {
      onError(mensajeDeError(e));
    } finally {
      setOcupado(false);
    }
  };

  const opcionPista = pista?.tipo === 'OPCION_DIALOGO' ? pista.opcionId : null;
  const turnosUsados = turnosMaximos - estado.turnosRestantes;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-space-lg">
      {/* Stakeholder */}
      <div className="xl:col-span-3 bg-surface-container-low rounded-xl p-space-lg shadow-xl border border-surface-container-high/40 flex flex-col items-center text-center gap-space-sm h-fit">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary-container to-secondary-container flex items-center justify-center shadow-lg ring-4 ring-surface-container-high">
          <span className="material-symbols-outlined text-on-primary-container" style={{ fontSize: 52, fontVariationSettings: "'FILL' 1" }}>
            {RETRATO[stakeholder.retrato] ?? 'person'}
          </span>
        </div>
        <div>
          <h2 className="font-title-lg text-title-lg text-on-surface font-bold">{stakeholder.nombre}</h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant">{stakeholder.rol}</p>
        </div>
        <div className="w-full">
          <div className="flex justify-between font-label-sm text-label-sm text-on-surface-variant mb-1">
            <span>Turnos</span>
            <span id="turnos-restantes">
              {estado.turnosRestantes} de {turnosMaximos} disponibles
            </span>
          </div>
          <div className="flex gap-1" aria-hidden="true">
            {Array.from({ length: turnosMaximos }, (_, i) => (
              <span
                key={i}
                className={`flex-1 h-2 rounded-full ${i < turnosUsados ? 'bg-surface-container-highest' : 'bg-primary-container'}`}
              />
            ))}
          </div>
        </div>
        {tecnicaElegida && (
          <span className="px-space-sm py-1 rounded-full bg-secondary-container/40 text-secondary font-label-sm text-label-sm font-bold flex items-center gap-1">
            <span className="material-symbols-outlined text-label-md">{TECNICAS[tecnicaElegida].icono}</span>
            {TECNICAS[tecnicaElegida].nombre}
          </span>
        )}
      </div>

      {/* Conversación */}
      <div className="xl:col-span-6 flex flex-col gap-space-md">
        {tecnicaElegida === null ? (
          <div className="bg-surface-container-low rounded-xl p-space-lg shadow-xl border border-surface-container-high/40">
            <h2 className="font-title-lg text-title-lg text-on-surface font-bold mb-1">1. Elige tu técnica de elicitación</h2>
            <p className="font-body-md text-body-md text-on-surface-variant mb-space-md">
              Piensa en el caso: ¿quién es el interesado y cuánto tiempo tienes? No podrás cambiarla una vez que empieces a preguntar.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-space-sm">
              {contenido.tecnicas.map((t) => (
                <button
                  key={t}
                  type="button"
                  disabled={bloqueado}
                  data-tecnica={t}
                  onClick={() => void elegir(t)}
                  className="text-left p-space-md rounded-xl bg-surface-container-high hover:bg-surface-bright border border-surface-container-highest/50 hover:border-primary transition-all disabled:opacity-60 flex gap-space-sm"
                >
                  <span className="material-symbols-outlined text-secondary text-headline-sm shrink-0">
                    {TECNICAS[t].icono}
                  </span>
                  <span>
                    <span className="block font-title-md text-title-md text-on-surface">{TECNICAS[t].nombre}</span>
                    <span className="block font-body-sm text-body-sm text-on-surface-variant">{TECNICAS[t].descripcion}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            <div className="bg-surface-container-low rounded-xl p-space-md shadow-xl border border-surface-container-high/40 flex flex-col gap-space-sm max-h-[28rem] overflow-y-auto">
              {estado.turnos.length === 0 && (
                <p className="font-body-sm text-body-sm text-on-surface-variant text-center py-space-sm">
                  Aquí aparecerá la conversación. Elige tu primera pregunta.
                </p>
              )}
              {estado.turnos.map((t) => (
                <React.Fragment key={t.numero}>
                  <div className="self-end max-w-[85%] bg-primary-container/25 text-on-surface rounded-2xl rounded-br-sm px-space-md py-space-sm font-body-md text-body-md">
                    {t.pregunta}
                  </div>
                  <div className="self-start max-w-[85%] bg-surface-container-high text-on-surface rounded-2xl rounded-bl-sm px-space-md py-space-sm font-body-md text-body-md">
                    {t.respuesta}
                    {t.requerimiento && (
                      <span className="mt-1 flex items-center gap-1 font-label-sm text-label-sm text-tertiary font-bold">
                        <span className="material-symbols-outlined text-label-md">edit_note</span>
                        Anotado en tu libreta ({t.requerimiento.codigo})
                      </span>
                    )}
                  </div>
                </React.Fragment>
              ))}
              {estado.nodoActual && (
                <div className="self-start max-w-[85%] bg-surface-container-high/70 text-on-surface rounded-2xl rounded-bl-sm px-space-md py-space-sm font-body-md text-body-md italic">
                  {estado.nodoActual.intervencion}
                </div>
              )}
              <div ref={final} />
            </div>

            {estado.nodoActual ? (
              <div className="bg-surface-container-low rounded-xl p-space-md shadow-xl border border-surface-container-high/40">
                <h2 className="font-title-md text-title-md text-on-surface font-bold mb-space-sm">¿Qué le preguntas?</h2>
                <ul className="flex flex-col gap-space-xs">
                  {estado.nodoActual.opciones.map((o) => (
                    <li key={o.id}>
                      <button
                        type="button"
                        disabled={bloqueado}
                        data-opcion-id={o.id}
                        onClick={() => void preguntar(o.id)}
                        className={`w-full text-left px-space-md py-space-sm rounded-lg bg-surface-container-high hover:bg-surface-bright text-on-surface font-body-md text-body-md transition-all disabled:opacity-60 flex items-center gap-space-sm border ${
                          opcionPista === o.id ? 'border-tertiary ring-2 ring-tertiary' : 'border-transparent'
                        }`}
                      >
                        <span className="material-symbols-outlined text-primary text-title-md shrink-0">
                          {opcionPista === o.id ? 'lightbulb' : 'chat_bubble'}
                        </span>
                        {o.pregunta}
                      </button>
                    </li>
                  ))}
                </ul>
                {opcionPista !== null && (
                  <p className="mt-space-sm font-body-sm text-body-sm text-tertiary" role="note">
                    <strong>Pista:</strong> la pregunta destacada es una buena apuesta para este momento.
                  </p>
                )}
              </div>
            ) : (
              <div className="bg-surface-container-low rounded-xl p-space-md border border-surface-container-high/40 text-center font-body-md text-body-md text-on-surface-variant">
                {estado.turnosRestantes === 0
                  ? 'Se acabaron los turnos. Enviando tu entrevista...'
                  : 'No hay más preguntas disponibles. Termina la entrevista cuando quieras.'}
              </div>
            )}
          </>
        )}
      </div>

      {/* Libreta */}
      <div className="xl:col-span-3 bg-surface-container-low rounded-xl p-space-lg shadow-xl border border-surface-container-high/40 h-fit">
        <div className="flex items-center justify-between mb-space-sm">
          <h2 className="font-title-lg text-title-lg text-on-surface font-bold flex items-center gap-space-xs">
            <span className="material-symbols-outlined text-tertiary">menu_book</span>
            Libreta
          </h2>
          <span className="font-label-sm text-label-sm text-on-surface-variant" id="libreta-contador">
            {estado.libreta.length} de {contenido.totalRequerimientos}
          </span>
        </div>
        {libretaVacia ? (
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Todavía no descubres ningún requerimiento. Cuando el stakeholder revele uno, se anotará aquí.
          </p>
        ) : (
          <ul className="flex flex-col gap-space-xs">
            {estado.libreta.map((r) => (
              <li key={r.codigo} className="bg-surface-container-high rounded-lg p-space-sm border border-tertiary/20">
                <span className="font-label-sm text-label-sm text-tertiary font-bold">{r.codigo}</span>
                <p className="font-body-sm text-body-sm text-on-surface">{r.descripcion}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
