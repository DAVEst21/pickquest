import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAvisosDuelos } from '../services/queries';
import { Footer } from './Footer';
import { Header } from './Header';

/** Estructura común de las pantallas autenticadas: Header fijo, contenido y Footer. */
export const Pagina: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { data: avisos } = useAvisosDuelos();
  const enDuelos = useLocation().pathname.startsWith('/duelos');
  const pendientes = avisos?.length ?? 0;
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
                  ? `${avisos![0].retador.nombreAventurero} te retó a un duelo de ${avisos![0].temaNombre}.`
                  : `Tienes ${pendientes} duelos pendientes de responder.`}
              </p>
              <Link to="/duelos" className="px-space-md py-space-xs rounded-lg bg-primary-container text-on-primary-container font-title-md">
                Ver duelos
              </Link>
            </div>
          </div>
        )}
        {children}
      </main>
      <Footer />
    </div>
  );
};
