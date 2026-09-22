import { create } from 'zustand';
import type { Estudiante, IntentoReto } from '../types';

interface PlayerState {
  nivel: number;
  xpTotal: number;
  xpSiguienteNivel: number;
  qpTotal: number;
  racha: {
    diasActuales: number;
  };
  titulo: string;
  avatarUrl: string;

  // Actions
  setEstudiante: (estudiante: Estudiante) => void;
  actualizarDesdeIntento: (intento: IntentoReto) => void;
  incrementarQP: (cantidad: number) => void;
  incrementarXP: (cantidad: number) => void;
}

const DEFAULT_ESTUDIANTE: Estudiante = {
  nivel: 5,
  xpTotal: 750,
  xpSiguienteNivel: 1000,
  qpTotal: 1420,
  racha: {
    diasActuales: 4,
  },
  titulo: 'Aprendiz',
  avatarUrl:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuAkK1BCQ8uGfm-oL05s5RyoOMILULmuhtykUluqRc6SeaYtNxAeZ6CjcKfWiev__MjOaHVUvHYGN6QnGKkuJwCaIA0_4Zihc1pI32IKqSSiN8PajarzaqNy-qacQnYF_ge64QGn508tpjeK3XYAYlMf3tSI053ZuLimtZf9VySuiyaGCZfRw38emwEPMwTRPSH2FtcrGSz93xx1vi4NYNRKYZA0qPEsFmy7oNgFY-G6xbXwSsNt9SLt',
};

export const usePlayerStore = create<PlayerState>((set) => ({
  ...DEFAULT_ESTUDIANTE,
  titulo: DEFAULT_ESTUDIANTE.titulo || 'Aprendiz',
  avatarUrl: DEFAULT_ESTUDIANTE.avatarUrl || '',

  setEstudiante: (estudiante) =>
    set({
      nivel: estudiante.nivel,
      xpTotal: estudiante.xpTotal,
      xpSiguienteNivel: estudiante.xpSiguienteNivel,
      qpTotal: estudiante.qpTotal,
      racha: estudiante.racha,
      titulo: estudiante.titulo || 'Aprendiz',
      avatarUrl: estudiante.avatarUrl || '',
    }),

  actualizarDesdeIntento: (intento) => {
    if (!intento.aprobado) return;

    set((state) => {
      let nuevoXp = state.xpTotal + intento.xpGanado;
      let nuevoNivel = state.nivel;
      let nuevoXpSiguiente = state.xpSiguienteNivel;

      // Check level up
      while (nuevoXp >= nuevoXpSiguiente) {
        nuevoNivel += 1;
        nuevoXpSiguiente += 500; // Increment threshold for next level
      }

      return {
        nivel: nuevoNivel,
        xpTotal: nuevoXp,
        xpSiguienteNivel: nuevoXpSiguiente,
        qpTotal: state.qpTotal + intento.qpGanado,
      };
    });
  },

  incrementarQP: (cantidad) =>
    set((state) => ({
      qpTotal: state.qpTotal + cantidad,
    })),

  incrementarXP: (cantidad) =>
    set((state) => ({
      xpTotal: state.xpTotal + cantidad,
    })),
}));
