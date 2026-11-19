import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PantallaCarga, PantallaError } from '../../components/EstadoPantalla';
import { Pagina } from '../../components/Pagina';
import { esRecuperable, mensajeDeError } from '../../services/errores';
import { useAceptarDuelo, useCrearDuelo, useDuelos, useRechazarDuelo, useRivales } from '../../services/queries';
import type { Duelo } from '../../types';

const ETIQUETA_ESTADO: Record<Duelo['estado'], string> = {
  PENDIENTE: 'Pendiente',
  ACEPTADO: 'Aceptado',
  TERMINADO: 'Terminado',
  RECHAZADO: 'Rechazado',
  EXPIRADO: 'Expirado',
};

function textoResultado(d: Duelo): string {
  if (d.estado === 'RECHAZADO') return 'Rechazado: no se otorgó XP';
  if (d.estado === 'EXPIRADO') return 'Expiró: no se otorgó XP';
  if (!d.resultado) return ETIQUETA_ESTADO[d.estado];
  const { yo, rival, ganador } = d.resultado;
  const marcador = `${yo.porcentaje} % vs ${rival.porcentaje} %`;
  if (ganador === 'EMPATE') return `Empate (${marcador}) · +${yo.xpOtorgada} XP`;
  return `${ganador === 'YO' ? 'Ganaste' : 'Perdiste'} (${marcador}) · +${yo.xpOtorgada} XP`;
}

const Tarjeta: React.FC<{ duelo: Duelo; children?: React.ReactNode }> = ({ duelo: d, children }) => (
  <li className="bg-surface-container-low rounded-xl p-space-md border border-outline-variant/30 flex flex-wrap items-center gap-space-md">
    <div className="flex-1 min-w-[12rem]">
      <p className="font-title-md text-title-md text-on-surface">
        {d.rol === 'RETADOR' ? 'Retaste a' : 'Te retó'} {d.rival.nombreAventurero}{' '}
        <span className="font-label-md text-on-surface-variant">(nivel {d.rival.nivel})</span>
      </p>
      <p className="font-body-md text-body-md text-on-surface-variant">
        {d.temaNombre}
        {d.estado === 'PENDIENTE' || d.estado === 'ACEPTADO'
          ? ` · vence el ${new Date(d.expiraEn).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })}`
          : ` · ${textoResultado(d)}`}
      </p>
    </div>
    {children}
  </li>
);

const Seccion: React.FC<{ id: string; titulo: string; vacio: string; items: Duelo[]; render: (d: Duelo) => React.ReactNode }> = ({
  id,
  titulo,
  vacio,
  items,
  render,
}) => (
  <section aria-labelledby={id} className="flex flex-col gap-space-sm">
    <h2 id={id} className="font-title-md text-title-md text-primary">
      {titulo} ({items.length})
    </h2>
    {items.length === 0 ? (
      <p className="font-body-md text-body-md text-on-surface-variant">{vacio}</p>
    ) : (
      <ul className="flex flex-col gap-space-sm">{items.map(render)}</ul>
    )}
  </section>
);

/** Sección de duelos (CU-13): retar, pendientes, por jugar, en espera e historial. */
export const DuelosPage: React.FC = () => {
  const navigate = useNavigate();
  const lista = useDuelos();
  const rivales = useRivales();
  const crear = useCrearDuelo();
  const aceptar = useAceptarDuelo();
  const rechazar = useRechazarDuelo();
  const [rival, setRival] = useState('');
  const [tema, setTema] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (lista.isPending || rivales.isPending) {
    return (
      <Pagina>
        <PantallaCarga mensaje="Abriendo los duelos..." />
      </Pagina>
    );
  }
  if (lista.isError || rivales.isError) {
    const e = lista.error ?? rivales.error;
    return (
      <Pagina>
        <PantallaError
          titulo="No se pudieron abrir los duelos"
          mensaje={mensajeDeError(e)}
          onReintentar={esRecuperable(e) ? () => void (lista.refetch(), rivales.refetch()) : undefined}
        />
      </Pagina>
    );
  }

  const elegido = rivales.data.find((r) => r.nombreAventurero === rival);
  const temaValido = elegido?.temasEnComun.some((t) => t.tema === tema) ?? false;
  const retar = () => {
    setError(null);
    crear.mutate(
      { rival, tema },
      {
        // El retador resuelve su ronda al crear el duelo (paso 5).
        onSuccess: (duelo) => navigate(`/duelos/${duelo.dueloId}`),
        // FE2: el mensaje del servidor indica el límite de duelos pendientes.
        onError: (e) => setError(mensajeDeError(e)),
      },
    );
  };
  const data = lista.data;
  const botonBase = 'px-space-md py-space-sm rounded-lg font-title-md text-title-md disabled:opacity-60';

  return (
    <Pagina>
      <div className="max-w-4xl mx-auto px-gutter py-space-xl flex flex-col gap-space-lg">
        <div>
          <h1 className="font-headline-md text-headline-md text-on-surface">Duelos</h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Reta a otro estudiante: los dos resuelven las mismas 5 preguntas y gana el mejor resultado. El ganador recibe 50 XP, el
            perdedor 20 y, en empate, 30 cada uno. Tienes {data.activos} de {data.limitePendientes} duelos pendientes.
          </p>
        </div>

        <section aria-labelledby="retar" className="bg-surface-container-low rounded-xl p-space-lg flex flex-col gap-space-md">
          <h2 id="retar" className="font-title-md text-title-md text-primary">
            Retar a un estudiante
          </h2>
          {rivales.data.length === 0 ? (
            <p className="font-body-md text-body-md text-on-surface-variant">
              Todavía no hay otros estudiantes con un tema desbloqueado en común.
            </p>
          ) : (
            <div className="grid gap-space-md sm:grid-cols-2">
              <label className="flex flex-col gap-space-xs font-label-md text-label-md text-on-surface-variant">
                Estudiante
                <select
                  value={rival}
                  onChange={(e) => {
                    setRival(e.target.value);
                    setTema('');
                  }}
                  className="bg-surface-container-high rounded-lg px-space-md py-space-sm text-on-surface font-body-md"
                >
                  <option value="">Elige a quién retar</option>
                  {rivales.data.map((r) => (
                    <option key={r.nombreAventurero} value={r.nombreAventurero}>
                      {r.nombreAventurero} · nivel {r.nivel} · {r.duelos.ganados}G {r.duelos.perdidos}P {r.duelos.empatados}E
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-space-xs font-label-md text-label-md text-on-surface-variant">
                Tema en común
                <select
                  value={tema}
                  onChange={(e) => setTema(e.target.value)}
                  disabled={!elegido}
                  className="bg-surface-container-high rounded-lg px-space-md py-space-sm text-on-surface font-body-md disabled:opacity-60"
                >
                  <option value="">Elige el tema</option>
                  {elegido?.temasEnComun.map((t) => (
                    <option key={t.tema} value={t.tema}>
                      {t.nombre}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}
          {error && (
            <p className="font-body-md text-body-md text-error" role="alert">
              {error}
            </p>
          )}
          <button
            type="button"
            onClick={retar}
            disabled={!temaValido || crear.isPending}
            className={`self-end bg-primary-container hover:bg-primary text-on-primary-container font-bold ${botonBase}`}
          >
            {crear.isPending ? 'Creando...' : 'Retar y jugar mi ronda'}
          </button>
        </section>

        <Seccion
          id="pendientes"
          titulo="Duelos pendientes de responder"
          vacio="Nadie te ha retado por ahora."
          items={data.pendientes}
          render={(d) => (
            <Tarjeta key={d.dueloId} duelo={d}>
              <div className="flex gap-space-xs">
                <button
                  type="button"
                  disabled={aceptar.isPending || rechazar.isPending}
                  onClick={() =>
                    aceptar.mutate(d.dueloId, { onSuccess: () => navigate(`/duelos/${d.dueloId}`), onError: (e) => setError(mensajeDeError(e)) })
                  }
                  className={`bg-primary-container hover:bg-primary text-on-primary-container font-bold ${botonBase}`}
                >
                  Aceptar
                </button>
                <button
                  type="button"
                  disabled={aceptar.isPending || rechazar.isPending}
                  onClick={() => rechazar.mutate(d.dueloId, { onError: (e) => setError(mensajeDeError(e)) })}
                  className={`bg-surface-container-high hover:bg-surface-bright text-on-surface ${botonBase}`}
                >
                  Rechazar
                </button>
              </div>
            </Tarjeta>
          )}
        />
        <Seccion
          id="por-jugar"
          titulo="Mi ronda por jugar"
          vacio="No tienes rondas por jugar."
          items={data.porJugar}
          render={(d) => (
            <Tarjeta key={d.dueloId} duelo={d}>
              <Link to={`/duelos/${d.dueloId}`} className={`bg-primary-container hover:bg-primary text-on-primary-container font-bold ${botonBase}`}>
                {d.miRonda.resueltas > 0 ? 'Continuar ronda' : 'Jugar ronda'}
              </Link>
            </Tarjeta>
          )}
        />
        <Seccion
          id="en-espera"
          titulo="En espera del rival"
          vacio="No hay duelos esperando al rival."
          items={data.enEspera}
          render={(d) => (
            <Tarjeta key={d.dueloId} duelo={d}>
              <span className="font-label-md text-label-md text-on-surface-variant">
                Tu ronda: {d.miResultado?.porcentaje ?? 0} % · el resultado se muestra al terminar
              </span>
            </Tarjeta>
          )}
        />
        <Seccion
          id="historial"
          titulo="Historial"
          vacio="Aún no tienes duelos terminados."
          items={data.historial}
          render={(d) => (
            <Tarjeta key={d.dueloId} duelo={d}>
              {d.estado === 'TERMINADO' && (
                <Link to={`/duelos/${d.dueloId}`} className={`bg-surface-container-high hover:bg-surface-bright text-on-surface ${botonBase}`}>
                  Ver resultado
                </Link>
              )}
            </Tarjeta>
          )}
        />
      </div>
    </Pagina>
  );
};
