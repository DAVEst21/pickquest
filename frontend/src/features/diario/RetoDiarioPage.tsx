import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PantallaCarga, PantallaError } from '../../components/EstadoPantalla';
import { ModalConfirmar } from '../../components/ModalConfirmar';
import { Pagina } from '../../components/Pagina';
import { PreguntaCronometrada } from '../../components/PreguntaCronometrada';
import { entregarPreguntaDiaria, responderPreguntaDiaria } from '../../services/api';
import { ApiError, esRecuperable, mensajeDeError } from '../../services/errores';
import {
  useAbandonarRetoDiario,
  useIniciarRetoDiario,
  useRefrescarRetoDiario,
  useRetoDiarioHoy,
} from '../../services/queries';
import type { EstadoRetoDiario, HoyRetoDiario, PreguntaCronometrada as Pregunta, RachaDiaria, ResultadoRetoDiario } from '../../types';

function formatoTiempo(segundos: number): string {
  const h = Math.floor(segundos / 3600);
  const m = Math.floor((segundos % 3600) / 60);
  const s = segundos % 60;
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':');
}

const Racha: React.FC<{ racha: RachaDiaria }> = ({ racha }) => (
  <dl className="grid grid-cols-3 gap-space-md w-full text-center">
    <div className="bg-surface-container-low rounded-xl p-space-md">
      <dt className="font-label-md text-on-surface-variant">Racha</dt>
      <dd className="font-headline-sm text-primary" id="racha-dias">
        {racha.diasActuales} {racha.diasActuales === 1 ? 'día' : 'días'}
      </dd>
    </div>
    <div className="bg-surface-container-low rounded-xl p-space-md">
      <dt className="font-label-md text-on-surface-variant">Multiplicador de QP</dt>
      <dd className="font-headline-sm text-primary" id="racha-multiplicador">
        ×{racha.multiplicadorQP.toFixed(1)}
      </dd>
    </div>
    <div className="bg-surface-container-low rounded-xl p-space-md">
      <dt className="font-label-md text-on-surface-variant">Récord</dt>
      <dd className="font-headline-sm text-on-surface">{racha.diasRecord}</dd>
    </div>
  </dl>
);

const Resumen: React.FC<{ resultado: ResultadoRetoDiario; segundosHastaSiguiente: number | null; titulo: string }> = ({
  resultado: r,
  segundosHastaSiguiente,
  titulo,
}) => {
  const [restante, setRestante] = useState(segundosHastaSiguiente);
  useEffect(() => {
    if (segundosHastaSiguiente === null) return;
    const inicio = performance.now();
    const id = window.setInterval(
      () => setRestante(Math.max(0, segundosHastaSiguiente - Math.floor((performance.now() - inicio) / 1000))),
      1000,
    );
    return () => window.clearInterval(id);
  }, [segundosHastaSiguiente]);
  return (
    <div className="bg-surface-container-low rounded-2xl p-space-xl flex flex-col gap-space-md items-center text-center">
      <span className="material-symbols-outlined text-headline-lg text-tertiary">timer</span>
      <h1 className="font-headline-sm text-headline-sm text-on-surface">{titulo}</h1>
      <p className="font-headline-md text-primary" id="resultado-aciertos">
        {r.aciertos} de {r.total} · {r.porcentaje} %
      </p>
      <p className="font-body-md text-body-md text-on-surface" id="resultado-recompensa">
        Ganaste {r.xpOtorgada} XP y {r.qpOtorgado} QP (multiplicador ×{r.multiplicadorAplicado.toFixed(1)}).
      </p>
      <p className="font-body-md text-body-md text-on-surface-variant" id="resultado-racha">
        {r.logroRacha
          ? `¡Tu racha sube a ${r.racha.diasActuales} ${r.racha.diasActuales === 1 ? 'día' : 'días'}!`
          : 'Necesitas al menos 50 % para aumentar tu racha.'}
      </p>
      <Racha racha={r.racha} />
      {restante !== null && (
        <p className="font-body-md text-body-md text-on-surface-variant" id="siguiente-reto">
          El siguiente reto diario estará disponible en <strong className="font-code-md">{formatoTiempo(restante)}</strong>.
        </p>
      )}
      <Link to="/" className="px-space-lg py-space-sm rounded-lg bg-primary-container text-on-primary-container font-title-md">
        Volver al mapa
      </Link>
    </div>
  );
};

/** Reto diario contrarreloj (CU-11): racha, 10 preguntas de 20 s, resumen y FE1. */
export const RetoDiarioPage: React.FC = () => {
  const { data, isPending, isError, error, refetch, isFetching } = useRetoDiarioHoy();
  const iniciar = useIniciarRetoDiario();
  const abandonar = useAbandonarRetoDiario();
  const refrescar = useRefrescarRetoDiario();
  const [reto, setReto] = useState<EstadoRetoDiario | null>(null);
  const [pregunta, setPregunta] = useState<Pregunta | null>(null);
  const [cargando, setCargando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [confirmandoSalida, setConfirmandoSalida] = useState(false);
  // FE1 cuando el servidor rechaza el inicio porque ya lo hizo hoy.
  const [yaRealizado, setYaRealizado] = useState<HoyRetoDiario | null>(null);

  // Si ya había un reto en curso al abrir la pantalla, se retoma.
  const enCurso = reto ?? (data?.estado === 'EN_CURSO' ? data.reto : null);

  const pedir = async (estado: EstadoRetoDiario) => {
    if (estado.terminado || estado.siguiente === null) {
      setReto(estado);
      setPregunta(null);
      refrescar();
      return;
    }
    setCargando(true);
    setAviso(null);
    try {
      setReto(estado);
      setPregunta(await entregarPreguntaDiaria(estado.retoDiarioId, estado.siguiente));
    } catch (e) {
      setAviso(mensajeDeError(e));
    } finally {
      setCargando(false);
    }
  };

  const empezar = () =>
    iniciar.mutate(undefined, {
      onSuccess: (estado) => void pedir(estado),
      onError: (e) => {
        // FE1: el servidor devuelve el resultado de hoy y el tiempo que falta.
        if (e instanceof ApiError && e.status === 409 && e.datos.reto) {
          setYaRealizado({
            dia: '',
            racha: (e.datos.reto as EstadoRetoDiario).resultado!.racha,
            reglas: data!.reglas,
            estado: 'TERMINADO',
            reto: e.datos.reto as EstadoRetoDiario,
            segundosHastaSiguiente: e.datos.segundosHastaSiguiente as number,
          });
        } else {
          setAviso(mensajeDeError(e));
        }
      },
    });

  if (isPending) {
    return (
      <Pagina>
        <PantallaCarga mensaje="Preparando el reto diario..." />
      </Pagina>
    );
  }
  if (isError) {
    return (
      <Pagina>
        <PantallaError
          titulo="No se pudo abrir el reto diario"
          mensaje={mensajeDeError(error)}
          onReintentar={esRecuperable(error) ? () => void refetch() : undefined}
          reintentando={isFetching}
        />
      </Pagina>
    );
  }

  const terminado = reto?.terminado ? reto : data.estado === 'TERMINADO' ? data.reto : yaRealizado?.reto ?? null;
  if (terminado?.resultado) {
    const segundos = yaRealizado?.segundosHastaSiguiente ?? data.segundosHastaSiguiente;
    return (
      <Pagina>
        <div className="max-w-2xl mx-auto px-gutter py-space-xl">
          <Resumen
            resultado={terminado.resultado}
            segundosHastaSiguiente={segundos}
            titulo={reto?.terminado && !yaRealizado ? 'Reto diario terminado' : 'Ya hiciste el reto diario de hoy'}
          />
        </div>
      </Pagina>
    );
  }

  // Jugando: una pregunta en pantalla.
  if (enCurso && pregunta) {
    return (
      <Pagina>
        <div className="max-w-2xl mx-auto px-gutter py-space-xl flex flex-col gap-space-lg">
          <div className="flex items-center justify-between gap-space-md">
            <h1 className="font-title-md text-title-md text-on-surface">Reto diario</h1>
            <button
              type="button"
              onClick={() => setConfirmandoSalida(true)}
              className="px-space-md py-space-sm rounded-lg bg-surface-container-high text-on-surface font-title-md text-title-md"
            >
              Abandonar
            </button>
          </div>
          <PreguntaCronometrada
            key={pregunta.numero}
            pregunta={pregunta}
            responder={async (opcionId) => {
              const r = await responderPreguntaDiaria(enCurso.retoDiarioId, pregunta.numero, opcionId);
              setReto(r.estado);
              return r;
            }}
            alSiguiente={() => void pedir(reto!)}
            textoSiguiente={pregunta.numero === pregunta.total ? 'Ver resumen' : 'Siguiente pregunta'}
          />
          {aviso && (
            <p className="font-body-md text-body-md text-error" role="alert">
              {aviso}
            </p>
          )}
        </div>
        {confirmandoSalida && (
          <ModalConfirmar
            titulo="¿Abandonar el reto?"
            icono="logout"
            mensaje="Las preguntas que no hayas respondido contarán como incorrectas y el reto de hoy quedará realizado."
            textoConfirmar="Abandonar"
            textoCancelar="Seguir jugando"
            cargando={abandonar.isPending}
            onCancelar={() => setConfirmandoSalida(false)}
            onConfirmar={() =>
              abandonar.mutate(enCurso.retoDiarioId, {
                onSuccess: (estado) => {
                  setConfirmandoSalida(false);
                  setPregunta(null);
                  setReto(estado);
                },
              })
            }
          />
        )}
      </Pagina>
    );
  }

  // Pasos 1 y 2: racha, multiplicador y reglas.
  return (
    <Pagina>
      <div className="max-w-2xl mx-auto px-gutter py-space-xl flex flex-col gap-space-lg">
        <div>
          <h1 className="font-headline-md text-headline-md text-on-surface">Reto diario</h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Una vez al día, contra el reloj. Mantén tu racha obteniendo al menos 50 %.
          </p>
        </div>
        <Racha racha={data.racha} />
        <section aria-labelledby="reglas" className="bg-surface-container-low rounded-xl p-space-lg flex flex-col gap-space-sm">
          <h2 id="reglas" className="font-title-md text-title-md text-primary">
            Reglas
          </h2>
          <ul className="list-disc pl-space-lg font-body-md text-body-md text-on-surface-variant flex flex-col gap-space-xs">
            <li>{data.reglas.preguntas} preguntas mixtas de los temas que ya tienes desbloqueados.</li>
            <li>{data.reglas.segundosPorPregunta} segundos por pregunta; si se agota el tiempo, cuenta como incorrecta.</li>
            <li>
              Ganas {data.reglas.xpPorAcierto} XP y {data.reglas.qpPorAcierto} QP por acierto; los QP se multiplican por tu racha.
            </li>
            <li>Con {data.reglas.porcentajeRacha} % o más, tu racha crece un día. Si pasa un día sin lograrlo, vuelve a 0.</li>
            <li>No puedes usar objetos en este reto.</li>
          </ul>
        </section>
        {aviso && (
          <p className="font-body-md text-body-md text-error" role="alert">
            {aviso}
          </p>
        )}
        <button
          type="button"
          onClick={enCurso ? () => void pedir(enCurso) : empezar}
          disabled={iniciar.isPending || cargando}
          className="self-end px-space-xl py-space-md rounded-xl bg-primary-container hover:bg-primary disabled:opacity-60 text-on-primary-container font-title-md text-title-md font-bold shadow-xl"
        >
          {iniciar.isPending || cargando ? 'Preparando...' : enCurso ? 'Continuar el reto' : 'Iniciar reto diario'}
        </button>
      </div>
    </Pagina>
  );
};
