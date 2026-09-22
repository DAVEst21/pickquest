import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Header } from '../../components/Header';
import { Footer } from '../../components/Footer';
import { useFaseDetalle } from '../../services/queries';

export const MisionPage: React.FC = () => {
  const { faseId = '3' } = useParams<{ faseId: string }>();
  const navigate = useNavigate();
  const idNum = parseInt(faseId, 10);
  const { data } = useFaseDetalle(idNum);

  // Checkbox status for interactive checklist review
  const [checkedObjectives, setCheckedObjectives] = useState<Record<string, boolean>>({
    'obj-1': true,
    'obj-2': true,
    'obj-3': true,
  });

  const toggleObjective = (objId: string) => {
    setCheckedObjectives((prev) => ({
      ...prev,
      [objId]: !prev[objId],
    }));
  };

  const fase = data?.fase;
  const reto = data?.reto;

  return (
    <div className="bg-background min-h-screen flex flex-col text-on-surface">
      <Header />

      <main className="w-full pt-20 bg-background min-h-screen flex-1">
        <div className="flex flex-col w-full px-gutter py-space-lg max-w-7xl mx-auto">
          {/* Breadcrumb & Mode Tag */}
          <div className="flex items-center justify-between gap-space-sm mb-space-md">
            <div className="flex items-center gap-space-xs text-on-surface-variant font-label-md text-label-md">
              <Link to="/" className="hover:text-primary transition-colors flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px]">map</span>
                Overworld
              </Link>
              <span className="text-surface-bright">/</span>
              <span className="text-tertiary">Sector SDLC: Arquitectura</span>
              <span className="text-surface-bright">/</span>
              <span className="text-primary font-bold">CU-02 · Tablón de Misiones</span>
            </div>
          </div>

          {/* Main Hero Parchment Board */}
          <div className="relative w-full rounded-xl bg-surface-container-low shadow-xl overflow-hidden mb-space-lg border border-surface-container-high/40">
            {/* Ambient Radial Glows */}
            <div className="absolute -top-32 -right-32 w-96 h-96 bg-primary-container/10 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute -bottom-24 -left-20 w-80 h-80 bg-secondary-container/20 rounded-full blur-3xl pointer-events-none"></div>

            <div className="relative p-space-lg md:p-space-xl flex flex-col gap-space-lg">
              {/* Header Banner & Metadata */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md pb-space-md border-b border-surface-container-high/40">
                <div className="flex flex-col gap-space-xs">
                  <div className="flex flex-wrap items-center gap-space-xs">
                    <span className="px-space-sm py-0.5 rounded bg-primary-container/20 text-primary-fixed font-label-sm uppercase tracking-wider font-bold">
                      Misión Principal
                    </span>
                    <span className="px-space-sm py-0.5 rounded bg-tertiary/15 text-tertiary font-label-sm flex items-center gap-1 font-semibold">
                      <span className="material-symbols-outlined text-[14px]">bolt</span>
                      Dificultad {fase?.dificultad || 'Intermedia'}
                    </span>
                    <span className="px-space-sm py-0.5 rounded bg-surface-container-highest text-on-surface-variant font-label-sm flex items-center gap-1 font-semibold">
                      <span className="material-symbols-outlined text-[14px]">schedule</span>
                      {reto?.tiempoSugerido || '15 min'}
                    </span>
                  </div>
                  <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight mt-space-xs">
                    {reto?.titulo || 'Fase 03: Atributos de Calidad y Arquitectura'}
                  </h1>
                  <p className="font-body-lg text-body-lg text-on-surface-variant max-w-3xl">
                    {fase?.descripcionNarrativa ||
                      'La fortaleza digital del Reino experimenta latencia crítica y vulnerabilidades en sus accesos perimetrales. Evalúa los compromisos del sistema, equilibra los requisitos no funcionales y redacta el plano arquitectónico definitivo antes del despliegue masivo.'}
                  </p>
                </div>

                {/* Mastery Badge Hologram Pill */}
                <div className="flex flex-row lg:flex-col items-center justify-center p-space-md rounded-xl bg-surface-container-highest/60 backdrop-blur-md self-start lg:self-auto shrink-0 min-w-[200px] gap-2 border border-outline-variant/30 shadow-md">
                  <span className="font-label-sm text-label-sm uppercase tracking-widest text-on-surface-variant">
                    Rango Máximo
                  </span>
                  <div className="flex items-center gap-1 text-primary">
                    <span
                      className="material-symbols-outlined text-headline-sm"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      star
                    </span>
                    <span
                      className="material-symbols-outlined text-headline-sm"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      star
                    </span>
                    <span
                      className="material-symbols-outlined text-headline-sm"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      star
                    </span>
                  </div>
                  <span className="font-code-md text-label-sm text-tertiary">3 / 3 Estrellas de Maestría</span>
                </div>
              </div>

              {/* Bento Grid: Objectives vs Rewards */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg">
                {/* Left Column: Mission Objectives (7 Cols) */}
                <div className="lg:col-span-7 flex flex-col gap-space-md">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-space-xs">
                      <div className="w-2 h-5 rounded-full bg-primary"></div>
                      <h2 className="font-headline-sm text-headline-sm text-on-surface">Objetivos de la Misión</h2>
                    </div>
                    <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                      Obligatorio
                    </span>
                  </div>

                  <div className="flex flex-col gap-space-sm">
                    {/* Objective 1 */}
                    <label
                      onClick={() => toggleObjective('obj-1')}
                      className="group relative flex items-start gap-space-md p-space-md rounded-xl bg-surface-container hover:bg-surface-container-high transition-all cursor-pointer border border-surface-container-highest/40"
                    >
                      <div className="relative flex items-center justify-center mt-1">
                        <input
                          checked={!!checkedObjectives['obj-1']}
                          onChange={() => {}}
                          className="peer sr-only"
                          id="obj-1"
                          type="checkbox"
                        />
                        <div
                          className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all shadow-inner ${
                            checkedObjectives['obj-1']
                              ? 'bg-primary-container text-on-primary-container'
                              : 'bg-surface-container-lowest text-transparent'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[18px]">check</span>
                        </div>
                      </div>
                      <div className="flex flex-col flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-space-xs">
                          <span className="font-title-md text-title-md text-on-surface group-hover:text-primary transition-colors">
                            Identificar atributos no funcionales según ISO 25010
                          </span>
                          <span className="shrink-0 px-space-xs py-0.5 rounded bg-surface-container-highest text-tertiary font-label-sm text-label-sm font-bold">
                            Núcleo
                          </span>
                        </div>
                        <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
                          Categorizar anomalías en Seguridad (autenticación mTLS), Rendimiento (p99 &lt; 200ms) y
                          Usabilidad para el panel de operadores.
                        </p>
                      </div>
                    </label>

                    {/* Objective 2 */}
                    <label
                      onClick={() => toggleObjective('obj-2')}
                      className="group relative flex items-start gap-space-md p-space-md rounded-xl bg-surface-container hover:bg-surface-container-high transition-all cursor-pointer border border-surface-container-highest/40"
                    >
                      <div className="relative flex items-center justify-center mt-1">
                        <input
                          checked={!!checkedObjectives['obj-2']}
                          onChange={() => {}}
                          className="peer sr-only"
                          id="obj-2"
                          type="checkbox"
                        />
                        <div
                          className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all shadow-inner ${
                            checkedObjectives['obj-2']
                              ? 'bg-primary-container text-on-primary-container'
                              : 'bg-surface-container-lowest text-transparent'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[18px]">check</span>
                        </div>
                      </div>
                      <div className="flex flex-col flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-space-xs">
                          <span className="font-title-md text-title-md text-on-surface group-hover:text-primary transition-colors">
                            Analizar el dilema de trade-off arquitectónico
                          </span>
                          <span className="shrink-0 px-space-xs py-0.5 rounded bg-surface-container-highest text-secondary font-label-sm text-label-sm font-bold">
                            Toma de Decisión
                          </span>
                        </div>
                        <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
                          Resolver el conflicto entre Alta Disponibilidad distribuida (Consistencia eventual) vs. Cero
                          Tolerancia a Pérdida Financiera (ACID estricto).
                        </p>
                      </div>
                    </label>

                    {/* Objective 3: Precision Requirement */}
                    <label
                      onClick={() => toggleObjective('obj-3')}
                      className="group relative flex items-start gap-space-md p-space-md rounded-xl bg-surface-container hover:bg-surface-container-high transition-all cursor-pointer border border-surface-container-highest/40"
                    >
                      <div className="relative flex items-center justify-center mt-1">
                        <input
                          checked={!!checkedObjectives['obj-3']}
                          onChange={() => {}}
                          className="peer sr-only"
                          id="obj-3"
                          type="checkbox"
                        />
                        <div
                          className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all shadow-inner ${
                            checkedObjectives['obj-3']
                              ? 'bg-primary-container text-on-primary-container'
                              : 'bg-surface-container-lowest text-transparent'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[18px]">check</span>
                        </div>
                      </div>
                      <div className="flex flex-col flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-space-xs">
                          <span className="font-title-md text-title-md text-on-surface group-hover:text-primary transition-colors">
                            Alcanzar una precisión mínima del 80% (RN-03)
                          </span>
                          <span className="shrink-0 px-space-xs py-0.5 rounded bg-surface-container-highest text-primary font-label-sm text-label-sm font-bold">
                            Umbral Crítico
                          </span>
                        </div>
                        <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
                          Requisito mandatorio para desbloquear la fase posterior de CI/CD automatizado y acreditar el
                          botín completo sin penalizaciones de XP.
                        </p>
                        {/* Micro Progress Gauge */}
                        <div className="mt-space-sm flex items-center gap-space-sm">
                          <div className="flex-1 h-2 rounded-full bg-surface-container-lowest overflow-hidden p-[1px]">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-primary to-tertiary"
                              style={{ width: '80%' }}
                            ></div>
                          </div>
                          <span className="font-code-md text-label-sm text-primary font-bold">80% Requerido</span>
                        </div>
                      </div>
                    </label>
                  </div>

                  {/* Architecture Blueprint Preview Card */}
                  <div className="p-space-md rounded-xl bg-surface-container-lowest flex flex-col md:flex-row items-center gap-space-md border border-surface-container-high/40">
                    <div className="w-full md:w-36 h-24 rounded-lg bg-surface-container overflow-hidden shrink-0 relative flex items-center justify-center border border-outline-variant/20">
                      {/* Decorative Architectural Vector Diagram */}
                      <svg className="w-full h-full p-2 text-on-surface-variant" fill="none" stroke="currentColor" viewBox="0 0 160 100">
                        <rect className="stroke-tertiary" height="28" rx="4" strokeWidth="1.5" width="40" x="15" y="15"></rect>
                        <text className="text-[8px] font-label-sm" fill="currentColor" textAnchor="middle" x="35" y="32">API GW</text>
                        <rect className="stroke-primary" height="28" rx="4" strokeWidth="1.5" width="40" x="105" y="15"></rect>
                        <text className="text-[8px] font-label-sm" fill="currentColor" textAnchor="middle" x="125" y="32">AUTH</text>
                        <rect className="stroke-secondary" height="28" rx="4" strokeWidth="1.5" width="40" x="60" y="60"></rect>
                        <text className="text-[8px] font-label-sm" fill="currentColor" textAnchor="middle" x="80" y="77">CORE</text>
                        <path d="M55 29 H105" stroke="currentColor" strokeDasharray="2 2" strokeWidth="1.5"></path>
                        <path d="M35 43 V74 H60" stroke="currentColor" strokeWidth="1.5"></path>
                        <path d="M125 43 V74 H100" stroke="currentColor" strokeWidth="1.5"></path>
                      </svg>
                    </div>
                    <div className="flex flex-col gap-1 min-w-0">
                      <span className="font-label-sm text-label-sm text-tertiary uppercase tracking-wider font-bold">
                        Artefacto de Contexto
                      </span>
                      <span className="font-title-md text-title-md text-on-surface font-semibold">
                        Escenario: Sistema de Telemetría Bancaria
                      </span>
                      <p className="font-body-sm text-body-sm text-on-surface-variant">
                        Se te presentará un caso interactivo con diagramas modulares y matrices de decisión antes de
                        confirmar tu pull request conceptual.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Right Column: Loot & Rewards (RN-02) (5 Cols) */}
                <div className="lg:col-span-5 flex flex-col gap-space-md">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-space-xs">
                      <div className="w-2 h-5 rounded-full bg-secondary"></div>
                      <h2 className="font-headline-sm text-headline-sm text-on-surface">Botín y Recompensas</h2>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-space-sm">
                    {/* XP Bounty */}
                    <div className="p-space-md rounded-xl bg-surface-container flex items-center gap-space-md hover:bg-surface-container-high transition-all border border-surface-container-highest/40">
                      <div className="w-12 h-12 rounded-xl bg-secondary-container/40 flex items-center justify-center shrink-0 shadow-inner">
                        <span className="material-symbols-outlined text-secondary text-[26px]">psychology</span>
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-space-xs">
                          <span className="font-headline-sm text-headline-sm text-secondary font-bold">
                            +{reto?.recompensas?.xp || 350} XP
                          </span>
                        </div>
                        <span className="font-body-sm text-body-sm text-on-surface-variant">
                          Experiencia de Desarrollador (Aumenta Rango SDLC)
                        </span>
                      </div>
                    </div>

                    {/* QP Bounty */}
                    <div className="p-space-md rounded-xl bg-surface-container flex items-center gap-space-md hover:bg-surface-container-high transition-all border border-surface-container-highest/40">
                      <div className="w-12 h-12 rounded-xl bg-primary-container/20 flex items-center justify-center shrink-0 shadow-inner">
                        <span className="material-symbols-outlined text-primary text-[26px]">toll</span>
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-space-xs">
                          <span className="font-headline-sm text-headline-sm text-primary font-bold">
                            +{reto?.recompensas?.qp || 120} QP
                          </span>
                        </div>
                        <span className="font-body-sm text-body-sm text-on-surface-variant">
                          Puntos de Calidad (Canjeables en Tienda de Gremio)
                        </span>
                      </div>
                    </div>

                    {/* Guaranteed Item Loot Card */}
                    <div className="p-space-md rounded-xl bg-surface-container flex items-start gap-space-md hover:bg-surface-container-high transition-all relative overflow-hidden border border-surface-container-highest/40">
                      <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-tertiary-container/10 rounded-full blur-xl pointer-events-none"></div>
                      <div className="w-12 h-12 rounded-xl bg-tertiary-container/20 flex items-center justify-center shrink-0 shadow-inner mt-0.5">
                        <span className="material-symbols-outlined text-tertiary text-[26px]">history_edu</span>
                      </div>
                      <div className="flex flex-col flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-title-md text-title-md text-on-surface font-semibold truncate">
                            {reto?.recompensas?.itemGarantizado?.nombre || 'Pergamino de Refactorización'}
                          </span>
                          <span className="px-space-xs py-0.5 rounded bg-tertiary/15 text-tertiary font-label-sm text-label-sm uppercase shrink-0 font-bold">
                            Garantizado
                          </span>
                        </div>
                        <span className="font-label-sm text-label-sm text-tertiary mt-0.5">
                          {reto?.recompensas?.itemGarantizado?.tipo || 'Ítem Consumible de Inventario'}
                        </span>
                        <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
                          {reto?.recompensas?.itemGarantizado?.descripcion ||
                            'Permite resetear una decisión errónea en una prueba de pipeline o corregir una respuesta en exámenes de boss sin penalizar vida (HP).'}
                        </p>
                      </div>
                    </div>

                    {/* Mastery Tier Card */}
                    <div className="p-space-md rounded-xl bg-surface-container flex items-center justify-between gap-space-md border border-surface-container-highest/40">
                      <div className="flex items-center gap-space-sm">
                        <div className="w-10 h-10 rounded-xl bg-surface-container-highest flex items-center justify-center text-primary">
                          <span className="material-symbols-outlined text-[22px]">military_tech</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="font-title-md text-title-md text-on-surface">Rango de Maestría</span>
                          <span className="font-body-sm text-body-sm text-on-surface-variant">
                            {reto?.recompensas?.rangoMaestria || 'Hasta 3 Estrellas de prestigio'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-primary">
                        <span
                          className="material-symbols-outlined text-title-lg"
                          style={{ fontVariationSettings: "'FILL' 1" }}
                        >
                          star
                        </span>
                        <span
                          className="material-symbols-outlined text-title-lg"
                          style={{ fontVariationSettings: "'FILL' 1" }}
                        >
                          star
                        </span>
                        <span
                          className="material-symbols-outlined text-title-lg"
                          style={{ fontVariationSettings: "'FILL' 1" }}
                        >
                          star
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Footer Deck (CU-02 -> CU-03 Transition) */}
              <div className="pt-space-lg flex flex-col sm:flex-row items-center justify-between gap-space-md border-t border-surface-container-high/40">
                {/* Return Navigation */}
                <Link
                  to="/"
                  className="w-full sm:w-auto px-space-lg py-space-sm rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-title-md text-title-md flex items-center justify-center gap-space-xs transition-all shadow-md group border border-outline-variant/30"
                >
                  <span className="material-symbols-outlined text-[20px] group-hover:-translate-x-1 transition-transform">
                    arrow_back
                  </span>
                  <span>Regresar al Mapa</span>
                </Link>

                {/* Stats Quick Snapshot */}
                <div className="hidden md:flex items-center gap-space-md text-on-surface-variant font-code-md text-label-sm">
                  <div className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-primary text-[16px]">verified</span>
                    <span>Prerrequisito: Fase 02 Completa</span>
                  </div>
                </div>

                {/* Initiate Challenge Action (Primary CTA -> CU-03) */}
                <button
                  onClick={() => navigate(`/reto/${fase?.id || 3}`)}
                  id="btn-iniciar-reto"
                  className="w-full sm:w-auto px-space-xl py-3 rounded-xl bg-primary-container hover:brightness-110 active:scale-[0.98] text-on-primary-container font-title-lg text-title-lg font-bold flex items-center justify-center gap-space-sm transition-all shadow-[0_8px_20px_-4px_rgba(245,158,11,0.5)]"
                >
                  <span>Iniciar Reto</span>
                  <span className="material-symbols-outlined text-[22px]">play_arrow</span>
                </button>
              </div>
            </div>
          </div>

          {/* Guild Intel / Community Tip Callout */}
          <div className="w-full p-space-md rounded-xl bg-surface-container flex flex-col md:flex-row items-start md:items-center justify-between gap-space-md border border-surface-container-high/40">
            <div className="flex items-center gap-space-md">
              <div className="w-10 h-10 rounded-full bg-secondary-container/40 flex items-center justify-center text-secondary shrink-0">
                <span className="material-symbols-outlined text-[20px]">forum</span>
              </div>
              <div className="flex flex-col">
                <span className="font-title-md text-title-md text-on-surface font-semibold">
                  Consejo del Archimago de Calidad:
                </span>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  "No sacrifiques la observabilidad en aras de la micro-optimización de CPU. En producción, un sistema que
                  no habla es un sistema caído."
                </p>
              </div>
            </div>
            <div className="flex items-center gap-space-xs text-on-surface-variant font-label-sm text-label-sm shrink-0">
              <span className="material-symbols-outlined text-[16px]">groups</span>
              <span>1,842 desarrolladores superaron este contrato</span>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};
