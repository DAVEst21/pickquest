import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PantallaCarga, PantallaError } from '../../components/EstadoPantalla';
import { Pagina } from '../../components/Pagina';
import { mensajeDeError } from '../../services/errores';
import { useFases } from '../../services/queries';
import type { EstadoFase, Fase } from '../../types';
import { buscarFaseActiva } from '../fases/presentacion';
import { ModalFase } from './ModalFase';
import { TarjetaFase } from './TarjetaFase';

const LEYENDA: { estado: EstadoFase; etiqueta: string; punto: string }[] = [
  { estado: 'completada', etiqueta: 'Completado', punto: 'bg-tertiary' },
  { estado: 'en_progreso', etiqueta: 'En Progreso', punto: 'bg-primary-container animate-pulse' },
  { estado: 'desbloqueada', etiqueta: 'Desbloqueado', punto: 'bg-secondary' },
  { estado: 'bloqueada', etiqueta: 'Bloqueado', punto: 'bg-surface-bright' },
];

export const OverworldPage: React.FC = () => {
  const navigate = useNavigate();
  const { data: fases, isPending, isError, error } = useFases();
  const [faseInspeccionada, setFaseInspeccionada] = useState<Fase | null>(null);

  if (isPending) {
    return (
      <Pagina>
        <PantallaCarga mensaje="Cargando el mapa..." />
      </Pagina>
    );
  }
  if (isError) {
    return (
      <Pagina>
        <PantallaError titulo="No se pudo cargar el mapa" mensaje={mensajeDeError(error)} accion={<span />} />
      </Pagina>
    );
  }

  const faseActiva = buscarFaseActiva(fases);
  const abrirMision = (fase: Fase) => {
    if (fase.estado !== 'bloqueada') navigate(`/mision/${fase.id}`);
  };

  return (
    <Pagina>
      <div className="relative w-full px-gutter py-space-lg max-w-7xl mx-auto flex flex-col gap-space-lg">
        {/* Top HUD Strip: Context & Legend */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-space-md bg-surface-container-low/70 backdrop-blur-md p-space-md lg:p-space-lg rounded-xl shadow-md border border-surface-container-high/50">
          <div className="flex items-center gap-space-md">
            <div className="w-12 h-12 rounded-xl bg-surface-container-high flex items-center justify-center text-primary shadow-inner">
              <span className="material-symbols-outlined text-headline-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
                explore
              </span>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-space-xs">
                <span className="font-label-sm text-label-sm uppercase tracking-widest text-tertiary">Mapa General</span>
                <span className="font-label-sm text-label-sm text-on-surface-variant">/</span>
                <span className="font-label-sm text-label-sm text-primary-fixed-dim uppercase tracking-wider">
                  Temporada 1
                </span>
              </div>
              <h1 className="font-headline-md text-headline-md text-on-surface">Overworld SDLC</h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-space-sm bg-surface-container-lowest/80 p-space-xs lg:p-space-sm rounded-xl border border-surface-container-high/40">
            {LEYENDA.map(({ estado, etiqueta, punto }) => (
              <div
                key={estado}
                className="flex items-center gap-space-xs px-space-sm py-space-xs rounded-lg bg-surface-container-low"
              >
                <span className={`w-2.5 h-2.5 rounded-full ${punto}`}></span>
                <span className="font-label-sm text-label-sm text-on-surface">
                  {etiqueta} ({fases.filter((f) => f.estado === estado).length})
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Active Quest Spotlight Banner */}
        {faseActiva && (
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-surface-container-high via-surface-container to-surface-container-low p-space-lg shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-space-md border border-primary-container/30">
            <div className="absolute -right-8 -top-8 w-44 h-44 rounded-full bg-primary/10 blur-3xl pointer-events-none"></div>
            <div className="flex items-center gap-space-md z-10">
              <div className="relative flex items-center justify-center">
                <span className="absolute inline-flex h-12 w-12 rounded-full bg-primary-container opacity-25 animate-ping"></span>
                <div className="relative w-10 h-10 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold shadow-lg">
                  <span className="material-symbols-outlined text-title-lg">near_me</span>
                </div>
              </div>
              <div className="flex flex-col">
                <span className="font-label-sm text-label-sm bg-primary-container text-on-primary-container font-bold px-space-xs py-0.5 rounded uppercase self-start">
                  TÚ ESTÁS AQUÍ
                </span>
                <span className="font-title-lg text-title-lg text-on-surface">Fase Activa: {faseActiva.nombre}</span>
              </div>
            </div>
            <button
              onClick={() => setFaseInspeccionada(faseActiva)}
              className="z-10 w-full md:w-auto px-space-lg py-space-sm rounded-lg bg-primary-container hover:bg-primary text-on-primary-container font-title-md text-title-md flex items-center justify-center gap-space-xs shadow-lg transition-all active:translate-y-0.5"
              id="btn-quick-inspect"
            >
              <span className="material-symbols-outlined text-title-md">visibility</span>
              <span>Ver objetivos y recompensas</span>
            </button>
          </div>
        )}

        {/* Mapa de fases: una tarjeta por fase que devuelve el backend, en orden */}
        <ol className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-space-lg bg-surface-container-lowest rounded-xl p-space-md lg:p-space-xl shadow-2xl border border-surface-container-high/40">
          {fases.map((fase) => (
            <li key={fase.id} className="flex">
              <TarjetaFase
                fase={fase}
                esActiva={fase.id === faseActiva?.id}
                onAbrir={() => abrirMision(fase)}
                onInspeccionar={() => setFaseInspeccionada(fase)}
              />
            </li>
          ))}
        </ol>

        {faseInspeccionada && <ModalFase fase={faseInspeccionada} onCerrar={() => setFaseInspeccionada(null)} />}
      </div>
    </Pagina>
  );
};
