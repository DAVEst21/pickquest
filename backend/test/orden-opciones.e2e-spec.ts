import { INestApplication } from '@nestjs/common';
import { PrismaService } from '../src/common/prisma/prisma.service';
import {
  auth,
  borrarEstudiantes,
  crearApp,
  EstudiantePrueba,
  http,
  iniciarIntento,
  nuevoEstudiante,
} from './ayudas-e2e';
import { aprobarAnteriores, retoPorMecanica } from './ayudas-sprint3';

jest.setTimeout(240000);

/**
 * El orden en que se presentan las opciones no debe revelar la correcta.
 *
 * Cada intento ve las opciones mezcladas con su id como semilla: dos intentos distintos
 * muestran órdenes distintos y retomar un intento (FA3) conserva el orden. Las pruebas
 * miran la posición de la respuesta correcta (que se lee de la base, no del contenido
 * público) en varios intentos del mismo reto.
 */
describe('Orden de presentación de las opciones (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const creados: number[] = [];

  beforeAll(async () => {
    ({ app, prisma } = await crearApp());
  });
  afterAll(async () => {
    await borrarEstudiantes(prisma, creados);
    await app.close();
  });

  const obtener = async (e: EstudiantePrueba, intentoId: number) =>
    (await http(app).get(`/intentos/${intentoId}`).set(auth(e)).expect(200)).body;

  /**
   * Abre intentos del mismo reto, uno tras otro, y devuelve la «firma» de cada uno (las posiciones de
   * las respuestas correctas). Se detiene cuando ya vio dos firmas distintas (con un tope de intentos,
   * para que la prueba no dependa de un único sorteo). En el primer intento comprueba que retomarlo
   * (iniciar de nuevo o recargarlo) devuelve el mismo contenido y el mismo borrador (FA3).
   */
  const muestrear = async (
    mecanica: string,
    firma: (intento: any, e: EstudiantePrueba, retoId: number) => Promise<unknown> | unknown,
    preparar: (intento: any, e: EstudiantePrueba, retoId: number) => Promise<void> = async () => {},
    suficiente: (firmas: any[]) => boolean = (f) => new Set(f.map((x) => JSON.stringify(x))).size > 1,
    maximo = 14,
  ) => {
    const reto = await retoPorMecanica(prisma, mecanica);
    const e = await nuevoEstudiante(app, prisma, 0);
    creados.push(e.id);
    await aprobarAnteriores(app, prisma, e, reto.id);

    const firmas: string[] = [];
    let primero: { intento: any; recargado: any } | null = null;
    for (let n = 0; n < maximo; n++) {
      const abierto = await iniciarIntento(app, e, reto.id);
      await preparar(abierto, e, reto.id);
      const intento = await obtener(e, abierto.intentoId);
      firmas.push(JSON.stringify(await firma(intento, e, reto.id)));
      if (n === 0) {
        // FA3: volver a entrar al reto y recargar la pantalla muestran lo mismo.
        const retomado = await iniciarIntento(app, e, reto.id);
        expect(retomado.intentoId).toBe(abierto.intentoId);
        primero = { intento, recargado: { ...retomado, ...(await obtener(e, abierto.intentoId)) } };
      }
      await prisma.intentoReto.update({
        where: { id: abierto.intentoId },
        data: { estado: 'CALIFICADO', porcentaje: 0, calificacionEstrellas: 0 },
      });
      if (n >= 1 && suficiente(firmas.map((f) => JSON.parse(f)))) break;
    }
    return { firmas, primero: primero!, reto };
  };

  const posicion = (lista: { id: number }[], idCorrecta: number | null | undefined) =>
    lista.findIndex((x) => x.id === idCorrecta);

  const variaYSeConserva = (r: { firmas: string[]; primero: { intento: any; recargado: any } }) => {
    // En dos intentos distintos la posición de la respuesta correcta no es siempre la misma.
    expect(r.firmas.length).toBeGreaterThanOrEqual(2);
    expect(new Set(r.firmas).size).toBeGreaterThan(1);
    // Al retomar el intento el orden se conserva.
    expect(r.primero.recargado.contenido).toEqual(r.primero.intento.contenido);
    expect(r.primero.recargado.borrador).toEqual(r.primero.intento.borrador);
  };

  it('CU-05: las opciones de cada parte y las unidades cambian de orden entre intentos y se conservan al retomar', async () => {
    const r = await muestrear('SIMULADOR_ESCENARIOS', async (intento, _e, retoId) => {
      const correctas = await prisma.opcionParteEscenario.findMany({ where: { retoId, correcta: true } });
      const escenario = await prisma.escenarioCalidad.findUniqueOrThrow({ where: { retoId } });
      const c = intento.contenido;
      // `orden` es la posición mostrada (1..n), no la del seed: no delata la correcta.
      for (const p of c.partes) expect(p.opciones.map((o: any) => o.orden)).toEqual(p.opciones.map((_: any, i: number) => i + 1));
      return {
        partes: c.partes.map((p: any) => posicion(p.opciones, correctas.find((o) => o.parte === p.parte)!.id)),
        unidad: posicion(c.unidades, escenario.unidadCorrectaId),
      };
    });
    variaYSeConserva(r);
    // La correcta ya no queda siempre primera en las cinco partes ni la unidad correcta primero.
    const primeras = r.firmas.map((f) => JSON.parse(f)).every((f) => f.partes.every((x: number) => x === 0) && f.unidad === 0);
    expect(primeras).toBe(false);
  });

  it('CU-06: las tres justificaciones cambian de orden entre intentos y se conservan al retomar', async () => {
    const r = await muestrear('REPARTO_PRESUPUESTO', async (intento, _e, retoId) => {
      const correcta = await prisma.opcionJustificacion.findFirstOrThrow({ where: { retoId, correcta: true } });
      return posicion(intento.contenido.justificaciones, correcta.id);
    });
    variaYSeConserva(r);
    expect(r.firmas.length).toBeGreaterThanOrEqual(2);
  });

  it('CU-07: los modelos y las características cambian de orden entre intentos y se conservan al retomar', async () => {
    const r = await muestrear('EXPEDIENTE_PROYECTO', async (intento, _e, retoId) => {
      const c = intento.contenido;
      const relevante = await prisma.fragmentoDocumento.findFirstOrThrow({
        where: { documento: { retoId }, caracteristicaCorrectaId: { not: null } },
        orderBy: [{ documento: { orden: 'asc' } }, { orden: 'asc' }],
      });
      return {
        modelo: c.modelos.indexOf('AGIL'),
        caracteristica: posicion(c.caracteristicas, relevante.caracteristicaCorrectaId),
      };
    }, async () => {}, (f) => new Set(f.map((x) => x.modelo)).size > 1 && new Set(f.map((x) => x.caracteristica)).size > 1);
    variaYSeConserva(r);
    const modelos = new Set(r.firmas.map((f) => JSON.parse(f).modelo));
    expect(modelos.size).toBeGreaterThan(1); // el modelo correcto no siempre va en la misma posición
  });

  it('CU-03: las tarjetas se presentan mezcladas (no agrupadas por columna ni con las MUST en su orden) y se conservan al retomar', async () => {
    const r = await muestrear('TABLERO_MOSCOW', async (intento, _e, retoId) => {
      const del = await prisma.tarjetaRequerimiento.findMany({ where: { retoId } });
      const c = intento.contenido;
      expect(c.tarjetas.map((t: any) => t.orden)).toEqual(c.tarjetas.map((_: any, i: number) => i + 1));
      return c.tarjetas.map((t: any) => {
        const tarjeta = del.find((x) => x.id === t.id)!;
        return tarjeta.columnaCorrecta === 'MUST' ? `M${tarjeta.ordenMustReferencia}` : '-';
      });
    });
    variaYSeConserva(r);
    // En el seed las MUST van al principio y en su orden de referencia: eso ya no se ve.
    const comoSeed = r.firmas.map((f) => JSON.parse(f).join()).every((f) => f === 'M1,M2,M3,M4,-,-,-,-,-,-');
    expect(comoSeed).toBe(false);
  });

  it('CU-02: el banco de piezas cambia de orden entre intentos y se conserva al retomar', async () => {
    const r = await muestrear('ARMADO_PIEZAS', async (intento, _e, retoId) => {
      const correctas = await prisma.casillaHistoria.findMany({ where: { historia: { retoId } } });
      const piezas: { id: number }[] = intento.contenido.piezas;
      return correctas.map((c) => posicion(piezas, c.piezaCorrectaId)).sort((a, b) => a - b);
    });
    variaYSeConserva(r);
    // El orden del seed (por historia) no es el que se muestra en todos los intentos.
    const delSeed = (await prisma.piezaHistoria.findMany({ where: { retoId: r.reto.id }, orderBy: { orden: 'asc' } })).map((p) => p.id);
    const mostrado = r.primero.intento.contenido.piezas.map((p: any) => p.id);
    expect(mostrado).not.toEqual(delSeed);
  });

  it('CU-08: los bloques y los entregables cambian de orden entre intentos (no salen en el orden cronológico del plan) y se conservan al retomar', async () => {
    const r = await muestrear('LINEA_TIEMPO', (intento) => ({
      bloques: intento.contenido.bloques.map((b: any) => b.id),
      entregables: intento.contenido.entregables.map((e: any) => e.id),
    }));
    variaYSeConserva(r);
    // En el seed las fases van en orden cronológico y los entregables en el orden de sus fases (ids ascendentes).
    const ascendente = (ids: number[]) => ids.every((id, i) => i === 0 || id > ids[i - 1]);
    const comoSeed = r.firmas
      .map((f) => JSON.parse(f))
      .every((f) => ascendente(f.bloques) && ascendente(f.entregables));
    expect(comoSeed).toBe(false);
  });

  it('CU-01: la lista de técnicas y las preguntas de cada nodo cambian de orden entre intentos y se conservan al retomar', async () => {
    const r = await muestrear(
      'DIALOGO_STAKEHOLDER',
      async (intento, _e, retoId) => {
        const stakeholder = await prisma.stakeholder.findUniqueOrThrow({ where: { retoId } });
        const productivas = await prisma.opcionDialogo.findMany({
          where: { nodo: { retoId }, productiva: true },
          select: { id: true },
        });
        const ids = new Set(productivas.map((o) => o.id));
        const opciones: { id: number }[] = intento.borrador.nodoActual.opciones;
        return {
          tecnica: intento.contenido.tecnicas.indexOf(stakeholder.tecnicaCorrecta),
          productivas: opciones.map((o) => (ids.has(o.id) ? 'P' : '-')),
        };
      },
      async (intento, e, retoId) => {
        const stakeholder = await prisma.stakeholder.findUniqueOrThrow({ where: { retoId } });
        await http(app)
          .post(`/intentos/${intento.intentoId}/dialogo/tecnica`)
          .set(auth(e))
          .send({ tecnica: stakeholder.tecnicaCorrecta })
          .expect(200);
      },
      (f) =>
        new Set(f.map((x) => x.tecnica)).size > 1 && new Set(f.map((x) => x.productivas.join(''))).size > 1,
    );
    variaYSeConserva(r);
    // En el seed las productivas van siempre al principio del nodo (P,P,P,P,-): ya no.
    const comoSeed = r.firmas.map((f) => JSON.parse(f).productivas.join('')).every((f) => /^P+-*$/.test(f));
    expect(comoSeed).toBe(false);
    const tecnicas = new Set(r.firmas.map((f) => JSON.parse(f).tecnica));
    expect(tecnicas.size).toBeGreaterThan(1);
  });

  it('CU-01: al elegir una pregunta, las que quedan en el nodo conservan su orden relativo', async () => {
    const reto = await retoPorMecanica(prisma, 'DIALOGO_STAKEHOLDER');
    const e = await nuevoEstudiante(app, prisma, 0);
    creados.push(e.id);
    await aprobarAnteriores(app, prisma, e, reto.id);
    const abierto = await iniciarIntento(app, e, reto.id);
    const stakeholder = await prisma.stakeholder.findUniqueOrThrow({ where: { retoId: reto.id } });
    await http(app)
      .post(`/intentos/${abierto.intentoId}/dialogo/tecnica`)
      .set(auth(e))
      .send({ tecnica: stakeholder.tecnicaCorrecta })
      .expect(200);
    const antes = (await obtener(e, abierto.intentoId)).borrador.nodoActual.opciones.map((o: any) => o.id);
    // Elige la pregunta que devuelve al nodo inicial (sin nodo siguiente): las demás deben seguir en el mismo orden.
    const opciones = await prisma.opcionDialogo.findMany({ where: { id: { in: antes } } });
    const elegida = opciones.find((o) => o.siguienteNodoId === null)!;
    expect(elegida).toBeDefined();
    await http(app).post(`/intentos/${abierto.intentoId}/dialogo/turnos`).set(auth(e)).send({ opcionId: elegida.id }).expect(200);
    const despues = (await obtener(e, abierto.intentoId)).borrador.nodoActual.opciones.map((o: any) => o.id);
    expect(despues).toEqual(antes.filter((id: number) => id !== elegida.id));
  });

  it('banco de preguntas (diagnóstico, reto diario y duelos): la correcta no está siempre en la misma posición', async () => {
    const correctas = await prisma.opcionPregunta.findMany({
      where: { correcta: true },
      select: { orden: true, pregunta: { select: { tema: true } } },
    });
    expect(correctas.length).toBeGreaterThanOrEqual(45);
    const posiciones = new Set(correctas.map((c) => c.orden));
    expect(posiciones.size).toBe(4); // aparece en las cuatro posiciones
    for (const orden of posiciones) {
      // ninguna posición concentra más de la mitad de las respuestas correctas
      expect(correctas.filter((c) => c.orden === orden).length).toBeLessThan(correctas.length / 2);
    }
    for (const tema of new Set(correctas.map((c) => c.pregunta.tema))) {
      const deTema = correctas.filter((c) => c.pregunta.tema === tema);
      expect(new Set(deTema.map((c) => c.orden)).size).toBeGreaterThan(2);
    }
  });
});
