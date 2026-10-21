import React, { useEffect, useMemo, useState } from 'react';
import type {
  AtributoCalidad,
  BorradorInspeccion,
  ContenidoInspeccion,
  ElementoContenido,
} from '../../../types';
import { NOMBRE_ATRIBUTO } from '../atributos';
import type { PropsMecanica } from '../tipos';
import { PantallaFalsa } from './PantallaFalsa';

/**
 * CU-04 Detectar fallas de calidad inspeccionando un sistema (RF-07, RN-19).
 * Clic en un elemento = marca numerada + atributo ISO/IEC 25010 afectado.
 * Las marcas se pueden cambiar o retirar (FA4). Al llegar a maxMarcas no se
 * permiten más (FE1; el servidor también lo valida).
 */
interface Marca {
  elementoId: number;
  atributo: AtributoCalidad | null;
}

export const RetoInspeccion: React.FC<PropsMecanica<ContenidoInspeccion, BorradorInspeccion>> = ({
  contenido,
  borrador,
  pista,
  deshabilitado,
  onCambio,
  onEstado,
}) => {
  const { pantallas, maxMarcas, nombreAplicacion, atributos } = contenido;
  const [marcas, setMarcas] = useState<Marca[]>(() => borrador.marcas.map((m) => ({ ...m })));
  const [pantallaId, setPantallaId] = useState<number>(pantallas[0]?.id ?? 0);
  const [seleccionado, setSeleccionado] = useState<number | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const elementos = useMemo(
    () => new Map(pantallas.flatMap((p) => p.elementos.map((e) => [e.id, { elemento: e, pantalla: p }] as const))),
    [pantallas],
  );
  const numeroPorElemento = useMemo(() => new Map(marcas.map((m, i) => [m.elementoId, i + 1])), [marcas]);
  const pantalla = pantallas.find((p) => p.id === pantallaId) ?? pantallas[0];

  const guardar = (nuevas: Marca[]) => {
    setMarcas(nuevas);
    onCambio({ marcas: nuevas });
  };

  const alClicar = (el: ElementoContenido) => {
    setAviso(null);
    if (marcas.some((m) => m.elementoId === el.id)) {
      setSeleccionado(el.id); // ya tiene marca: se edita desde el panel
      return;
    }
    if (marcas.length >= maxMarcas) {
      // FE1: máximo de marcas alcanzado
      setAviso(`Llegaste al máximo de ${maxMarcas} marcas. Retira alguna para marcar otro elemento.`);
      return;
    }
    guardar([...marcas, { elementoId: el.id, atributo: null }]);
    setSeleccionado(el.id);
  };

  const cambiarAtributo = (elementoId: number, atributo: AtributoCalidad | null) =>
    guardar(marcas.map((m) => (m.elementoId === elementoId ? { ...m, atributo } : m)));

  const quitar = (elementoId: number) => {
    setAviso(null);
    if (seleccionado === elementoId) setSeleccionado(null);
    guardar(marcas.filter((m) => m.elementoId !== elementoId));
  };

  // FE2: marcas sin atributo impiden enviar.
  const estado = useMemo(
    () => ({
      faltantes: marcas
        .map((m, i) => ({ m, i }))
        .filter(({ m }) => m.atributo === null)
        .map(({ m, i }) => `La marca ${i + 1} sobre «${elementos.get(m.elementoId)?.elemento.etiqueta}» no tiene atributo de calidad`),
    }),
    [marcas, elementos],
  );
  useEffect(() => onEstado(estado), [estado, onEstado]);

  const pantallaPista = pista?.tipo === 'PANTALLA' ? pista.pantallaId : null;
  const tituloPista = pantallas.find((p) => p.id === pantallaPista)?.titulo;
  const llena = marcas.length >= maxMarcas;

  return (
    <div className="flex flex-col gap-space-lg">
      {tituloPista && (
        <div className="bg-tertiary-container/20 border border-tertiary/40 rounded-xl p-space-md flex items-start gap-space-sm" role="note">
          <span className="material-symbols-outlined text-tertiary">lightbulb</span>
          <p className="font-body-md text-body-md text-on-surface">
            <strong>Pista:</strong> en la pantalla «{tituloPista}» todavía hay una falla sin marcar.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-space-lg">
        {/* Aplicación ficticia */}
        <div className="xl:col-span-7 flex flex-col gap-space-sm">
          <div className="flex flex-wrap gap-space-xs" role="tablist" aria-label="Pantallas de la aplicación">
            {pantallas.map((p) => {
              const cantidad = marcas.filter((m) => p.elementos.some((e) => e.id === m.elementoId)).length;
              return (
                <button
                  key={p.id}
                  type="button"
                  role="tab"
                  aria-selected={p.id === pantalla.id}
                  onClick={() => setPantallaId(p.id)}
                  className={`px-space-md py-space-xs rounded-lg font-label-md text-label-md font-semibold flex items-center gap-space-xs transition-all ${
                    p.id === pantalla.id
                      ? 'bg-primary-container text-on-primary-container'
                      : 'bg-surface-container-high text-on-surface hover:bg-surface-bright'
                  } ${pantallaPista === p.id ? 'ring-2 ring-tertiary animate-pulse' : ''}`}
                >
                  {p.orden}. {p.titulo}
                  {cantidad > 0 && (
                    <span className="px-1.5 rounded-full bg-rose-600 text-white font-label-sm text-[10px]">{cantidad}</span>
                  )}
                </button>
              );
            })}
          </div>
          {pantalla && (
            <PantallaFalsa
              nombreAplicacion={nombreAplicacion}
              pantalla={pantalla}
              marcas={numeroPorElemento}
              seleccionado={seleccionado}
              deshabilitado={deshabilitado}
              onClickElemento={alClicar}
            />
          )}
          <p className="font-body-sm text-body-sm text-on-surface-variant text-center">
            Haz clic (o Enter) en un elemento para marcarlo como defectuoso.
          </p>
        </div>

        {/* Panel de marcas */}
        <div className="xl:col-span-5 bg-surface-container-low rounded-xl p-space-lg shadow-xl border border-surface-container-high/40 h-fit">
          <div className="flex items-center justify-between mb-space-sm">
            <h2 className="font-title-lg text-title-lg text-on-surface font-bold flex items-center gap-space-xs">
              <span className="material-symbols-outlined text-error">bug_report</span>
              Marcas
            </h2>
            <span
              className={`px-space-sm py-0.5 rounded-full font-label-sm text-label-sm font-bold ${
                llena ? 'bg-error-container/40 text-error' : 'bg-surface-container-high text-on-surface'
              }`}
              id="contador-marcas"
            >
              {marcas.length} / {maxMarcas}
            </span>
          </div>
          <p aria-live="polite" className={`font-body-sm text-body-sm mb-space-sm ${aviso ? 'text-error' : 'hidden'}`}>
            {aviso}
          </p>
          {marcas.length === 0 && (
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Aún no marcas nada. Recorre las pantallas y busca fallas de seguridad, usabilidad, desempeño, fiabilidad...
            </p>
          )}
          <ol className="flex flex-col gap-space-sm">
            {marcas.map((m, i) => {
              const info = elementos.get(m.elementoId);
              return (
                <li
                  key={m.elementoId}
                  data-marca-elemento={m.elementoId}
                  className={`rounded-lg p-space-sm border flex flex-col gap-1 ${
                    seleccionado === m.elementoId
                      ? 'bg-surface-container-high border-error/60'
                      : 'bg-surface-container-high/60 border-transparent'
                  }`}
                >
                  <div className="flex items-start gap-space-xs">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rose-600 text-xs font-bold text-white">
                      {i + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (info) setPantallaId(info.pantalla.id);
                        setSeleccionado(m.elementoId);
                      }}
                      className="flex-1 text-left font-body-sm text-body-sm text-on-surface"
                    >
                      <strong>{info?.elemento.etiqueta}</strong>
                      <span className="block text-on-surface-variant text-[11px]">{info?.pantalla.titulo}</span>
                    </button>
                    <button
                      type="button"
                      disabled={deshabilitado}
                      onClick={() => quitar(m.elementoId)}
                      aria-label={`Retirar la marca ${i + 1}`}
                      className="w-7 h-7 rounded bg-surface-container-lowest hover:bg-error-container/40 text-on-surface-variant hover:text-error"
                    >
                      <span className="material-symbols-outlined text-title-md">delete</span>
                    </button>
                  </div>
                  <select
                    aria-label={`Atributo de calidad afectado por la marca ${i + 1}`}
                    disabled={deshabilitado}
                    value={m.atributo ?? ''}
                    onChange={(e) => cambiarAtributo(m.elementoId, (e.target.value || null) as AtributoCalidad | null)}
                    className={`bg-surface-container-lowest border rounded-md px-space-sm py-1.5 text-on-surface font-body-sm text-body-sm focus:outline-none focus:border-primary ${
                      m.atributo === null ? 'border-error/60' : 'border-outline-variant/40'
                    }`}
                  >
                    <option value="">¿Qué atributo ISO/IEC 25010 afecta?</option>
                    {atributos.map((a) => (
                      <option key={a} value={a}>
                        {NOMBRE_ATRIBUTO[a]}
                      </option>
                    ))}
                  </select>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </div>
  );
};
