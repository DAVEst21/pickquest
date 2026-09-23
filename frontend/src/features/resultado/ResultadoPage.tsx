import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Header } from '../../components/Header';
import { Footer } from '../../components/Footer';
import { useIntento } from '../../services/queries';

export const ResultadoPage: React.FC = () => {
  const { intentoId = '204' } = useParams<{ intentoId: string }>();
  const navigate = useNavigate();
  const idNum = parseInt(intentoId, 10);
  const { data: intento } = useIntento(idNum);

  const [isTechGuideOpen, setIsTechGuideOpen] = useState(false);
  const [animOffset, setAnimOffset] = useState(314.159); // Full circle circumference (2 * pi * 50)

  const porcentaje = intento?.porcentaje ?? 68;
  const targetThreshold = 80;
  const brecha = Math.max(0, targetThreshold - porcentaje);

  // Circumference = 2 * Math.PI * 50 = 314.159
  const circumference = 314.159;
  const targetOffset = circumference * (1 - porcentaje / 100);

  useEffect(() => {
    // Animate radial progress on mount
    const timer = setTimeout(() => {
      setAnimOffset(targetOffset);
    }, 150);
    return () => clearTimeout(timer);
  }, [targetOffset]);

  const hitos = intento?.desgloseHitos || [
    {
      id: 'hito-1',
      nombre: 'Elicitación de Requisitos del Sistema',
      descripcion: 'Identificación de actores y casos de uso con precisión estricta.',
      puntos: 35,
      superado: true,
    },
    {
      id: 'hito-2',
      nombre: 'Clasificación Estándar ISO 25010',
      descripcion: 'Confusión detectada entre requisitos de Rendimiento y Fiabilidad.',
      puntos: 0,
      superado: false,
    },
    {
      id: 'hito-3',
      nombre: 'Análisis de Trade-offs y Factibilidad',
      descripcion: 'Balance balanceado entre coste de almacenamiento y latencia de red.',
      puntos: 33,
      superado: true,
    },
  ];

  const hitosAprobados = hitos.filter((h) => h.superado).length;

  return (
    <div className="bg-background min-h-screen flex flex-col text-on-surface">
      <Header />

      <main className="w-full pt-20 bg-background min-h-screen flex-1">
        <div className="flex flex-col w-full">
          {/* Dynamic Ambient Backing Glows */}
          <div className="relative w-full max-w-7xl mx-auto px-gutter py-space-xl overflow-hidden">
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary-container/10 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute top-1/3 right-10 w-80 h-80 bg-secondary-container/15 rounded-full blur-3xl pointer-events-none"></div>

            {/* Breadcrumb & Mission Header Context */}
            <div className="flex flex-wrap items-center justify-between gap-space-sm mb-space-lg relative z-10">
              <div className="flex items-center gap-space-xs text-on-surface-variant font-label-md text-label-md">
                <Link to="/" className="hover:text-primary transition-colors flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">map</span>
                  Overworld
                </Link>
                <span className="font-label-sm text-label-sm opacity-40">/</span>
                <span className="text-on-surface">Sector II: Ingeniería de Requisitos</span>
                <span className="font-label-sm text-label-sm opacity-40">/</span>
                <span className="text-primary font-bold">Misión #{intento?.retoId || '204'}</span>
              </div>
              <div className="flex items-center gap-space-xs bg-surface-container-high px-space-md py-space-xs rounded-full border border-surface-container-highest">
                <span className="font-label-sm text-label-sm text-on-surface-variant uppercase">Intento:</span>
                <span className="font-code-md text-label-md text-primary font-bold">#2 Registrado</span>
              </div>
            </div>

            {/* Main Verdict Card Structure */}
            <div className="relative z-10 w-full bg-surface-container-low rounded-xl shadow-xl overflow-hidden mb-space-lg border border-surface-container-high/40">
              {/* Card Top Decorative Tone Bar */}
              <div className="w-full h-1.5 bg-gradient-to-r from-primary-container via-secondary to-tertiary"></div>

              <div className="p-space-lg sm:p-space-xl flex flex-col items-center text-center">
                {/* Badge State & Title */}
                <div className="inline-flex items-center gap-space-xs px-space-md py-space-xs rounded-full bg-primary-container/15 text-primary mb-space-sm border border-primary-container/30">
                  <span className="material-symbols-outlined text-title-md">upgrade</span>
                  <span className="font-label-md text-label-md uppercase tracking-wider font-bold">
                    Puntaje Mejorable · SDLC Trial
                  </span>
                </div>
                <h1 className="font-headline-lg text-headline-lg text-on-surface mb-space-xs">¡Reto No Superado!</h1>
                <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl mx-auto mb-space-lg">
                  Faltan criterios clave para validar el despliegue. Revisa los puntos pendientes y vuelve a intentar.
                </p>

                {/* Dynamic Star Rating Node */}
                <div className="flex items-center justify-center gap-space-md mb-space-xl bg-surface-container-lowest/70 px-space-xl py-space-md rounded-xl shadow-inner border border-surface-container-high/40">
                  {/* Star 1 */}
                  <div className="flex flex-col items-center gap-space-xs group">
                    <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center text-primary shadow-[0_0_16px_rgba(255,193,116,0.35)]">
                      <span
                        className="material-symbols-outlined text-headline-lg"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        star
                      </span>
                    </div>
                    <span className="font-label-sm text-label-sm text-primary font-bold uppercase">1ª Estrella</span>
                    <span className="font-body-sm text-body-sm text-on-surface-variant">Completada (50%)</span>
                  </div>

                  <div className="w-8 h-0.5 bg-surface-container-highest"></div>

                  {/* Star 2 */}
                  <div className="flex flex-col items-center gap-space-xs opacity-40">
                    <div className="w-14 h-14 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant">
                      <span className="material-symbols-outlined text-headline-lg">star</span>
                    </div>
                    <span className="font-label-sm text-label-sm text-on-surface-variant font-bold uppercase">
                      2ª Estrella
                    </span>
                    <span className="font-body-sm text-body-sm text-on-surface-variant">Requerida (80%)</span>
                  </div>

                  <div className="w-8 h-0.5 bg-surface-container-highest"></div>

                  {/* Star 3 */}
                  <div className="flex flex-col items-center gap-space-xs opacity-40">
                    <div className="w-14 h-14 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant">
                      <span className="material-symbols-outlined text-headline-lg">star</span>
                    </div>
                    <span className="font-label-sm text-label-sm text-on-surface-variant font-bold uppercase">
                      3ª Estrella
                    </span>
                    <span className="font-body-sm text-body-sm text-on-surface-variant">Maestría (100%)</span>
                  </div>
                </div>

                {/* Gauge & Criteria Grid */}
                <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-center text-left mb-space-xl">
                  {/* Radial Progress Gauge (Inline SVG) */}
                  <div className="lg:col-span-4 bg-surface-container rounded-xl p-space-lg flex flex-col items-center justify-center shadow-md relative border border-surface-container-highest/40">
                    <div className="relative w-44 h-44 flex items-center justify-center">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                        {/* Background track */}
                        <circle
                          className="text-surface-container-highest stroke-current"
                          cx="60"
                          cy="60"
                          fill="transparent"
                          r="50"
                          strokeWidth="10"
                        />
                        {/* Target threshold indicator marker (80%) */}
                        <circle
                          className="text-error/30 stroke-current"
                          cx="60"
                          cy="60"
                          fill="transparent"
                          r="50"
                          strokeDasharray="314.159"
                          strokeDashoffset="62.83"
                          strokeWidth="10"
                        />
                        {/* Achieved score circle */}
                        <circle
                          className="text-primary-container stroke-current transition-all duration-1000 ease-out"
                          cx="60"
                          cy="60"
                          fill="transparent"
                          id="score-circle"
                          r="50"
                          strokeDasharray="314.159"
                          strokeDashoffset={animOffset}
                          strokeLinecap="round"
                          strokeWidth="10"
                        />
                      </svg>
                      <div className="absolute flex flex-col items-center justify-center">
                        <span className="font-headline-lg text-headline-lg text-primary font-bold">
                          {porcentaje}%
                        </span>
                        <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                          Score Final
                        </span>
                      </div>
                    </div>

                    <div className="mt-space-md w-full flex items-center justify-between text-center bg-surface-container-lowest/60 p-space-xs rounded-lg border border-surface-container-high">
                      <div className="flex-1">
                        <span className="font-label-sm text-label-sm text-on-surface-variant block uppercase font-bold">
                          Tu Registro
                        </span>
                        <span className="font-title-md text-title-md text-on-surface font-bold">
                          {porcentaje} / 100
                        </span>
                      </div>
                      <div className="w-px h-6 bg-surface-container-highest"></div>
                      <div className="flex-1">
                        <span className="font-label-sm text-label-sm text-error block uppercase font-bold">
                          Exigido
                        </span>
                        <span className="font-title-md text-title-md text-error font-bold">80% Mínimo</span>
                      </div>
                    </div>
                  </div>

                  {/* Milestones Breakdown */}
                  <div className="lg:col-span-8 bg-surface-container rounded-xl p-space-lg flex flex-col justify-between h-full shadow-md border border-surface-container-highest/40">
                    <div>
                      <div className="flex items-center justify-between mb-space-md">
                        <span className="font-title-md text-title-md text-on-surface font-semibold">
                          Desglose de Hitos de Arquitectura
                        </span>
                        <span className="font-label-sm text-label-sm text-tertiary uppercase font-bold">
                          {hitosAprobados} de {hitos.length} Aprobados
                        </span>
                      </div>

                      <div className="space-y-space-sm">
                        {hitos.map((hito) => (
                          <div
                            key={hito.id}
                            className="flex items-center justify-between p-space-sm bg-surface-container-lowest/80 rounded-lg border border-surface-container-high/40"
                          >
                            <div className="flex items-center gap-space-sm">
                              <div
                                className={`w-8 h-8 rounded flex items-center justify-center shrink-0 ${
                                  hito.superado
                                    ? 'bg-tertiary-container/20 text-tertiary'
                                    : 'bg-error-container/40 text-error'
                                }`}
                              >
                                <span className="material-symbols-outlined text-title-md">
                                  {hito.superado ? 'check_circle' : 'cancel'}
                                </span>
                              </div>
                              <div>
                                <h2 className="font-title-md text-title-md text-on-surface font-medium leading-snug">
                                  {hito.nombre}
                                </h2>
                                <p className="font-body-sm text-body-sm text-on-surface-variant">
                                  {hito.descripcion}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-space-xs shrink-0 pl-space-sm">
                              <span
                                className={`font-code-md text-label-md font-bold ${
                                  hito.superado ? 'text-tertiary' : 'text-error'
                                }`}
                              >
                                {hito.superado ? `+${hito.puntos} PTS` : '0 PTS'}
                              </span>
                              <span
                                className={`px-space-xs py-0.5 rounded font-label-sm text-label-sm font-bold ${
                                  hito.superado
                                    ? 'bg-tertiary/10 text-tertiary'
                                    : 'bg-error/10 text-error'
                                }`}
                              >
                                {hito.superado ? 'SUPERADO' : 'ERROR'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Escudo de Brecha */}
                    <div className="mt-space-md pt-space-sm flex items-center gap-space-sm text-on-surface-variant border-t border-surface-container-high/40">
                      <span className="material-symbols-outlined text-primary text-title-md">info</span>
                      <span className="font-body-sm text-body-sm">
                        Brecha para el rango de victoria:{' '}
                        <strong className="text-on-surface">+{brecha}%</strong> necesario para desbloquear recompensas.
                      </span>
                    </div>
                  </div>
                </div>

                {/* Locked Rewards Deck */}
                <div className="w-full bg-surface-container-highest/30 rounded-xl p-space-lg mb-space-lg text-left border border-outline-variant/30">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm mb-space-md">
                    <div>
                      <span className="font-label-sm text-label-sm text-error uppercase tracking-wider font-bold block flex items-center gap-1">
                        <span className="material-symbols-outlined text-base">lock</span> Bóveda Retenida temporalmente
                      </span>
                      <h3 className="font-title-lg text-title-lg text-on-surface font-semibold">
                        Recompensas no Acreditadas del Reto
                      </h3>
                    </div>
                    <span className="font-body-sm text-body-sm text-on-surface-variant">
                      Se liberarán automáticamente al certificar ≥ 80%
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-space-md">
                    {/* Retained Item 1 */}
                    <div className="flex items-center gap-space-md p-space-md bg-surface-container-low rounded-lg opacity-60 border border-surface-container-highest/40">
                      <div className="w-10 h-10 rounded bg-primary-container/20 flex items-center justify-center text-primary">
                        <span className="material-symbols-outlined text-headline-sm">toll</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="font-label-md text-label-md text-primary font-bold">+350 QP</span>
                        <span className="font-body-sm text-body-sm text-on-surface-variant">Quality Points</span>
                      </div>
                    </div>

                    {/* Retained Item 2 */}
                    <div className="flex items-center gap-space-md p-space-md bg-surface-container-low rounded-lg opacity-60 border border-surface-container-highest/40">
                      <div className="w-10 h-10 rounded bg-secondary-container/30 flex items-center justify-center text-secondary">
                        <span className="material-symbols-outlined text-headline-sm">auto_awesome</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="font-label-md text-label-md text-secondary font-bold">+500 XP</span>
                        <span className="font-body-sm text-body-sm text-on-surface-variant">SDLC Master Tree</span>
                      </div>
                    </div>

                    {/* Retained Item 3 */}
                    <div className="flex items-center gap-space-md p-space-md bg-surface-container-low rounded-lg opacity-60 border border-surface-container-highest/40">
                      <div className="w-10 h-10 rounded bg-tertiary-container/30 flex items-center justify-center text-tertiary">
                        <span className="material-symbols-outlined text-headline-sm">military_tech</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="font-label-md text-label-md text-tertiary font-bold">Insignia ISO-25010</span>
                        <span className="font-body-sm text-body-sm text-on-surface-variant">Emblema de Perfil</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Business Rule (RN-05) Callout Banner */}
                <div className="w-full bg-surface-container-high/60 p-space-md rounded-xl flex items-start sm:items-center gap-space-md mb-space-xl text-left shadow-sm border border-outline-variant/30">
                  <div className="w-8 h-8 rounded-full bg-secondary-container/30 text-secondary flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-title-md">verified_user</span>
                  </div>
                  <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <span className="font-body-sm text-body-sm text-on-surface">
                      <strong className="text-primary-fixed">Garantía de intento:</strong> Solo se conserva tu
                      calificación más alta.
                    </span>
                    <span className="font-label-sm text-label-sm text-on-surface-variant font-semibold">
                      Sin penalización de QP
                    </span>
                  </div>
                </div>

                {/* Action Controls Matrix */}
                <div className="w-full flex flex-col sm:flex-row items-center justify-center gap-space-md">
                  {/* Primary: Retry Immediately (CU-03) */}
                  <button
                    onClick={() => navigate(`/reto/${intento?.faseId || 3}`)}
                    id="retry-btn"
                    className="w-full sm:w-auto px-space-xl py-space-md bg-primary-container text-on-primary-container font-title-lg text-title-lg rounded-lg shadow-lg hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-space-xs font-bold"
                  >
                    <span className="material-symbols-outlined">replay</span>
                    <span>Reintentar Reto</span>
                  </button>

                  {/* Secondary: Technical Documentation / Support Guide */}
                  <button
                    onClick={() => setIsTechGuideOpen((prev) => !prev)}
                    id="guide-btn"
                    className="w-full sm:w-auto px-space-lg py-space-md bg-surface-container-highest text-on-surface font-title-md text-title-md rounded-lg shadow hover:bg-surface-bright active:scale-[0.98] transition-all flex items-center justify-center gap-space-xs border border-outline-variant/30 font-semibold"
                  >
                    <span className="material-symbols-outlined text-tertiary">menu_book</span>
                    <span>Guía Técnica</span>
                  </button>

                  {/* Tertiary: Return to Overworld */}
                  <Link
                    to="/"
                    className="w-full sm:w-auto px-space-lg py-space-md text-on-surface-variant font-title-md text-title-md rounded-lg hover:bg-surface-container-high hover:text-on-surface transition-all flex items-center justify-center gap-space-xs border border-transparent hover:border-outline-variant/30"
                  >
                    <span className="material-symbols-outlined">map</span>
                    <span>Volver al Overworld</span>
                  </Link>
                </div>
              </div>
            </div>

            {/* Technical Diagnostic Drawer (Collapsible for prep) */}
            {isTechGuideOpen && (
              <div
                className="w-full bg-surface-container rounded-xl p-space-lg transition-all duration-300 mb-space-lg border border-outline-variant/40 animate-fadeIn"
                id="tech-guide-drawer"
              >
                <div className="flex items-center justify-between mb-space-md">
                  <div className="flex items-center gap-space-sm">
                    <span className="material-symbols-outlined text-tertiary">integration_instructions</span>
                    <h4 className="font-title-lg text-title-lg text-on-surface font-bold">
                      Apuntes Rápidos: ISO/IEC 25010 (Software Quality Model)
                    </h4>
                  </div>
                  <button
                    onClick={() => setIsTechGuideOpen(false)}
                    className="text-on-surface-variant hover:text-on-surface p-space-xs"
                    aria-label="Cerrar apuntes"
                  >
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md text-on-surface-variant font-body-sm text-body-sm">
                  <div className="bg-surface-container-low p-space-md rounded-lg border border-surface-container-high">
                    <strong className="text-tertiary font-title-md block mb-space-xs">
                      Eficiencia de Desempeño:
                    </strong>
                    Comportamiento temporal (latencia, throughput), utilización de recursos (CPU, RAM, red) y capacidad
                    máxima admisible del sistema.
                  </div>
                  <div className="bg-surface-container-low p-space-md rounded-lg border border-surface-container-high">
                    <strong className="text-primary font-title-md block mb-space-xs">Fiabilidad (Reliability):</strong>
                    Madurez, tolerancia a fallos, disponibilidad (SLA 99.99%) y capacidad de recuperación o backup tras
                    caída de nodo.
                  </div>
                </div>
              </div>
            )}

            {/* Supplementary Context: Peer Benchmark */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md text-center md:text-left">
              <div className="bg-surface-container-lowest/40 p-space-sm px-space-md rounded-lg flex items-center gap-space-sm border border-surface-container-high/40">
                <span className="material-symbols-outlined text-primary text-title-lg">analytics</span>
                <div>
                  <span className="font-label-sm text-label-sm text-on-surface-variant uppercase block font-bold">
                    Promedio
                  </span>
                  <p className="font-title-md text-title-md text-on-surface font-semibold">84.2%</p>
                </div>
              </div>
              <div className="bg-surface-container-lowest/40 p-space-sm px-space-md rounded-lg flex items-center gap-space-sm border border-surface-container-high/40">
                <span className="material-symbols-outlined text-secondary text-title-lg">history</span>
                <div>
                  <span className="font-label-sm text-label-sm text-on-surface-variant uppercase block font-bold">
                    Intentos
                  </span>
                  <p className="font-title-md text-title-md text-on-surface font-semibold">Ilimitados</p>
                </div>
              </div>
              <div className="bg-surface-container-lowest/40 p-space-sm px-space-md rounded-lg flex items-center gap-space-sm border border-surface-container-high/40">
                <span className="material-symbols-outlined text-tertiary text-title-lg">timer</span>
                <div>
                  <span className="font-label-sm text-label-sm text-on-surface-variant uppercase block font-bold">
                    Tiempo
                  </span>
                  <p className="font-title-md text-title-md text-on-surface font-semibold">14m 20s</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};
