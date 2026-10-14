import { RetroalimentacionDto } from './tipos';

/**
 * Qué parte de la retroalimentación se entrega según el resultado del intento:
 * - Intento NO aprobado: solo lo que está mal (dependencias incumplidas, tarjetas
 *   en columna incorrecta, marcas sin falla, restricciones incumplidas, técnica
 *   y preguntas improductivas), SIN la respuesta de referencia (plan de
 *   referencia, columna correcta de cada tarjeta, fallas no encontradas, reparto
 *   de referencia, requerimientos no descubiertos...). Así un estudiante no puede
 *   reprobar a propósito para leer la solución.
 * - Intento aprobado: retroalimentación completa, con la referencia.
 * Funciones puras; `referenciaCompleta` le indica al cliente cuál de las dos recibió.
 */
type Obj = Record<string, unknown>;
const lista = (valor: unknown): Obj[] => (Array.isArray(valor) ? (valor as Obj[]) : []);

function sinReferencia(retro: RetroalimentacionDto): RetroalimentacionDto {
  const r = retro as Obj;
  switch (retro.mecanica) {
    case 'LINEA_TIEMPO':
      return {
        mecanica: retro.mecanica,
        finCalculado: r.finCalculado,
        duracionMaximaSemanas: r.duracionMaximaSemanas,
        dentroDelPlazo: r.dentroDelPlazo,
        dependenciasIncumplidas: r.dependenciasIncumplidas,
        // qué entregables están mal asociados, pero no con qué fase iba cada uno
        entregablesMalAsociados: lista(r.entregablesMalAsociados).map((e) => ({
          entregable: e.entregable,
          faseElegida: e.faseElegida,
        })),
      };
    case 'TABLERO_MOSCOW':
      return {
        mecanica: retro.mecanica,
        capacidad: r.capacidad,
        tarjetas: lista(r.tarjetas).map((t) => ({
          tarjetaId: t.tarjetaId,
          texto: t.texto,
          puntos: t.puntos,
          columnaElegida: t.columnaElegida,
          tipoElegido: t.tipoElegido,
          columnaAcertada: t.columnaAcertada,
          tipoAcertado: t.tipoAcertado,
        })),
        ordenMustConcordantes: r.ordenMustConcordantes,
        ordenMustPares: r.ordenMustPares,
      };
    case 'INSPECCION_SISTEMA':
      return {
        mecanica: retro.mecanica,
        encontradas: lista(r.encontradas).map((f) => ({
          elementoId: f.elementoId,
          etiqueta: f.etiqueta,
          pantalla: f.pantalla,
          atributoElegido: f.atributoElegido,
          atributoAcertado: f.atributoAcertado,
        })),
        // solo cuántas faltaron, no cuáles
        fallasNoEncontradas: lista(r.noEncontradas).length,
        marcasSinFalla: r.marcasSinFalla,
      };
    case 'REPARTO_PRESUPUESTO':
      return {
        mecanica: retro.mecanica,
        presupuesto: r.presupuesto,
        atributos: lista(r.atributos).map((a) => ({
          atributoEscenarioId: a.atributoEscenarioId,
          atributo: a.atributo,
          asignado: a.asignado,
          medidor: a.medidor,
          minimo: a.minimo,
          cumple: a.cumple,
        })),
        restriccionesCumplidas: r.restriccionesCumplidas,
        restriccionesTotales: r.restriccionesTotales,
        justificacionElegida: r.justificacionElegida,
        justificacionAcertada: r.justificacionAcertada,
      };
    case 'DIALOGO_STAKEHOLDER':
      return {
        mecanica: retro.mecanica,
        tecnicaElegida: r.tecnicaElegida,
        tecnicaAcertada: r.tecnicaElegida === r.tecnicaCorrecta,
        descubiertos: r.descubiertos,
        noDescubiertosCantidad: lista(r.noDescubiertos).length,
        preguntasImproductivas: r.preguntasImproductivas,
        turnosUsados: r.turnosUsados,
        turnosMaximos: r.turnosMaximos,
      };
    default:
      return retro;
  }
}

export function redactarRetroalimentacion(
  retro: RetroalimentacionDto,
  aprobado: boolean,
): RetroalimentacionDto {
  if (aprobado) return { ...retro, referenciaCompleta: true };
  return { ...sinReferencia(retro), referenciaCompleta: false };
}
