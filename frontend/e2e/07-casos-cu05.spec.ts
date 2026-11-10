import { expect, test, type Page } from '@playwright/test';
import type { Client } from 'pg';
import { esperarGuardado, nuevaPagina } from './fixtures';
import { abrirReto, BACK, aprobarAnteriores, type Alumno, cerrarCaso, conectar, crearAlumno, entrar, esperarResultado } from './ayudas-sprint3';

/**
 * CU-05 Calibrar escenarios de calidad en un simulador (RF-08, RN-20, RN-31), resuelto por la interfaz.
 * Cada caso cita su flujo en el nombre: FN (flujo normal), FA (alternativo) y FE (excepción) del anexo A.
 * Los retos anteriores de la fase solo se dan por aprobados (sin recompensa) para poder llegar al reto.
 */
const EVIDENCIAS = 'cu05';
const PARTES = ['FUENTE', 'ESTIMULO', 'ARTEFACTO', 'ENTORNO', 'RESPUESTA'] as const;
type Parte = (typeof PARTES)[number];

let db: Client;
let page: Page;
let alumno: Alumno | undefined;
let reto: { id: number; faseId: number };
let opciones: { parte: Parte; texto: string; correcta: boolean }[];
let observado = '';

const sql = async (q: string, valores: unknown[] = []) => (await db.query(q, valores)).rows;
const parte = (p: Parte) => page.locator(`fieldset[data-parte="${p}"]`);
const textoDe = (p: Parte, correcta: boolean) => opciones.find((o) => o.parte === p && o.correcta === correcta)!.texto;

/** Elige la opción correcta (o una incorrecta) de cada parte indicada. */
async function elegirPartes(que: Parte[] = [...PARTES], correcta: Record<string, boolean> = {}) {
  for (const p of que) await parte(p).getByRole('radio', { name: textoDe(p, correcta[p] ?? true), exact: true }).check();
}

/** Calibra los tres controles de la medida de respuesta. */
async function calibrar(valor: number, unidad: string, carga: number) {
  await page.locator('[data-control=valor]').fill(String(valor));
  await page.locator('[data-control=unidad]').selectOption({ label: unidad });
  await page.locator('[data-control=carga]').fill(String(carga));
}

/** Escenario de referencia: las cinco partes correctas y una medida dentro del rango aceptable. */
async function resolverBien() {
  await elegirPartes();
  await calibrar(3, 'segundos', 2000);
}

async function simular() {
  const antes = await page.locator('[data-historial-simulaciones] li').count();
  await page.locator('#btn-simular').click();
  await expect(page.locator('[data-historial-simulaciones] li')).toHaveCount(antes + 1);
}

async function enviar() {
  await page.locator('#btn-enviar').click();
  await esperarResultado(page);
}

test.beforeAll(async () => {
  db = await conectar();
  [reto] = await sql(`SELECT id, "faseId" FROM reto WHERE mecanica = 'SIMULADOR_ESCENARIOS'`);
  opciones = await sql(`SELECT parte, texto, correcta FROM opcion_parte_escenario WHERE "retoId" = $1 ORDER BY parte, orden`, [reto.id]);
});
test.afterAll(async () => {
  await db.end();
});
test.beforeEach(async ({ browser }) => {
  observado = '';
  alumno = await crearAlumno(db, 'cu05');
  await aprobarAnteriores(db, alumno, reto.id);
  page = await nuevaPagina(browser);
  await entrar(page, alumno);
  await abrirReto(page, reto.faseId, reto.id);
  await page.locator('#btn-simular').waitFor();
});
test.afterEach(async ({}, info) => {
  await cerrarCaso({ subcarpeta: EVIDENCIAS, info, page, db, alumno, observado });
});

test('CP-ES-01 CU-05 FN: elegir las cinco partes, calibrar, simular, ver la gráfica y enviar con las partes incorrectas señaladas', async () => {
  // paso 2: la necesidad vaga y las seis partes vacías
  await expect(page.getByText('La app tiene que ser rápida en temporada alta.')).toBeVisible();
  for (const p of PARTES) await expect(parte(p).locator('input:checked')).toHaveCount(0);

  // pasos 3 y 4: las cinco partes (el entorno, a propósito, incorrecto) y la medida con los controles
  await elegirPartes(PARTES.filter((p) => p !== 'ENTORNO'));
  await elegirPartes(['ENTORNO'], { ENTORNO: false });
  await calibrar(2, 'segundos', 2000);

  // pasos 5 y 6: la app tarda 2.4 s con 2,000 usuarios; con un máximo de 2 s no se cumple
  await simular();
  await expect(page.locator('[data-resultado-simulacion]')).toContainText('La app no cumple tu escenario');
  await expect(page.locator('[data-grafica]')).toBeVisible();

  // paso 7: ajustar y repetir hasta que se cumpla
  await calibrar(3, 'segundos', 2000);
  await simular();
  await expect(page.locator('[data-resultado-simulacion]')).toContainText('La app cumple tu escenario');
  await expect(page.locator('#simulaciones-restantes')).toHaveText('3 de 5 simulaciones restantes');
  await esperarGuardado(page);

  // pasos 8 a 10: enviar; el entorno queda señalado como incorrecto y las demás partes como correctas
  await enviar();
  await expect(page.locator('#resultado-porcentaje')).toHaveText('88%');
  for (const p of PARTES) {
    const marca = page.locator(`[data-parte-resultado="${p}"] .material-symbols-outlined`).first();
    await expect(marca).toHaveText(p === 'ENTORNO' ? 'cancel' : 'check_circle');
  }
  await expect(page.locator('[data-medida]')).toContainText('Está dentro del rango aceptable');
  observado = 'Flujo completo por interfaz: 88 %, aprobado; el entorno incorrecto quedó señalado y la medida dentro del rango.';
});

test('CP-ES-02 CU-05 FE1: con una parte vacía, Simular y Enviar señalan lo que falta y no proceden', async () => {
  // sin nada elegido
  await expect(page.locator('#btn-simular')).toBeDisabled();
  await expect(page.locator('[data-aviso-simular]')).toContainText('Falta elegir la fuente del escenario');
  await expect(page.locator('#btn-enviar')).toBeDisabled();
  await expect(page.locator('#aviso-faltantes')).toContainText('Falta elegir la fuente del escenario');

  // cuatro partes y la medida completas, falta la respuesta
  await elegirPartes(PARTES.filter((p) => p !== 'RESPUESTA'));
  await calibrar(3, 'segundos', 2000);
  await expect(page.locator('#btn-simular')).toBeDisabled();
  await expect(page.locator('[data-aviso-simular]')).toContainText('Falta elegir la respuesta del escenario');
  await expect(page.locator('#btn-enviar')).toBeDisabled();
  await expect(page.locator('#aviso-faltantes')).toContainText('Falta elegir la respuesta del escenario');
  await expect(page.locator('[data-historial-simulaciones]')).toHaveCount(0);

  // nada se envió ni se simuló en el servidor
  const [{ calificados }] = await sql(`SELECT count(*)::int AS calificados FROM intento_reto WHERE "estudianteId" = $1 AND estado = 'CALIFICADO' AND "retoId" = $2`, [alumno!.id, reto.id]);
  expect(calificados).toBe(0);
  const [{ simulaciones }] = await sql(`SELECT count(*)::int AS simulaciones FROM simulacion_escenario s JOIN intento_reto i ON i.id = s."intentoId" WHERE i."estudianteId" = $1`, [alumno!.id]);
  expect(simulaciones).toBe(0);

  // al completar la respuesta se habilitan
  await elegirPartes(['RESPUESTA']);
  await expect(page.locator('#btn-simular')).toBeEnabled();
  await expect(page.locator('#btn-enviar')).toBeEnabled();
  observado = 'Con la respuesta vacía se muestran las partes vacías y no se simula ni se envía; al completarla se habilitan.';
});

test('CP-ES-03 CU-05 FE2: tras 5 simulaciones, la sexta muestra el aviso de límite y Simular queda deshabilitado', async () => {
  await resolverBien();
  for (let n = 1; n <= 5; n++) {
    await simular();
    await expect(page.locator('#simulaciones-restantes')).toHaveText(`${5 - n} de 5 simulaciones restantes`);
  }
  await expect(page.locator('#btn-simular')).toBeDisabled();
  await expect(page.locator('[data-aviso-limite]')).toContainText('Ya no puedes simular: envía tu escenario');
  await expect(page.locator('[data-historial-simulaciones] li')).toHaveCount(5);

  // el servidor también rechaza la sexta (409)
  const [{ id }] = await sql(`SELECT id FROM intento_reto WHERE "estudianteId" = $1 AND estado = 'EN_CURSO'`, [alumno!.id]);
  const sexta = await fetch(`${BACK}/intentos/${id}/escenario/simular`, { method: 'POST', headers: { Authorization: `Bearer ${alumno!.token}` } }).catch(() => null);
  if (sexta) expect(sexta.status).toBe(409);
  // todavía se puede enviar
  await enviar();
  await expect(page.locator('#resultado-porcentaje')).toHaveText('100%');
  observado = 'Cinco simulaciones; la sexta quedó deshabilitada con el aviso de límite y el envío siguió disponible.';
});

test('CP-ES-04 CU-05 FA2: usar una ayuda muestra el rango aceptable y el resultado queda con máximo 2 estrellas', async () => {
  await expect(page.locator('[data-pista=rango]')).toHaveCount(0);
  await page.locator('[data-objeto-id]').first().click();
  const pista = page.locator('[data-pista=rango]');
  await expect(pista).toBeVisible();
  await expect(pista).toContainText('entre 2 y 3');
  await expect(pista).toContainText('1500');
  await expect(pista).toContainText('2500');

  // la ayuda descuenta una unidad del inventario y solo se puede usar una vez por intento
  await expect(page.locator('[data-objeto-id]').first()).toBeDisabled();
  const [{ cantidad }] = await sql(
    `SELECT i.cantidad FROM inventario_objeto i JOIN objeto o ON o.id = i."objetoId" WHERE i."estudianteId" = $1 AND o.nombre = 'Poción de Sabiduría'`,
    [alumno!.id],
  );
  expect(cantidad).toBe(2);

  await resolverBien();
  await esperarGuardado(page);
  await enviar();
  await expect(page.locator('#resultado-porcentaje')).toHaveText('100%');
  await expect(page.getByLabel('2 de 3 estrellas').first()).toBeVisible();
  await expect(page.getByLabel('3 de 3 estrellas')).toHaveCount(0);
  observado = 'La pista mostró el rango 2–3 s con 1,500–2,500 usuarios; con 100 % el intento con ayuda quedó en 2 estrellas.';
});

test('CP-ES-05 CU-05 FA3: salir a mitad del reto y volver conserva lo elegido y la pista revelada', async () => {
  await page.locator('[data-objeto-id]').first().click();
  await expect(page.locator('[data-pista=rango]')).toBeVisible();
  await elegirPartes(['FUENTE', 'ESTIMULO']);
  await calibrar(3, 'segundos', 2000);
  await esperarGuardado(page);

  // sale del reto y vuelve desde el tablón
  await page.goto('/');
  const intentoId = await abrirReto(page, reto.faseId, reto.id, /Continuar intento/);
  await page.locator('#btn-simular').waitFor();
  expect(intentoId).toBeGreaterThan(0);

  await expect(parte('FUENTE').getByRole('radio', { name: textoDe('FUENTE', true), exact: true })).toBeChecked();
  await expect(parte('ESTIMULO').getByRole('radio', { name: textoDe('ESTIMULO', true), exact: true })).toBeChecked();
  for (const p of ['ARTEFACTO', 'ENTORNO', 'RESPUESTA'] as Parte[]) await expect(parte(p).locator('input:checked')).toHaveCount(0);
  await expect(page.locator('[data-valor-texto]')).toContainText('3 segundos');
  await expect(page.locator('[data-carga-texto]')).toContainText('2000 usuarios concurrentes');
  await expect(page.locator('[data-pista=rango]')).toBeVisible();
  // el servidor sigue marcando la ayuda como usada
  await expect(page.locator('[data-objeto-id]').first()).toBeDisabled();
  observado = 'Al volver: dos partes elegidas, valor 3 s, carga 2,000 y la pista del rango siguen presentes.';
});

test('CP-ES-06 CU-05 RN-31: con un intento no aprobado no aparece el escenario de referencia; aparece al aprobar', async () => {
  // intento 1: todo incorrecto y una medida fuera del rango
  await elegirPartes([...PARTES], Object.fromEntries(PARTES.map((p) => [p, false])));
  await calibrar(9, 'minutos', 300);
  await esperarGuardado(page);
  await enviar();
  await expect(page.locator('#resultado-porcentaje')).toHaveText('0%');
  await expect(page.locator('[data-retro=referencia-reservada]')).toBeVisible();
  await expect(page.locator('[data-rango-referencia]')).toHaveCount(0);
  await expect(page.getByText(/Correcta:/)).toHaveCount(0);
  // las partes incorrectas sí se señalan, sin revelar la solución
  for (const p of PARTES) await expect(page.locator(`[data-parte-resultado="${p}"] .material-symbols-outlined`).first()).toHaveText('cancel');

  // intento 2: aprobado → ahora sí aparecen el rango y las respuestas de referencia
  await page.locator('#retry-btn').click();
  await page.waitForURL(/\/intento\/\d+/);
  await page.locator('#btn-simular').waitFor();
  await resolverBien();
  await esperarGuardado(page);
  await enviar();
  await expect(page.locator('#resultado-porcentaje')).toHaveText('100%');
  await expect(page.locator('[data-retro=referencia-reservada]')).toHaveCount(0);
  await expect(page.locator('[data-rango-referencia]')).toContainText('Rango aceptable: entre 2 y 3 segundos');
  observado = 'Intento no aprobado (0 %): aviso de solución reservada y sin rango; intento aprobado: rango de referencia visible.';
});
