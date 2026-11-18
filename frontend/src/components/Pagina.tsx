import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAvisosDuelos, useMarcarAvisoDueloVisto } from '../services/queries';
import { Footer } from './Footer';
import { Header } from './Header';

/** Estructura común de las pantallas autenticadas: Header fijo, contenido y Footer. */
export const Pagina: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { data: avisos } = useAvisosDuelos();
  const enDuelos = useLocation().pathname.startsWith('/duelos');
  const invitaciones = (avisos ?? []).filter((a) => a.tipo === 'INVITACION');
  const cierres = (avisos ?? []).filter((a) => a.tipo === 'CIERRE');
  const marcarVisto = useMarcarAvisoDueloVisto();
  const pendientes = invitaciones.length;
  return (
    <div className="bg-background min-h-screen flex flex-col text-on-surface">
      <Header />
      <main className="w-full pt-20 bg-background flex-1">
        {/* CU-13: el retado recibe un aviso visible del duelo pendiente al iniciar sesión. */}
        {pendientes > 0 && !enDuelos && (
          <div role="alert" className="bg-primary-container/25 border-b border-primary-container/40">
            <div className="max-w-7xl mx-auto px-gutter py-space-sm flex flex-wrap items-center gap-space-sm">
              <span className="material-symbols-outlined text-primary" aria-hidden="true">
                sports_kabaddi
              </span>
              <p className="font-body-md text-body-md text-on-surface flex-1">
                {pendientes === 1
                  ? `${invitaciones[0].retador.nombreAventurero} te retó a un duelo de ${invitaciones[0].temaNombre}.`
                  : `Tienes ${pendientes} duelos pendientes de responder.`}
              </p>
              <Link to="/duelos" className="px-space-md py-space-xs rounded-lg bg-primary-container text-on-primary-container font-title-md">
                Ver duelos
              </Link>
            </div>
          </div>
        )}
        {/* D-001 (CU-13 FA1/FE1): el retador recibe el cierre de su duelo rechazado o expirado, con 0 XP. */}
        {cierres.map((aviso) => (
          <div key={aviso.dueloId} role="status" data-aviso-cierre={aviso.dueloId} className="bg-surface-container border-b border-outline-variant">
            <div className="max-w-7xl mx-auto px-gutter py-space-sm flex flex-wrap items-center gap-space-sm">
              <span className="material-symbols-outlined text-on-surface-variant" aria-hidden="true">
                sports_kabaddi
              </span>
              <p className="font-body-md text-body-md text-on-surface flex-1">
                {`Tu duelo contra ${aviso.rival.nombreAventurero} ${aviso.estado === 'RECHAZADO' ? 'fue rechazado' : 'expiró'}. ${aviso.xpOtorgada} XP.`}
              </p>
              <button
                type="button"
                disabled={marcarVisto.isPending}
                onClick={() => marcarVisto.mutate(aviso.dueloId)}
                className="px-space-md py-space-xs rounded-lg border border-outline text-on-surface font-title-md"
              >
                Entendido
              </button>
            </div>
          </div>
        ))}
        {children}
      </main>
      <Footer />
    </div>
  );
};
