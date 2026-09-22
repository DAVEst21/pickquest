import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { usePlayerStore } from '../store/playerStore';

export const Header: React.FC = () => {
  const location = useLocation();
  const { nivel, xpTotal, xpSiguienteNivel, qpTotal, racha, titulo, avatarUrl } = usePlayerStore();

  const xpPercent = Math.min(100, Math.round((xpTotal / xpSiguienteNivel) * 100));

  const isOverworldActive = location.pathname === '/';
  const isMisionesActive = location.pathname.startsWith('/mision') || location.pathname.startsWith('/reto') || location.pathname.startsWith('/resultado');

  return (
    <header className="fixed top-0 w-full z-50 bg-surface-container-lowest/90 backdrop-blur-xl shadow-[0_1px_12px_rgba(0,0,0,0.45)]">
      <div className="h-20 w-full max-w-7xl mx-auto px-gutter pr-12 flex items-center justify-between gap-space-md">
        {/* Brand & Logo */}
        <div className="flex items-center gap-space-lg shrink-0">
          <Link to="/" className="flex items-center gap-space-sm group">
            <div className="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center text-primary group-hover:scale-105 transition-transform">
              <span className="material-symbols-outlined text-headline-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
                swords
              </span>
            </div>
            <div className="flex flex-col">
              <span className="font-headline-sm text-headline-sm tracking-tight text-primary leading-none">
                PickQuest
              </span>
              <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest mt-space-xs">
                SDLC Chronicles · v2.4
              </span>
            </div>
          </Link>

          {/* Main Navigation */}
          <nav
            aria-label="Navegación principal"
            className="hidden xl:flex items-center gap-space-xs bg-surface-container-low/70 p-space-xs rounded-xl"
          >
            <Link
              to="/"
              className={`px-space-md py-space-sm rounded-lg font-title-md text-title-md transition-all ${
                isOverworldActive
                  ? 'bg-surface-container-high text-primary font-title-md rounded-lg shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]'
                  : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
              }`}
            >
              Overworld
            </Link>
            <Link
              to="/mision/3"
              className={`px-space-md py-space-sm rounded-lg font-title-md text-title-md transition-all ${
                isMisionesActive
                  ? 'bg-surface-container-high text-primary font-title-md rounded-lg shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]'
                  : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
              }`}
            >
              Misiones
            </Link>
            <span
              className="px-space-md py-space-sm rounded-lg font-title-md text-title-md text-on-surface-variant/50 cursor-not-allowed"
              title="Próximamente en CU-05"
            >
              Ficha Dev
            </span>
            <span
              className="px-space-md py-space-sm rounded-lg font-title-md text-title-md text-on-surface-variant/50 cursor-not-allowed"
              title="Próximamente en CU-07"
            >
              Leaderboard
            </span>
            <span
              className="px-space-md py-space-sm rounded-lg font-title-md text-title-md text-on-surface-variant/50 cursor-not-allowed"
              title="Próximamente en CU-06"
            >
              Tienda del Gremio
            </span>
          </nav>
        </div>

        {/* Player Status Hub */}
        <div className="flex items-center gap-space-md shrink-0 pr-space-md">
          {/* XP Level Bar */}
          <div className="hidden lg:flex flex-col items-end min-w-[190px]">
            <div className="flex items-center justify-between w-full mb-space-xs">
              <span className="font-label-sm text-label-sm text-tertiary uppercase">
                Nivel {nivel} · {titulo}
              </span>
              <span className="font-code-md text-label-sm text-on-surface-variant">
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

          {/* QP Badge */}
          <div className="flex items-center gap-space-xs bg-surface-container-low px-space-md py-space-xs rounded-full shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] shrink-0">
            <span className="material-symbols-outlined text-primary text-title-md">toll</span>
            <span className="font-label-md text-label-md text-primary font-bold tracking-tight">
              {qpTotal.toLocaleString()} QP
            </span>
          </div>

          {/* Streak Badge */}
          <div className="flex items-center gap-space-xs bg-primary-container/20 border border-primary-container/40 px-space-sm py-1 rounded-lg shadow-[0_0_12px_rgba(245,158,11,0.25)] shrink-0">
            <span
              className="material-symbols-outlined text-primary text-title-md"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              local_fire_department
            </span>
            <span className="font-label-md text-label-md text-primary font-bold">
              {racha.diasActuales} Días
            </span>
          </div>

          {/* User Profile Avatar */}
          <div className="flex items-center pl-space-xs shrink-0">
            <img
              alt="Perfil de Estudiante"
              className="w-8 h-8 rounded-full object-cover ring-2 ring-primary/40 shadow-sm"
              src={avatarUrl}
            />
          </div>
        </div>
      </div>
    </header>
  );
};
