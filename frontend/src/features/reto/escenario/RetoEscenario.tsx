import React, { useEffect, useMemo, useState } from 'react';
import { simularEscenario } from '../../../services/api';
import { mensajeDeError } from '../../../services/errores';
import type {
  BorradorEscenario,
  ContenidoEscenario,
  ParteEscenario,
  PistaRango,
  ResultadoSimulacion,
  SimulacionGuardada,
} from '../../../types';
import type { PropsMecanica } from '../tipos';

/**
 * CU-05 Simulador de escenarios de calidad (RF-08, RN-20).
 * Cinco selectores (fuente, estímulo, artefacto, entorno y respuesta), la medida
 * de respuesta con deslizadores y la simulación de una app ficticia: la gráfica
 * muestra cómo responde la app frente al umbral que define el estudiante.
 * El rango aceptable y el modelo de la app nunca están en el cliente: la
 * simulación se calcula en el servidor.
 */
const TITULO_PARTE: Record<ParteEscenario, string> = {
  FUENTE: 'Fuente',
  ESTIMULO: 'Estímulo',
  ARTEFACTO: 'Artefacto',
  ENTORNO: 'Entorno',
  RESPUESTA: 'Respuesta',
};
const AYUDA_PARTE: Record<ParteEscenario, string> = {
  FUENTE: '¿Quién o qué provoca la situación?',
  ESTIMULO: '¿Qué ocurre?',
  ARTEFACTO: '¿Qué parte del sistema se ve afectada?',
  ENTORNO: '¿En qué condiciones está el sistema?',
  RESPUESTA: '¿Qué debe hacer el sistema?',
};

interface Props extends PropsMecanica<ContenidoEscenario, BorradorEscenario, PistaRango> {
  intentoId: number;
  onError: (mensaje: string) => void;
}

const numero = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0+$/, '').replace(/\.$/, ''));

/** Gráfica SVG: respuesta de la app según la carga, el umbral definido y la carga elegida. */
function Grafica({
  curva,
  umbral,
  carga,
  valorApp,
  unidad,
}: {
  curva: { carga: number; valorApp: number }[];
  umbral: number;
  carga: number;
  valorApp: number;
  unidad: string;
}) {
  const ancho = 520;
  const alto = 220;
  const margen = { izq: 48, der: 16, arr: 14, abajo: 32 };
  const xs = curva.map((p) => p.carga);
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const yMax = Math.max(umbral, valorApp, ...curva.map((p) => p.valorApp)) * 1.15;
  const x = (c: number) => margen.izq + ((c - xMin) / (xMax - xMin)) * (ancho - margen.izq - margen.der);
  const y = (v: number) => alto - margen.abajo - (v / yMax) * (alto - margen.abajo - margen.arr);
  const linea = curva.map((p) => `${x(p.carga)},${y(p.valorApp)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${ancho} ${alto}`} className="w-full" role="img" aria-label="Respuesta de la app frente al umbral" data-grafica>
      <rect x={margen.izq} y={margen.arr} width={ancho - margen.izq - margen.der} height={alto - margen.arr - margen.abajo} fill="rgba(255,255,255,0.03)" />
      {/* umbral definido por el estudiante */}
      <line x1={margen.izq} x2={ancho - margen.der} y1={y(umbral)} y2={y(umbral)} stroke="#f59e0b" strokeDasharray="6 4" strokeWidth={2} />
      <text x={ancho - margen.der} y={y(umbral) - 5} textAnchor="end" fontSize={11} fill="#f59e0b">
        Umbral: {numero(umbral)} {unidad}
      </text>
      {/* respuesta de la app */}
      <polyline points={linea} fill="none" stroke="#54ddfc" strokeWidth={2.5} />
      {/* carga elegida */}
      <line x1={x(carga)} x2={x(carga)} y1={margen.arr} y2={alto - margen.abajo} stroke="rgba(255,255,255,0.35)" strokeDasharray="3 3" />
      <circle cx={x(carga)} cy={y(valorApp)} r={6} fill={valorApp <= umbral ? '#54ddfc' : '#ff6b6b'} stroke="#fff" strokeWidth={1.5} />
      <text x={margen.izq} y={alto - 8} fontSize={11} fill="#9aa4b2">{xMin}</text>
      <text x={ancho - margen.der} y={alto - 8} fontSize={11} fill="#9aa4b2" textAnchor="end">{xMax}</text>
      <text x={margen.izq - 6} y={margen.arr + 8} fontSize={11} fill="#9aa4b2" textAnchor="end">{numero(yMax)}</text>
      <text x={margen.izq - 6} y={alto - margen.abajo} fontSize={11} fill="#9aa4b2" textAnchor="end">0</text>
    </svg>
  );
}

export const RetoEscenario: React.FC<Props> = ({
  contenido,
  borrador,
  pista,
  deshabilitado,
  onCambio,
  onEstado,
  vaciar,
  intentoId,
  onError,
}) => {
  const { deslizadores, partes, unidades, limiteSimulaciones } = contenido;
  const [elecciones, setElecciones] = useState<Partial<Record<ParteEscenario, number>>>(() =>
    Object.fromEntries(borrador.elecciones.map((e) => [e.parte, e.opcionId])),
  );
  const [valor, setValor] = useState<number | null>(borrador.valor);
  const [unidadId, setUnidadId] = useState<number | null>(borrador.unidadId);
  const [carga, setCarga] = useState<number | null>(borrador.carga);
  const [simulaciones, setSimulaciones] = useState<SimulacionGuardada[]>(borrador.simulaciones);
  const [ultima, setUltima] = useState<ResultadoSimulacion | null>(null);
  const [simulando, setSimulando] = useState(false);

  const restantes = limiteSimulaciones - simulaciones.length;
  const unidadNombre = unidades.find((u) => u.id === unidadId)?.nombre ?? '';

  const guardar = (
    el = elecciones,
    v: number | null = valor,
    u: number | null = unidadId,
    c: number | null = carga,
  ) =>
    onCambio({
      elecciones: Object.entries(el).map(([parte, opcionId]) => ({ parte, opcionId })),
      valor: v,
      unidadId: u,
      carga: c,
    });

  // FE1: partes vacías o medida incompleta impiden simular y enviar.
  const faltantes = useMemo(() => {
    const lista = partes
      .filter((p) => elecciones[p.parte] === undefined)
      .map((p) => `Falta elegir la ${p.nombre} del escenario`);
    if (valor === null) lista.push('Falta definir el valor de la medida de respuesta');
    if (unidadId === null) lista.push('Falta elegir la unidad de la medida de respuesta');
    if (carga === null) lista.push('Falta definir la condición de carga de la medida de respuesta');
    return lista;
  }, [partes, elecciones, valor, unidadId, carga]);
  useEffect(() => onEstado({ faltantes }), [faltantes, onEstado]);

  const simular = async () => {
    if (faltantes.length > 0 || restantes <= 0 || simulando) return;
    setSimulando(true);
    try {
      await vaciar?.(); // la simulación usa lo que está guardado en el servidor
      const r = await simularEscenario(intentoId);
      setUltima(r);
      setSimulaciones((previas) => [...previas, { numero: r.numero, valor: r.valor, carga: r.carga, valorApp: r.valorApp, cumple: r.cumple }]);
    } catch (e) {
      onError(mensajeDeError(e));
    } finally {
      setSimulando(false);
    }
  };

  const bloqueado = deshabilitado || simulando;

  return (
    <div className="flex flex-col gap-space-lg">
      <div className="bg-surface-container-low rounded-xl p-space-lg shadow-xl border border-surface-container-high/40">
        <span className="font-label-sm text-label-sm text-on-surface-variant uppercase">Necesidad de calidad</span>
        <p className="font-headline-sm text-headline-sm text-on-surface italic">«{contenido.necesidadVaga}»</p>
        <p className="font-body-md text-body-md text-on-surface-variant mt-space-xs">{contenido.contextoApp}</p>
      </div>

      {pista?.tipo === 'RANGO_ESCENARIO' && (
        <div className="bg-tertiary-container/20 border border-tertiary/40 rounded-xl p-space-md flex items-start gap-space-sm" role="note" data-pista="rango">
          <span className="material-symbols-outlined text-tertiary">lightbulb</span>
          <p className="font-body-md text-body-md text-on-surface">
            <strong>Pista:</strong> la medida de respuesta aceptable está entre <strong>{numero(pista.valorMin)}</strong> y{' '}
            <strong>{numero(pista.valorMax)}</strong> {pista.unidad}, con <strong>{pista.cargaMin}</strong> a <strong>{pista.cargaMax}</strong>{' '}
            {contenido.nombreCarga}.
          </p>
        </div>
      )}

      {/* Las cinco partes cualitativas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
        {partes.map((p) => (
          <fieldset
            key={p.parte}
            data-parte={p.parte}
            className="bg-surface-container-low rounded-xl p-space-md shadow-xl border border-surface-container-high/40"
          >
            <legend className="px-space-xs font-title-md text-title-md text-on-surface font-bold">
              {TITULO_PARTE[p.parte]} <span className="font-body-sm text-body-sm text-on-surface-variant font-normal">· {AYUDA_PARTE[p.parte]}</span>
            </legend>
            <div className="flex flex-col gap-space-xs mt-space-xs">
              {p.opciones.map((o) => (
                <label
                  key={o.id}
                  className={`flex items-start gap-space-sm p-space-sm rounded-lg cursor-pointer border transition-all ${
                    elecciones[p.parte] === o.id
                      ? 'bg-primary-container/15 border-primary-container'
                      : 'bg-surface-container-high border-transparent hover:bg-surface-bright'
                  }`}
                >
                  <input
                    type="radio"
                    name={`parte-${p.parte}`}
                    checked={elecciones[p.parte] === o.id}
                    disabled={bloqueado}
                    onChange={() => {
                      const nuevas = { ...elecciones, [p.parte]: o.id };
                      setElecciones(nuevas);
                      guardar(nuevas);
                    }}
                    className="mt-1 accent-primary-container"
                  />
                  <span className="font-body-md text-body-md text-on-surface">{o.texto}</span>
                </label>
              ))}
            </div>
          </fieldset>
        ))}
      </div>

      {/* Medida de respuesta */}
      <div className="bg-surface-container-low rounded-xl p-space-lg shadow-xl border border-surface-container-high/40 flex flex-col gap-space-md">
        <h2 className="font-title-lg text-title-lg text-on-surface font-bold flex items-center gap-space-xs">
          <span className="material-symbols-outlined text-secondary">straighten</span>
          Medida de respuesta: {contenido.nombreMetrica.toLowerCase()}
        </h2>
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          Escribe la medida como un compromiso que se pueda comprobar: «{contenido.nombreMetrica} de a lo más <em>valor</em> <em>unidad</em> con
          <em> carga</em> {contenido.nombreCarga}».
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md items-end">
          <label className="flex flex-col gap-space-xs">
            <span className="font-label-md text-label-md text-on-surface-variant">Valor máximo</span>
            <input
              type="range"
              min={deslizadores.valorMin}
              max={deslizadores.valorMax}
              step={deslizadores.paso}
              value={valor ?? deslizadores.valorMin}
              disabled={bloqueado}
              aria-label="Valor de la medida de respuesta"
              data-control="valor"
              onChange={(e) => {
                const v = Number(e.target.value);
                setValor(v);
                guardar(elecciones, v);
              }}
              className="accent-primary-container"
            />
            <span className="font-title-md text-title-md text-primary font-bold" data-valor-texto>
              {valor === null ? 'Sin definir (mueve el deslizador)' : `${numero(valor)} ${unidadNombre}`}
            </span>
          </label>
          <label className="flex flex-col gap-space-xs">
            <span className="font-label-md text-label-md text-on-surface-variant">Unidad</span>
            <select
              value={unidadId ?? ''}
              disabled={bloqueado}
              aria-label="Unidad de la medida de respuesta"
              data-control="unidad"
              onChange={(e) => {
                const u = e.target.value === '' ? null : Number(e.target.value);
                setUnidadId(u);
                guardar(elecciones, valor, u);
              }}
              className="bg-surface-container-lowest border border-outline-variant/40 rounded-md px-space-sm py-2 text-on-surface font-body-md text-body-md"
            >
              <option value="">Elige la unidad…</option>
              {unidades.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nombre}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-space-xs">
            <span className="font-label-md text-label-md text-on-surface-variant">Condición de carga ({contenido.nombreCarga})</span>
            <input
              type="range"
              min={deslizadores.cargaMin}
              max={deslizadores.cargaMax}
              step={deslizadores.pasoCarga}
              value={carga ?? deslizadores.cargaMin}
              disabled={bloqueado}
              aria-label="Condición de carga de la medida de respuesta"
              data-control="carga"
              onChange={(e) => {
                const c = Number(e.target.value);
                setCarga(c);
                guardar(elecciones, valor, unidadId, c);
              }}
              className="accent-primary-container"
            />
            <span className="font-title-md text-title-md text-primary font-bold" data-carga-texto>
              {carga === null ? 'Sin definir (mueve el deslizador)' : `${carga} ${contenido.nombreCarga}`}
            </span>
          </label>
        </div>
      </div>

      {/* Simulación */}
      <div className="bg-surface-container-low rounded-xl p-space-lg shadow-xl border border-surface-container-high/40 flex flex-col gap-space-md">
        <div className="flex items-center justify-between flex-wrap gap-space-sm">
          <h2 className="font-title-lg text-title-lg text-on-surface font-bold flex items-center gap-space-xs">
            <span className="material-symbols-outlined text-tertiary">science</span>
            Simulación
          </h2>
          <span
            className={`px-space-sm py-0.5 rounded-full font-label-md text-label-md font-bold ${restantes === 0 ? 'bg-error-container/40 text-error' : 'bg-surface-container-high text-on-surface'}`}
            id="simulaciones-restantes"
          >
            {restantes} de {limiteSimulaciones} simulaciones restantes
          </span>
        </div>
        <div className="flex items-center gap-space-md flex-wrap">
          <button
            type="button"
            id="btn-simular"
            onClick={() => void simular()}
            disabled={bloqueado || faltantes.length > 0 || restantes <= 0}
            className="px-space-lg py-space-sm rounded-lg bg-tertiary text-on-tertiary hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed font-title-md text-title-md font-bold flex items-center gap-space-xs"
          >
            <span className="material-symbols-outlined text-title-md">play_arrow</span>
            {simulando ? 'Simulando...' : 'Simular'}
          </button>
          {faltantes.length > 0 && (
            <span className="font-body-sm text-body-sm text-on-surface-variant" data-aviso-simular>
              Para simular: {faltantes[0]}
              {faltantes.length > 1 ? ` (y ${faltantes.length - 1} más)` : ''}
            </span>
          )}
          {restantes <= 0 && (
            <span className="font-body-sm text-body-sm text-error" data-aviso-limite>
              Ya no puedes simular: envía tu escenario.
            </span>
          )}
        </div>

        {ultima && (
          <div data-resultado-simulacion className="flex flex-col gap-space-sm">
            <p className={`font-title-md text-title-md font-bold ${ultima.cumple ? 'text-tertiary' : 'text-error'}`}>
              {ultima.cumple
                ? `La app cumple tu escenario: respondió en ${numero(ultima.valorApp)} ${unidadNombre} con ${ultima.carga} ${contenido.nombreCarga}.`
                : ultima.valorApp > ultima.valor
                  ? `La app no cumple tu escenario: respondió en ${numero(ultima.valorApp)} y el umbral era ${numero(ultima.valor)}.`
                  : 'La app no cumple tu escenario con esa medida.'}
            </p>
            <Grafica curva={ultima.curva} umbral={ultima.valor} carga={ultima.carga} valorApp={ultima.valorApp} unidad={unidadNombre} />
          </div>
        )}

        {simulaciones.length > 0 && (
          <ol className="flex flex-col gap-1 font-body-sm text-body-sm text-on-surface-variant" data-historial-simulaciones>
            {simulaciones.map((s) => (
              <li key={s.numero}>
                Simulación {s.numero}: umbral {numero(s.valor)}, carga {s.carga} → la app respondió {numero(s.valorApp)} (
                <span className={s.cumple ? 'text-tertiary' : 'text-error'}>{s.cumple ? 'cumple' : 'no cumple'}</span>)
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
};
