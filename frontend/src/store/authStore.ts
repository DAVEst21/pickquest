import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { queryClient } from '../services/queryClient';
import { usePlayerStore } from './playerStore';

interface AuthState {
  token: string | null;
  iniciarSesion: (token: string) => void;
  cerrarSesion: () => void;
}

/**
 * Sesión persistida en localStorage para que sobreviva a un reload.
 * PENDIENTE DE ENDURECER: un token en localStorage es legible por cualquier
 * script de la página (riesgo XSS). A futuro conviene una cookie httpOnly.
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      iniciarSesion: (token) => {
        // Nada en caché puede pertenecer a otra sesión.
        queryClient.clear();
        set({ token });
      },
      cerrarSesion: () => {
        queryClient.clear();
        usePlayerStore.getState().limpiar();
        set({ token: null });
      },
    }),
    { name: 'pickquest-sesion' },
  ),
);
