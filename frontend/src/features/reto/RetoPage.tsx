import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Header } from '../../components/Header';
import { Footer } from '../../components/Footer';
import { Toast } from '../../components/Toast';
import { useEnviarIntento, useFaseDetalle } from '../../services/queries';

type AtributoTipo = 'seguridad' | 'desempeno' | 'usabilidad';

export const RetoPage: React.FC = () => {
  const { faseId = '3' } = useParams<{ faseId: string }>();
  const navigate = useNavigate();
  const idNum = parseInt(faseId, 10);
  const { data: faseData } = useFaseDetalle(idNum);
  const enviarIntentoMutation = useEnviarIntento();

  // 1. Cronómetro
  const [secondsLeft, setSecondsLeft] = useState(7 * 60 + 42); // 07:42
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTimer = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60)
      .toString()
      .padStart(2, '0');
    const s = (totalSeconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // 2. Estado del ejercicio interactivo (inicializado con borrador si existe)
  const [clasificaciones, setClasificaciones] = useState<Record<number, AtributoTipo>>(() => {
    const draft = typeof window !== 'undefined' ? localStorage.getItem(`draft_reto_${faseId}`) : null;
    if (draft) {
      try {
        const parsed = JSON.parse(draft);
        if (parsed.clasificaciones) return parsed.clasificaciones;
      } catch {
        // Ignorar error al parsear borrador
      }
    }
    return {
      1: 'seguridad',
      2: 'desempeno',
      3: 'usabilidad',
    };
  });

  const [tradeoffOption, setTradeoffOption] = useState<'A' | 'B'>(() => {
    const draft = typeof window !== 'undefined' ? localStorage.getItem(`draft_reto_${faseId}`) : null;
    if (draft) {
      try {
        const parsed = JSON.parse(draft);
        if (parsed.tradeoffOption) return parsed.tradeoffOption;
      } catch {
        // Ignorar error al parsear borrador
      }
    }
    return 'A';
  });

  // 3. Cinto de combate (consumibles)
  const [clueUsed, setClueUsed] = useState(() => {
    const draft = typeof window !== 'undefined' ? localStorage.getItem(`draft_reto_${faseId}`) : null;
    if (draft) {
      try {
        const parsed = JSON.parse(draft);
        if (parsed.clueUsed) return Boolean(parsed.clueUsed);
      } catch {
        // Ignorar error
      }
    }
    return false;
  });

  const [discardUsed, setDiscardUsed] = useState(() => {
    const draft = typeof window !== 'undefined' ? localStorage.getItem(`draft_reto_${faseId}`) : null;
    if (draft) {
      try {
        const parsed = JSON.parse(draft);
        if (parsed.discardUsed) return Boolean(parsed.discardUsed);
      } catch {
        // Ignorar error
      }
    }
    return false;
  });

  const [usoAyuda, setUsoAyuda] = useState(() => {
    const draft = typeof window !== 'undefined' ? localStorage.getItem(`draft_reto_${faseId}`) : null;
    if (draft) {
      try {
        const parsed = JSON.parse(draft);
        if (parsed.usoAyuda) return Boolean(parsed.usoAyuda);
      } catch {
        // Ignorar error
      }
    }
    return false;
  });

  // 4. Modal Guía Técnica (CU-08)
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  // 5. Toast
  const [toastInfo, setToastInfo] = useState<{ visible: boolean; message: string; icon: string }>({
    visible: false,
    message: '',
    icon: 'check_circle',
  });

  const showToast = (message: string, icon = 'check_circle') => {
    setToastInfo({ visible: true, message, icon });
    setTimeout(() => {
      setToastInfo((prev) => ({ ...prev, visible: false }));
    }, 3200);
  };

  const handleUseClue = () => {
    if (clueUsed) return;
    setClueUsed(true);
    setUsoAyuda(true);
    showToast('Poción de Pistas consumida (+Efecto activo)', 'science');
  };

  const handleUseDiscard = () => {
    if (discardUsed) return;
    setDiscardUsed(true);
    setUsoAyuda(true);
    if (tradeoffOption === 'B') {
      setTradeoffOption('A');
    }
    showToast('Pergamino de Descarte: Opción B inhabilitada', 'history_edu');
  };

  const handleSaveDraft = () => {
    const draft = {
      clasificaciones,
      tradeoffOption,
      usoAyuda,
      clueUsed,
      discardUsed,
    };
    localStorage.setItem(`draft_reto_${faseId}`, JSON.stringify(draft));
    showToast('Borrador de resolución respaldado en el Gremio', 'bookmark');
  };

  const [aprobadoExitoso, setAprobadoExitoso] = useState<boolean | null>(null);

  const handleSubmit = async () => {
    try {
      const intento = await enviarIntentoMutation.mutateAsync({
        faseId: idNum,
        retoId: 204,
        payload: {
          respuesta: {
            clasificaciones,
            tradeoff: tradeoffOption,
          },
          usoAyuda,
        },
      });

      if (intento.aprobado) {
        setAprobadoExitoso(true);
        showToast(`¡Solución validada (${intento.porcentaje}%)! +${intento.xpGanado} XP y +${intento.qpGanado} QP acreditados.`, 'military_tech');
      } else {
        // Flujo alternativo no-aprobado: navegar a CU-04
        navigate(`/resultado/${intento.id}`);
      }
    } catch {
      showToast('Error al procesar el intento. Por favor reintenta.', 'error');
    }
  };

  return (
    <div className="bg-background min-h-screen flex flex-col text-on-surface">
      <Header />

      <main className="w-full pt-20 bg-background min-h-screen flex-1">
        <div className="flex flex-col w-full">
          {/* HUD Superior del Reto (CU-03 Header Sticky) */}
          <div className="w-full bg-surface-container-low/80 backdrop-blur-md px-gutter py-space-md shadow-lg sticky top-20 z-30 border-b border-surface-container-high/40">
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-space-md">
              {/* Título y Metadata del Reto */}
              <div className="flex items-center gap-space-md w-full md:w-auto">
                <div className="w-12 h-12 rounded-xl bg-surface-container-high flex items-center justify-center shrink-0 shadow-md">
                  <span
                    className="material-symbols-outlined text-primary text-headline-sm"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    balance
                  </span>
                </div>
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-space-xs">
                    <span className="px-space-xs py-0.5 rounded bg-tertiary-container/20 text-tertiary font-label-sm text-label-sm uppercase font-bold">
                      Fase 0{idNum}: {faseData?.fase.nombre || 'Arquitectura'}
                    </span>
                    <span className="text-on-surface-variant font-label-sm text-label-sm">• SDLC FA2</span>
                  </div>
                  <h1 className="font-headline-sm text-headline-sm text-on-surface truncate">
                    Reto: Resolución de Trade-offs y Clasificación ISO 25010
                  </h1>
                </div>
              </div>

              {/* Progreso, Cronómetro y Botón Guía Técnica (CU-08) */}
              <div className="flex items-center justify-between md:justify-end gap-space-lg w-full md:w-auto shrink-0">
                {/* Indicador de Paso */}
                <div className="flex flex-col items-end">
                  <div className="flex items-center gap-space-xs mb-1">
                    <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                      Progreso
                    </span>
                    <span className="font-label-md text-label-md text-primary font-bold">Paso 2 / 3</span>
                  </div>
                  <div className="w-32 h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-primary-container to-primary rounded-full w-2/3 shadow-[0_0_8px_rgba(245,158,11,0.5)]"></div>
                  </div>
                </div>

                {/* Cronómetro de Combate */}
                <div className="flex items-center gap-space-xs bg-surface-container-highest/60 px-space-md py-1.5 rounded-lg shadow-sm border border-surface-container-highest">
                  <span className="material-symbols-outlined text-tertiary text-title-md animate-pulse">timer</span>
                  <span className="font-code-md text-label-md text-on-surface font-bold tracking-tight" id="countdown-timer">
                    {formatTimer(secondsLeft)}
                  </span>
                  <span className="font-label-sm text-[9px] text-on-surface-variant uppercase">Sugerido</span>
                </div>

                {/* Botón Guía Técnica (CU-08) */}
                <button
                  onClick={() => setIsGuideOpen(true)}
                  className="flex items-center gap-space-xs px-space-md py-2 rounded-lg bg-surface-container-high hover:bg-surface-bright text-on-surface transition-all shadow-sm group border border-outline-variant/30"
                  id="guide-modal-btn"
                >
                  <span className="material-symbols-outlined text-secondary text-title-md group-hover:rotate-12 transition-transform">
                    menu_book
                  </span>
                  <span className="font-label-md text-label-md font-semibold">Guía Técnica</span>
                  <span className="px-1.5 py-0.2 bg-secondary-container text-on-secondary-container font-label-sm text-[9px] rounded font-bold">
                    CU-08
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Modal Éxito (cuando aprobado === true) */}
          {aprobadoExitoso && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-gutter bg-surface-container-lowest/80 backdrop-blur-md">
              <div className="bg-surface-container max-w-lg w-full rounded-2xl p-space-xl shadow-2xl border border-tertiary/40 flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-tertiary/20 flex items-center justify-center text-tertiary mb-space-md shadow-[0_0_24px_rgba(84,221,252,0.4)]">
                  <span className="material-symbols-outlined text-display-lg" style={{ fontVariationSettings: "'FILL' 1" }}>
                    military_tech
                  </span>
                </div>
                <span className="px-space-md py-0.5 rounded-full bg-tertiary/20 text-tertiary font-label-sm uppercase font-bold tracking-wider mb-space-xs">
                  ¡Victoria de Arquitectura!
                </span>
                <h2 className="font-headline-md text-headline-md text-on-surface font-bold mb-space-sm">
                  ¡Reto Aprobado con Éxito!
                </h2>
                <p className="font-body-md text-body-md text-on-surface-variant mb-space-lg">
                  Has balanceado los requisitos ISO 25010 y seleccionado la arquitectura adecuada. El progreso de XP y QP se ha
                  actualizado en tiempo real en tu barra superior.
                </p>

                <div className="grid grid-cols-2 gap-space-md w-full mb-space-lg">
                  <div className="bg-surface-container-low p-space-md rounded-xl flex flex-col items-center">
                    <span className="font-label-sm text-label-sm text-secondary font-bold uppercase">XP Ganado</span>
                    <span className="font-headline-sm text-headline-sm text-secondary font-bold">+350 XP</span>
                  </div>
                  <div className="bg-surface-container-low p-space-md rounded-xl flex flex-col items-center">
                    <span className="font-label-sm text-label-sm text-primary font-bold uppercase">QP Acreditado</span>
                    <span className="font-headline-sm text-headline-sm text-primary font-bold">+180 QP</span>
                  </div>
                </div>

                <div className="flex gap-space-md w-full">
                  <button
                    onClick={() => navigate('/')}
                    className="flex-1 py-3 rounded-xl bg-primary-container hover:bg-primary text-on-primary-container font-title-md font-bold transition-all shadow-lg"
                  >
                    Volver al Overworld
                  </button>
                  <button
                    onClick={() => setAprobadoExitoso(false)}
                    className="py-3 px-space-md rounded-xl bg-surface-container-high hover:bg-surface-bright text-on-surface font-title-md transition-all"
                  >
                    Seguir explorando
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Contenedor Principal: Bento Layout */}
          <div className="w-full max-w-7xl mx-auto px-gutter py-space-xl flex flex-col lg:flex-row gap-space-lg pb-32">
            {/* LATERAL IZQUIERDO: Cinto de Combate (FA4 / RN-11) y Telemetría */}
            <div className="w-full lg:w-80 flex flex-col gap-space-lg shrink-0">
              {/* Cinto de Combate con Ranuras de Consumibles */}
              <div className="bg-surface-container-low rounded-xl p-space-lg shadow-xl relative overflow-hidden border border-surface-container-high/40">
                <div className="absolute -top-12 -right-12 w-32 h-32 bg-primary/10 rounded-full blur-2xl pointer-events-none"></div>

                <div className="flex items-center justify-between mb-space-md">
                  <div className="flex items-center gap-space-xs">
                    <span className="material-symbols-outlined text-primary text-title-lg">shield</span>
                    <h2 className="font-title-lg text-title-lg text-on-surface font-bold">Cinto de Combate</h2>
                  </div>
                  <span className="px-space-xs py-0.5 rounded bg-surface-container-high text-primary font-label-sm text-label-sm font-bold">
                    RN-11 ({clueUsed || discardUsed ? '1/2' : '2/2'})
                  </span>
                </div>
                <p className="font-body-sm text-body-sm text-on-surface-variant mb-space-md">
                  Ayudas activas disponibles para mitigar fallas en la resolución del dilema.
                </p>

                {/* Ranuras de Consumibles */}
                <div className="space-y-space-md">
                  {/* Ranura 1: Poción de Pistas */}
                  <div className="p-space-md rounded-xl bg-surface-container-high shadow-md transition-all border border-surface-container-highest/50">
                    <div className="flex items-start justify-between gap-space-sm mb-space-xs">
                      <div className="flex items-center gap-space-sm">
                        <div className="w-10 h-10 rounded-lg bg-tertiary-container/30 flex items-center justify-center text-tertiary shrink-0 shadow-sm">
                          <span
                            className="material-symbols-outlined text-headline-sm"
                            style={{ fontVariationSettings: "'FILL' 1" }}
                          >
                            science
                          </span>
                        </div>
                        <div>
                          <span className="font-label-sm text-[10px] text-tertiary uppercase font-bold">Consumible</span>
                          <h3 className="font-title-md text-title-md text-on-surface leading-snug">Poción de Pistas</h3>
                        </div>
                      </div>
                    </div>
                    <p className="font-body-sm text-body-sm text-on-surface-variant mb-space-sm">
                      Revela el atributo ISO 25010 para una métrica crítica.
                    </p>
                    <button
                      onClick={handleUseClue}
                      disabled={clueUsed}
                      className={`w-full py-2 px-space-md rounded-lg font-title-md text-title-md font-bold transition-all flex items-center justify-center gap-space-xs shadow-md ${
                        clueUsed
                          ? 'opacity-60 cursor-not-allowed bg-surface-container-highest text-on-surface-variant'
                          : 'bg-tertiary text-on-tertiary hover:brightness-110 active:scale-[0.98]'
                      }`}
                    >
                      <span className="material-symbols-outlined text-title-md">
                        {clueUsed ? 'check' : 'auto_awesome'}
                      </span>
                      <span>{clueUsed ? 'Consumido' : 'Usar Ayuda'}</span>
                    </button>

                    {clueUsed && (
                      <div className="mt-space-sm p-space-xs bg-tertiary-container/20 rounded text-tertiary font-label-sm text-label-sm border border-tertiary/30 animate-fadeIn">
                        💡 <strong>Pista:</strong> El cifrado E2E penaliza el pipeline de CPU, impactando en 'Desempeño'
                        (Comportamiento Temporal).
                      </div>
                    )}
                  </div>

                  {/* Ranura 2: Pergamino de Descarte */}
                  <div className="p-space-md rounded-xl bg-surface-container-high shadow-md transition-all border border-surface-container-highest/50">
                    <div className="flex items-start justify-between gap-space-sm mb-space-xs">
                      <div className="flex items-center gap-space-sm">
                        <div className="w-10 h-10 rounded-lg bg-secondary-container/40 flex items-center justify-center text-secondary shrink-0 shadow-sm">
                          <span
                            className="material-symbols-outlined text-headline-sm"
                            style={{ fontVariationSettings: "'FILL' 1" }}
                          >
                            history_edu
                          </span>
                        </div>
                        <div>
                          <span className="font-label-sm text-[10px] text-secondary uppercase font-bold">Consumible</span>
                          <h3 className="font-title-md text-title-md text-on-surface leading-snug">Pergamino de Descarte</h3>
                        </div>
                      </div>
                    </div>
                    <p className="font-body-sm text-body-sm text-on-surface-variant mb-space-sm">
                      Descarta una opción errónea del trade-off de arquitectura.
                    </p>
                    <button
                      onClick={handleUseDiscard}
                      disabled={discardUsed}
                      className={`w-full py-2 px-space-md rounded-lg font-title-md text-title-md font-semibold transition-all flex items-center justify-center gap-space-xs shadow-sm ${
                        discardUsed
                          ? 'opacity-60 cursor-not-allowed bg-surface-container-highest text-on-surface-variant'
                          : 'bg-surface-container-highest hover:bg-surface-bright text-secondary active:scale-[0.98]'
                      }`}
                    >
                      <span className="material-symbols-outlined text-title-md">
                        {discardUsed ? 'check' : 'delete_sweep'}
                      </span>
                      <span>{discardUsed ? 'Descarte Aplicado' : 'Activar Descarte'}</span>
                    </button>
                  </div>
                </div>

                {/* Medidor de Vitalidad / Stamina del Ejercicio */}
                <div className="mt-space-lg pt-space-md bg-surface-container/50 -mx-space-lg -mb-space-lg p-space-lg border-t border-surface-container-high/40">
                  <div className="flex items-center justify-between text-label-sm font-label-sm mb-1">
                    <span className="text-on-surface-variant uppercase">Integridad del Build</span>
                    <span className="text-primary font-bold">100 / 100 HP</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-surface-container-lowest overflow-hidden p-[1px]">
                    <div className="h-full bg-gradient-to-r from-primary-container to-tertiary rounded-full w-full"></div>
                  </div>
                  <div className="flex items-center justify-between mt-space-sm text-on-surface-variant font-label-sm text-[11px]">
                    <span>Recompensa: +350 XP</span>
                    <span className="text-primary font-bold">+180 QP</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ÁREA CENTRAL: Ejercicio Interactivo */}
            <div className="flex-1 flex flex-col gap-space-lg">
              {/* Bloque 1: Escenario Conciso */}
              <div className="bg-surface-container-low rounded-xl p-space-lg shadow-xl relative overflow-hidden border border-surface-container-high/40">
                <div className="flex items-center gap-space-sm mb-space-xs">
                  <span className="material-symbols-outlined text-primary text-title-md">terminal</span>
                  <span className="font-label-sm text-label-sm text-primary uppercase tracking-wider font-bold">
                    Caso Crítico · Microservicios Financieros
                  </span>
                </div>
                <p className="font-headline-sm text-headline-sm text-on-surface font-semibold leading-relaxed">
                  “El sistema bancario necesita{' '}
                  <span className="text-tertiary font-bold underline decoration-tertiary/40">alta disponibilidad</span> y{' '}
                  <span className="text-primary font-bold underline decoration-primary/40">cifrado de extremo a extremo</span>,
                  pero tiene{' '}
                  <span className="text-error font-bold underline decoration-error/40">restricciones severas de latencia</span>{' '}
                  (&lt;120ms p99).”
                </p>
              </div>

              {/* Bloque 2: Clasificación Táctica ISO 25010 */}
              <div className="bg-surface-container-low rounded-xl p-space-lg shadow-xl flex flex-col gap-space-md border border-surface-container-high/40">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-xs">
                  <div>
                    <h3 className="font-title-lg text-title-lg text-on-surface font-bold flex items-center gap-space-xs">
                      <span className="material-symbols-outlined text-tertiary text-title-lg">category</span>
                      Mapeo de Atributos de Calidad (ISO/IEC 25010)
                    </h3>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                      Asigna cada requerimiento táctico a su dominio canónico correspondiente. Haz clic en las etiquetas para
                      clasificar.
                    </p>
                  </div>
                  <span className="font-label-sm text-label-sm text-on-surface-variant bg-surface-container-high px-space-sm py-1 rounded self-start md:self-auto font-semibold">
                    3 Mappings Requeridos
                  </span>
                </div>

                {/* Matriz de Requerimientos vs Categorías */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md mt-space-sm">
                  {/* Requerimiento 1 */}
                  <div className="bg-surface-container-high rounded-xl p-space-md flex flex-col justify-between shadow-md border border-surface-container-highest/40">
                    <div>
                      <div className="flex items-center justify-between mb-space-xs">
                        <span className="font-label-sm text-[10px] text-on-surface-variant uppercase font-bold">
                          Req #01
                        </span>
                        <span className="material-symbols-outlined text-on-surface-variant text-title-md">lock</span>
                      </div>
                      <p className="font-body-md text-body-md text-on-surface font-semibold mb-space-md">
                        Cifrado simétrico AES-256 en reposo y rotación continua de claves bancarias.
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      <span className="font-label-sm text-[10px] text-on-surface-variant uppercase">
                        Clasificar Atributo:
                      </span>
                      <div className="grid grid-cols-3 gap-1" role="radiogroup" aria-label="Atributo Req 1">
                        <button
                          type="button"
                          onClick={() => setClasificaciones((prev) => ({ ...prev, 1: 'seguridad' }))}
                          className={`px-2 py-1.5 rounded text-center font-label-sm text-[11px] font-bold transition-all ${
                            clasificaciones[1] === 'seguridad'
                              ? 'bg-primary text-on-primary shadow-sm'
                              : 'bg-surface-container text-on-surface-variant hover:bg-surface-bright hover:text-on-surface'
                          }`}
                        >
                          Seguridad
                        </button>
                        <button
                          type="button"
                          onClick={() => setClasificaciones((prev) => ({ ...prev, 1: 'desempeno' }))}
                          className={`px-2 py-1.5 rounded text-center font-label-sm text-[11px] font-bold transition-all ${
                            clasificaciones[1] === 'desempeno'
                              ? 'bg-tertiary text-on-tertiary shadow-sm'
                              : 'bg-surface-container text-on-surface-variant hover:bg-surface-bright hover:text-on-surface'
                          }`}
                        >
                          Desempeño
                        </button>
                        <button
                          type="button"
                          onClick={() => setClasificaciones((prev) => ({ ...prev, 1: 'usabilidad' }))}
                          className={`px-2 py-1.5 rounded text-center font-label-sm text-[11px] font-bold transition-all ${
                            clasificaciones[1] === 'usabilidad'
                              ? 'bg-secondary text-on-secondary shadow-sm'
                              : 'bg-surface-container text-on-surface-variant hover:bg-surface-bright hover:text-on-surface'
                          }`}
                        >
                          Usabilidad
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Requerimiento 2 */}
                  <div className="bg-surface-container-high rounded-xl p-space-md flex flex-col justify-between shadow-md border border-surface-container-highest/40">
                    <div>
                      <div className="flex items-center justify-between mb-space-xs">
                        <span className="font-label-sm text-[10px] text-on-surface-variant uppercase font-bold">
                          Req #02
                        </span>
                        <span className="material-symbols-outlined text-on-surface-variant text-title-md">speed</span>
                      </div>
                      <p className="font-body-md text-body-md text-on-surface font-semibold mb-space-md">
                        Respuesta bajo carga pico de 25,000 transacciones concurrentes por segundo.
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      <span className="font-label-sm text-[10px] text-on-surface-variant uppercase">
                        Clasificar Atributo:
                      </span>
                      <div className="grid grid-cols-3 gap-1" role="radiogroup" aria-label="Atributo Req 2">
                        <button
                          type="button"
                          onClick={() => setClasificaciones((prev) => ({ ...prev, 2: 'seguridad' }))}
                          className={`px-2 py-1.5 rounded text-center font-label-sm text-[11px] font-bold transition-all ${
                            clasificaciones[2] === 'seguridad'
                              ? 'bg-primary text-on-primary shadow-sm'
                              : 'bg-surface-container text-on-surface-variant hover:bg-surface-bright hover:text-on-surface'
                          }`}
                        >
                          Seguridad
                        </button>
                        <button
                          type="button"
                          onClick={() => setClasificaciones((prev) => ({ ...prev, 2: 'desempeno' }))}
                          className={`px-2 py-1.5 rounded text-center font-label-sm text-[11px] font-bold transition-all ${
                            clasificaciones[2] === 'desempeno'
                              ? 'bg-tertiary text-on-tertiary shadow-sm'
                              : 'bg-surface-container text-on-surface-variant hover:bg-surface-bright hover:text-on-surface'
                          }`}
                        >
                          Desempeño
                        </button>
                        <button
                          type="button"
                          onClick={() => setClasificaciones((prev) => ({ ...prev, 2: 'usabilidad' }))}
                          className={`px-2 py-1.5 rounded text-center font-label-sm text-[11px] font-bold transition-all ${
                            clasificaciones[2] === 'usabilidad'
                              ? 'bg-secondary text-on-secondary shadow-sm'
                              : 'bg-surface-container text-on-surface-variant hover:bg-surface-bright hover:text-on-surface'
                          }`}
                        >
                          Usabilidad
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Requerimiento 3 */}
                  <div className="bg-surface-container-high rounded-xl p-space-md flex flex-col justify-between shadow-md border border-surface-container-highest/40">
                    <div>
                      <div className="flex items-center justify-between mb-space-xs">
                        <span className="font-label-sm text-[10px] text-on-surface-variant uppercase font-bold">
                          Req #03
                        </span>
                        <span className="material-symbols-outlined text-on-surface-variant text-title-md">touch_app</span>
                      </div>
                      <p className="font-body-md text-body-md text-on-surface font-semibold mb-space-md">
                        Flujo de autorización en 1-clic con biometría sin fricción cognitiva para el usuario.
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      <span className="font-label-sm text-[10px] text-on-surface-variant uppercase">
                        Clasificar Atributo:
                      </span>
                      <div className="grid grid-cols-3 gap-1" role="radiogroup" aria-label="Atributo Req 3">
                        <button
                          type="button"
                          onClick={() => setClasificaciones((prev) => ({ ...prev, 3: 'seguridad' }))}
                          className={`px-2 py-1.5 rounded text-center font-label-sm text-[11px] font-bold transition-all ${
                            clasificaciones[3] === 'seguridad'
                              ? 'bg-primary text-on-primary shadow-sm'
                              : 'bg-surface-container text-on-surface-variant hover:bg-surface-bright hover:text-on-surface'
                          }`}
                        >
                          Seguridad
                        </button>
                        <button
                          type="button"
                          onClick={() => setClasificaciones((prev) => ({ ...prev, 3: 'desempeno' }))}
                          className={`px-2 py-1.5 rounded text-center font-label-sm text-[11px] font-bold transition-all ${
                            clasificaciones[3] === 'desempeno'
                              ? 'bg-tertiary text-on-tertiary shadow-sm'
                              : 'bg-surface-container text-on-surface-variant hover:bg-surface-bright hover:text-on-surface'
                          }`}
                        >
                          Desempeño
                        </button>
                        <button
                          type="button"
                          onClick={() => setClasificaciones((prev) => ({ ...prev, 3: 'usabilidad' }))}
                          className={`px-2 py-1.5 rounded text-center font-label-sm text-[11px] font-bold transition-all ${
                            clasificaciones[3] === 'usabilidad'
                              ? 'bg-secondary text-on-secondary shadow-sm'
                              : 'bg-surface-container text-on-surface-variant hover:bg-surface-bright hover:text-on-surface'
                          }`}
                        >
                          Usabilidad
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bloque 3: Pregunta de Trade-Off (A / B Split) */}
              <div className="bg-surface-container-low rounded-xl p-space-lg shadow-xl flex flex-col gap-space-md border border-surface-container-high/40">
                <div className="flex items-center gap-space-sm">
                  <span className="px-space-xs py-0.5 rounded bg-primary-container text-on-primary-container font-label-sm text-label-sm font-bold">
                    Decisión Táctica
                  </span>
                  <h3 className="font-title-lg text-title-lg text-on-surface font-bold">
                    Trade-Off de Rendimiento vs Confidencialidad
                  </h3>
                </div>
                <p className="font-body-lg text-body-lg text-on-surface">
                  ¿Qué patrón resuelve la sobrecarga de re-encriptación interna garantizando a la vez la auditoría bancaria?
                </p>

                {/* Opciones A / B */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md mt-space-xs" role="radiogroup" aria-label="Opciones de Trade-off">
                  {/* Opción A */}
                  <label
                    onClick={() => setTradeoffOption('A')}
                    className={`group relative p-space-lg rounded-xl bg-surface-container-high hover:bg-surface-bright/80 cursor-pointer shadow-md transition-all flex flex-col justify-between border ${
                      tradeoffOption === 'A' ? 'border-primary/80 ring-1 ring-primary/40' : 'border-surface-container-highest/50'
                    }`}
                  >
                    <input
                      checked={tradeoffOption === 'A'}
                      onChange={() => setTradeoffOption('A')}
                      className="sr-only"
                      name="tradeoff_option"
                      type="radio"
                      value="A"
                    />
                    <div>
                      <div className="flex items-center justify-between mb-space-sm">
                        <span className="w-8 h-8 rounded-lg bg-surface-container-lowest text-primary font-headline-sm flex items-center justify-center font-bold shadow-sm group-hover:scale-105 transition-transform">
                          A
                        </span>
                        <span
                          className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                            tradeoffOption === 'A' ? 'bg-primary text-on-primary' : 'bg-surface-container-lowest text-transparent'
                          }`}
                        >
                          <span className="material-symbols-outlined text-sm font-bold">check</span>
                        </span>
                      </div>
                      <h4 className="font-title-md text-title-md text-on-surface font-bold mb-space-xs">
                        Terminación TLS en Ingress Controller con Service Mesh mTLS en Hardware Dedicado
                      </h4>
                      <p className="font-body-sm text-body-sm text-on-surface-variant">
                        Descarga la carga criptográfica en gateways perimetrales con chips criptográficos dedicados y delega
                        la seguridad este-oeste al proxy Envoy sin degradar la CPU de las aplicaciones.
                      </p>
                    </div>
                    <div className="mt-space-md pt-space-sm flex items-center gap-space-xs border-t border-surface-container/60">
                      <span className="font-label-sm text-[10px] text-tertiary bg-tertiary-container/20 px-2 py-0.5 rounded uppercase font-semibold">
                        Desempeño +99.4%
                      </span>
                      <span className="font-label-sm text-[10px] text-primary bg-primary-container/20 px-2 py-0.5 rounded uppercase font-semibold">
                        Zero-Trust Válido
                      </span>
                    </div>
                  </label>

                  {/* Opción B */}
                  <label
                    onClick={() => !discardUsed && setTradeoffOption('B')}
                    className={`group relative p-space-lg rounded-xl bg-surface-container-high transition-all flex flex-col justify-between border ${
                      discardUsed
                        ? 'opacity-30 pointer-events-none grayscale cursor-not-allowed border-surface-container-highest/20'
                        : 'hover:bg-surface-bright/80 cursor-pointer shadow-md'
                    } ${
                      tradeoffOption === 'B' ? 'border-primary/80 ring-1 ring-primary/40' : 'border-surface-container-highest/50'
                    }`}
                  >
                    <input
                      checked={tradeoffOption === 'B'}
                      onChange={() => !discardUsed && setTradeoffOption('B')}
                      disabled={discardUsed}
                      className="sr-only"
                      name="tradeoff_option"
                      type="radio"
                      value="B"
                    />
                    <div>
                      <div className="flex items-center justify-between mb-space-sm">
                        <span className="w-8 h-8 rounded-lg bg-surface-container-lowest text-on-surface-variant font-headline-sm flex items-center justify-center font-bold shadow-sm group-hover:scale-105 transition-transform">
                          B
                        </span>
                        <span
                          className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                            tradeoffOption === 'B' ? 'bg-primary text-on-primary' : 'bg-surface-container-lowest text-transparent'
                          }`}
                        >
                          <span className="material-symbols-outlined text-sm font-bold">check</span>
                        </span>
                      </div>
                      <h4 className="font-title-md text-title-md text-on-surface font-bold mb-space-xs">
                        Deshabilitar Cifrado Este-Oeste en Subredes Privadas (VPC Trust)
                      </h4>
                      <p className="font-body-sm text-body-sm text-on-surface-variant">
                        Eliminar el handshake criptográfico entre microservicios confiando en el firewall de red perimetral
                        para recuperar latencia inmediata a expensas de la superficie de ataque interno.
                      </p>
                    </div>
                    <div className="mt-space-md pt-space-sm flex items-center gap-space-xs border-t border-surface-container/60">
                      <span className="font-label-sm text-[10px] text-error bg-error-container/20 px-2 py-0.5 rounded uppercase font-semibold">
                        Violación PCI-DSS
                      </span>
                      <span className="font-label-sm text-[10px] text-on-surface-variant bg-surface-container/40 px-2 py-0.5 rounded uppercase font-semibold">
                        Alta Deuda Técnica
                      </span>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* BARRA INFERIOR FIJA DE NAVEGACIÓN Y ACCIÓN (CU-03) */}
          <div className="fixed bottom-0 left-0 w-full z-40 bg-surface-container-lowest/95 backdrop-blur-xl py-space-md px-gutter shadow-[0_-8px_24px_rgba(0,0,0,0.6)] border-t border-surface-container-high/40">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-space-md">
              {/* Criterio Mínimo / Nota de Evaluación */}
              <div className="flex items-center gap-space-sm">
                <div className="w-9 h-9 rounded-lg bg-surface-container-high flex items-center justify-center text-primary-fixed-dim shrink-0 shadow-sm">
                  <span className="material-symbols-outlined text-title-lg">verified_user</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                    Criterio de Aprobación Mínima
                  </span>
                  <span className="font-body-sm text-body-sm text-on-surface font-semibold">
                    Umbral de pase: <strong className="text-primary font-bold">80% de precisión</strong> en trade-offs
                    arquitectónicos.
                  </span>
                </div>
              </div>

              {/* Acciones Principales */}
              <div className="flex items-center gap-space-md w-full sm:w-auto justify-end">
                {/* Guardar Borrador */}
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  className="px-space-lg py-2.5 rounded-lg bg-surface-container-high hover:bg-surface-bright text-on-surface font-title-md text-title-md font-semibold transition-all shadow-sm active:scale-[0.98] flex items-center gap-space-xs border border-outline-variant/30"
                >
                  <span className="material-symbols-outlined text-title-md">bookmark</span>
                  <span>Guardar Borrador</span>
                </button>

                {/* Enviar Solución */}
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={enviarIntentoMutation.isPending}
                  className="px-space-xl py-2.5 rounded-lg bg-primary-container hover:brightness-110 text-on-primary-container font-title-md text-title-md font-bold transition-all shadow-[0_4px_16px_rgba(245,158,11,0.35)] active:scale-[0.98] flex items-center gap-space-xs"
                >
                  {enviarIntentoMutation.isPending ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-title-md">progress_activity</span>
                      <span>Verificando Build...</span>
                    </>
                  ) : (
                    <>
                      <span>Enviar Solución</span>
                      <span className="material-symbols-outlined text-title-md font-bold">arrow_forward</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* MODAL: GUÍA TÉCNICA (CU-08) */}
          {isGuideOpen && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center p-gutter bg-surface-container-lowest/80 backdrop-blur-md"
              role="dialog"
              aria-modal="true"
              aria-labelledby="guide-title"
              onClick={() => setIsGuideOpen(false)}
            >
              <div
                className="bg-surface-container-low max-w-2xl w-full rounded-2xl p-space-xl shadow-2xl relative flex flex-col gap-space-md max-h-[870px] overflow-y-auto border border-outline-variant/40"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-space-sm">
                    <div className="w-10 h-10 rounded-lg bg-secondary-container text-secondary flex items-center justify-center">
                      <span className="material-symbols-outlined text-headline-sm">menu_book</span>
                    </div>
                    <div>
                      <span className="font-label-sm text-label-sm text-secondary uppercase font-bold">
                        Compendio SDLC · CU-08
                      </span>
                      <h3 id="guide-title" className="font-headline-sm text-headline-sm text-on-surface">
                        Guía Técnica ISO/IEC 25010
                      </h3>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsGuideOpen(false)}
                    className="w-8 h-8 rounded-lg bg-surface-container-high hover:bg-surface-bright text-on-surface flex items-center justify-center transition-colors"
                    aria-label="Cerrar guía"
                  >
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>

                <div className="space-y-space-md font-body-md text-body-md text-on-surface-variant">
                  <p>
                    Los <strong>Atributos de Calidad</strong> dictan cómo el software satisface las necesidades explícitas
                    e implícitas de las partes interesadas en condiciones operativas reales:
                  </p>
                  <div className="p-space-md rounded-xl bg-surface-container-high space-y-2 border border-surface-container-highest/40">
                    <h4 className="font-title-md text-title-md text-primary font-bold">
                      1. Seguridad (Confidencialidad e Integridad)
                    </h4>
                    <p className="font-body-sm text-body-sm text-on-surface">
                      Capacidad de proteger la información contra accesos no autorizados, ataques de alteración y permitir el
                      no repudio.
                    </p>
                  </div>
                  <div className="p-space-md rounded-xl bg-surface-container-high space-y-2 border border-surface-container-highest/40">
                    <h4 className="font-title-md text-title-md text-tertiary font-bold">
                      2. Eficiencia de Desempeño
                    </h4>
                    <p className="font-body-sm text-body-sm text-on-surface">
                      Comportamiento temporal, uso de recursos y capacidad volumétrica ante escenarios de estrés.
                    </p>
                  </div>
                  <div className="p-space-md rounded-xl bg-surface-container-high space-y-2 border border-surface-container-highest/40">
                    <h4 className="font-title-md text-title-md text-secondary font-bold">
                      3. Trade-offs Clásicos
                    </h4>
                    <p className="font-body-sm text-body-sm text-on-surface">
                      A mayor complejidad criptográfica en tránsito (mTLS con re-cifrado en capas de aplicación), mayor
                      consumo de ciclos de reloj y latencia terminal. Se mitiga desacoplando criptografía a nivel de proxy de
                      infraestructura (Sidecars o Hardware Offloading).
                    </p>
                  </div>
                </div>

                <div className="pt-space-md flex justify-end">
                  <button
                    onClick={() => setIsGuideOpen(false)}
                    className="px-space-lg py-2 rounded-lg bg-primary-container text-on-primary-container font-title-md text-title-md font-bold hover:brightness-110 transition-all"
                  >
                    Comprendido, Volver al Combate
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Toast Notification */}
          <Toast visible={toastInfo.visible} message={toastInfo.message} icon={toastInfo.icon} />
        </div>
      </main>

      <Footer />
    </div>
  );
};
