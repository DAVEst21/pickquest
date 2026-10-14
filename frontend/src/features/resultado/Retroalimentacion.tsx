import React from 'react';
import type {
  Retroalimentacion as RetroTipo,
  RetroDialogo,
  RetroInspeccion,
  RetroLineaTiempo,
  RetroMoscow,
  RetroPresupuesto,
} from '../../types';
import { NOMBRE_ATRIBUTO, NOMBRE_COLUMNA, NOMBRE_TECNICA, NOMBRE_TIPO } from '../reto/atributos';

/** Retroalimentación específica de cada mecánica (SRS, sección de cada CU). */

const Tarjeta: React.FC<{ titulo: string; icono: string; children: React.ReactNode }> = ({ titulo, icono, children }) => (
  <section className="bg-surface-container rounded-xl p-space-lg shadow-md border border-surface-container-highest/40 text-left">
    <h3 className="font-title-lg text-title-lg text-on-surface font-bold flex items-center gap-space-xs mb-space-sm">
      <span className="material-symbols-outlined text-secondary">{icono}</span>
      {titulo}
    </h3>
    {children}
  </section>
);

const Marca: React.FC<{ ok: boolean }> = ({ ok }) => (
  <span className={`material-symbols-outlined text-title-md align-middle ${ok ? 'text-tertiary' : 'text-error'}`}>
    {ok ? 'check_circle' : 'cancel'}
  </span>
);

const Vacio: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="font-body-sm text-body-sm text-on-surface-variant">{children}</p>
);

// ---------------------------------------------------------------------
const LineaTiempo: React.FC<{ r: RetroLineaTiempo }> = ({ r }) => (
  <div className="flex flex-col gap-space-md">
    <Tarjeta titulo="Plazo" icono="event">
      <p className="font-body-md text-body-md text-on-surface" data-retro="plazo">
        Tu plan duró <strong>{r.finCalculado}</strong> semanas y la fecha límite era de{' '}
        <strong>{r.duracionMaximaSemanas}</strong>. {r.dentroDelPlazo ? 'Cumpliste el plazo.' : 'Te pasaste de la fecha límite.'}
      </p>
    </Tarjeta>
    <Tarjeta titulo="Dependencias incumplidas" icono="link_off">
      {r.dependenciasIncumplidas.length === 0 ? (
        <Vacio>Respetaste todas las dependencias. ¡Bien!</Vacio>
      ) : (
        <ul className="list-disc pl-space-lg font-body-md text-body-md text-on-surface space-y-1">
          {r.dependenciasIncumplidas.map((d, i) => (
            <li key={i}>
              «{d.bloque}» no puede empezar antes de que termine «{d.requiere}».
            </li>
          ))}
        </ul>
      )}
    </Tarjeta>
    <Tarjeta titulo="Entregables mal asociados" icono="inventory_2">
      {r.entregablesMalAsociados.length === 0 ? (
        <Vacio>Asociaste todos los entregables con la fase correcta.</Vacio>
      ) : (
        <ul className="list-disc pl-space-lg font-body-md text-body-md text-on-surface space-y-1">
          {r.entregablesMalAsociados.map((e, i) => (
            <li key={i}>
              «{e.entregable}»: lo asociaste a «{e.faseElegida ?? 'ninguna fase'}», pero lo produce «{e.faseCorrecta}».
            </li>
          ))}
        </ul>
      )}
    </Tarjeta>
    <Tarjeta titulo="Plan de referencia" icono="timeline">
      <div className="overflow-x-auto">
        <table className="w-full font-body-sm text-body-sm text-on-surface">
          <thead>
            <tr className="text-on-surface-variant text-left">
              <th className="py-1 pr-space-md">Bloque</th>
              <th className="pr-space-md">Duración</th>
              <th className="pr-space-md">Inicio de referencia</th>
              <th>Tu inicio</th>
            </tr>
          </thead>
          <tbody>
            {r.planReferencia.map((b) => (
              <tr key={b.bloqueId} className="border-t border-surface-container-high/40">
                <td className="py-1 pr-space-md">
                  {b.nombre} <span className="text-on-surface-variant text-[10px]">({b.tipo === 'FASE' ? 'fase' : 'actividad'})</span>
                </td>
                <td className="pr-space-md">{b.duracionSemanas} sem</td>
                <td className="pr-space-md">semana {b.inicio + 1}</td>
                <td className={b.inicioElegido === b.inicio ? 'text-tertiary' : ''}>
                  {b.inicioElegido === null ? '—' : `semana ${b.inicioElegido + 1}`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-space-xs font-body-sm text-body-sm text-on-surface-variant">
        El plan de referencia termina en {r.finReferencia} semanas. Puede haber otras soluciones válidas mientras respeten las dependencias.
      </p>
    </Tarjeta>
  </div>
);

// ---------------------------------------------------------------------
const Moscow: React.FC<{ r: RetroMoscow }> = ({ r }) => (
  <div className="flex flex-col gap-space-md">
    <Tarjeta titulo="Tarjeta por tarjeta" icono="view_kanban">
      <div className="overflow-x-auto">
        <table className="w-full font-body-sm text-body-sm text-on-surface">
          <thead>
            <tr className="text-on-surface-variant text-left">
              <th className="py-1 pr-space-md">Requerimiento</th>
              <th className="pr-space-md">Tu columna</th>
              <th className="pr-space-md">Correcta</th>
              <th className="pr-space-md">Tu tipo</th>
              <th>Correcto</th>
            </tr>
          </thead>
          <tbody>
            {r.tarjetas.map((t) => (
              <tr key={t.tarjetaId} className="border-t border-surface-container-high/40 align-top">
                <td className="py-1 pr-space-md">{t.texto}</td>
                <td className="pr-space-md whitespace-nowrap">
                  <Marca ok={t.columnaAcertada} /> {t.columnaElegida ? NOMBRE_COLUMNA[t.columnaElegida] : '—'}
                </td>
                <td className="pr-space-md">{NOMBRE_COLUMNA[t.columnaCorrecta]}</td>
                <td className="pr-space-md whitespace-nowrap">
                  <Marca ok={t.tipoAcertado} /> {t.tipoElegido ? NOMBRE_TIPO[t.tipoElegido] : '—'}
                </td>
                <td>{NOMBRE_TIPO[t.tipoCorrecto]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Tarjeta>
    <Tarjeta titulo="Orden de referencia de MUST" icono="format_list_numbered">
      <ol className="list-decimal pl-space-lg font-body-md text-body-md text-on-surface space-y-1">
        {r.ordenMustReferencia.map((t) => (
          <li key={t.tarjetaId}>{t.texto}</li>
        ))}
      </ol>
      <p className="mt-space-xs font-body-sm text-body-sm text-on-surface-variant">
        Tu orden coincidió en {r.ordenMustConcordantes} de {r.ordenMustPares}{' '}
        {r.ordenMustPares === 1 ? 'comparación' : 'comparaciones'} entre pares de tarjetas.
      </p>
    </Tarjeta>
  </div>
);

// ---------------------------------------------------------------------
const Inspeccion: React.FC<{ r: RetroInspeccion }> = ({ r }) => (
  <div className="flex flex-col gap-space-md">
    <Tarjeta titulo={`Fallas encontradas (${r.encontradas.length})`} icono="task_alt">
      {r.encontradas.length === 0 ? (
        <Vacio>No encontraste ninguna falla.</Vacio>
      ) : (
        <ul className="flex flex-col gap-space-sm">
          {r.encontradas.map((f) => (
            <li key={f.elementoId} className="bg-surface-container-high rounded-lg p-space-sm">
              <p className="font-body-md text-body-md text-on-surface font-semibold">
                <Marca ok={f.atributoAcertado} /> «{f.etiqueta}» <span className="text-on-surface-variant font-normal">· {f.pantalla}</span>
              </p>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Atributo correcto: <strong className="text-tertiary">{NOMBRE_ATRIBUTO[f.atributoCorrecto]}</strong>
                {!f.atributoAcertado && f.atributoElegido && <> (elegiste {NOMBRE_ATRIBUTO[f.atributoElegido]})</>}
              </p>
              <p className="font-body-sm text-body-sm text-on-surface">{f.explicacion}</p>
            </li>
          ))}
        </ul>
      )}
    </Tarjeta>
    <Tarjeta titulo={`Fallas que no encontraste (${r.noEncontradas.length})`} icono="search_off">
      {r.noEncontradas.length === 0 ? (
        <Vacio>¡No se te escapó ninguna!</Vacio>
      ) : (
        <ul className="flex flex-col gap-space-sm">
          {r.noEncontradas.map((f) => (
            <li key={f.elementoId} className="bg-surface-container-high rounded-lg p-space-sm">
              <p className="font-body-md text-body-md text-on-surface font-semibold">
                «{f.etiqueta}» <span className="text-on-surface-variant font-normal">· pantalla «{f.pantalla}»</span>
              </p>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Atributo: <strong className="text-tertiary">{NOMBRE_ATRIBUTO[f.atributoCorrecto]}</strong>
              </p>
              <p className="font-body-sm text-body-sm text-on-surface">{f.explicacion}</p>
            </li>
          ))}
        </ul>
      )}
    </Tarjeta>
    <Tarjeta titulo={`Marcas sobre elementos sin falla (${r.marcasSinFalla.length})`} icono="report">
      {r.marcasSinFalla.length === 0 ? (
        <Vacio>Todas tus marcas fueron sobre elementos defectuosos.</Vacio>
      ) : (
        <ul className="list-disc pl-space-lg font-body-md text-body-md text-on-surface space-y-1">
          {r.marcasSinFalla.map((m) => (
            <li key={m.elementoId}>
              «{m.etiqueta}» <span className="text-on-surface-variant">· {m.pantalla}</span> estaba bien: cada marca de más resta puntos.
            </li>
          ))}
        </ul>
      )}
    </Tarjeta>
  </div>
);

// ---------------------------------------------------------------------
const Presupuesto: React.FC<{ r: RetroPresupuesto }> = ({ r }) => (
  <div className="flex flex-col gap-space-md">
    <Tarjeta titulo="Tu reparto frente al de referencia" icono="tune">
      <div className="overflow-x-auto">
        <table className="w-full font-body-sm text-body-sm text-on-surface">
          <thead>
            <tr className="text-on-surface-variant text-left">
              <th className="py-1 pr-space-md">Atributo</th>
              <th className="pr-space-md">Tus puntos</th>
              <th className="pr-space-md">Referencia</th>
              <th className="pr-space-md">Tu medidor</th>
              <th className="pr-space-md">Medidor de referencia</th>
              <th>Restricción</th>
            </tr>
          </thead>
          <tbody>
            {r.atributos.map((a) => (
              <tr key={a.atributoEscenarioId} className="border-t border-surface-container-high/40">
                <td className="py-1 pr-space-md">{NOMBRE_ATRIBUTO[a.atributo]}</td>
                <td className="pr-space-md">{a.asignado}</td>
                <td className="pr-space-md">{a.referencia}</td>
                <td className="pr-space-md">{a.medidor}</td>
                <td className="pr-space-md">{a.medidorReferencia}</td>
                <td className="whitespace-nowrap">
                  {a.minimo === null ? (
                    <span className="text-on-surface-variant">sin mínimo</span>
                  ) : (
                    <>
                      <Marca ok={a.cumple === true} /> mínimo {a.minimo}
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-space-xs font-body-md text-body-md text-on-surface">
        Cumpliste <strong>{r.restriccionesCumplidas}</strong> de <strong>{r.restriccionesTotales}</strong> restricciones obligatorias.
      </p>
    </Tarjeta>
    <Tarjeta titulo="Justificación" icono="rate_review">
      <p className="font-body-sm text-body-sm text-on-surface-variant">Elegiste:</p>
      <p className="font-body-md text-body-md text-on-surface">
        <Marca ok={r.justificacionAcertada} /> {r.justificacionElegida?.texto ?? 'Ninguna'}
      </p>
      {!r.justificacionAcertada && r.justificacionCorrecta && (
        <>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-space-sm">La justificación correcta era:</p>
          <p className="font-body-md text-body-md text-tertiary">{r.justificacionCorrecta.texto}</p>
        </>
      )}
    </Tarjeta>
  </div>
);

// ---------------------------------------------------------------------
const Dialogo: React.FC<{ r: RetroDialogo }> = ({ r }) => (
  <div className="flex flex-col gap-space-md">
    <Tarjeta titulo="Técnica de elicitación" icono="record_voice_over">
      <p className="font-body-md text-body-md text-on-surface">
        <Marca ok={r.tecnicaElegida === r.tecnicaCorrecta} /> Elegiste{' '}
        <strong>{r.tecnicaElegida ? NOMBRE_TECNICA[r.tecnicaElegida] : 'ninguna'}</strong>
        {r.tecnicaElegida !== r.tecnicaCorrecta && (
          <>
            ; para este caso era la <strong className="text-tertiary">{NOMBRE_TECNICA[r.tecnicaCorrecta]}</strong>
          </>
        )}
        .
      </p>
    </Tarjeta>
    <Tarjeta titulo={`Requerimientos descubiertos (${r.descubiertos.length})`} icono="edit_note">
      {r.descubiertos.length === 0 ? (
        <Vacio>No descubriste ningún requerimiento.</Vacio>
      ) : (
        <ul className="list-disc pl-space-lg font-body-md text-body-md text-on-surface space-y-1">
          {r.descubiertos.map((d) => (
            <li key={d.codigo}>
              <strong>{d.codigo}:</strong> {d.descripcion}
            </li>
          ))}
        </ul>
      )}
    </Tarjeta>
    <Tarjeta titulo={`Requerimientos que no descubriste (${r.noDescubiertos.length})`} icono="help_center">
      {r.noDescubiertos.length === 0 ? (
        <Vacio>¡Los descubriste todos!</Vacio>
      ) : (
        <ul className="list-disc pl-space-lg font-body-md text-body-md text-on-surface space-y-1">
          {r.noDescubiertos.map((d) => (
            <li key={d.codigo}>
              <strong>{d.codigo}:</strong> {d.descripcion}
            </li>
          ))}
        </ul>
      )}
    </Tarjeta>
    <Tarjeta titulo="Tu entrevista" icono="forum">
      <p className="font-body-md text-body-md text-on-surface">
        Usaste {r.turnosUsados} de {r.turnosMaximos} turnos y hiciste{' '}
        <strong className={r.preguntasImproductivas > 0 ? 'text-error' : 'text-tertiary'}>{r.preguntasImproductivas}</strong>{' '}
        {r.preguntasImproductivas === 1 ? 'pregunta improductiva' : 'preguntas improductivas'} (cada una resta 5 puntos).
      </p>
    </Tarjeta>
  </div>
);

export const Retroalimentacion: React.FC<{ retro: RetroTipo }> = ({ retro }) => {
  switch (retro.mecanica) {
    case 'LINEA_TIEMPO':
      return <LineaTiempo r={retro} />;
    case 'TABLERO_MOSCOW':
      return <Moscow r={retro} />;
    case 'INSPECCION_SISTEMA':
      return <Inspeccion r={retro} />;
    case 'REPARTO_PRESUPUESTO':
      return <Presupuesto r={retro} />;
    case 'DIALOGO_STAKEHOLDER':
      return <Dialogo r={retro} />;
  }
};
