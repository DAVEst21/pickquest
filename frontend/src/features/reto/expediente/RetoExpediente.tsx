import React, { useEffect, useMemo, useState } from 'react';
import type { BorradorExpediente, ContenidoExpediente, ModeloCicloVida, PistaDocumento } from '../../../types';
import type { PropsMecanica } from '../tipos';
import { NOMBRE_MODELO } from './modelos';

/**
 * CU-07 Elegir el ciclo de vida investigando el expediente de un proyecto (RF-10, RN-22).
 * El expediente es un conjunto de documentos que se abren como carpetas; cada
 * fragmento se puede seleccionar como evidencia (clic o Enter). Cada evidencia
 * lleva la característica del proyecto que revela; el modelo se elige al final y
 * se respalda con al menos dos evidencias. La referencia nunca está en el cliente.
 */
const ICONO_DOCUMENTO: Record<string, string> = {
  MINUTA: 'groups',
  CORREO: 'mail',
  FICHA_TECNICA: 'description',
  PRESUPUESTO: 'payments',
};

export const RetoExpediente: React.FC<PropsMecanica<ContenidoExpediente, BorradorExpediente, PistaDocumento>> = ({
  contenido,
  borrador,
  pista,
  deshabilitado,
  onCambio,
  onEstado,
}) => {
  const { documentos, caracteristicas, modelos, minimoVinculos } = contenido;
  const [evidencias, setEvidencias] = useState(borrador.evidencias);
  const [modelo, setModelo] = useState<ModeloCicloVida | null>(borrador.modelo);
  const [vinculos, setVinculos] = useState<number[]>(borrador.vinculos);
  const [abierto, setAbierto] = useState<number>(documentos[0]?.id ?? 0);
  const [aviso, setAviso] = useState<string | null>(null);

  const fragmentos = useMemo(
    () => new Map(documentos.flatMap((d) => d.fragmentos.map((f) => [f.id, { ...f, documento: d.titulo }] as const))),
    [documentos],
  );
  const documentoPista = pista?.tipo === 'DOCUMENTO' ? pista.documentoId : null;
  const tituloPista = documentos.find((d) => d.id === documentoPista)?.titulo;
  const abiertoDoc = documentos.find((d) => d.id === abierto) ?? documentos[0];

  const guardar = (
    ev = evidencias,
    m: ModeloCicloVida | null = modelo,
    v = vinculos,
  ) => onCambio({ evidencias: ev, modelo: m, vinculos: v });

  // FE1: sin modelo, con menos de 2 vínculos o con evidencias sin característica.
  const faltantes = useMemo(() => {
    const lista: string[] = [];
    if (modelo === null) lista.push('Falta elegir el modelo de ciclo de vida');
    if (vinculos.length < minimoVinculos) lista.push(`Debes vincular al menos ${minimoVinculos} evidencias al modelo elegido`);
    for (const ev of evidencias) {
      if (ev.caracteristicaId === null) {
        lista.push(`Falta indicar qué característica del proyecto revela la evidencia «${fragmentos.get(ev.fragmentoId)?.texto.slice(0, 40)}…»`);
      }
    }
    return lista;
  }, [modelo, vinculos, evidencias, fragmentos, minimoVinculos]);
  useEffect(() => onEstado({ faltantes }), [faltantes, onEstado]);

  const seleccionar = (fragmentoId: number) => {
    if (deshabilitado) return;
    // FE2: seleccionar un fragmento que ya está en el tablero no lo duplica.
    if (evidencias.some((e) => e.fragmentoId === fragmentoId)) {
      setAviso('Esa evidencia ya fue agregada al tablero: no se duplica.');
      return;
    }
    setAviso(null);
    const nuevas = [...evidencias, { fragmentoId, caracteristicaId: null }];
    setEvidencias(nuevas);
    guardar(nuevas);
  };
  const cambiarCaracteristica = (fragmentoId: number, caracteristicaId: number | null) => {
    const nuevas = evidencias.map((e) => (e.fragmentoId === fragmentoId ? { ...e, caracteristicaId } : e));
    setEvidencias(nuevas);
    guardar(nuevas);
  };
  const quitar = (fragmentoId: number) => {
    const nuevas = evidencias.filter((e) => e.fragmentoId !== fragmentoId);
    const nuevosVinculos = vinculos.filter((v) => v !== fragmentoId);
    setEvidencias(nuevas);
    setVinculos(nuevosVinculos);
    setAviso(null);
    guardar(nuevas, modelo, nuevosVinculos);
  };
  const alternarVinculo = (fragmentoId: number) => {
    const nuevos = vinculos.includes(fragmentoId) ? vinculos.filter((v) => v !== fragmentoId) : [...vinculos, fragmentoId];
    setVinculos(nuevos);
    guardar(evidencias, modelo, nuevos);
  };

  return (
    <div className="flex flex-col gap-space-lg">
      {tituloPista && (
        <div className="bg-tertiary-container/20 border border-tertiary/40 rounded-xl p-space-md flex items-start gap-space-sm" role="note" data-pista="documento">
          <span className="material-symbols-outlined text-tertiary">lightbulb</span>
          <p className="font-body-md text-body-md text-on-surface">
            <strong>Pista:</strong> el documento «{tituloPista}» tiene una evidencia relevante que todavía no seleccionas.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-space-lg">
        {/* Expediente */}
        <section aria-label="Expediente del proyecto" className="xl:col-span-7 flex flex-col gap-space-sm">
          <h2 className="font-title-lg text-title-lg text-on-surface font-bold flex items-center gap-space-xs">
            <span className="material-symbols-outlined text-secondary">folder_open</span>
            Expediente: {contenido.nombreProyecto}
          </h2>
          <div role="tablist" aria-label="Documentos del expediente" className="flex flex-wrap gap-space-xs">
            {documentos.map((d) => (
              <button
                key={d.id}
                type="button"
                role="tab"
                aria-selected={d.id === abiertoDoc.id}
                data-documento-id={d.id}
                onClick={() => setAbierto(d.id)}
                className={`px-space-md py-space-xs rounded-lg font-label-md text-label-md font-semibold flex items-center gap-space-xs transition-all ${
                  d.id === abiertoDoc.id
                    ? 'bg-primary-container text-on-primary-container'
                    : 'bg-surface-container-high text-on-surface hover:bg-surface-bright'
                } ${documentoPista === d.id ? 'ring-2 ring-tertiary animate-pulse' : ''}`}
              >
                <span className="material-symbols-outlined text-title-md">{ICONO_DOCUMENTO[d.tipo] ?? 'description'}</span>
                {d.titulo}
              </button>
            ))}
          </div>
          <article className="bg-surface-container-low rounded-xl p-space-lg shadow-xl border border-surface-container-high/40" data-documento-abierto={abiertoDoc.id}>
            <h3 className="font-title-md text-title-md text-on-surface font-bold mb-space-sm">{abiertoDoc.titulo}</h3>
            <p className="font-body-sm text-body-sm text-on-surface-variant mb-space-sm">
              Haz clic en un fragmento para agregarlo como evidencia. No todos los fragmentos sirven.
            </p>
            <ul className="flex flex-col gap-space-xs">
              {abiertoDoc.fragmentos.map((f) => {
                const agregado = evidencias.some((e) => e.fragmentoId === f.id);
                return (
                  <li key={f.id}>
                    <button
                      type="button"
                      data-fragmento-id={f.id}
                      aria-pressed={agregado}
                      disabled={deshabilitado}
                      onClick={() => seleccionar(f.id)}
                      className={`w-full text-left p-space-sm rounded-lg border font-body-md text-body-md transition-all ${
                        agregado
                          ? 'bg-tertiary-container/20 border-tertiary/60 text-on-surface'
                          : 'bg-surface-container-high border-transparent hover:bg-surface-bright text-on-surface'
                      }`}
                    >
                      {f.texto}
                      {agregado && <span className="ml-space-xs font-label-sm text-label-sm text-tertiary font-bold">· en el tablero</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          </article>
          <p role="status" aria-live="polite" className={`font-body-sm text-body-sm ${aviso ? 'text-error' : 'hidden'}`} data-aviso-evidencia>
            {aviso}
          </p>
        </section>

        {/* Tablero de evidencias y modelo */}
        <section aria-label="Tablero de evidencias" className="xl:col-span-5 flex flex-col gap-space-md">
          <div className="bg-surface-container-low rounded-xl p-space-lg shadow-xl border border-surface-container-high/40">
            <div className="flex items-center justify-between mb-space-sm">
              <h2 className="font-title-lg text-title-lg text-on-surface font-bold flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-tertiary">fact_check</span>
                Tablero de evidencias
              </h2>
              <span className="px-space-sm py-0.5 rounded-full bg-surface-container-high text-on-surface font-label-sm text-label-sm font-bold" id="contador-evidencias">
                {evidencias.length} {evidencias.length === 1 ? 'evidencia' : 'evidencias'}
              </span>
            </div>
            {evidencias.length === 0 && (
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Aún no tienes evidencias. Abre un documento y selecciona los fragmentos que revelan una característica del proyecto.
              </p>
            )}
            <ol className="flex flex-col gap-space-sm">
              {evidencias.map((ev, i) => {
                const f = fragmentos.get(ev.fragmentoId);
                return (
                  <li
                    key={ev.fragmentoId}
                    data-evidencia-id={ev.fragmentoId}
                    className={`rounded-lg p-space-sm border flex flex-col gap-1 ${
                      ev.caracteristicaId === null ? 'bg-surface-container-high border-error/50' : 'bg-surface-container-high border-transparent'
                    }`}
                  >
                    <div className="flex items-start gap-space-xs">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary text-on-secondary text-xs font-bold">{i + 1}</span>
                      <p className="flex-1 font-body-sm text-body-sm text-on-surface">
                        {f?.texto}
                        <span className="block text-on-surface-variant text-[11px]">{f?.documento}</span>
                      </p>
                      <button
                        type="button"
                        disabled={deshabilitado}
                        onClick={() => quitar(ev.fragmentoId)}
                        aria-label={`Quitar la evidencia ${i + 1}`}
                        className="w-7 h-7 rounded bg-surface-container-lowest hover:bg-error-container/40 text-on-surface-variant hover:text-error"
                      >
                        <span className="material-symbols-outlined text-title-md">delete</span>
                      </button>
                    </div>
                    <select
                      aria-label={`Característica que revela la evidencia ${i + 1}`}
                      disabled={deshabilitado}
                      value={ev.caracteristicaId ?? ''}
                      onChange={(e) => cambiarCaracteristica(ev.fragmentoId, e.target.value === '' ? null : Number(e.target.value))}
                      className="bg-surface-container-lowest border border-outline-variant/40 rounded-md px-space-sm py-1.5 text-on-surface font-body-sm text-body-sm"
                    >
                      <option value="">¿Qué característica del proyecto revela?</option>
                      {caracteristicas.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nombre}
                        </option>
                      ))}
                    </select>
                    <label className="flex items-center gap-space-xs font-label-md text-label-md text-on-surface-variant">
                      <input
                        type="checkbox"
                        checked={vinculos.includes(ev.fragmentoId)}
                        disabled={deshabilitado}
                        onChange={() => alternarVinculo(ev.fragmentoId)}
                        className="accent-primary-container"
                      />
                      Vincular como respaldo del modelo
                    </label>
                  </li>
                );
              })}
            </ol>
          </div>

          <div className="bg-surface-container-low rounded-xl p-space-lg shadow-xl border border-surface-container-high/40">
            <h2 className="font-title-lg text-title-lg text-on-surface font-bold flex items-center gap-space-xs mb-space-sm">
              <span className="material-symbols-outlined text-primary">account_tree</span>
              Modelo de ciclo de vida
            </h2>
            <div className="flex flex-col gap-space-xs" role="radiogroup" aria-label="Modelo de ciclo de vida">
              {modelos.map((m) => (
                <label
                  key={m}
                  className={`flex items-center gap-space-sm p-space-sm rounded-lg cursor-pointer border transition-all ${
                    modelo === m ? 'bg-primary-container/15 border-primary-container' : 'bg-surface-container-high border-transparent hover:bg-surface-bright'
                  }`}
                >
                  <input
                    type="radio"
                    name="modelo"
                    value={m}
                    checked={modelo === m}
                    disabled={deshabilitado}
                    onChange={() => {
                      setModelo(m);
                      guardar(evidencias, m, vinculos);
                    }}
                    className="accent-primary-container"
                  />
                  <span className="font-body-md text-body-md text-on-surface">{NOMBRE_MODELO[m]}</span>
                </label>
              ))}
            </div>
            <p
              className={`mt-space-sm font-body-sm text-body-sm ${vinculos.length >= minimoVinculos ? 'text-tertiary' : 'text-on-surface-variant'}`}
              id="contador-vinculos"
            >
              {vinculos.length} de {minimoVinculos} evidencias vinculadas como mínimo
            </p>
          </div>
        </section>
      </div>
    </div>
  );
};
