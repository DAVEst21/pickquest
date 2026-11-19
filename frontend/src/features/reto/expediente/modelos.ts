import type { ModeloCicloVida } from '../../../types';

/** Nombre en español de cada modelo de ciclo de vida (CU-07). */
export const NOMBRE_MODELO: Record<ModeloCicloVida, string> = {
  CASCADA: 'Cascada',
  MODELO_V: 'Modelo en V',
  INCREMENTAL: 'Incremental',
  ESPIRAL: 'Espiral',
  PROTOTIPOS: 'Prototipos',
  AGIL: 'Ágil',
};
