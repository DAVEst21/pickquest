import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAvisosDuelos, useRetoDiarioHoy } from '../services/queries';
import { useAuthStore } from '../store/authStore';
import { usePlayerStore } from '../store/playerStore';

interface ItemNavegacion {
  ruta: string;
  etiqueta: string;
  /** Ruta(s) que deben dejar el elemento resaltado. */
  activo: (ruta: string) => boolean;
  /** Indicador opcional: número (insignia) o punto. */
  indicador?: { texto: string; etiqueta: string } | null;
}

const clasesEnlace = (activo: boolean) =>
  `relative flex items-center gap-space-xs px-space-md py-space-sm rounded-lg font-title-md text-title-md whitespace-nowrap transition-all ${
    activo
      ? 'bg-surface-container-high text-primary shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]'
      : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
  }`;

const Indicador: React.FC<{ texto: string; etiqueta: string }> = ({ texto, etiqueta }) => (
  <span
    className="min-w-5 h-5 px-1 rounded-full bg-error text-on-error font-label-sm text-label-sm flex items-center justify-center"
    role="status"
    aria-label={etiqueta}
  >
    {texto}
  </span>
);

export const Header: React.FC = () => {
  const location = useLocation();
  const perfil = usePlayerStore((s) => s.perfil);
  const cerrarSesion = useAuthStore((s) => s.cerrarSesion);
  const [menuAbierto, setMenuAbierto] = useState(false);
  const { data: avisos } = useAvisosDuelos();
  const { data: diario } = useRetoDiarioHoy();

  const xpTotal = perfil?.xpTotal ?? 0;
  const xpSiguienteNivel = perfil?.xpSiguienteNivel ?? 1;
  const xpPercent = Math.min(100, Math.round((xpTotal / xpSiguienteNivel) * 100));

  const duelosPendientes = avisos?.length ?? 0;
  // El reto diario cuenta como pendiente mientras no se haya terminado el de hoy.
  const diarioPendiente = diario !== undefined && diario.estado !== 'TERMINADO';
  const empieza = (prefijo: string) => (ruta: string) => ruta.startsWith(prefijo);

  const items: ItemNavegacion[] = [
    {
      ruta: '/',
      etiqueta: 'Mapa',
      activo: (r) => r === '/' || r.startsWith('/mision') || r.startsWith('/intento') || r.startsWith('/resultado'),
    },
    { ruta: '/estudio', etiqueta: 'Biblioteca', activo: empieza('/estudio') },
    { ruta: '/plan', etiqueta: 'Plan de estudio', activo: empieza('/plan') },
    {
      ruta: '/reto-diario',
      etiqueta: 'Reto diario',
      activo: empieza('/reto-diario'),
      indicador: diarioPendiente ? { texto: '!', etiqueta: 'El reto diario de hoy está disponible' } : null,
    },
    { ruta: '/tienda', etiqueta: 'Tienda', activo: empieza('/tienda') },
    {
      ruta: '/duelos',
      etiqueta: 'Duelos',
      activo: empieza('/duelos'),
      indicador:
        duelosPendientes > 0
          ? { texto: String(duelosPendientes), etiqueta: `${duelosPendientes} ${duelosPendientes === 1 ? 'duelo pendiente' : 'duelos pendientes'}` }
          : null,
    },
    { ruta: '/clasificacion', etiqueta: 'Clasificación', activo: empieza('/clasificacion') },
    { ruta: '/perfil', etiqueta: 'Perfil', activo: empieza('/perfil') },
  ];

  return (
    <header className="fixed top-0 w-full z-50 bg-surface-container-lowest/90 backdrop-blur-xl shadow-[0_1px_12px_rgba(0,0,0,0.45)]">
      <div className="h-20 w-full max-w-[90rem] mx-auto px-gutter flex items-center justify-between gap-space-md">
        {/* Marca */}
        <div className="flex items-center gap-space-md shrink-0">
          <Link to="/" className="flex items-center gap-space-sm group">
            <div className="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center text-primary group-hover:scale-105 transition-transform">
              <span className="material-symbols-outlined text-headline-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
                swords
              </span>
            </div>
            <div className="hidden sm:flex flex-col">
              <span className="font-headline-sm text-headline-sm tracking-tight text-primary leading-none">PickQuest</span>
              <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest mt-space-xs">
                SDLC Chronicles
              </span>
            </div>
          </Link>
        </div>

        {/* Navegación principal */}
        <nav
          aria-label="Navegación principal"
          className="hidden xl:flex items-center gap-space-xs bg-surface-container-low/70 p-space-xs rounded-xl min-w-0"
        >
          {items.map((item) => (
            <Link key={item.ruta} to={item.ruta} className={clasesEnlace(item.activo(location.pathname))} aria-current={item.activo(location.pathname) ? 'page' : undefined}>
              {item.etiqueta}
              {item.indicador && <Indicador {...item.indicador} />}
            </Link>
          ))}
        </nav>

        {/* Estado del jugador */}
        <div className="flex items-center gap-space-md shrink-0">
          <div className="hidden 2xl:flex flex-col items-end w-[200px]">
            <div className="flex items-center justify-between w-full mb-space-xs gap-space-sm">
              <span className="font-label-sm text-label-sm text-tertiary uppercase truncate" id="hud-nivel">
                Nivel {perfil?.nivel ?? '-'} · {perfil?.nombreAventurero}
              </span>
              <span className="font-code-md text-label-sm text-on-surface-variant shrink-0" id="hud-xp">
                {xpTotal} / {xpSiguienteNivel} XP
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-surface-container-highest overflow-hidden p-[1px]">
              <div
                className="h-full bg-gradient-to-r from-tertiary to-secondary rounded-full shadow-[0_0_8px_rgba(84,221,252,0.4)] transition-all duration-700 ease-out"
                style={{ width: `${xpPercent}%` }}
              />
            </div>
          </div>

          <div className="flex items-center gap-space-xs bg-surface-container-low px-space-md py-space-xs rounded-full shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] shrink-0">
            <span className="material-symbols-outlined text-primary text-title-md">toll</span>
            <span className="font-label-md text-label-md text-primary font-bold tracking-tight" id="hud-qp">
              {(perfil?.qpTotal ?? 0).toLocaleString()} QP
            </span>
          </div>

          <Link
            to="/reto-diario"
            title="Racha de días consecutivos y multiplicador de QP"
            className="hidden sm:flex items-center gap-space-xs bg-primary-container/20 border border-primary-container/40 px-space-sm py-1 rounded-lg shadow-[0_0_12px_rgba(245,158,11,0.25)] shrink-0"
          >
            <span className="material-symbols-outlined text-primary text-title-md" style={{ fontVariationSettings: "'FILL' 1" }}>
              local_fire_department
            </span>
            <span className="font-label-md text-label-md text-primary font-bold" id="hud-racha">
              {perfil?.racha?.diasActuales ?? 0} Días
            </span>
          </Link>

          <div className="flex items-center gap-space-xs pl-space-xs shrink-0">
            <Link to="/perfil" aria-label="Ir a mi perfil" title="Mi perfil">
              {perfil?.avatar ? (
                <img
                  alt="Perfil de Estudiante"
                  className="w-8 h-8 rounded-full object-cover ring-2 ring-primary/40 shadow-sm"
                  src={perfil.avatar}
                />
              ) : (
                <div
                  aria-hidden="true"
                  className="w-8 h-8 rounded-full bg-surface-container-high ring-2 ring-primary/40 flex items-center justify-center font-title-md text-primary uppercase"
                >
                  {perfil?.nombreAventurero.charAt(0) ?? '?'}
                </div>
              )}
            </Link>
            <button
              onClick={cerrarSesion}
              title="Cerrar sesión"
              aria-label="Cerrar sesión"
              className="w-8 h-8 rounded-lg hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface flex items-center justify-center transition-colors"
            >
              <span className="material-symbols-outlined text-title-md">logout</span>
            </button>
            <button
              type="button"
              onClick={() => setMenuAbierto((v) => !v)}
              aria-expanded={menuAbierto}
              aria-controls="menu-movil"
              aria-label="Abrir el menú de navegación"
              className="xl:hidden w-9 h-9 rounded-lg hover:bg-surface-container-high text-on-surface flex items-center justify-center relative"
            >
              <span className="material-symbols-outlined">{menuAbierto ? 'close' : 'menu'}</span>
              {!menuAbierto && (duelosPendientes > 0 || diarioPendiente) && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-error" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Menú en pantallas angostas */}
      {menuAbierto && (
        <nav
          id="menu-movil"
          aria-label="Navegación principal"
          className="xl:hidden border-t border-surface-container-high/40 bg-surface-container-lowest px-gutter py-space-sm grid grid-cols-2 gap-space-xs sm:grid-cols-4"
        >
          {items.map((item) => (
            <Link
              key={item.ruta}
              to={item.ruta}
              onClick={() => setMenuAbierto(false)}
              className={clasesEnlace(item.activo(location.pathname))}
              aria-current={item.activo(location.pathname) ? 'page' : undefined}
            >
              {item.etiqueta}
              {item.indicador && <Indicador {...item.indicador} />}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
};
