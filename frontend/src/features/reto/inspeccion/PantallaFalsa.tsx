import React from 'react';
import type { ElementoContenido, PantallaContenido } from '../../../types';

/**
 * Dibuja una pantalla de la aplicación ficticia a partir de sus elementos
 * (tipo, etiqueta, contenido y variante). Estilo de "app falsa" deliberadamente
 * distinto al de PickQuest (claro, tipografía del sistema), sin imágenes
 * externas: todo con componentes y Tailwind. Las variantes ("texto-plano",
 * "contraste-bajo", "sin-feedback"...) solo cambian cómo se ve el elemento.
 */
function Contenido({ el }: { el: ElementoContenido }) {
  const v = el.variante ?? '';
  switch (el.tipo) {
    case 'TITULO':
      return <h3 className="text-lg font-bold text-slate-900">{el.etiqueta}</h3>;
    case 'TEXTO':
      return (
        <p
          className={
            v === 'contraste-bajo'
              ? 'text-sm text-slate-300'
              : v === 'pie'
                ? 'text-xs text-slate-500'
                : 'text-sm text-slate-700'
          }
        >
          {el.etiqueta}
        </p>
      );
    case 'CAMPO': {
      const esClave = /contrase/i.test(el.etiqueta);
      const mostrar = esClave && v !== 'texto-plano' ? '•'.repeat((el.contenido ?? '').length || 8) : (el.contenido ?? '');
      return (
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-slate-600">{el.etiqueta}</span>
          <div className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 min-h-9">{mostrar}</div>
        </div>
      );
    }
    case 'BOTON':
      return (
        <div
          className={`rounded-md px-4 py-2 text-center text-sm font-semibold ${
            v === 'secundario'
              ? 'border border-slate-300 bg-white text-slate-700'
              : 'bg-sky-600 text-white'
          }`}
        >
          {el.etiqueta}
        </div>
      );
    case 'IMAGEN':
      return (
        <div
          className={`flex items-center justify-center bg-slate-200 text-slate-500 ${
            v === 'avatar' ? 'h-14 w-14 rounded-full' : 'h-16 rounded-lg'
          }`}
          role="img"
          aria-label={el.etiqueta}
        >
          <span className="material-symbols-outlined">{v === 'avatar' ? 'person' : 'local_hospital'}</span>
        </div>
      );
    case 'MENSAJE':
      return (
        <div
          className={`flex items-start gap-2 rounded-md border px-3 py-2 text-sm ${
            v === 'alerta-fallos'
              ? 'border-amber-300 bg-amber-50 text-amber-900'
              : 'border-sky-200 bg-sky-50 text-sky-900'
          }`}
        >
          {v === 'carga-lenta' ? (
            <span className="material-symbols-outlined animate-spin text-base">progress_activity</span>
          ) : (
            <span className="material-symbols-outlined text-base">{v === 'alerta-fallos' ? 'warning' : 'info'}</span>
          )}
          <span>{el.contenido ?? el.etiqueta}</span>
        </div>
      );
    case 'LISTA':
      return (
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-slate-600">{el.etiqueta}</span>
          <ul className="rounded-md border border-slate-300 bg-white divide-y divide-slate-200 text-sm text-slate-800">
            {(el.contenido ?? '').split('\n').map((linea, i) => (
              <li key={i} className="px-3 py-2">
                {linea}
              </li>
            ))}
          </ul>
        </div>
      );
  }
}

interface Props {
  nombreAplicacion: string;
  pantalla: PantallaContenido;
  /** elementoId → número de marca. */
  marcas: Map<number, number>;
  seleccionado: number | null;
  deshabilitado: boolean;
  onClickElemento: (elemento: ElementoContenido) => void;
}

export const PantallaFalsa: React.FC<Props> = ({
  nombreAplicacion,
  pantalla,
  marcas,
  seleccionado,
  deshabilitado,
  onClickElemento,
}) => (
  <div
    className="mx-auto w-full max-w-sm rounded-[2rem] border-[10px] border-slate-700 bg-slate-100 shadow-2xl overflow-hidden"
    style={{ fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif' }}
  >
    <div className="bg-sky-700 px-4 py-2 text-white flex items-center justify-between text-sm font-semibold">
      <span>{nombreAplicacion}</span>
      <span className="text-xs opacity-80">{pantalla.titulo}</span>
    </div>
    <div className="bg-white p-4 flex flex-col gap-3 min-h-[28rem]">
      {pantalla.elementos.map((el) => {
        const numero = marcas.get(el.id);
        const marcado = numero !== undefined;
        return (
          <div
            key={el.id}
            role="button"
            tabIndex={deshabilitado ? -1 : 0}
            aria-pressed={marcado}
            aria-label={`${el.etiqueta}${marcado ? ` (marca ${numero})` : ''}`}
            data-elemento-id={el.id}
            onClick={() => !deshabilitado && onClickElemento(el)}
            onKeyDown={(e) => {
              if (!deshabilitado && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault();
                onClickElemento(el);
              }
            }}
            className={`relative rounded-md p-1 -m-1 cursor-pointer outline-2 outline-offset-2 transition-all ${
              seleccionado === el.id
                ? 'outline outline-rose-500 bg-rose-50'
                : marcado
                  ? 'outline outline-rose-400'
                  : 'hover:outline hover:outline-dashed hover:outline-sky-500 focus-visible:outline focus-visible:outline-sky-500'
            }`}
          >
            <Contenido el={el} />
            {marcado && (
              <span className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-rose-600 text-xs font-bold text-white shadow">
                {numero}
              </span>
            )}
          </div>
        );
      })}
    </div>
  </div>
);
