import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { PantallaCarga, PantallaError } from '../../components/EstadoPantalla';
import { Pagina } from '../../components/Pagina';
import { PreguntaCronometrada } from '../../components/PreguntaCronometrada';
import { entregarPreguntaDuelo, responderPreguntaDuelo } from '../../services/api';
import { esError, esRecuperable, mensajeDeError } from '../../services/errores';
import { useDuelo, useRefrescarDuelos } from '../../services/queries';
import type { Duelo, PreguntaCronometrada as Pregunta } from '../../types';

const volver = (
  <Link to="/duelos" className="px-space-lg py-space-sm rounded-lg bg-primary-container text-on-primary-container font-title-md">
    Volver a los duelos
  </Link>
);

/** Ronda y resultado de un duelo (CU-13, pasos 5, 8 y 10). Sin ayudas ni cinto. */
export const DueloPage: React.FC = () => {
  const dueloId = Number(useParams<{ dueloId: string }>().dueloId);
  const { data, isPending, isError, error, refetch, isFetching } = useDuelo(dueloId);
  const refrescar = useRefrescarDuelos();
  const [duelo, setDuelo] = useState<Duelo | null>(null);
  const [pregunta, setPregunta] = useState<Pregunta | null>(null);
  const [cargando, setCargando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  if (isPending) {
    return (
      <Pagina>
        <PantallaCarga mensaje="Abriendo el duelo..." />
      </Pagina>
    );
  }
  if (isError) {
    return (
      <Pagina>
        <PantallaError
          titulo={esError(error, 404) ? 'Duelo no encontrado' : 'No se pudo abrir el duelo'}
          mensaje={mensajeDeError(error)}
          accion={volver}
          onReintentar={esRecuperable(error) ? () => void refetch() : undefined}
          reintentando={isFetching}
        />
      </Pagina>
    );
  }

  const actual = duelo ?? data;
  const pedir = async (d: Duelo) => {
    if (d.miRonda.siguiente === null) {
      setPregunta(null);
      refrescar();
      return;
    }
    setCargando(true);
    setAviso(null);
    try {
      setPregunta(await entregarPreguntaDuelo(d.dueloId, d.miRonda.siguiente));
    } catch (e) {
      setAviso(mensajeDeError(e));
    } finally {
      setCargando(false);
    }
  };

  // Jugando una pregunta.
  if (pregunta && actual.accion === 'JUGAR_RONDA') {
    return (
      <Pagina>
        <div className="max-w-2xl mx-auto px-gutter py-space-xl flex flex-col gap-space-lg">
          <h1 className="font-title-md text-title-md text-on-surface">
            Duelo contra {actual.rival.nombreAventurero} · {actual.temaNombre}
          </h1>
          <PreguntaCronometrada
            key={pregunta.numero}
            pregunta={pregunta}
            // El duelo no revela si acertó ni cuál era la correcta hasta que termina (RNF-SE-05).
            responder={async (opcionId) => {
              const r = await responderPreguntaDuelo(actual.dueloId, pregunta.numero, opcionId);
              setDuelo(r.duelo);
              return undefined;
            }}
            mensajeSinRetro="Respuesta registrada. Verás cuáles acertaste cuando termine el duelo."
            alSiguiente={() => void pedir(duelo ?? actual)}
            textoSiguiente={pregunta.numero === pregunta.total ? 'Terminar mi ronda' : 'Siguiente pregunta'}
          />
          {aviso && (
            <p className="font-body-md text-body-md text-error" role="alert">
              {aviso}
            </p>
          )}
        </div>
      </Pagina>
    );
  }

  const r = actual.resultado;
  return (
    <Pagina>
      <div className="max-w-2xl mx-auto px-gutter py-space-xl flex flex-col gap-space-lg">
        <div>
          <h1 className="font-headline-md text-headline-md text-on-surface">Duelo contra {actual.rival.nombreAventurero}</h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            {actual.temaNombre} · nivel del rival {actual.rival.nivel}
          </p>
        </div>

        {actual.accion === 'JUGAR_RONDA' && (
          <div className="bg-surface-container-low rounded-xl p-space-lg flex flex-col gap-space-md items-start">
            <p className="font-body-md text-body-md text-on-surface">
              5 preguntas con 20 segundos cada una. {actual.miRonda.resueltas > 0 ? `Llevas ${actual.miRonda.resueltas}.` : ''}
              No hay ayudas en los duelos.
            </p>
            <button
              type="button"
              onClick={() => void pedir(actual)}
              disabled={cargando}
              className="px-space-xl py-space-md rounded-xl bg-primary-container hover:bg-primary disabled:opacity-60 text-on-primary-container font-title-md font-bold"
            >
              {cargando ? 'Preparando...' : actual.miRonda.resueltas > 0 ? 'Continuar mi ronda' : 'Empezar mi ronda'}
            </button>
            {aviso && (
              <p className="font-body-md text-body-md text-error" role="alert">
                {aviso}
              </p>
            )}
          </div>
        )}

        {actual.accion === 'ESPERAR_RIVAL' && (
          <div className="bg-surface-container-low rounded-xl p-space-lg" role="status">
            <p className="font-title-md text-title-md text-on-surface">¡Terminaste tu ronda!</p>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Obtuviste {actual.miResultado?.porcentaje ?? 0} %. El resultado se mostrará cuando {actual.rival.nombreAventurero} termine
              la suya.
            </p>
          </div>
        )}

        {actual.accion === 'ACEPTAR_O_RECHAZAR' && (
          <p className="font-body-md text-body-md text-on-surface-variant">
            Este duelo está pendiente: acéptalo o recházalo desde la sección de duelos.
          </p>
        )}

        {(actual.estado === 'RECHAZADO' || actual.estado === 'EXPIRADO') && (
          <p className="bg-surface-container-low rounded-xl p-space-lg font-body-md text-body-md text-on-surface" role="status">
            {actual.estado === 'RECHAZADO' ? 'El duelo fue rechazado.' : 'El duelo expiró.'} No se otorgó XP.
          </p>
        )}

        {r && (
          <section aria-labelledby="resultado" className="flex flex-col gap-space-md">
            <h2 id="resultado" className="font-title-md text-title-md text-primary">
              {r.ganador === 'EMPATE' ? 'Empate' : r.ganador === 'YO' ? '¡Ganaste!' : 'Perdiste esta vez'}
            </h2>
            <div className="grid grid-cols-2 gap-space-md">
              {[
                { quien: 'Tú', datos: r.yo },
                { quien: actual.rival.nombreAventurero, datos: r.rival },
              ].map(({ quien, datos }) => (
                <div key={quien} className="bg-surface-container-low rounded-xl p-space-md">
                  <p className="font-title-md text-title-md text-on-surface">{quien}</p>
                  <p className="font-headline-sm text-primary">{datos.porcentaje} %</p>
                  <p className="font-body-md text-body-md text-on-surface-variant">{datos.segundosTotales.toFixed(1)} s en total</p>
                  <p className="font-label-md text-label-md text-tertiary">+{datos.xpOtorgada} XP</p>
                </div>
              ))}
            </div>
            <ol className="flex flex-col gap-space-sm">
              {r.revision.map((p) => (
                <li key={p.numero} className="bg-surface-container-low rounded-xl p-space-md">
                  <p className="font-body-md text-body-md text-on-surface">
                    <span className={p.correcta ? 'text-tertiary' : 'text-error'}>{p.correcta ? '✔' : '✘'}</span> {p.numero}. {p.enunciado}
                  </p>
                  {p.explicacion && <p className="font-label-md text-label-md text-on-surface-variant mt-space-xs">{p.explicacion}</p>}
                </li>
              ))}
            </ol>
          </section>
        )}

        <div>{volver}</div>
      </div>
    </Pagina>
  );
};
