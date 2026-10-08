import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Pagina } from '../../components/Pagina';
import { PantallaCarga, PantallaError } from '../../components/EstadoPantalla';
import { useProgreso } from '../../services/queries';

const panel =
  'rounded-2xl border border-surface-container-high bg-surface-container-low p-space-lg';
const boton =
  'rounded-lg px-space-md py-space-sm bg-primary-container text-on-primary-container hover:bg-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary';
const numero = (n: number | null, sufijo = '') =>
  n === null
    ? 'No disponible'
    : `${n.toLocaleString('es-MX', { maximumFractionDigits: 2 })}${sufijo}`;
const rarezas = { BRONCE: 'Bronce', PLATA: 'Plata', ORO: 'Oro' };
const iconos = [
  'event_note',
  'search',
  'architecture',
  'code',
  'bug_report',
  'rocket_launch',
  'build',
];

export function ProgresoPage() {
  const consulta = useProgreso();
  const [categoria, setCategoria] = useState<string | null>(null);
  const [logroId, setLogroId] = useState<number | null>(null);
  const datos = consulta.data;
  const habilidad =
    datos?.habilidades.find((h) => h.categoria === categoria) ??
    datos?.habilidades[0];
  const logro = datos?.logros.find((l) => l.id === logroId);

  return (
    <Pagina>
      <div className="max-w-7xl mx-auto px-gutter py-space-xl space-y-space-xl">
        <nav
          aria-label="Ruta de navegación"
          className="text-body-sm text-on-surface-variant flex flex-wrap gap-space-sm"
        >
          <Link to="/" className="hover:text-primary">
            PickQuest
          </Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">Progreso de aprendizaje</span>
        </nav>
        <div>
          <h1 className="font-headline-lg text-headline-lg text-primary">
            Progreso de aprendizaje
          </h1>
          <p className="mt-space-sm text-on-surface-variant">
            Explora tu avance, tus habilidades y los logros de tu aventura.
          </p>
        </div>
        {consulta.isPending ? (
          <PantallaCarga mensaje="Cargando tu progreso..." />
        ) : consulta.isError ? (
          <PantallaError
            titulo="No pudimos recuperar tu progreso"
            mensaje="Tu progreso se conserva. Intenta consultar tus estadísticas nuevamente."
            accion={
              <button
                className={boton}
                disabled={consulta.isFetching}
                onClick={() => consulta.refetch()}
              >
                {consulta.isFetching ? 'Reintentando...' : 'Reintentar'}
              </button>
            }
          />
        ) : (
          datos &&
          (datos.sinHistorial ? (
            <section className={`${panel} text-center py-16`}>
              <span
                className="material-symbols-outlined text-primary text-5xl"
                aria-hidden="true"
              >
                explore
              </span>
              <h2 className="text-headline-sm font-headline-sm mt-space-md">
                ¡Tu aventura está por comenzar!
              </h2>
              <p className="text-on-surface-variant mt-space-sm">
                Comienza la primera fase desde el mapa. Aquí podrás consultar tu
                progreso después de resolver tu primer reto.
              </p>
              <Link to="/" className={`${boton} inline-block mt-space-lg`}>
                Volver al mapa
              </Link>
            </section>
          ) : (
            <>
              <section aria-labelledby="metricas">
                <h2
                  id="metricas"
                  className="text-headline-sm font-headline-sm mb-space-md"
                >
                  Tu avance
                </h2>
                <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">
                  {[
                    [
                      'Nivel',
                      numero(datos.nivel),
                      datos.nivelProvisional
                        ? 'Progresión actual pendiente de confirmación.'
                        : 'Según tu experiencia acumulada.',
                    ],
                    [
                      'Experiencia acumulada',
                      numero(datos.xpTotal, ' XP'),
                      `${numero(datos.xpSiguienteNivel)} XP para el siguiente nivel.`,
                    ],
                    [
                      'Puntos de calidad',
                      numero(datos.qpTotal, ' QP'),
                      'Tu saldo actual.',
                    ],
                    [
                      'Fases completadas',
                      `${datos.fasesCompletadas} / ${datos.totalFases}`,
                      'Todos los retos de la fase aprobados.',
                    ],
                    [
                      'Promedio de estrellas',
                      numero(datos.promedioEstrellas, ' / 3'),
                      'Mejor marca de cada reto resuelto.',
                    ],
                    [
                      'Precisión',
                      numero(datos.precision, '%'),
                      datos.precision === null
                        ? 'La forma de medir la precisión aún está por definir.'
                        : 'Precisión de tus respuestas.',
                    ],
                    [
                      'Tiempo promedio de resolución',
                      numero(datos.tiempoPromedioSegundos, ' s'),
                      datos.tiempoPromedioSegundos === null
                        ? 'Aún no se registran tiempos de resolución.'
                        : 'Tiempo por reto.',
                    ],
                  ].map(([etiqueta, valor, ayuda]) => (
                    <div className={panel} key={etiqueta}>
                      <dt className="text-on-surface-variant text-body-sm">
                        {etiqueta}
                      </dt>
                      <dd className="text-headline-sm font-headline-sm text-primary mt-space-sm break-words">
                        {valor}
                      </dd>
                      <dd className="text-body-sm text-on-surface-variant mt-space-sm">
                        {ayuda}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
              <section className={panel} aria-labelledby="habilidades">
                <h2
                  id="habilidades"
                  className="text-headline-sm font-headline-sm"
                >
                  Árbol de habilidades del SDLC
                </h2>
                <p className="text-on-surface-variant mt-space-sm mb-space-lg">
                  Selecciona una categoría para consultar las fases que
                  contribuyen a ella.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-sm">
                  {datos.habilidades.map((h, i) => (
                    <button
                      key={h.categoria}
                      onClick={() => setCategoria(h.categoria)}
                      aria-pressed={h.categoria === habilidad?.categoria}
                      aria-controls="detalle-habilidad"
                      className={`text-left rounded-xl p-space-md border focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${h.categoria === habilidad?.categoria ? 'border-primary bg-primary-container/10' : 'border-surface-container-highest hover:bg-surface-container-high'}`}
                    >
                      <span
                        aria-hidden="true"
                        className="material-symbols-outlined text-tertiary block mb-space-sm"
                      >
                        {iconos[i]}
                      </span>
                      <span className="block font-title-md">{h.nombre}</span>
                      <span className="block text-body-sm text-on-surface-variant">
                        {h.nivel === null
                          ? 'Nivel no disponible'
                          : `Nivel ${h.nivel}`}
                      </span>
                    </button>
                  ))}
                </div>
                {habilidad && (
                  <div
                    id="detalle-habilidad"
                    aria-live="polite"
                    className="mt-space-lg border-t border-surface-container-highest pt-space-lg"
                  >
                    <h3 className="font-title-lg text-title-lg text-tertiary">
                      {habilidad.nombre}
                    </h3>
                    <p className="mt-space-sm">
                      Dominio: {numero(habilidad.dominio, '%')}
                    </p>
                    {habilidad.dominio === null && (
                      <p className="text-on-surface-variant text-body-sm mt-space-sm">
                        La medición del dominio de esta habilidad aún está por
                        definir.
                      </p>
                    )}
                    <h4 className="font-title-md mt-space-lg mb-space-sm">
                      Fases que contribuyen
                    </h4>
                    {habilidad.fases.length ? (
                      <ul className="space-y-space-sm">
                        {habilidad.fases.map((f) => (
                          <li
                            key={f.id}
                            className="flex flex-wrap justify-between gap-space-sm bg-surface-container rounded-lg p-space-md"
                          >
                            <span>{f.nombre}</span>
                            <span className="text-on-surface-variant">
                              Dominio: {numero(f.dominio, '%')}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-on-surface-variant">
                        Aún no se han definido las fases que contribuyen a esta
                        categoría.
                      </p>
                    )}
                  </div>
                )}
              </section>
              <section className={panel} aria-labelledby="trofeos">
                <h2 id="trofeos" className="text-headline-sm font-headline-sm">
                  Sala de trofeos
                </h2>
                <p className="text-on-surface-variant mt-space-sm mb-space-lg">
                  {datos.logros.length
                    ? `${datos.logros.length} logros obtenidos. Selecciona uno para conocer sus detalles.`
                    : 'Todavía no tienes logros registrados.'}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-space-md">
                  {datos.logros.map((l) => (
                    <button
                      key={l.id}
                      className={`text-left rounded-xl border p-space-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${logroId === l.id ? 'border-primary bg-primary-container/10' : 'border-surface-container-highest hover:bg-surface-container-high'}`}
                      aria-pressed={logroId === l.id}
                      aria-controls="detalle-logro"
                      onClick={() => setLogroId(l.id)}
                    >
                      <span
                        aria-hidden="true"
                        className="material-symbols-outlined block text-primary text-4xl mb-space-sm"
                      >
                        emoji_events
                      </span>
                      <span className="block font-title-lg">{l.nombre}</span>
                      <span className="text-on-surface-variant">
                        {l.rareza ? rarezas[l.rareza] : 'Rareza no disponible'}
                      </span>
                    </button>
                  ))}
                </div>
                <div id="detalle-logro" aria-live="polite">
                  {logro && (
                    <div className="mt-space-lg border-t border-surface-container-highest pt-space-lg">
                      <h3 className="font-title-lg text-title-lg text-primary">
                        {logro.nombre}
                      </h3>
                      <p className="mt-space-sm">
                        Cómo lo obtuviste: {logro.descripcion}
                      </p>
                      <p className="text-on-surface-variant mt-space-sm">
                        Rareza:{' '}
                        {logro.rareza ? rarezas[logro.rareza] : 'No disponible'}
                      </p>
                      <p className="text-body-sm text-on-surface-variant mt-space-sm">
                        Obtenido el{' '}
                        <time dateTime={logro.fechaObtenido}>
                          {logro.fechaObtenido}
                        </time>
                      </p>
                    </div>
                  )}
                </div>
              </section>
              <section
                className={`${panel} border-primary/30`}
                aria-labelledby="racha"
              >
                <h2 id="racha" className="text-headline-sm font-headline-sm">
                  Racha de estudio
                </h2>
                <dl className="grid grid-cols-1 sm:grid-cols-3 gap-space-lg mt-space-lg">
                  {[
                    ['Racha actual', numero(datos.racha.diasActuales, ' días')],
                    [
                      'Récord de racha',
                      numero(datos.racha.diasRecord, ' días'),
                    ],
                    [
                      'Multiplicador de QP vigente',
                      datos.racha.multiplicadorQP === null
                        ? 'No disponible'
                        : `×${datos.racha.multiplicadorQP}`,
                    ],
                  ].map(([titulo, valor]) => (
                    <div key={titulo}>
                      <dt className="text-on-surface-variant">{titulo}</dt>
                      <dd className="text-title-lg font-title-lg mt-space-sm">
                        {valor}
                      </dd>
                    </div>
                  ))}
                </dl>
                <p className="text-on-surface-variant text-body-sm mt-space-lg">
                  {datos.racha.zonaHoraria
                    ? `Zona horaria: ${datos.racha.zonaHoraria}`
                    : 'La racha estará disponible cuando se definan la actividad diaria, la zona horaria y las bonificaciones de estudio.'}
                </p>
              </section>
            </>
          ))
        )}
      </div>
    </Pagina>
  );
}
