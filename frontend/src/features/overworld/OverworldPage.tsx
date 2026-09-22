import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../../components/Header';
import { Footer } from '../../components/Footer';
import { useFases } from '../../services/queries';
import type { Fase } from '../../types';

export const OverworldPage: React.FC = () => {
  const navigate = useNavigate();
  const { data: fases } = useFases();
  const [selectedFaseModal, setSelectedFaseModal] = useState<Fase | null>(null);

  const activeFase = fases?.find((f) => f.estado === 'en_progreso') || fases?.[2];

  const handleCardClick = (fase: Fase) => {
    if (fase.estado === 'bloqueada') {
      return;
    }
    navigate(`/mision/${fase.id}`);
  };

  const openQuickModal = (e: React.MouseEvent, fase: Fase) => {
    e.stopPropagation();
    setSelectedFaseModal(fase);
  };

  return (
    <div className="bg-background min-h-screen flex flex-col text-on-surface">
      <Header />

      <main className="w-full pt-20 bg-background flex-1">
        <div className="flex flex-col w-full">
          {/* Dynamic Map Atmosphere Layer */}
          <div className="relative w-full px-gutter py-space-lg max-w-7xl mx-auto flex flex-col gap-space-lg">
            {/* Top HUD Strip: Context, Season, and Quick Telemetry */}
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-space-md bg-surface-container-low/70 backdrop-blur-md p-space-md lg:p-space-lg rounded-xl shadow-md border border-surface-container-high/50">
              <div className="flex items-center gap-space-md">
                <div className="w-12 h-12 rounded-xl bg-surface-container-high flex items-center justify-center text-primary shadow-inner">
                  <span
                    className="material-symbols-outlined text-headline-sm"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    explore
                  </span>
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-space-xs">
                    <span className="font-label-sm text-label-sm uppercase tracking-widest text-tertiary">
                      CU-01 · Mapa General
                    </span>
                    <span className="font-label-sm text-label-sm text-on-surface-variant">/</span>
                    <span className="font-label-sm text-label-sm text-primary-fixed-dim uppercase tracking-wider">
                      Temporada 1
                    </span>
                  </div>
                  <h1 className="font-headline-md text-headline-md text-on-surface">Overworld SDLC</h1>
                </div>
              </div>

              {/* Quick Legend & Progress Telemetry */}
              <div className="flex flex-wrap items-center gap-space-sm bg-surface-container-lowest/80 p-space-xs lg:p-space-sm rounded-xl border border-surface-container-high/40">
                <div className="flex items-center gap-space-xs px-space-sm py-space-xs rounded-lg bg-surface-container-low">
                  <span className="w-2.5 h-2.5 rounded-full bg-tertiary"></span>
                  <span className="font-label-sm text-label-sm text-on-surface">Completado (2)</span>
                </div>
                <div className="flex items-center gap-space-xs px-space-sm py-space-xs rounded-lg bg-surface-container-low">
                  <span className="w-2.5 h-2.5 rounded-full bg-primary-container shadow-[0_0_8px_rgba(245,158,11,0.8)] animate-pulse"></span>
                  <span className="font-label-sm text-label-sm text-primary font-bold">En Progreso (1)</span>
                </div>
                <div className="flex items-center gap-space-xs px-space-sm py-space-xs rounded-lg bg-surface-container-low">
                  <span className="w-2.5 h-2.5 rounded-full bg-secondary"></span>
                  <span className="font-label-sm text-label-sm text-on-surface-variant">Desbloqueado (1)</span>
                </div>
                <div className="flex items-center gap-space-xs px-space-sm py-space-xs rounded-lg bg-surface-container-low">
                  <span className="w-2.5 h-2.5 rounded-full bg-surface-bright"></span>
                  <span className="font-label-sm text-label-sm text-on-surface-variant/70">Bloqueado (3)</span>
                </div>
              </div>
            </div>

            {/* Active Quest Spotlight Banner (Targeting Node 03) */}
            {activeFase && (
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
                    <div className="flex items-center gap-space-xs">
                      <span className="font-label-sm text-label-sm bg-primary-container text-on-primary-container font-bold px-space-xs py-0.5 rounded uppercase">
                        TÚ ESTÁS AQUÍ
                      </span>
                      <span className="font-label-sm text-label-sm text-primary">
                        {activeFase.sprint || 'Sprint 1 · En Ejecución'}
                      </span>
                    </div>
                    <span className="font-title-lg text-title-lg text-on-surface">
                      Fase Activa: {activeFase.nombre}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-space-sm z-10 w-full md:w-auto">
                  <button
                    onClick={() => setSelectedFaseModal(activeFase)}
                    className="w-full md:w-auto px-space-lg py-space-sm rounded-lg bg-primary-container hover:bg-primary text-on-primary-container font-title-md text-title-md flex items-center justify-center gap-space-xs shadow-lg transition-all active:translate-y-0.5"
                    id="btn-quick-inspect"
                  >
                    <span className="material-symbols-outlined text-title-md">visibility</span>
                    <span>Ver objetivos y recompensas</span>
                  </button>
                </div>
              </div>
            )}

            {/* Overworld Path Graph Canvas Container */}
            <div className="relative w-full bg-surface-container-lowest rounded-xl p-space-md lg:p-space-xl shadow-2xl overflow-x-auto border border-surface-container-high/40">
              <div className="relative min-w-[960px] pb-space-lg">
                {/* SVG Connections Vector Graph */}
                <svg
                  className="absolute inset-0 w-full h-full pointer-events-none"
                  fill="none"
                  preserveAspectRatio="none"
                  viewBox="0 0 1000 680"
                  aria-hidden="true"
                >
                  {/* Flow Line 1 -> 2 (Completed) */}
                  <path
                    className="opacity-80"
                    d="M 200 110 L 460 110"
                    stroke="#54ddfc"
                    strokeDasharray="6 6"
                    strokeLinecap="round"
                    strokeWidth="4"
                  />
                  {/* Flow Line 2 -> 3 (Transition to Active) */}
                  <path
                    d="M 540 110 C 720 110, 780 200, 780 280"
                    stroke="#54ddfc"
                    strokeLinecap="round"
                    strokeWidth="4"
                  />
                  {/* Flow Line 3 -> 4 (Active to Unlocked) */}
                  <path
                    className="animate-pulse"
                    d="M 720 330 C 580 330, 480 380, 480 440"
                    stroke="#f59e0b"
                    strokeDasharray="8 6"
                    strokeLinecap="round"
                    strokeWidth="4"
                  />
                  {/* Flow Line 4 -> 5 (Unlocked to Locked) */}
                  <path
                    d="M 400 470 C 260 470, 220 520, 220 570"
                    stroke="#2d3449"
                    strokeDasharray="6 6"
                    strokeLinecap="round"
                    strokeWidth="3"
                  />
                  {/* Flow Line 5 -> 6 (Locked) */}
                  <path
                    d="M 300 600 L 520 600"
                    stroke="#2d3449"
                    strokeDasharray="6 6"
                    strokeLinecap="round"
                    strokeWidth="3"
                  />
                  {/* Flow Line 6 -> 7 (Locked) */}
                  <path
                    d="M 600 600 L 820 600"
                    stroke="#2d3449"
                    strokeDasharray="6 6"
                    strokeLinecap="round"
                    strokeWidth="3"
                  />
                </svg>

                {/* Node Map Layout Matrix (7 Phases) */}
                <div className="relative z-10 grid grid-cols-12 gap-y-16">
                  {/* FASE 01: Planificación (Completed) */}
                  <div className="col-span-4 flex flex-col items-center">
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => handleCardClick(fases?.[0] || ({} as Fase))}
                      onKeyDown={(e) => e.key === 'Enter' && handleCardClick(fases?.[0] || ({} as Fase))}
                      className="group relative w-72 bg-surface-container rounded-xl p-space-md shadow-md transition-all hover:bg-surface-container-high cursor-pointer border border-tertiary/20"
                    >
                      <div className="flex items-center justify-between mb-space-xs">
                        <span className="font-label-sm text-label-sm text-tertiary">FASE 01 · 100%</span>
                        <span
                          className="material-symbols-outlined text-tertiary text-title-md"
                          style={{ fontVariationSettings: "'FILL' 1" }}
                        >
                          verified
                        </span>
                      </div>
                      <div className="flex items-center gap-space-sm mb-space-sm">
                        <div className="w-10 h-10 rounded-lg bg-tertiary-container/30 text-tertiary flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-headline-sm">event_note</span>
                        </div>
                        <div className="min-w-0">
                          <h2 className="font-title-md text-title-md text-on-surface truncate">Planificación</h2>
                          <span className="font-body-sm text-body-sm text-on-surface-variant">
                            Sprint 0 · Alcance y Épicas
                          </span>
                        </div>
                      </div>
                      {/* Rating Stars */}
                      <div className="flex items-center justify-between pt-space-xs bg-surface-container-low px-space-sm py-space-xs rounded-lg">
                        <span className="font-label-sm text-label-sm text-on-surface-variant">Calificación:</span>
                        <div className="flex items-center text-primary-container text-label-md">
                          <span className="material-symbols-outlined text-label-md" style={{ fontVariationSettings: "'FILL' 1" }}>
                            star
                          </span>
                          <span className="material-symbols-outlined text-label-md" style={{ fontVariationSettings: "'FILL' 1" }}>
                            star
                          </span>
                          <span className="material-symbols-outlined text-label-md" style={{ fontVariationSettings: "'FILL' 1" }}>
                            star
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="col-span-1"></div>

                  {/* FASE 02: Elicitación de Requerimientos (Completed) */}
                  <div className="col-span-4 flex flex-col items-center">
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => handleCardClick(fases?.[1] || ({} as Fase))}
                      onKeyDown={(e) => e.key === 'Enter' && handleCardClick(fases?.[1] || ({} as Fase))}
                      className="group relative w-72 bg-surface-container rounded-xl p-space-md shadow-md transition-all hover:bg-surface-container-high cursor-pointer border border-tertiary/20"
                    >
                      <div className="flex items-center justify-between mb-space-xs">
                        <span className="font-label-sm text-label-sm text-tertiary">FASE 02 · 100%</span>
                        <span
                          className="material-symbols-outlined text-tertiary text-title-md"
                          style={{ fontVariationSettings: "'FILL' 1" }}
                        >
                          check_circle
                        </span>
                      </div>
                      <div className="flex items-center gap-space-sm mb-space-sm">
                        <div className="w-10 h-10 rounded-lg bg-tertiary-container/30 text-tertiary flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-headline-sm">contactless</span>
                        </div>
                        <div className="min-w-0">
                          <h2 className="font-title-md text-title-md text-on-surface truncate">Elicitación Req.</h2>
                          <span className="font-body-sm text-body-sm text-on-surface-variant">
                            User Stories &amp; Criterios
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-space-xs bg-surface-container-low px-space-sm py-space-xs rounded-lg">
                        <span className="font-label-sm text-label-sm text-on-surface-variant">Recompensa:</span>
                        <span className="font-label-sm text-label-sm text-primary font-bold">+250 QP</span>
                      </div>
                    </div>
                  </div>

                  <div className="col-span-3"></div>

                  {/* FASE 03: Atributos de Calidad y Arquitectura (EN PROGRESO / ACTIVA) */}
                  <div className="col-span-12 flex justify-end pr-12 -mt-4">
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => handleCardClick(fases?.[2] || ({} as Fase))}
                      onKeyDown={(e) => e.key === 'Enter' && handleCardClick(fases?.[2] || ({} as Fase))}
                      className="relative w-84 bg-surface-container-high rounded-xl p-space-lg shadow-2xl transition-transform hover:scale-[1.02] cursor-pointer border-2 border-primary-container/60"
                      id="active-node-card"
                    >
                      {/* Radiant Badge: You Are Here */}
                      <div className="absolute -top-4 left-space-md flex items-center gap-space-xs bg-primary-container text-on-primary-container px-space-sm py-1 rounded-full shadow-lg">
                        <span className="material-symbols-outlined text-label-md animate-bounce">location_on</span>
                        <span className="font-label-sm text-label-sm font-bold tracking-wider uppercase">
                          TÚ ESTÁS AQUÍ
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-space-xs mb-space-xs">
                        <span className="font-label-sm text-label-sm text-primary font-bold">FASE 03 · SPRINT 1</span>
                        <span className="font-code-md text-label-sm text-primary-fixed-dim bg-primary/10 px-space-xs py-0.5 rounded">
                          65% Progreso
                        </span>
                      </div>
                      <div className="flex items-center gap-space-md mb-space-md">
                        <div className="relative w-12 h-12 rounded-xl bg-primary-container/20 text-primary-container flex items-center justify-center shrink-0 shadow-inner">
                          <span className="material-symbols-outlined text-headline-sm">account_tree</span>
                          <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-primary-container rounded-full ring-2 ring-surface-container-high"></span>
                        </div>
                        <div className="min-w-0">
                          <h2 className="font-headline-sm text-headline-sm text-on-surface">Calidad &amp; Arquitectura</h2>
                          <span className="font-body-sm text-body-sm text-on-surface-variant">
                            Tácticas de Disponibilidad &amp; C4
                          </span>
                        </div>
                      </div>
                      {/* Micro XP Bar */}
                      <div className="w-full bg-surface-container-lowest h-2 rounded-full mb-space-md overflow-hidden">
                        <div className="bg-gradient-to-r from-primary-container to-primary h-full rounded-full w-[65%] shadow-[0_0_8px_rgba(245,158,11,0.6)]"></div>
                      </div>
                      <div className="flex items-center justify-between gap-space-sm">
                        <div className="flex items-center gap-space-xs text-on-surface-variant font-label-sm text-label-sm">
                          <span className="material-symbols-outlined text-label-md text-secondary">token</span>
                          <span>Bounty: 400 QP</span>
                        </div>
                        <button
                          onClick={(e) => openQuickModal(e, fases?.[2] || ({} as Fase))}
                          className="px-space-md py-space-xs bg-primary-container hover:bg-primary text-on-primary-container font-title-md text-title-md rounded-lg shadow transition-colors flex items-center gap-1"
                        >
                          <span>Ver objetivos</span>
                          <span className="material-symbols-outlined text-title-md">arrow_forward</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* FASE 04: Diseño Detallado (Desbloqueado) */}
                  <div className="col-span-12 flex justify-center -mt-2">
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => handleCardClick(fases?.[3] || ({} as Fase))}
                      onKeyDown={(e) => e.key === 'Enter' && handleCardClick(fases?.[3] || ({} as Fase))}
                      className="group relative w-72 bg-surface-container rounded-xl p-space-md shadow-md transition-all hover:bg-surface-container-high cursor-pointer border border-secondary/30"
                    >
                      <div className="flex items-center justify-between mb-space-xs">
                        <span className="font-label-sm text-label-sm text-secondary">FASE 04 · DISPONIBLE</span>
                        <span className="material-symbols-outlined text-secondary text-title-md">lock_open</span>
                      </div>
                      <div className="flex items-center gap-space-sm mb-space-sm">
                        <div className="w-10 h-10 rounded-lg bg-secondary-container/30 text-secondary flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-headline-sm">architecture</span>
                        </div>
                        <div className="min-w-0">
                          <h2 className="font-title-md text-title-md text-on-surface truncate">Diseño Detallado</h2>
                          <span className="font-body-sm text-body-sm text-on-surface-variant">
                            Diagramas de Clase &amp; Esquemas
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-space-xs bg-surface-container-low px-space-sm py-space-xs rounded-lg">
                        <span className="font-label-sm text-label-sm text-on-surface-variant">Estado:</span>
                        <span className="font-label-sm text-label-sm text-secondary font-semibold">Listo para iniciar</span>
                      </div>
                    </div>
                  </div>

                  {/* FASE 05: Implementación (Bloqueado por RN-01) */}
                  <div className="col-span-4 flex flex-col items-center">
                    <div className="relative w-72 bg-surface-container-low/60 rounded-xl p-space-md shadow-inner cursor-not-allowed opacity-75 group border border-outline-variant/20">
                      <div className="flex items-center justify-between mb-space-xs">
                        <span className="font-label-sm text-label-sm text-on-surface-variant/60">FASE 05 · BLOQUEADA</span>
                        <span className="material-symbols-outlined text-on-surface-variant text-title-md">lock</span>
                      </div>
                      <div className="flex items-center gap-space-sm mb-space-sm">
                        <div className="w-10 h-10 rounded-lg bg-surface-container-highest/40 text-on-surface-variant/50 flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-headline-sm">code</span>
                        </div>
                        <div className="min-w-0">
                          <h2 className="font-title-md text-title-md text-on-surface-variant/80 truncate">
                            Implementación
                          </h2>
                          <span className="font-body-sm text-body-sm text-on-surface-variant/50">
                            Clean Code &amp; Repositorio
                          </span>
                        </div>
                      </div>
                      <div className="pt-space-xs bg-surface-container-lowest/60 px-space-sm py-space-xs rounded-lg flex items-center gap-space-xs">
                        <span className="material-symbols-outlined text-label-sm text-error">info</span>
                        <span className="font-label-sm text-label-sm text-on-surface-variant/70 truncate">
                          RN-01: Requiere fase anterior
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* FASE 06: Pruebas y Validación (Bloqueado) */}
                  <div className="col-span-4 flex flex-col items-center">
                    <div className="relative w-72 bg-surface-container-low/60 rounded-xl p-space-md shadow-inner cursor-not-allowed opacity-75 border border-outline-variant/20">
                      <div className="flex items-center justify-between mb-space-xs">
                        <span className="font-label-sm text-label-sm text-on-surface-variant/60">FASE 06 · BLOQUEADA</span>
                        <span className="material-symbols-outlined text-on-surface-variant text-title-md">lock</span>
                      </div>
                      <div className="flex items-center gap-space-sm mb-space-sm">
                        <div className="w-10 h-10 rounded-lg bg-surface-container-highest/40 text-on-surface-variant/50 flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-headline-sm">rule</span>
                        </div>
                        <div className="min-w-0">
                          <h2 className="font-title-md text-title-md text-on-surface-variant/80 truncate">
                            Pruebas &amp; Val.
                          </h2>
                          <span className="font-body-sm text-body-sm text-on-surface-variant/50">
                            Unit, E2E &amp; Mutaciones
                          </span>
                        </div>
                      </div>
                      <div className="pt-space-xs bg-surface-container-lowest/60 px-space-sm py-space-xs rounded-lg flex items-center gap-space-xs">
                        <span className="material-symbols-outlined text-label-sm text-error">info</span>
                        <span className="font-label-sm text-label-sm text-on-surface-variant/70 truncate">
                          RN-01: Requiere fase anterior
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* FASE 07: Despliegue y Entrega (Bloqueado - BOSS RAID) */}
                  <div className="col-span-4 flex flex-col items-center">
                    <div className="relative w-72 bg-surface-container-low/60 rounded-xl p-space-md shadow-inner cursor-not-allowed opacity-75 border border-outline-variant/20">
                      <div className="flex items-center justify-between mb-space-xs">
                        <span className="font-label-sm text-label-sm text-on-surface-variant/60">FASE 07 · BOSS RAID</span>
                        <span className="material-symbols-outlined text-on-surface-variant text-title-md">lock</span>
                      </div>
                      <div className="flex items-center gap-space-sm mb-space-sm">
                        <div className="w-10 h-10 rounded-lg bg-surface-container-highest/40 text-on-surface-variant/50 flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-headline-sm">rocket_launch</span>
                        </div>
                        <div className="min-w-0">
                          <h2 className="font-title-md text-title-md text-on-surface-variant/80 truncate">Despliegue</h2>
                          <span className="font-body-sm text-body-sm text-on-surface-variant/50">
                            Pipeline CI/CD a Producción
                          </span>
                        </div>
                      </div>
                      <div className="pt-space-xs bg-surface-container-lowest/60 px-space-sm py-space-xs rounded-lg flex items-center gap-space-xs">
                        <span className="material-symbols-outlined text-label-sm text-error">info</span>
                        <span className="font-label-sm text-label-sm text-on-surface-variant/70 truncate">
                          RN-01: Requiere fase anterior
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Modal Drawer for Active Challenge (CU-01 Quick Inspect) */}
            {selectedFaseModal && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center p-gutter bg-surface-container-lowest/80 backdrop-blur-md transition-opacity duration-200"
                onClick={() => setSelectedFaseModal(null)}
                role="dialog"
                aria-modal="true"
                aria-labelledby="modal-title"
              >
                <div
                  className="relative w-full max-w-xl bg-surface-container rounded-xl shadow-2xl p-space-lg overflow-hidden border border-outline-variant/30"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between mb-space-md">
                    <div className="flex items-center gap-space-sm">
                      <span className="material-symbols-outlined text-primary text-headline-sm">token</span>
                      <div>
                        <span className="font-label-sm text-label-sm text-primary uppercase">
                          Fase 0{selectedFaseModal.id} · Reto Activo
                        </span>
                        <h3 id="modal-title" className="font-title-lg text-title-lg text-on-surface">
                          {selectedFaseModal.nombre}
                        </h3>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedFaseModal(null)}
                      className="w-8 h-8 rounded-lg bg-surface-container-high hover:bg-surface-bright flex items-center justify-center text-on-surface-variant"
                      aria-label="Cerrar modal"
                    >
                      <span className="material-symbols-outlined text-title-md">close</span>
                    </button>
                  </div>

                  <div className="space-y-space-md mb-space-lg">
                    <div className="bg-surface-container-low p-space-md rounded-lg">
                      <span className="font-label-sm text-label-sm text-tertiary uppercase">Objetivo Primario</span>
                      <p className="font-body-md text-body-md text-on-surface mt-1">
                        {selectedFaseModal.descripcionNarrativa ||
                          'Diseña el diagrama de componentes C4 para resolver un cuello de botella de 15,000 req/s conservando la tolerancia a fallos en el cluster de pagos.'}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-space-sm">
                      <div className="bg-surface-container-low p-space-sm rounded-lg flex flex-col">
                        <span className="font-label-sm text-label-sm text-on-surface-variant">Recompensa XP</span>
                        <span className="font-headline-sm text-headline-sm text-tertiary font-bold">
                          +{selectedFaseModal.recompensaXp || 650} XP
                        </span>
                      </div>
                      <div className="bg-surface-container-low p-space-sm rounded-lg flex flex-col">
                        <span className="font-label-sm text-label-sm text-on-surface-variant">Bounty Monedas</span>
                        <span className="font-headline-sm text-headline-sm text-primary font-bold">
                          {selectedFaseModal.recompensaQp || 400} QP
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-space-sm">
                    <button
                      onClick={() => setSelectedFaseModal(null)}
                      className="px-space-md py-space-sm rounded-lg bg-surface-container-high text-on-surface font-title-md text-title-md hover:bg-surface-bright transition-colors"
                    >
                      Cerrar
                    </button>
                    <button
                      onClick={() => navigate(`/mision/${selectedFaseModal.id}`)}
                      className="px-space-lg py-space-sm rounded-lg bg-primary-container hover:bg-primary text-on-primary-container font-title-md text-title-md flex items-center gap-space-xs transition-colors"
                    >
                      <span>Ir a la Misión</span>
                      <span className="material-symbols-outlined text-title-md">arrow_forward</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};
