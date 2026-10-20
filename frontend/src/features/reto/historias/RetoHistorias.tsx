import { useEffect, useMemo, useState } from 'react';
import {
  DndContext,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type {
  BorradorHistorias,
  ContenidoHistorias,
  Pista,
  TipoPiezaHistoria,
} from '../../../types';
import type { EstadoEnvio } from '../tipos';

import { ETIQUETA_PIEZA } from './etiquetas';
const TIPO_NOMBRE: Record<TipoPiezaHistoria, string> = {
  ROL: 'rol',
  FUNCIONALIDAD: 'funcionalidad',
  BENEFICIO: 'beneficio',
  DADO: 'condición inicial (Dado)',
  CUANDO: 'acción (Cuando)',
  ENTONCES: 'resultado (Entonces)',
};
type Pieza = ContenidoHistorias['piezas'][number];
function PiezaBoton({
  pieza,
  seleccionada,
  disabled,
  elegir,
}: {
  pieza: Pieza;
  seleccionada: boolean;
  disabled: boolean;
  elegir: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: pieza.id,
    disabled,
  });
  return (
    <button
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      type="button"
      disabled={disabled}
      onClick={elegir}
      aria-pressed={seleccionada}
      data-pieza-id={pieza.id}
      style={
        transform
          ? {
              transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
              zIndex: 50,
              position: 'relative',
            }
          : undefined
      }
      className={`w-full text-left p-space-sm rounded-lg border touch-none ${seleccionada ? 'border-primary bg-primary-container/30' : 'border-surface-container-highest bg-surface-container-high'} disabled:opacity-50`}
    >
      <span className="block text-label-sm text-secondary">
        {ETIQUETA_PIEZA[pieza.tipo]}
      </span>
      <span>{pieza.texto}</span>
    </button>
  );
}
function Casilla({
  id,
  historiaOrden,
  tipo,
  pieza,
  disabled,
  colocar,
  retirar,
  seleccionar,
}: {
  id: number;
  historiaOrden: number;
  tipo: TipoPiezaHistoria;
  pieza?: Pieza;
  disabled: boolean;
  colocar: () => void;
  retirar: () => void;
  seleccionar: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `casilla-${id}`,
    disabled,
  });
  return (
    <div
      ref={setNodeRef}
      data-casilla-id={id}
      data-tipo={tipo}
      className={`rounded-lg border p-space-sm ${isOver ? 'border-primary' : 'border-surface-container-highest'}`}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={colocar}
        aria-label={`Colocar pieza en ${ETIQUETA_PIEZA[tipo]}, historia ${historiaOrden}`}
        className="w-full text-left min-h-12"
      >
        <strong className="text-secondary">{ETIQUETA_PIEZA[tipo]} </strong>
        <span>{pieza ? '' : 'Selecciona una pieza del banco'}</span>
      </button>
      {pieza && (
        <>
          <PiezaBoton
            pieza={pieza}
            seleccionada={false}
            disabled={disabled}
            elegir={seleccionar}
          />
          <button
            type="button"
            disabled={disabled}
            onClick={retirar}
            aria-label={`Retirar pieza de ${ETIQUETA_PIEZA[tipo]}, historia ${historiaOrden}`}
            className="text-secondary underline mt-space-xs"
          >
            Devolver al banco
          </button>
        </>
      )}
    </div>
  );
}
export function RetoHistorias({
  contenido,
  borrador,
  pista,
  deshabilitado,
  onCambio,
  onEstado,
}: {
  contenido: ContenidoHistorias;
  borrador: BorradorHistorias;
  pista: Pista | null;
  deshabilitado: boolean;
  onCambio: (b: BorradorHistorias) => void;
  onEstado: (e: EstadoEnvio) => void;
}) {
  const [colocaciones, setColocaciones] = useState(borrador.colocaciones);
  const [seleccion, setSeleccion] = useState<number | null>(null);
  const [aviso, setAviso] = useState('');
  const retiradas =
    pista?.tipo === 'DISTRACTORES_RETIRADOS' ? pista.piezaIds : [];
  const casillas = contenido.historias.flatMap((h) => h.casillas);
  const faltantes = useMemo(
    () =>
      contenido.historias.flatMap((h) =>
        h.casillas
          .filter((c) => !colocaciones.some((p) => p.casillaId === c.id))
          .map((c) => `Historia ${h.orden}: falta ${ETIQUETA_PIEZA[c.tipo]}`),
      ),
    [contenido, colocaciones],
  );
  useEffect(() => {
    onEstado({ faltantes });
  }, [faltantes, onEstado]);
  const actualizar = (nuevas: BorradorHistorias['colocaciones']) => {
    setColocaciones(nuevas);
    onCambio({ colocaciones: nuevas });
  };
  const colocar = (casillaId: number, piezaId = seleccion) => {
    if (deshabilitado || piezaId === null) return;
    const pieza = contenido.piezas.find((p) => p.id === piezaId);
    const casilla = casillas.find((c) => c.id === casillaId);
    if (!pieza || !casilla || retiradas.includes(piezaId)) return;
    if (pieza.tipo !== casilla.tipo) {
      setAviso(
        `Esta casilla acepta una pieza de ${TIPO_NOMBRE[casilla.tipo]}. La pieza vuelve al banco.`,
      );
      actualizar(colocaciones.filter((p) => p.piezaId !== piezaId));
    } else {
      actualizar([
        ...colocaciones.filter(
          (p) => p.casillaId !== casillaId && p.piezaId !== piezaId,
        ),
        { casillaId, piezaId },
      ]);
      setAviso('Pieza colocada. Su resultado se mostrará al enviar.');
    }
    setSeleccion(null);
  };
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );
  return (
    <DndContext
      sensors={sensors}
      onDragEnd={({ active, over }) => {
        if (over && String(over.id).startsWith('casilla-'))
          colocar(Number(String(over.id).slice(8)), Number(active.id));
      }}
    >
      <p className="text-on-surface-variant">
        Arrastra una pieza o selecciónala y después elige su casilla. Puedes
        moverla o devolverla al banco.
      </p>
      <p id="contador-casillas" className="font-bold text-primary">
        {colocaciones.length} / {casillas.length} casillas completas
      </p>
      <p role="status" aria-live="polite">
        {aviso}
      </p>
      {retiradas.length > 0 && (
        <p className="text-tertiary" data-ayuda-historias>
          Ayuda aplicada: se retiraron dos piezas distractoras del banco.
        </p>
      )}
      <div className="flex flex-col xl:flex-row gap-space-lg items-start">
        <section
          aria-label="Plantillas de historias"
          className="flex-1 min-w-0 space-y-space-lg"
        >
          {contenido.historias.map((h) => (
            <article
              key={h.id}
              data-historia-id={h.id}
              className="bg-surface-container-low p-space-md rounded-xl space-y-space-sm"
            >
              <h3 className="font-bold text-title-lg">Historia {h.orden}</h3>
              <p>{h.necesidad}</p>
              {h.casillas.map((c) => (
                <Casilla
                  key={c.id}
                  id={c.id}
                  historiaOrden={h.orden}
                  tipo={c.tipo}
                  disabled={deshabilitado}
                  pieza={contenido.piezas.find(
                    (p) =>
                      p.id ===
                      colocaciones.find((x) => x.casillaId === c.id)?.piezaId,
                  )}
                  colocar={() => colocar(c.id)}
                  seleccionar={() =>
                    setSeleccion(
                      colocaciones.find((x) => x.casillaId === c.id)?.piezaId ??
                        null,
                    )
                  }
                  retirar={() => {
                    actualizar(
                      colocaciones.filter((p) => p.casillaId !== c.id),
                    );
                    setSeleccion(null);
                  }}
                />
              ))}
            </article>
          ))}
        </section>
        <section
          aria-label="Banco de piezas"
          className="w-full xl:w-80 shrink-0 bg-surface-container-low p-space-md rounded-xl space-y-space-sm"
        >
          <h3 className="font-bold text-title-lg">Banco de piezas</h3>
          {contenido.piezas
            .filter(
              (p) =>
                !colocaciones.some((c) => c.piezaId === p.id) &&
                !retiradas.includes(p.id),
            )
            .map((p) => (
              <PiezaBoton
                key={p.id}
                pieza={p}
                seleccionada={seleccion === p.id}
                disabled={deshabilitado}
                elegir={() => {
                  setSeleccion(p.id);
                  setAviso(
                    `Pieza seleccionada: ${p.texto}. Elige una casilla.`,
                  );
                }}
              />
            ))}
        </section>
      </div>
    </DndContext>
  );
}
