import { redactarRetroalimentacion } from './retroalimentacion';
import { RetroalimentacionDto } from './tipos';

const COMPLETAS: RetroalimentacionDto[] = [
  {
    mecanica: 'LINEA_TIEMPO',
    finCalculado: 20,
    duracionMaximaSemanas: 15,
    dentroDelPlazo: false,
    dependenciasIncumplidas: [{ bloque: 'Diseño', requiere: 'Análisis' }],
    entregablesMalAsociados: [{ entregable: 'SRS', faseElegida: 'Diseño', faseCorrecta: 'Análisis' }],
    planReferencia: [{ bloqueId: 1, nombre: 'Análisis', inicio: 0 }],
    finReferencia: 14,
  },
  {
    mecanica: 'TABLERO_MOSCOW',
    capacidad: 20,
    tarjetas: [
      {
        tarjetaId: 1,
        texto: 'T',
        puntos: 5,
        columnaElegida: 'COULD',
        tipoElegido: 'FUNCIONAL',
        columnaCorrecta: 'MUST',
        tipoCorrecto: 'NO_FUNCIONAL',
        columnaAcertada: false,
        tipoAcertado: false,
      },
    ],
    ordenMustReferencia: [{ tarjetaId: 1, texto: 'T', orden: 1 }],
    ordenMustConcordantes: 0,
    ordenMustPares: 1,
  },
  {
    mecanica: 'INSPECCION_SISTEMA',
    encontradas: [
      {
        elementoId: 1,
        etiqueta: 'Contraseña',
        pantalla: 'Inicio',
        atributoCorrecto: 'SEGURIDAD',
        atributoElegido: 'USABILIDAD',
        atributoAcertado: false,
        explicacion: 'texto de referencia',
      },
    ],
    noEncontradas: [{ elementoId: 2, etiqueta: 'Botón', pantalla: 'Agendar', atributoCorrecto: 'USABILIDAD', explicacion: 'x' }],
    marcasSinFalla: [{ elementoId: 3, etiqueta: 'Logo', pantalla: 'Inicio' }],
  },
  {
    mecanica: 'REPARTO_PRESUPUESTO',
    presupuesto: 20,
    atributos: [
      {
        atributoEscenarioId: 1,
        atributo: 'SEGURIDAD',
        asignado: 5,
        referencia: 8,
        medidor: 55,
        medidorReferencia: 70,
        minimo: 70,
        cumple: false,
      },
    ],
    restriccionesCumplidas: 2,
    restriccionesTotales: 3,
    justificacionElegida: { id: 2, texto: 'a' },
    justificacionCorrecta: { id: 1, texto: 'b' },
    justificacionAcertada: false,
  },
  {
    mecanica: 'DIALOGO_STAKEHOLDER',
    tecnicaElegida: 'CUESTIONARIO',
    tecnicaCorrecta: 'ENTREVISTA',
    descubiertos: [{ codigo: 'R1', descripcion: 'd1' }],
    noDescubiertos: [{ codigo: 'R2', descripcion: 'd2' }],
    preguntasImproductivas: 2,
    turnosUsados: 5,
    turnosMaximos: 12,
  },
];

const REFERENCIA_PROHIBIDA = [
  'planReferencia',
  'finReferencia',
  'faseCorrecta',
  'columnaCorrecta',
  'tipoCorrecto',
  'ordenMustReferencia',
  'atributoCorrecto',
  'explicacion',
  'noEncontradas',
  'referencia',
  'medidorReferencia',
  'justificacionCorrecta',
  'tecnicaCorrecta',
  'noDescubiertos',
];

function claves(valor: unknown, acumulado = new Set<string>()): Set<string> {
  if (Array.isArray(valor)) valor.forEach((v) => claves(v, acumulado));
  else if (valor && typeof valor === 'object') {
    for (const [k, v] of Object.entries(valor)) {
      acumulado.add(k);
      claves(v, acumulado);
    }
  }
  return acumulado;
}

describe('Retroalimentación según el resultado del intento', () => {
  it.each(COMPLETAS.map((r) => [r.mecanica, r] as const))(
    '%s: un intento NO aprobado no recibe ninguna respuesta de referencia',
    (_mecanica, retro) => {
      const redactada = redactarRetroalimentacion(retro, false);
      const k = claves(redactada);
      for (const prohibida of REFERENCIA_PROHIBIDA) expect(k.has(prohibida)).toBe(false);
      expect(redactada.referenciaCompleta).toBe(false);
      expect(JSON.stringify(redactada)).not.toContain('texto de referencia');
    },
  );

  it.each(COMPLETAS.map((r) => [r.mecanica, r] as const))(
    '%s: un intento aprobado recibe la retroalimentación completa',
    (_mecanica, retro) => {
      expect(redactarRetroalimentacion(retro, true)).toEqual({ ...retro, referenciaCompleta: true });
    },
  );

  it('sí conserva lo que está mal: dependencias, columnas incorrectas, marcas sin falla, restricciones, técnica y preguntas improductivas', () => {
    const [linea, moscow, inspeccion, presupuesto, dialogo] = COMPLETAS.map((r) =>
      redactarRetroalimentacion(r, false),
    ) as Record<string, any>[];
    expect(linea.dependenciasIncumplidas).toEqual([{ bloque: 'Diseño', requiere: 'Análisis' }]);
    expect(linea.entregablesMalAsociados).toEqual([{ entregable: 'SRS', faseElegida: 'Diseño' }]);
    expect(moscow.tarjetas[0]).toMatchObject({ columnaAcertada: false, tipoAcertado: false, columnaElegida: 'COULD' });
    expect(inspeccion.marcasSinFalla).toHaveLength(1);
    expect(inspeccion.fallasNoEncontradas).toBe(1);
    expect(inspeccion.encontradas[0]).toMatchObject({ atributoAcertado: false, atributoElegido: 'USABILIDAD' });
    expect(presupuesto.atributos[0]).toMatchObject({ cumple: false, minimo: 70, medidor: 55 });
    expect(presupuesto.restriccionesCumplidas).toBe(2);
    expect(dialogo).toMatchObject({
      tecnicaElegida: 'CUESTIONARIO',
      tecnicaAcertada: false,
      preguntasImproductivas: 2,
      noDescubiertosCantidad: 1,
    });
  });
});
