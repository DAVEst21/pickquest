import React from 'react';
import { Footer } from './Footer';
import { Header } from './Header';

/** Estructura común de las pantallas autenticadas: Header fijo, contenido y Footer. */
export const Pagina: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="bg-background min-h-screen flex flex-col text-on-surface">
    <Header />
    <main className="w-full pt-20 bg-background flex-1">{children}</main>
    <Footer />
  </div>
);
