import {
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent, DragOverEvent, DragStartEvent, UniqueIdentifier } from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import React, { useEffect, useMemo, useState } from 'react';
import type {
  BorradorMoscow,
  ColumnaMoscow,
  ContenidoMoscow,
  TarjetaContenido,
  TipoRequerimiento,
} from '../../../types';
import type { PropsMecanica } from '../tipos';

/**
 * CU-03 Tablero MoSCoW (RF-06, RN-18).
 * Cada tarjeta se mueve entre "Sin clasificar" y las cuatro columnas arrastrándola
 * o con el selector «Mover a…» (RNF-US-04); el orden dentro de MUST se cambia
 * arrastrando o con las flechas ↑ ↓. Las respuestas correctas no están en el cliente.
 */
type Contenedor = 'SIN' | ColumnaMoscow;
const COLUMNAS: ColumnaMoscow[] = ['MUST', 'SHOULD', 'COULD', 'WONT'];
const CONTENEDORES: Contenedor[] = ['SIN', ...COLUMNAS];

const INFO: Record<ColumnaMoscow, { titulo: string; sub: string; borde: string; chip: string }> = {
  MUST: { titulo: 'MUST', sub: 'Imprescindible', borde: 'border-error/50', chip: 'bg-error-container/40 text-error' },
  SHOULD: { titulo: 'SHOULD', sub: 'Importante', borde: 'border-primary-container/60', chip: 'bg-primary-container/30 text-primary' },
  COULD: { titulo: 'COULD', sub: 'Deseable', borde: 'border-tertiary/50', chip: 'bg-tertiary-container/30 text-tertiary' },
  WONT: { titulo: "WON'T", sub: 'No en esta versión', borde: 'border-outline-variant/60', chip: 'bg-surface-container-highest text-on-surface-variant' },
};

type Columnas = Record<Contenedor, number[]>;

function columnasIniciales(contenido: ContenidoMoscow, borrador: BorradorMoscow): Columnas {
  const columnas: Columnas = { SIN: [], MUST: [], SHOULD: [], COULD: [], WONT: [] };
  const respuesta = new Map(borrador.tarjetas.map((t) => [t.tarjetaId, t]));
  for (const t of [...contenido.tarjetas].sort((a, b) => a.orden - b.orden)) {
    columnas[respuesta.get(t.id)?.columna ?? 'SIN'].push(t.id);
  }
  const orden = (id: number) => respuesta.get(id)?.ordenMust ?? Number.MAX_SAFE_INTEGER;
  columnas.MUST.sort((a, b) => orden(a) - orden(b));
  return columnas;
}

interface TarjetaProps {
  tarjeta: TarjetaContenido;
  contenedor: Contenedor;
  posicion: number;
  totalEnColumna: number;
  tipo: TipoRequerimiento | undefined;
  resaltada: boolean;
  deshabilitado: boolean;
  onTipo: (tipo: TipoRequerimiento) => void;
  onMover: (destino: Contenedor) => void;
  onSubir: () => void;
  onBajar: () => void;
}

const Tarjeta: React.FC<TarjetaProps> = ({
  tarjeta,
  contenedor,
  posicion,
  totalEnColumna,
  tipo,
  resaltada,
  deshabilitado,
  onTipo,
  onMover,
  onSubir,
  onBajar,
}) => {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: tarjeta.id,
    disabled: deshabilitado,
  });
  return (
    <div
      ref={setNodeRef}
      data-tarjeta-id={tarjeta.id}
      data-columna={contenedor}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`bg-surface-container-high rounded-lg p-space-sm shadow-md border flex flex-col gap-space-xs ${
        isDragging ? 'opacity-40' : ''
      } ${resaltada ? 'border-tertiary ring-2 ring-tertiary' : 'border-surface-container-highest/50'}`}
    >
      <div className="flex items-start gap-space-xs">
        <button
          type="button"
          ref={setActivatorNodeRef}
          {...listeners}
          {...attributes}
          disabled={deshabilitado}
          aria-label={`Arrastrar: ${tarjeta.texto}`}
          className="touch-none cursor-grab active:cursor-grabbing text-on-surface-variant hover:text-on-surface shrink-0"
        >
          <span className="material-symbols-outlined text-title-md">drag_indicator</span>
        </button>
        <p className="font-body-sm text-body-sm text-on-surface flex-1 leading-snug">
          {contenedor === 'MUST' && (
            <span className="inline-block mr-1 px-1.5 rounded bg-error-container/40 text-error font-label-sm text-[10px] font-bold">
              #{posicion + 1}
            </span>
          )}
          {tarjeta.texto}
        </p>
        <span className="shrink-0 px-1.5 py-0.5 rounded bg-surface-container-lowest text-primary font-label-sm text-[10px] font-bold">
          {tarjeta.puntos} pts
        </span>
      </div>
      <div className="flex items-center gap-space-xs flex-wrap">
        <div className="flex rounded-md overflow-hidden border border-outline-variant/40" role="group" aria-label="Tipo de requerimiento">
          {(['FUNCIONAL', 'NO_FUNCIONAL'] as TipoRequerimiento[]).map((t) => (
            <button
              key={t}
              type="button"
              disabled={deshabilitado}
              aria-pressed={tipo === t}
              onClick={() => onTipo(t)}
              className={`px-space-sm py-0.5 font-label-sm text-[10px] font-bold ${
                tipo === t ? 'bg-secondary text-on-secondary' : 'bg-surface-container-lowest text-on-surface-variant hover:bg-surface-bright'
              }`}
            >
              {t === 'FUNCIONAL' ? 'RF' : 'RNF'}
            </button>
          ))}
        </div>
        <select
          aria-label={`Mover «${tarjeta.texto}» a`}
          disabled={deshabilitado}
          value={contenedor}
          onChange={(e) => onMover(e.target.value as Contenedor)}
          className="bg-surface-container-lowest border border-outline-variant/40 rounded-md px-1 py-0.5 text-on-surface font-label-sm text-[10px]"
        >
          <option value="SIN">Sin clasificar</option>
          {COLUMNAS.map((c) => (
            <option key={c} value={c}>
              {INFO[c].titulo}
            </option>
          ))}
        </select>
        {contenedor === 'MUST' && (
          <div className="flex gap-1 ml-auto">
            <button
              type="button"
              disabled={deshabilitado || posicion === 0}
              onClick={onSubir}
              aria-label="Subir en prioridad"
              className="w-6 h-6 rounded bg-surface-container-lowest hover:bg-surface-bright disabled:opacity-30 text-on-surface"
            >
              ↑
            </button>
            <button
              type="button"
              disabled={deshabilitado || posicion === totalEnColumna - 1}
              onClick={onBajar}
              aria-label="Bajar en prioridad"
              className="w-6 h-6 rounded bg-surface-container-lowest hover:bg-surface-bright disabled:opacity-30 text-on-surface"
            >
              ↓
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const Zona: React.FC<{ id: Contenedor; className: string; children: React.ReactNode }> = ({ id, className, children }) => {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div ref={setNodeRef} data-zona={id} className={`${className} ${isOver ? 'ring-2 ring-tertiary/60' : ''}`}>
      {children}
    </div>
  );
};

export const RetoTableroMoscow: React.FC<PropsMecanica<ContenidoMoscow, BorradorMoscow>> = ({
  contenido,
  borrador,
  pista,
  deshabilitado,
  onCambio,
  onEstado,
}) => {
  const [columnas, setColumnas] = useState<Columnas>(() => columnasIniciales(contenido, borrador));
  const [tipos, setTipos] = useState<Record<number, TipoRequerimiento>>(() =>
    Object.fromEntries(borrador.tarjetas.filter((t) => t.tipo).map((t) => [t.tarjetaId, t.tipo!])),
  );
  const [activa, setActiva] = useState<number | null>(null);

  const porId = useMemo(() => new Map(contenido.tarjetas.map((t) => [t.id, t])), [contenido.tarjetas]);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const emitir = (cols: Columnas, tps: Record<number, TipoRequerimiento>) =>
    onCambio({
      tarjetas: contenido.tarjetas.map((t) => {
        const contenedor = CONTENEDORES.find((c) => cols[c].includes(t.id))!;
        return {
          tarjetaId: t.id,
          columna: contenedor === 'SIN' ? null : contenedor,
          tipo: tps[t.id] ?? null,
          ordenMust: contenedor === 'MUST' ? cols.MUST.indexOf(t.id) + 1 : null,
        };
      }),
    });

  const aplicar = (cols: Columnas, tps = tipos) => {
    setColumnas(cols);
    setTipos(tps);
    emitir(cols, tps);
  };

  const dondeEsta = (id: UniqueIdentifier): Contenedor | undefined =>
    CONTENEDORES.includes(id as Contenedor)
      ? (id as Contenedor)
      : CONTENEDORES.find((c) => columnas[c].includes(Number(id)));

  const alIniciarArrastre = ({ active }: DragStartEvent) => setActiva(Number(active.id));

  const alPasarSobre = ({ active, over }: DragOverEvent) => {
    if (!over) return;
    const desde = dondeEsta(active.id);
    const hacia = dondeEsta(over.id);
    if (!desde || !hacia || desde === hacia) return;
    const id = Number(active.id);
    setColumnas((prev) => {
      const destino = prev[hacia];
      const indiceSobre = destino.indexOf(Number(over.id));
      const indice = indiceSobre >= 0 ? indiceSobre : destino.length;
      return {
        ...prev,
        [desde]: prev[desde].filter((x) => x !== id),
        [hacia]: [...destino.slice(0, indice), id, ...destino.slice(indice)],
      };
    });
  };

  const alSoltar = ({ active, over }: DragEndEvent) => {
    setActiva(null);
    const id = Number(active.id);
    let cols = columnas;
    const desde = dondeEsta(active.id);
    const hacia = over ? dondeEsta(over.id) : undefined;
    if (over && desde && hacia && desde === hacia) {
      const viejo = columnas[desde].indexOf(id);
      const nuevo = columnas[desde].includes(Number(over.id)) ? columnas[desde].indexOf(Number(over.id)) : viejo;
      if (viejo !== nuevo) cols = { ...columnas, [desde]: arrayMove(columnas[desde], viejo, nuevo) };
    }
    aplicar(cols);
  };

  const mover = (id: number, destino: Contenedor) => {
    const origen = dondeEsta(id);
    if (!origen || origen === destino) return;
    aplicar({
      ...columnas,
      [origen]: columnas[origen].filter((x) => x !== id),
      [destino]: [...columnas[destino], id],
    });
  };

  const reordenar = (id: number, delta: -1 | 1) => {
    const viejo = columnas.MUST.indexOf(id);
    const nuevo = viejo + delta;
    if (nuevo < 0 || nuevo >= columnas.MUST.length) return;
    aplicar({ ...columnas, MUST: arrayMove(columnas.MUST, viejo, nuevo) });
  };

  const poner = (id: number, tipo: TipoRequerimiento) => aplicar(columnas, { ...tipos, [id]: tipo });

  const puntosMust = columnas.MUST.reduce((s, id) => s + (porId.get(id)?.puntos ?? 0), 0);
  const excede = puntosMust > contenido.capacidad;

  // CU-03 FE1 (tarjetas sin columna o sin tipo) y FE2 (MUST por encima de la capacidad).
  const estado = useMemo(() => {
    const sinColumna = columnas.SIN.length;
    const sinTipo = contenido.tarjetas.filter((t) => tipos[t.id] === undefined).length;
    const faltantes: string[] = [];
    if (sinColumna > 0) faltantes.push(`Faltan ${sinColumna} tarjeta(s) por colocar en una columna`);
    if (sinTipo > 0) faltantes.push(`Faltan ${sinTipo} tarjeta(s) por indicar si son RF o RNF`);
    if (excede) {
      faltantes.push(`Los puntos de MUST (${puntosMust}) superan la capacidad (${contenido.capacidad}): saca alguna tarjeta de MUST`);
    }
    return { faltantes };
  }, [columnas.SIN.length, contenido.tarjetas, contenido.capacidad, tipos, excede, puntosMust]);

  useEffect(() => onEstado(estado), [estado, onEstado]);

  const renderTarjeta = (id: number, contenedor: Contenedor, indice: number, total: number) => {
    const t = porId.get(id);
    if (!t) return null;
    return (
      <Tarjeta
        key={id}
        tarjeta={t}
        contenedor={contenedor}
        posicion={indice}
        totalEnColumna={total}
        tipo={tipos[id]}
        resaltada={pista?.tipo === 'COLUMNA_TARJETA' && pista.tarjetaId === id}
        deshabilitado={deshabilitado}
        onTipo={(tipo) => poner(id, tipo)}
        onMover={(destino) => mover(id, destino)}
        onSubir={() => reordenar(id, -1)}
        onBajar={() => reordenar(id, 1)}
      />
    );
  };

  const tarjetaPista = pista?.tipo === 'COLUMNA_TARJETA' && pista.tarjetaId !== null ? porId.get(pista.tarjetaId) : undefined;
  const tarjetaActiva = activa !== null ? porId.get(activa) : undefined;

  return (
    <div className="flex flex-col gap-space-lg">
      {/* Capacidad de MUST */}
      <div
        className={`rounded-xl p-space-md border ${
          excede ? 'bg-error-container/20 border-error/40' : 'bg-surface-container-low border-surface-container-high/40'
        }`}
      >
        <div className="flex items-center justify-between font-label-md text-label-md mb-1">
          <span className="text-on-surface-variant uppercase">Capacidad usada en MUST</span>
          <span className={excede ? 'text-error font-bold' : 'text-on-surface font-bold'} id="capacidad-usada">
            {puntosMust} / {contenido.capacidad} puntos
          </span>
        </div>
        <div className="w-full bg-surface-container-lowest h-3 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${excede ? 'bg-error' : 'bg-gradient-to-r from-primary-container to-primary'}`}
            style={{ width: `${Math.min(100, (puntosMust / contenido.capacidad) * 100)}%` }}
          />
        </div>
      </div>

      {tarjetaPista && pista?.tipo === 'COLUMNA_TARJETA' && pista.columna && (
        <div className="bg-tertiary-container/20 border border-tertiary/40 rounded-xl p-space-md flex items-start gap-space-sm" role="note">
          <span className="material-symbols-outlined text-tertiary">lightbulb</span>
          <p className="font-body-md text-body-md text-on-surface">
            <strong>Pista:</strong> «{tarjetaPista.texto}» pertenece a la columna <strong>{INFO[pista.columna].titulo}</strong>.
          </p>
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={alIniciarArrastre}
        onDragOver={alPasarSobre}
        onDragEnd={alSoltar}
        onDragCancel={() => setActiva(null)}
      >
        {/* Sin clasificar */}
        <div className="bg-surface-container-low rounded-xl p-space-md border border-surface-container-high/40">
          <h2 className="font-title-md text-title-md text-on-surface font-bold mb-space-sm flex items-center gap-space-xs">
            <span className="material-symbols-outlined text-on-surface-variant">inbox</span>
            Sin clasificar
            <span className="font-label-sm text-label-sm text-on-surface-variant">({columnas.SIN.length})</span>
          </h2>
          <SortableContext items={columnas.SIN} strategy={verticalListSortingStrategy}>
            <Zona id="SIN" className="grid grid-cols-1 md:grid-cols-2 gap-space-sm min-h-16 rounded-lg">
              {columnas.SIN.map((id, i) => renderTarjeta(id, 'SIN', i, columnas.SIN.length))}
              {columnas.SIN.length === 0 && (
                <p className="font-body-sm text-body-sm text-on-surface-variant col-span-full self-center">
                  Todas las tarjetas están clasificadas.
                </p>
              )}
            </Zona>
          </SortableContext>
        </div>

        {/* Columnas MoSCoW */}
        <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-4 gap-space-md">
          {COLUMNAS.map((c) => {
            const info = INFO[c];
            const puntos = columnas[c].reduce((s, id) => s + (porId.get(id)?.puntos ?? 0), 0);
            return (
              <SortableContext key={c} items={columnas[c]} strategy={verticalListSortingStrategy}>
                <Zona
                  id={c}
                  className={`bg-surface-container-low rounded-xl p-space-sm border-2 ${info.borde} flex flex-col gap-space-sm min-h-48`}
                >
                  <div className="flex items-center justify-between px-space-xs">
                    <div>
                      <span className={`px-space-xs py-0.5 rounded font-label-sm text-label-sm font-bold ${info.chip}`}>
                        {info.titulo}
                      </span>
                      <span className="ml-space-xs font-label-sm text-[10px] text-on-surface-variant">{info.sub}</span>
                    </div>
                    <span className="font-label-sm text-label-sm text-on-surface-variant">
                      {columnas[c].length} · {puntos} pts
                    </span>
                  </div>
                  {columnas[c].map((id, i) => renderTarjeta(id, c, i, columnas[c].length))}
                  {columnas[c].length === 0 && (
                    <p className="font-body-sm text-body-sm text-on-surface-variant/70 text-center py-space-md">
                      Suelta aquí una tarjeta
                    </p>
                  )}
                </Zona>
              </SortableContext>
            );
          })}
        </div>

        <DragOverlay>
          {tarjetaActiva && (
            <div className="bg-surface-container-highest rounded-lg p-space-sm shadow-2xl border border-tertiary font-body-sm text-body-sm text-on-surface max-w-xs">
              {tarjetaActiva.texto}
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
};
