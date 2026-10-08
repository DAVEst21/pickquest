export interface ProgresoAprendizaje {
  sinHistorial: boolean;
  nivel: number;
  nivelProvisional: boolean;
  xpSiguienteNivel: number;
  xpTotal: number;
  qpTotal: number;
  fasesCompletadas: number;
  totalFases: number;
  promedioEstrellas: number | null;
  precision: number | null;
  tiempoPromedioSegundos: number | null;
  habilidades: {
    categoria: string;
    nombre: string;
    nivel: number | null;
    dominio: number | null;
    fases: { id: number; nombre: string; dominio: number | null }[];
  }[];
  logros: {
    id: number;
    nombre: string;
    descripcion: string;
    rareza: 'BRONCE' | 'PLATA' | 'ORO' | null;
    fechaObtenido: string;
  }[];
  racha: {
    diasActuales: number | null;
    diasRecord: number | null;
    multiplicadorQP: number | null;
    zonaHoraria: string | null;
  };
}
