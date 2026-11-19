/**
 * CU-07 Expediente del proyecto (RF-10, RN-22). Funciones puras.
 *
 * RN-22: 50 × (modelo correcto ? 1 : 0)
 *      + 30 × (evidencias relevantes con su característica correcta ÷ total de fragmentos relevantes)
 *      + 20 × (modelo correcto ? vínculos que respaldan el modelo ÷ total de vínculos : 0)
 *      − 5 × evidencias irrelevantes seleccionadas
 * Se acota entre 0 y 100 y se trunca. Un fragmento es *relevante* si tiene una
 * característica correcta (`caracteristicaCorrectaId` no nulo).
 */

export const MINIMO_VINCULOS = 2;

export interface FragmentoEval {
  id: number;
  /** null = fragmento irrelevante. */
  caracteristicaCorrectaId: number | null;
  /** Relevante para justificar el modelo correcto. */
  respaldaModelo: boolean;
}

export interface EvidenciaEval {
  fragmentoId: number;
  caracteristicaId: number | null;
}

export interface EntradaExpediente {
  modeloElegido: string | null;
  modeloCorrecto: string;
  fragmentos: FragmentoEval[];
  evidencias: EvidenciaEval[];
  /** Ids de fragmento vinculados al modelo elegido como respaldo. */
  vinculos: number[];
}

export function calificarExpediente(e: EntradaExpediente): number {
  const modeloOk = e.modeloElegido !== null && e.modeloElegido === e.modeloCorrecto;
  const porId = new Map(e.fragmentos.map((f) => [f.id, f]));
  const relevantes = e.fragmentos.filter((f) => f.caracteristicaCorrectaId !== null).length;
  const bienCaracterizadas = e.evidencias.filter((ev) => {
    const f = porId.get(ev.fragmentoId);
    return !!f && f.caracteristicaCorrectaId !== null && f.caracteristicaCorrectaId === ev.caracteristicaId;
  }).length;
  const irrelevantes = e.evidencias.filter((ev) => porId.get(ev.fragmentoId)?.caracteristicaCorrectaId === null).length;
  const vinculosTotal = e.vinculos.length;
  const respaldan = e.vinculos.filter((id) => porId.get(id)?.respaldaModelo).length;

  // Todo sobre un denominador común (R × V) para no perder exactitud con fracciones.
  const R = Math.max(1, relevantes);
  const V = Math.max(1, vinculosTotal);
  const numerador =
    50 * R * V * (modeloOk ? 1 : 0) +
    30 * bienCaracterizadas * V +
    20 * (modeloOk ? respaldan : 0) * R -
    5 * irrelevantes * R * V;
  const valor = Math.floor(numerador / (R * V));
  return Math.max(0, Math.min(100, valor));
}

/** FE1: sin modelo, con menos de 2 vínculos o con evidencias sin característica. */
export function faltantesExpediente(
  modeloElegido: string | null,
  evidencias: { fragmentoId: number; caracteristicaId: number | null; texto?: string }[],
  vinculos: number[],
): string[] {
  const faltantes: string[] = [];
  if (modeloElegido === null) faltantes.push('Falta elegir el modelo de ciclo de vida');
  if (vinculos.length < MINIMO_VINCULOS) {
    faltantes.push(`Debes vincular al menos ${MINIMO_VINCULOS} evidencias al modelo elegido`);
  }
  for (const ev of evidencias) {
    if (ev.caracteristicaId === null) {
      faltantes.push(`Falta indicar qué característica del proyecto revela la evidencia «${ev.texto ?? ev.fragmentoId}»`);
    }
  }
  return faltantes;
}
