import { DndContext, KeyboardSensor, PointerSensor, useDraggable, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import React, { useEffect, useMemo, useState } from 'react';
import type { BorradorLineaTiempo, ContenidoLineaTiempo } from '../../../types';
import { type PropsMecanica } from '../tipos';

/**
 * CU-08 Línea de tiempo (RF-11, RN-23).
 * Vista tipo Gantt: una fila por bloque y una columna por semana. La semana de
 * inicio se fija arrastrando la barra en horizontal O con los controles − y +
 * (RNF-US-04). Las dependencias no se muestran: forman parte de lo que se evalúa.
 */
const ANCHO_SEMANA = 40;
const SEMANA_MAXIMA = 200;
const SEMANAS_EXTRA = 6;

const MODELO: Record<string, string> = {
  CASCADA: 'Cascada',
  MODELO_V: 'Modelo V',
  INCREMENTAL: 'Incremental',
  ESPIRAL: 'Espiral',
  PROTOTIPOS: 'Prototipos',
  AGIL: 'Ágil',
};

interface BarraProps {
  id: number;
  inicio: number;
  duracion: number;
  tipo: 'FASE' | 'ACTIVIDAD';
  nombre: string;
  resaltada: boolean;
  deshabilitado: boolean;
}

const Barra: React.FC<BarraProps> = ({ id, inicio, duracion, tipo, nombre, resaltada, deshabilitado }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `bloque-${id}`,
    disabled: deshabilitado,
  });
  const desplazamiento = Math.round((transform?.x ?? 0) / ANCHO_SEMANA) * ANCHO_SEMANA;
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      data-bloque-id={id}
      aria-label={`${nombre}: semana ${inicio + 1}, dura ${duracion} semanas. Arrastra o usa las flechas.`}
      className={`absolute top-1.5 bottom-1.5 rounded-md flex items-center px-space-xs cursor-grab active:cursor-grabbing select-none touch-none shadow-md font-label-sm text-[11px] font-bold overflow-hidden whitespace-nowrap transition-shadow ${
        tipo === 'FASE'
          ? 'bg-primary-container text-on-primary-container'
          : 'bg-secondary-container text-on-secondary-container'
      } ${isDragging ? 'z-20 shadow-2xl ring-2 ring-tertiary' : ''} ${resaltada ? 'ring-2 ring-tertiary' : ''}`}
      style={{
        left: inicio * ANCHO_SEMANA + 2,
        width: duracion * ANCHO_SEMANA - 4,
        transform: `translate3d(${desplazamiento}px, 0, 0)`,
      }}
    >
      {duracion} sem
    </div>
  );
};

export const RetoLineaTiempo: React.FC<PropsMecanica<ContenidoLineaTiempo, BorradorLineaTiempo>> = ({
  contenido,
  borrador,
  pista,
  deshabilitado,
  onCambio,
  onEstado,
}) => {
  const [inicios, setInicios] = useState<Record<number, number>>(() =>
    Object.fromEntries(borrador.posiciones.map((p) => [p.bloqueId, p.inicioSemana])),
  );
  const [asociaciones, setAsociaciones] = useState<Record<number, number>>(() =>
    Object.fromEntries(borrador.asociaciones.map((a) => [a.entregableId, a.faseBloqueId])),
  );

  const { bloques, entregables, duracionMaximaSemanas: limite } = contenido;
  const fases = bloques.filter((b) => b.tipo === 'FASE');
  const colocados = bloques.filter((b) => inicios[b.id] !== undefined);
  const fin = colocados.reduce((max, b) => Math.max(max, inicios[b.id] + b.duracionSemanas), 0);
  const semanas = Math.max(limite + SEMANAS_EXTRA, fin + 1);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor),
  );

  const guardar = (nuevosInicios: Record<number, number>, nuevasAsoc: Record<number, number>) => {
    setInicios(nuevosInicios);
    setAsociaciones(nuevasAsoc);
    onCambio({
      posiciones: bloques
        .filter((b) => nuevosInicios[b.id] !== undefined)
        .map((b) => ({ bloqueId: b.id, inicioSemana: nuevosInicios[b.id] })),
      asociaciones: entregables
        .filter((e) => nuevasAsoc[e.id] !== undefined)
        .map((e) => ({ entregableId: e.id, faseBloqueId: nuevasAsoc[e.id] })),
    });
  };

  const mover = (bloqueId: number, nuevoInicio: number) => {
    const acotado = Math.max(0, Math.min(SEMANA_MAXIMA, nuevoInicio));
    guardar({ ...inicios, [bloqueId]: acotado }, asociaciones);
  };

  const alSoltar = ({ active, delta }: DragEndEvent) => {
    const id = Number(String(active.id).replace('bloque-', ''));
    if (inicios[id] === undefined) return;
    mover(id, inicios[id] + Math.round(delta.x / ANCHO_SEMANA));
  };

  const asociar = (entregableId: number, faseId: number | null) => {
    const nuevas = { ...asociaciones };
    if (faseId === null) delete nuevas[entregableId];
    else nuevas[entregableId] = faseId;
    guardar(inicios, nuevas);
  };

  // Estado de envío: FE1 (faltantes) y FE2 (advertencia si se rebasa la fecha límite).
  const estado = useMemo(() => {
    const faltantes = [
      ...bloques
        .filter((b) => inicios[b.id] === undefined)
        .map((b) => `Falta colocar «${b.nombre}» en la línea de tiempo`),
      ...entregables
        .filter((e) => asociaciones[e.id] === undefined)
        .map((e) => `Falta asociar el entregable «${e.nombre}» con una fase`),
    ];
    const rebasa = colocados.length === bloques.length && fin > limite;
    return {
      faltantes,
      confirmacion: rebasa
        ? `Tu plan dura ${fin} semanas y la fecha límite es de ${limite}. Perderás los puntos del plazo (y quizá el reto no se apruebe).`
        : undefined,
    };
  }, [bloques, entregables, inicios, asociaciones, colocados.length, fin, limite]);

  useEffect(() => onEstado(estado), [estado, onEstado]);

  const nombrePorId = new Map(bloques.map((b) => [b.id, b.nombre]));
  const resaltados =
    pista?.tipo === 'DEPENDENCIA' ? new Set([pista.bloqueId, pista.requiereId]) : new Set<number | null>();
  const excede = fin > limite;

  return (
    <div className="flex flex-col gap-space-lg">
      {/* Resumen: modelo, fecha límite y fin calculado (RNF-US-05) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md">
        <div className="bg-surface-container-low rounded-xl p-space-md border border-surface-container-high/40">
          <span className="font-label-sm text-label-sm text-on-surface-variant uppercase">Modelo de ciclo de vida</span>
          <p className="font-title-lg text-title-lg text-on-surface">{MODELO[contenido.modelo] ?? contenido.modelo}</p>
        </div>
        <div className="bg-surface-container-low rounded-xl p-space-md border border-surface-container-high/40">
          <span className="font-label-sm text-label-sm text-on-surface-variant uppercase">Fecha límite</span>
          <p className="font-title-lg text-title-lg text-on-surface">{limite} semanas</p>
        </div>
        <div
          className={`rounded-xl p-space-md border ${
            excede ? 'bg-error-container/20 border-error/40' : 'bg-surface-container-low border-surface-container-high/40'
          }`}
          id="resumen-fin"
        >
          <span className="font-label-sm text-label-sm text-on-surface-variant uppercase">Tu plan termina</span>
          <p className={`font-title-lg text-title-lg ${excede ? 'text-error' : 'text-tertiary'}`}>
            {colocados.length === 0 ? '—' : `${fin} semanas`}
            {excede && <span className="font-label-md text-label-md"> · +{fin - limite} sobre el límite</span>}
          </p>
        </div>
      </div>

      {pista?.tipo === 'DEPENDENCIA' && pista.bloqueId !== null && pista.requiereId !== null && (
        <div
          className="bg-tertiary-container/20 border border-tertiary/40 rounded-xl p-space-md flex items-start gap-space-sm"
          role="note"
        >
          <span className="material-symbols-outlined text-tertiary">lightbulb</span>
          <p className="font-body-md text-body-md text-on-surface">
            <strong>Pista:</strong> «{nombrePorId.get(pista.bloqueId)}» no puede empezar antes de que termine «
            {nombrePorId.get(pista.requiereId)}».
          </p>
        </div>
      )}

      {/* Gantt */}
      <div className="bg-surface-container-low rounded-xl shadow-xl border border-surface-container-high/40 overflow-hidden">
        <div className="px-space-md pt-space-md pb-space-xs flex items-center justify-between flex-wrap gap-space-xs">
          <h2 className="font-title-lg text-title-lg text-on-surface font-bold flex items-center gap-space-xs">
            <span className="material-symbols-outlined text-primary">timeline</span>
            Cronograma
          </h2>
          <span className="font-label-sm text-label-sm text-on-surface-variant">
            Arrastra cada barra o usa − / + para elegir su semana de inicio
          </span>
        </div>
        <div className="overflow-x-auto">
          <DndContext sensors={sensors} onDragEnd={alSoltar}>
            <div style={{ width: 288 + semanas * ANCHO_SEMANA }}>
              {/* Encabezado de semanas */}
              <div className="flex border-b border-surface-container-high/60">
                <div className="w-72 shrink-0 sticky left-0 z-10 bg-surface-container-low px-space-md py-1 font-label-sm text-label-sm text-on-surface-variant">
                  Bloque
                </div>
                <div className="flex relative">
                  {Array.from({ length: semanas }, (_, i) => (
                    <div
                      key={i}
                      className={`text-center font-label-sm text-[10px] py-1 border-l border-surface-container-high/40 ${
                        i === limite - 1 ? 'text-error font-bold' : 'text-on-surface-variant'
                      }`}
                      style={{ width: ANCHO_SEMANA }}
                    >
                      S{i + 1}
                    </div>
                  ))}
                </div>
              </div>

              {bloques.map((bloque) => {
                const inicio = inicios[bloque.id];
                const colocado = inicio !== undefined;
                return (
                  <div
                    key={bloque.id}
                    data-fila-bloque={bloque.id}
                    className={`flex border-b border-surface-container-high/40 ${
                      resaltados.has(bloque.id) ? 'bg-tertiary-container/10' : ''
                    }`}
                  >
                    <div className="w-72 shrink-0 sticky left-0 z-10 bg-surface-container-low px-space-md py-space-xs flex flex-col gap-1 border-r border-surface-container-high/40">
                      <div className="flex items-center gap-space-xs">
                        <span
                          className={`px-1.5 py-0.5 rounded font-label-sm text-[9px] font-bold ${
                            bloque.tipo === 'FASE'
                              ? 'bg-primary-container/30 text-primary'
                              : 'bg-secondary-container/50 text-secondary'
                          }`}
                        >
                          {bloque.tipo === 'FASE' ? 'FASE' : 'ACTIVIDAD'}
                        </span>
                        <span className="font-body-sm text-body-sm text-on-surface font-semibold leading-tight">
                          {bloque.nombre}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-label-sm text-label-sm text-on-surface-variant">
                          {bloque.duracionSemanas} {bloque.duracionSemanas === 1 ? 'semana' : 'semanas'}
                        </span>
                        {colocado ? (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              aria-label={`Adelantar ${bloque.nombre} una semana`}
                              disabled={deshabilitado || inicio <= 0}
                              onClick={() => mover(bloque.id, inicio - 1)}
                              className="w-6 h-6 rounded bg-surface-container-high hover:bg-surface-bright disabled:opacity-40 text-on-surface font-bold"
                            >
                              −
                            </button>
                            <span className="font-label-sm text-label-sm text-on-surface w-16 text-center">
                              Semana {inicio + 1}
                            </span>
                            <button
                              type="button"
                              aria-label={`Retrasar ${bloque.nombre} una semana`}
                              disabled={deshabilitado || inicio >= SEMANA_MAXIMA}
                              onClick={() => mover(bloque.id, inicio + 1)}
                              className="w-6 h-6 rounded bg-surface-container-high hover:bg-surface-bright disabled:opacity-40 text-on-surface font-bold"
                            >
                              +
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            disabled={deshabilitado}
                            onClick={() => mover(bloque.id, 0)}
                            className="px-space-sm py-0.5 rounded bg-primary-container text-on-primary-container font-label-sm text-label-sm font-bold hover:brightness-110"
                          >
                            Colocar
                          </button>
                        )}
                      </div>
                    </div>
                    <div
                      className="relative h-14"
                      style={{
                        width: semanas * ANCHO_SEMANA,
                        backgroundImage: `repeating-linear-gradient(to right, transparent 0, transparent ${ANCHO_SEMANA - 1}px, rgba(83,68,52,0.35) ${ANCHO_SEMANA - 1}px, rgba(83,68,52,0.35) ${ANCHO_SEMANA}px)`,
                      }}
                    >
                      <div
                        className="absolute top-0 bottom-0 border-r-2 border-dashed border-error/70 pointer-events-none"
                        style={{ left: limite * ANCHO_SEMANA - 1 }}
                        title="Fecha límite"
                      />
                      {colocado && (
                        <Barra
                          id={bloque.id}
                          inicio={inicio}
                          duracion={bloque.duracionSemanas}
                          tipo={bloque.tipo}
                          nombre={bloque.nombre}
                          resaltada={resaltados.has(bloque.id)}
                          deshabilitado={deshabilitado}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </DndContext>
        </div>
      </div>

      {/* Entregables */}
      <div className="bg-surface-container-low rounded-xl p-space-lg shadow-xl border border-surface-container-high/40">
        <h2 className="font-title-lg text-title-lg text-on-surface font-bold flex items-center gap-space-xs mb-space-xs">
          <span className="material-symbols-outlined text-tertiary">inventory_2</span>
          Entregables
        </h2>
        <p className="font-body-sm text-body-sm text-on-surface-variant mb-space-md">
          Asocia cada entregable con la fase que lo produce.
        </p>
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-space-sm">
          {entregables.map((entregable) => (
            <li
              key={entregable.id}
              className="bg-surface-container-high rounded-lg p-space-sm flex flex-col gap-1 border border-surface-container-highest/40"
            >
              <label htmlFor={`entregable-${entregable.id}`} className="font-body-sm text-body-sm text-on-surface font-semibold">
                {entregable.nombre}
              </label>
              <select
                id={`entregable-${entregable.id}`}
                disabled={deshabilitado}
                value={asociaciones[entregable.id] ?? ''}
                onChange={(e) => asociar(entregable.id, e.target.value === '' ? null : Number(e.target.value))}
                className="bg-surface-container-lowest border border-outline-variant/40 rounded-md px-space-sm py-1.5 text-on-surface font-body-sm text-body-sm focus:outline-none focus:border-primary"
              >
                <option value="">Elige la fase…</option>
                {fases.map((fase) => (
                  <option key={fase.id} value={fase.id}>
                    {fase.nombre}
                  </option>
                ))}
              </select>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
