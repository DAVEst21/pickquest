import React, { useEffect, useMemo, useState } from 'react';
import type { AtributoCalidad, BorradorPresupuesto, ContenidoPresupuesto } from '../../../types';
import { NOMBRE_ATRIBUTO } from '../atributos';
import type { PropsMecanica } from '../tipos';
import { calcularMedidores } from './medidores';

/**
 * CU-06 Equilibrar atributos de calidad repartiendo un presupuesto (RF-09, RN-21).
 * El medidor de cada atributo se recalcula al instante con los efectos cruzados;
 * el reparto de referencia y la justificación correcta nunca llegan al cliente.
 */
const ICONO: Partial<Record<AtributoCalidad, string>> = {
  SEGURIDAD: 'lock',
  USABILIDAD: 'touch_app',
  EFICIENCIA_DESEMPENO: 'speed',
  MANTENIBILIDAD: 'build',
  FIABILIDAD: 'health_and_safety',
  ADECUACION_FUNCIONAL: 'task_alt',
  COMPATIBILIDAD: 'sync_alt',
  PORTABILIDAD: 'devices',
};

export const RetoPresupuesto: React.FC<PropsMecanica<ContenidoPresupuesto, BorradorPresupuesto>> = ({
  contenido,
  borrador,
  pista,
  deshabilitado,
  onCambio,
  onEstado,
}) => {
  const { presupuesto, atributos, efectos, justificaciones } = contenido;
  const [puntos, setPuntos] = useState<Record<number, number>>(() =>
    Object.fromEntries(borrador.asignaciones.map((a) => [a.atributoEscenarioId, a.puntos])),
  );
  const [justificacionId, setJustificacionId] = useState<number | null>(borrador.justificacionId);

  const asignados = atributos.reduce((s, a) => s + (puntos[a.id] ?? 0), 0);
  const restantes = presupuesto - asignados;
  const medidores = useMemo(() => calcularMedidores(atributos, efectos, puntos), [atributos, efectos, puntos]);
  const nombre = (id: number) => {
    const a = atributos.find((x) => x.id === id);
    return a ? NOMBRE_ATRIBUTO[a.atributo] : '';
  };

  const guardar = (nuevos: Record<number, number>, justificacion: number | null) => {
    setPuntos(nuevos);
    setJustificacionId(justificacion);
    onCambio({
      asignaciones: atributos.map((a) => ({ atributoEscenarioId: a.id, puntos: nuevos[a.id] ?? 0 })),
      justificacionId: justificacion,
    });
  };

  const cambiar = (id: number, nuevo: number) => {
    const actual = puntos[id] ?? 0;
    // FE1: no se puede asignar más que el presupuesto (el servidor también lo valida).
    const tope = actual + restantes;
    const valor = Math.max(0, Math.min(tope, Math.round(nuevo)));
    if (valor === actual) return;
    guardar({ ...puntos, [id]: valor }, justificacionId);
  };

  const incumplidas = atributos.filter(
    (a) => a.minimoObligatorio !== null && (medidores[a.id] ?? 0) < a.minimoObligatorio,
  );

  // Faltante: justificación sin elegir. FE2: restricciones incumplidas solo piden confirmación.
  const estado = useMemo(
    () => ({
      faltantes: justificacionId === null ? ['Falta elegir una justificación para tu reparto'] : [],
      confirmacion:
        incumplidas.length > 0
          ? `No cumples ${incumplidas.length === 1 ? 'una restricción obligatoria' : `${incumplidas.length} restricciones obligatorias`} del cliente: ${incumplidas
              .map((a) => `${NOMBRE_ATRIBUTO[a.atributo]} (mínimo ${a.minimoObligatorio}, tienes ${medidores[a.id]})`)
              .join(', ')}. Tu calificación bajará.`
          : undefined,
    }),
    [justificacionId, incumplidas, medidores],
  );
  useEffect(() => onEstado(estado), [estado, onEstado]);

  const atributoPista = pista?.tipo === 'RESTRICCION' ? pista.atributoEscenarioId : null;
  const conMinimo = atributos.filter((a) => a.minimoObligatorio !== null);

  return (
    <div className="flex flex-col gap-space-lg">
      {/* Presupuesto y restricciones */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
        <div className="bg-surface-container-low rounded-xl p-space-lg shadow-xl border border-surface-container-high/40">
          <span className="font-label-sm text-label-sm text-on-surface-variant uppercase">Presupuesto disponible</span>
          <p className="font-headline-md text-headline-md text-on-surface" id="puntos-restantes">
            <span className={restantes === 0 ? 'text-tertiary' : 'text-primary'}>{restantes}</span>
            <span className="text-on-surface-variant font-title-md text-title-md"> de {presupuesto} puntos</span>
          </p>
          <div className="w-full bg-surface-container-lowest h-2 rounded-full overflow-hidden mt-space-xs">
            <div
              className="h-full bg-gradient-to-r from-primary-container to-primary rounded-full transition-all"
              style={{ width: `${(asignados / presupuesto) * 100}%` }}
            />
          </div>
          {restantes > 0 && (
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-space-xs">
              Te quedan puntos sin asignar; no es obligatorio gastarlos todos.
            </p>
          )}
        </div>
        <div className="bg-surface-container-low rounded-xl p-space-lg shadow-xl border border-surface-container-high/40">
          <span className="font-label-sm text-label-sm text-on-surface-variant uppercase">Restricciones obligatorias del cliente</span>
          <ul className="mt-space-xs flex flex-col gap-1">
            {conMinimo.map((a) => {
              const cumple = (medidores[a.id] ?? 0) >= a.minimoObligatorio!;
              return (
                <li key={a.id} className="flex items-center gap-space-xs font-body-md text-body-md text-on-surface" data-cumple={cumple}>
                  <span className={`material-symbols-outlined text-title-md ${cumple ? 'text-tertiary' : 'text-error'}`}>
                    {cumple ? 'check_circle' : 'cancel'}
                  </span>
                  {NOMBRE_ATRIBUTO[a.atributo]} de al menos <strong>{a.minimoObligatorio}</strong>
                  <span className="text-on-surface-variant font-label-sm text-label-sm">(ahora {medidores[a.id]})</span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {pista?.tipo === 'RESTRICCION' && atributoPista !== null && (
        <div className="bg-tertiary-container/20 border border-tertiary/40 rounded-xl p-space-md flex items-start gap-space-sm" role="note">
          <span className="material-symbols-outlined text-tertiary">lightbulb</span>
          <p className="font-body-md text-body-md text-on-surface">
            <strong>Pista:</strong> la restricción más lejos de cumplirse es la de <strong>{nombre(atributoPista)}</strong>
            {pista.minimo !== null && <> (mínimo {pista.minimo})</>}.
          </p>
        </div>
      )}

      {/* Atributos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
        {atributos.map((a) => {
          const medidor = medidores[a.id] ?? 0;
          const asignado = puntos[a.id] ?? 0;
          const incumple = a.minimoObligatorio !== null && medidor < a.minimoObligatorio;
          return (
            <div
              key={a.id}
              data-atributo={a.atributo}
              className={`bg-surface-container-low rounded-xl p-space-lg shadow-xl border flex flex-col gap-space-sm ${
                atributoPista === a.id ? 'border-tertiary ring-2 ring-tertiary' : 'border-surface-container-high/40'
              }`}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-title-lg text-title-lg text-on-surface font-bold flex items-center gap-space-xs">
                  <span className="material-symbols-outlined text-secondary">{ICONO[a.atributo] ?? 'tune'}</span>
                  {NOMBRE_ATRIBUTO[a.atributo]}
                </h3>
                <span className={`font-headline-sm text-headline-sm font-bold ${incumple ? 'text-error' : 'text-tertiary'}`} data-medidor={medidor}>
                  {medidor}
                </span>
              </div>

              {/* Medidor con marca del mínimo obligatorio */}
              <div className="relative w-full h-4 bg-surface-container-lowest rounded-full overflow-hidden" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={medidor} aria-label={`Medidor de ${NOMBRE_ATRIBUTO[a.atributo]}`}>
                <div
                  className={`h-full rounded-full transition-all duration-300 ${incumple ? 'bg-error' : 'bg-gradient-to-r from-tertiary-container to-tertiary'}`}
                  style={{ width: `${medidor}%` }}
                />
                {a.minimoObligatorio !== null && (
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-primary"
                    style={{ left: `${a.minimoObligatorio}%` }}
                    title={`Mínimo obligatorio: ${a.minimoObligatorio}`}
                  />
                )}
              </div>
              {a.minimoObligatorio !== null && (
                <span className="font-label-sm text-[10px] text-primary">Mínimo obligatorio: {a.minimoObligatorio}</span>
              )}

              <div className="flex items-center gap-space-sm">
                <button
                  type="button"
                  aria-label={`Quitar un punto de ${NOMBRE_ATRIBUTO[a.atributo]}`}
                  disabled={deshabilitado || asignado <= 0}
                  onClick={() => cambiar(a.id, asignado - 1)}
                  className="w-9 h-9 rounded-lg bg-surface-container-high hover:bg-surface-bright disabled:opacity-40 text-on-surface font-bold text-title-md"
                >
                  −
                </button>
                <input
                  type="range"
                  min={0}
                  max={presupuesto}
                  value={asignado}
                  disabled={deshabilitado}
                  onChange={(e) => cambiar(a.id, Number(e.target.value))}
                  aria-label={`Puntos para ${NOMBRE_ATRIBUTO[a.atributo]}`}
                  className="flex-1 accent-primary-container"
                />
                <button
                  type="button"
                  aria-label={`Agregar un punto a ${NOMBRE_ATRIBUTO[a.atributo]}`}
                  disabled={deshabilitado || restantes <= 0}
                  onClick={() => cambiar(a.id, asignado + 1)}
                  className="w-9 h-9 rounded-lg bg-surface-container-high hover:bg-surface-bright disabled:opacity-40 text-on-surface font-bold text-title-md"
                >
                  +
                </button>
                <span className="w-16 text-right font-title-md text-title-md text-primary font-bold" data-puntos={asignado}>
                  {asignado} pts
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Justificación */}
      <fieldset className="bg-surface-container-low rounded-xl p-space-lg shadow-xl border border-surface-container-high/40">
        <legend className="px-space-xs font-title-lg text-title-lg text-on-surface font-bold">
          ¿Cómo justificas tu reparto?
        </legend>
        <div className="flex flex-col gap-space-sm mt-space-xs">
          {justificaciones.map((j) => (
            <label
              key={j.id}
              className={`flex items-start gap-space-sm p-space-md rounded-lg cursor-pointer border transition-all ${
                justificacionId === j.id
                  ? 'bg-primary-container/15 border-primary-container'
                  : 'bg-surface-container-high border-transparent hover:bg-surface-bright'
              }`}
            >
              <input
                type="radio"
                name="justificacion"
                value={j.id}
                checked={justificacionId === j.id}
                disabled={deshabilitado}
                onChange={() => guardar(puntos, j.id)}
                className="mt-1 accent-primary-container"
              />
              <span className="font-body-md text-body-md text-on-surface">{j.texto}</span>
            </label>
          ))}
        </div>
      </fieldset>
    </div>
  );
};
