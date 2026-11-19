import { TemaFase } from '@prisma/client';

/** Nombre en español de cada tema (una fase por tema). */
export const NOMBRE_TEMA: Record<TemaFase, string> = {
  CICLO_VIDA: 'Ciclo de vida del software',
  ELICITACION: 'Elicitación de requerimientos',
  ATRIBUTOS_CALIDAD: 'Atributos de calidad',
};
