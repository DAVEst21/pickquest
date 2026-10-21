import { create } from 'zustand';
import type { PerfilEstudiante } from '../types';

interface PlayerState {
  /** Perfil tal como lo devuelve GET /auth/perfil. null mientras no hay sesión. */
  perfil: PerfilEstudiante | null;
  setPerfil: (perfil: PerfilEstudiante) => void;
  limpiar: () => void;
}

/**
 * Estado del jugador que muestra el Header. Solo se llena con datos del
 * backend (GET /auth/perfil, que se vuelve a pedir tras cada intento); nunca se
 * suman XP/QP localmente, para que la regla "solo la primera aprobación otorga
 * recompensa" viva en un único lugar: el servidor.
 */
export const usePlayerStore = create<PlayerState>((set) => ({
  perfil: null,
  setPerfil: (perfil) => set({ perfil }),
  limpiar: () => set({ perfil: null }),
}));
