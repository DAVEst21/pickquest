import { expect, test, type Page } from '@playwright/test';
import type { Client } from 'pg';
import { esperarGuardado, nuevaPagina } from './fixtures';
import { abrirReto, type Alumno, cerrarCaso, conectar, crearAlumno, entrar, esperarResultado } from './ayudas-sprint3';

/**
 * CU-07 Elegir el ciclo de vida investigando el expediente de un proyecto (RF-10, RN-22, RN-31),
 * resuelto por la interfaz. Cada caso cita su flujo en el nombre (FN, FA y FE del anexo A).
 * CU-07 abre la fase 1, así que cada estudiante de prueba llega a él sin requisitos previos.
 */
const EVIDENCIAS = 'cu07';

interface Fragmento {
  id: number;
  texto: string;
  caracteristica: string | null;
  respalda: boolean;
  documento: string;
  orden: number;
}

let db: Client;
let page: Page;
let alumno: Alumno | undefined;
let reto: { id: number; faseId: number };
let fragmentos: Fragmento[];
let nombreCaracteristicas: string[];
let observado = '';
/** Evidencias agregadas en el caso actual, en el orden del tablero. */
let agregadas: Fragmento[] = [];

const sql = async (q: string, valores: unknown[] = []) => (await db.query(q, valores)).rows;
const relevantes = () => fragmentos.filter((f) => f.caracteristica !== null);
/** Un fragmento de respaldo por documento, para recorrer los cuatro documentos. */
const unoPorDocumento = () => {
  const vistos = new Set<string>();
  return fragmentos.filter((f) => f.respalda && !vistos.has(f.documento) && vistos.add(f.documento));
};
const irrelevante = () => fragmentos.find((f) => f.caracteristica === null)!;
const fragmento = (f: Fragmento) => page.locator(`[data-fragmento-id="${f.id}"]`);
const evidencia = (f: Fragmento) => page.locator(`[data-evidencia-id="${f.id}"]`);

/** Abre el documento y selecciona el fragmento con clic o con el teclado (Enter). */
async function agregar(f: Fragmento, via: 'clic' | 'enter' = 'clic') {
  await page.getByRole('tab', { name: f.documento }).click();
  if (via === 'clic') await fragmento(f).click();
  else {
    await fragmento(f).focus();
    await page.keyboard.press('Enter');
  }
  agregadas.push(f);
  await expect(evidencia(f)).toBeVisible();
}

async function caracterizar(f: Fragmento, nombre = f.caracteristica ?? nombreCaracteristicas[0]) {
  const n = agregadas.indexOf(f) + 1;
  await page.getByLabel(`Característica que revela la evidencia ${n}`).selectOption({ label: nombre });
}

async function vincular(f: Fragmento) {
  await evidencia(f).getByRole('checkbox').check();
}

const elegirModelo = (nombre: string) => page.getByRole('radio', { name: nombre, exact: true }).check();

/** Solución de referencia: una evidencia de respaldo por documento, con su característica, modelo Ágil y dos vínculos. */
async function resolverBien() {
  const buenas = unoPorDocumento();
  for (const f of buenas) {
    await agregar(f);
    await caracterizar(f);
  }
  await elegirModelo('Ágil');
  await vincular(buenas[0]);
  await vincular(buenas[1]);
}

async function enviar() {
  await page.locator('#btn-enviar').click();
  await esperarResultado(page);
}

test.beforeAll(async () => {
  db = await conectar();
  [reto] = await sql(`SELECT id, "faseId" FROM reto WHERE mecanica = 'EXPEDIENTE_PROYECTO'`);
  fragmentos = await sql(
    `SELECT f.id, f.texto, c.nombre AS caracteristica, f."respaldaModelo" AS respalda, d.titulo AS documento, d.orden
       FROM fragmento_documento f
       JOIN documento_expediente d ON d.id = f."documentoId"
       LEFT JOIN caracteristica_proyecto c ON c.id = f."caracteristicaCorrectaId"
      WHERE d."retoId" = $1 ORDER BY d.orden, f.orden`,
    [reto.id],
  );
  nombreCaracteristicas = (await sql(`SELECT nombre FROM caracteristica_proyecto WHERE "retoId" = $1 ORDER BY id`, [reto.id])).map((c) => c.nombre);
});
test.afterAll(async () => {
  await db.end();
});
test.beforeEach(async ({ browser }) => {
  observado = '';
  agregadas = [];
  alumno = await crearAlumno(db, 'cu07');
  page = await nuevaPagina(browser);
  await entrar(page, alumno);
  await abrirReto(page, reto.faseId, reto.id);
  await page.locator('#contador-evidencias').waitFor();
});
test.afterEach(async ({ browser }, info) => {
  void browser;
  await cerrarCaso({ subcarpeta: EVIDENCIAS, info, page, db, alumno, observado });
});

test('CP-EX-01 CU-07 FN: abrir documentos, seleccionar con clic y con Enter, caracterizar, elegir modelo, vincular, enviar y ver las irrelevantes señaladas', async () => {
  // paso 2: expediente con sus cuatro documentos y el tablero vacío
  await expect(page.getByRole('tab')).toHaveCount(4);
  await expect(page.locator('#contador-evidencias')).toHaveText('0 evidencias');

  // pasos 3 a 7: una evidencia de respaldo de cada documento (dos con clic, dos con Enter) y una irrelevante
  const buenas = unoPorDocumento();
  expect(buenas).toHaveLength(4);
  await agregar(buenas[0], 'clic');
  await agregar(buenas[1], 'clic');
  await agregar(buenas[2], 'enter');
  await agregar(buenas[3], 'enter');
  const mala = irrelevante();
  await agregar(mala, 'clic');
  for (const f of buenas) await caracterizar(f);
  await caracterizar(mala, nombreCaracteristicas[0]);
  await expect(page.locator('#contador-evidencias')).toHaveText('5 evidencias');
  await page.getByRole('tab', { name: buenas[2].documento }).click();
  await expect(fragmento(buenas[2])).toHaveAttribute('aria-pressed', 'true');
  await expect(fragmento(buenas[2])).toContainText('en el tablero');

  // paso 8: modelo Ágil respaldado por dos evidencias
  await elegirModelo('Ágil');
  await vincular(buenas[0]);
  await vincular(buenas[1]);
  await expect(page.locator('#contador-vinculos')).toHaveText('2 de 2 evidencias vinculadas como mínimo');
  await esperarGuardado(page);

  // pasos 9 a 11: se califica (RN-22) y la evidencia irrelevante queda señalada
  await enviar();
  await expect(page.locator('#resultado-porcentaje')).toHaveText('77%'); // 50 + 12 + 20 − 5
  await expect(page.locator(`[data-evidencia-resultado="${mala.id}"]`)).toContainText('Esta evidencia no era relevante');
  await expect(page.locator(`[data-evidencia-resultado="${mala.id}"] .material-symbols-outlined`).first()).toHaveText('cancel');
  for (const f of buenas) {
    await expect(page.locator(`[data-evidencia-resultado="${f.id}"] .material-symbols-outlined`).first()).toHaveText('check_circle');
    await expect(page.locator(`[data-evidencia-resultado="${f.id}"]`)).not.toContainText('no era relevante');
  }
  await expect(page.locator('[data-modelo]')).toContainText('Es el modelo que respaldan las evidencias');
  observado = 'Flujo completo por interfaz (clic y Enter): 77 %; la evidencia irrelevante quedó señalada y las cuatro buenas, correctas.';
});

test('CP-EX-02 CU-07 FE1: con menos de dos evidencias vinculadas, Enviar muestra el aviso y no envía', async () => {
  const [a, b] = unoPorDocumento();
  await agregar(a);
  await caracterizar(a);
  await elegirModelo('Ágil');

  await expect(page.locator('#btn-enviar')).toBeDisabled();
  await expect(page.locator('#aviso-faltantes')).toContainText('Debes vincular al menos 2 evidencias al modelo elegido');
  await vincular(a);
  await expect(page.locator('#btn-enviar')).toBeDisabled();
  await expect(page.locator('#contador-vinculos')).toHaveText('1 de 2 evidencias vinculadas como mínimo');

  // una evidencia sin característica también impide enviar
  await agregar(b);
  await vincular(b);
  await expect(page.locator('#btn-enviar')).toBeDisabled();
  await expect(page.locator('#aviso-faltantes')).toContainText('Falta indicar qué característica del proyecto revela la evidencia');
  expect(page.url()).toMatch(/\/intento\/\d+/);

  // nada se calificó en el servidor
  const [{ calificados }] = await sql(`SELECT count(*)::int AS calificados FROM intento_reto WHERE "estudianteId" = $1 AND estado = 'CALIFICADO'`, [alumno!.id]);
  expect(calificados).toBe(0);

  // con las dos vinculadas y caracterizadas se habilita
  await caracterizar(b);
  await expect(page.locator('#btn-enviar')).toBeEnabled();
  observado = 'Con 0 y 1 vínculos —y con una evidencia sin característica— Enviar quedó deshabilitado con su aviso; con 2 se habilitó.';
});

test('CP-EX-03 CU-07 FE2: seleccionar un fragmento ya agregado muestra el aviso y no lo duplica', async () => {
  const [a] = unoPorDocumento();
  await agregar(a);
  await expect(page.locator('[data-aviso-evidencia]')).toBeHidden();

  await fragmento(a).click();
  await expect(page.locator('[data-aviso-evidencia]')).toContainText('Esa evidencia ya fue agregada al tablero: no se duplica.');
  await expect(page.locator('[data-evidencia-id]')).toHaveCount(1);
  await expect(page.locator('#contador-evidencias')).toHaveText('1 evidencia');

  // también con el teclado
  await fragmento(a).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-evidencia-id]')).toHaveCount(1);
  await esperarGuardado(page);
  const [{ total }] = await sql(
    `SELECT count(*)::int AS total FROM evidencia_seleccionada e JOIN intento_reto i ON i.id = e."intentoId" WHERE i."estudianteId" = $1`,
    [alumno!.id],
  );
  expect(total).toBe(1);
  observado = 'Seleccionar de nuevo el mismo fragmento (clic y Enter) avisó y dejó una sola evidencia, también en el servidor.';
});

test('CP-EX-04 CU-07 FA2: la ayuda resalta un documento con una evidencia relevante pendiente', async () => {
  const [a] = unoPorDocumento();
  await agregar(a);
  await caracterizar(a);
  await expect(page.locator('[data-pista=documento]')).toHaveCount(0);

  await page.locator('[data-objeto-id]').first().click();
  const pista = page.locator('[data-pista=documento]');
  await expect(pista).toBeVisible();
  await expect(pista).toContainText('tiene una evidencia relevante que todavía no seleccionas');

  // el documento resaltado tiene al menos una evidencia relevante que aún no está en el tablero
  const resaltado = page.locator('button[role=tab].ring-tertiary');
  await expect(resaltado).toHaveCount(1);
  const [{ titulo }] = await sql(`SELECT titulo FROM documento_expediente WHERE id = $1`, [Number(await resaltado.getAttribute('data-documento-id'))]);
  const pendientes = relevantes().filter((f) => f.documento === titulo && !agregadas.some((e) => e.id === f.id));
  expect(pendientes.length).toBeGreaterThan(0);
  await expect(page.locator('[data-objeto-id]').first()).toBeDisabled();
  observado = `La ayuda resaltó el documento «${titulo}», que aún tiene ${pendientes.length} evidencia(s) relevante(s) sin seleccionar.`;
});

test('CP-EX-05 CU-07 FA3: salir y volver conserva evidencias, características, modelo y vínculos', async () => {
  const [a, b] = unoPorDocumento();
  await agregar(a);
  await agregar(b);
  await caracterizar(a);
  await caracterizar(b, nombreCaracteristicas[nombreCaracteristicas.length - 1]); // una característica distinta a propósito
  await elegirModelo('Espiral');
  await vincular(b);
  await esperarGuardado(page);

  await page.goto('/');
  await abrirReto(page, reto.faseId, reto.id, /Continuar intento/);
  await page.locator('#contador-evidencias').waitFor();

  await expect(page.locator('#contador-evidencias')).toHaveText('2 evidencias');
  await expect(evidencia(a)).toBeVisible();
  await expect(evidencia(b)).toBeVisible();
  await expect(page.getByLabel('Característica que revela la evidencia 1').locator('option:checked')).toHaveText(a.caracteristica!);
  await expect(page.getByLabel('Característica que revela la evidencia 2').locator('option:checked')).toHaveText(nombreCaracteristicas[nombreCaracteristicas.length - 1]);
  await expect(page.getByRole('radio', { name: 'Espiral', exact: true })).toBeChecked();
  await expect(evidencia(a).getByRole('checkbox')).not.toBeChecked();
  await expect(evidencia(b).getByRole('checkbox')).toBeChecked();
  await expect(page.locator('#contador-vinculos')).toHaveText('1 de 2 evidencias vinculadas como mínimo');
  observado = 'Al volver siguen las 2 evidencias, sus características, el modelo Espiral y el vínculo de la segunda.';
});

test('CP-EX-06 CU-07 RN-31: con un intento no aprobado no aparece el modelo de referencia; aparece al aprobar', async () => {
  // intento 1: modelo equivocado y solo dos evidencias → no aprueba
  const [a, b] = unoPorDocumento();
  await agregar(a);
  await caracterizar(a);
  await agregar(b);
  await caracterizar(b);
  await elegirModelo('Cascada');
  await vincular(a);
  await vincular(b);
  await esperarGuardado(page);
  await enviar();
  await expect(page.locator('#resultado-porcentaje')).toHaveText('6%');
  await expect(page.locator('[data-retro=referencia-reservada]')).toBeVisible();
  await expect(page.locator('[data-modelo-referencia]')).toHaveCount(0);
  await expect(page.locator('[data-fragmentos-referencia]')).toHaveCount(0);
  await expect(page.locator('[data-modelo]')).toContainText('No es el modelo que respaldan las evidencias');

  // intento 2: aprobado → aparecen el modelo de referencia y las evidencias relevantes del expediente
  await page.locator('#retry-btn').click();
  await page.waitForURL(/\/intento\/\d+/);
  await page.locator('#contador-evidencias').waitFor();
  agregadas = [];
  await resolverBien();
  await esperarGuardado(page);
  await enviar();
  await expect(page.locator('#resultado-porcentaje')).toHaveText('82%');
  await expect(page.locator('[data-retro=referencia-reservada]')).toHaveCount(0);
  await expect(page.locator('[data-modelo-referencia]')).toContainText('Modelo de referencia: Ágil');
  await expect(page.locator('[data-fragmentos-referencia] li')).toHaveCount(relevantes().length);
  observado = 'Intento no aprobado (6 %): sin modelo ni fragmentos de referencia; intento aprobado (82 %): ambos visibles.';
});
