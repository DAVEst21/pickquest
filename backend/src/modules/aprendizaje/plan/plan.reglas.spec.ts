import {
  elegirAlAzar,
  esTemaDebil,
  generarPlan,
  porcentajeDeTema,
  preguntasPendientes,
  RetoParaPlan,
  TemaParaPlan,
  validarAjuste,
} from './plan.reglas';

const reto = (id: number, orden: number, extra: Partial<RetoParaPlan> = {}): RetoParaPlan => ({
  id,
  orden,
  titulo: `Reto ${id}`,
  desbloqueado: true,
  aprobado: false,
  mejorPorcentaje: null,
  mejorEstrellas: null,
  ...extra,
});

const tema = (t: Partial<TemaParaPlan> & Pick<TemaParaPlan, 'tema' | 'faseOrden' | 'dominio'>): TemaParaPlan => ({
  nombre: t.tema,
  faseDesbloqueada: true,
  retos: [],
  ...t,
});

describe('CU-10 RN-27: tema débil', () => {
  it('es débil con menos de 80 %', () => {
    expect(esTemaDebil(79)).toBe(true);
    expect(esTemaDebil(0)).toBe(true);
  });
  it('80 % o más ya no es débil', () => {
    expect(esTemaDebil(80)).toBe(false);
    expect(esTemaDebil(100)).toBe(false);
  });
});

describe('CU-10 RN-27: generarPlan', () => {
  it('prioriza los temas de menor dominio y empieza cada uno con su repaso', () => {
    const plan = generarPlan([
      tema({ tema: 'CICLO_VIDA', faseOrden: 1, dominio: 70, retos: [reto(1, 1)] }),
      tema({ tema: 'ELICITACION', faseOrden: 2, dominio: 40, retos: [reto(2, 1)] }),
      tema({ tema: 'ATRIBUTOS_CALIDAD', faseOrden: 3, dominio: 55, retos: [reto(3, 1)] }),
    ]);
    expect(plan.esPlanMejora).toBe(false);
    expect(plan.actividades.map((a) => `${a.tipo}:${a.tema}`)).toEqual([
      'REPASO:ELICITACION',
      'RETO:ELICITACION',
      'REPASO:ATRIBUTOS_CALIDAD',
      'RETO:ATRIBUTOS_CALIDAD',
      'REPASO:CICLO_VIDA',
      'RETO:CICLO_VIDA',
    ]);
  });

  it('cada actividad lleva un motivo claro con el dominio del tema', () => {
    const plan = generarPlan([tema({ tema: 'ATRIBUTOS_CALIDAD', faseOrden: 3, dominio: 55, nombre: 'Atributos de calidad', retos: [reto(9, 1)] })]);
    expect(plan.actividades[0].motivo).toBe('Tu dominio de Atributos de calidad es 55 %: repasa el material y las tarjetas del tema');
    expect(plan.actividades[1].motivo).toContain('Atributos de calidad');
  });

  it('un tema débil con la fase bloqueada no genera repaso ni retos', () => {
    const plan = generarPlan([
      tema({ tema: 'CICLO_VIDA', faseOrden: 1, dominio: 90 }),
      tema({ tema: 'ELICITACION', faseOrden: 2, dominio: 30, faseDesbloqueada: false, retos: [reto(2, 1, { desbloqueado: false })] }),
      tema({ tema: 'ATRIBUTOS_CALIDAD', faseOrden: 3, dominio: 90 }),
    ]);
    // los débiles no tienen nada que hacer todavía: cae al plan de mejora
    expect(plan.esPlanMejora).toBe(true);
    expect(plan.actividades.some((a) => a.tema === 'ELICITACION' && a.tipo !== 'DUELO')).toBe(false);
  });

  it('solo incluye retos desbloqueados y no aprobados, o aprobados con mejor calificación < 80', () => {
    const plan = generarPlan([
      tema({
        tema: 'CICLO_VIDA',
        faseOrden: 1,
        dominio: 60,
        retos: [
          reto(1, 1, { aprobado: true, mejorPorcentaje: 100, mejorEstrellas: 3 }), // ya dominado
          reto(2, 2, { aprobado: false, mejorPorcentaje: 70 }), // no aprobado
          reto(3, 3, { desbloqueado: false }), // aún bloqueado
        ],
      }),
    ]);
    const retos = plan.actividades.filter((a) => a.tipo === 'RETO').map((a) => a.retoId);
    expect(retos).toEqual([2]);
  });

  it('respeta el orden de los retos dentro del tema', () => {
    const plan = generarPlan([tema({ tema: 'CICLO_VIDA', faseOrden: 1, dominio: 10, retos: [reto(7, 3), reto(5, 1), reto(6, 2)] })]);
    expect(plan.actividades.filter((a) => a.tipo === 'RETO').map((a) => a.retoId)).toEqual([5, 6, 7]);
  });

  it('desempata dominios iguales por el orden de la fase', () => {
    const plan = generarPlan([
      tema({ tema: 'ATRIBUTOS_CALIDAD', faseOrden: 3, dominio: 50 }),
      tema({ tema: 'CICLO_VIDA', faseOrden: 1, dominio: 50 }),
    ]);
    expect(plan.actividades.filter((a) => a.tipo === 'REPASO').map((a) => a.tema)).toEqual(['CICLO_VIDA', 'ATRIBUTOS_CALIDAD']);
  });

  it('FE2: sin temas débiles, un plan de mejora con retos de menos de 3 estrellas y un duelo por tema desbloqueado', () => {
    const plan = generarPlan([
      tema({ tema: 'CICLO_VIDA', faseOrden: 1, dominio: 95, retos: [reto(1, 1, { aprobado: true, mejorPorcentaje: 100, mejorEstrellas: 3 }), reto(2, 2, { aprobado: true, mejorPorcentaje: 85, mejorEstrellas: 1 })] }),
      tema({ tema: 'ELICITACION', faseOrden: 2, dominio: 85, retos: [reto(3, 1, { aprobado: true, mejorPorcentaje: 92, mejorEstrellas: 2 })] }),
      tema({ tema: 'ATRIBUTOS_CALIDAD', faseOrden: 3, dominio: 80, faseDesbloqueada: false }),
    ]);
    expect(plan.esPlanMejora).toBe(true);
    expect(plan.actividades.map((a) => `${a.tipo}:${a.retoId ?? a.tema}`)).toEqual([
      'RETO:2',
      'RETO:3',
      'DUELO:CICLO_VIDA',
      'DUELO:ELICITACION',
    ]);
  });

  it('el plan de mejora siempre tiene al menos un duelo (la fase 1 está siempre abierta)', () => {
    const plan = generarPlan([
      tema({ tema: 'CICLO_VIDA', faseOrden: 1, dominio: 100 }),
      tema({ tema: 'ELICITACION', faseOrden: 2, dominio: 100, faseDesbloqueada: false }),
    ]);
    expect(plan.actividades).toHaveLength(1);
    expect(plan.actividades[0].tipo).toBe('DUELO');
  });
});

describe('CU-10: resultado del diagnóstico', () => {
  it('aciertos ÷ 3 × 100, redondeado', () => {
    expect(porcentajeDeTema(0, 3)).toBe(0);
    expect(porcentajeDeTema(1, 3)).toBe(33);
    expect(porcentajeDeTema(2, 3)).toBe(67);
    expect(porcentajeDeTema(3, 3)).toBe(100);
  });
  it('sin preguntas es 0', () => {
    expect(porcentajeDeTema(0, 0)).toBe(0);
  });
});

describe('CU-10 FE1: preguntas pendientes', () => {
  it('lista las preguntas sin respuesta', () => {
    expect(preguntasPendientes([1, 2, 3, 4], [2, 4])).toEqual([1, 3]);
  });
  it('sin pendientes devuelve una lista vacía', () => {
    expect(preguntasPendientes([1, 2], [2, 1, 1])).toEqual([]);
  });
});

describe('CU-10: elegirAlAzar', () => {
  it('devuelve la cantidad pedida sin repetir elementos', () => {
    const elegidos = elegirAlAzar([1, 2, 3, 4, 5, 6, 7, 8], 3);
    expect(elegidos).toHaveLength(3);
    expect(new Set(elegidos).size).toBe(3);
  });
  it('si hay menos elementos que los pedidos devuelve todos', () => {
    expect(elegirAlAzar([1, 2], 5).sort()).toEqual([1, 2]);
  });
  it('no modifica la lista original', () => {
    const original = [1, 2, 3, 4];
    elegirAlAzar(original, 2);
    expect(original).toEqual([1, 2, 3, 4]);
  });
  it('con un generador fijo el resultado es reproducible', () => {
    expect(elegirAlAzar([1, 2, 3, 4], 2, () => 0)).toEqual(elegirAlAzar([1, 2, 3, 4], 2, () => 0));
  });
});

describe('CU-10 FA1: validarAjuste', () => {
  it('acepta quitar y reordenar actividades del plan', () => {
    expect(validarAjuste([1, 2, 3], [3, 1])).toBeNull();
  });
  it('rechaza una lista vacía', () => {
    expect(validarAjuste([1, 2, 3], [])).toMatch(/al menos una/);
  });
  it('rechaza actividades que no son del plan', () => {
    expect(validarAjuste([1, 2, 3], [1, 99])).toMatch(/de este plan/);
  });
  it('rechaza actividades repetidas', () => {
    expect(validarAjuste([1, 2, 3], [1, 1])).toMatch(/repetirse/);
  });
});
