import { expect, test, type Page } from '@playwright/test';
import { capturar, entrarAlReto, iniciarSesionDemo, nuevaPagina } from './fixtures';

/**
 * Flujos alternativos y de excepción en la interfaz real. Corre después de
 * 01-recorrido (usa el usuario demo con los 5 retos ya aprobados, así que los
 * reintentos no otorgan XP ni QP).
 */
test.describe.configure({ mode: 'serial' });

test.describe('Flujos alternativos y de excepción', () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    page = await nuevaPagina(browser);
    await iniciarSesionDemo(page);
  });
  test.afterAll(async () => {
    await page.context().close();
  });

  test('CU-01 FE1 (libreta vacía pide confirmación), ayuda y FE2 (turnos agotados envían solos)', async () => {
    await entrarAlReto(page, 2, 'Entrevista con Don Ramón');
    await page.locator('[data-tecnica=ENTREVISTA]').click();
    await page.getByText('¿Qué le preguntas?').waitFor();

    await page.locator('#btn-enviar').click();
    await expect(page.getByText('Tu libreta está vacía')).toBeVisible();
    await page.getByRole('button', { name: 'Seguir editando' }).click();

    await page.getByRole('button', { name: /Usar ayuda/ }).click();
    await expect(page.getByText('la pregunta destacada es una buena apuesta')).toBeVisible();
    await expect(page.getByRole('button', { name: /Ayuda usada/ })).toBeDisabled(); // máximo 1 por intento
    // la pista sobrevive a recargar
    await page.reload();
    await expect(page.getByText('la pregunta destacada es una buena apuesta')).toBeVisible();

    for (let i = 0; i < 12; i++) {
      await page.locator('[data-opcion-id]').first().click();
      await expect(page.locator('#turnos-restantes')).toHaveText(new RegExp(`^${11 - i} de`));
    }
    await page.waitForURL(/\/resultado\/\d+/, { timeout: 20_000 });
    await expect(page.locator('dl')).toContainText('Sí'); // usó ayuda
  });

  test('CU-06 FE2: restricciones incumplidas piden confirmación; un intento no aprobado no recibe la referencia', async () => {
    await entrarAlReto(page, 3, 'Equilibra la plataforma de pagos');
    await page.getByRole('button', { name: /Usar ayuda/ }).click();
    await expect(page.getByText('la restricción más lejos de cumplirse')).toBeVisible();
    for (const a of ['Seguridad', 'Usabilidad', 'Eficiencia de desempeño', 'Mantenibilidad'])
      for (let i = 0; i < 5; i++) await page.getByRole('button', { name: `Agregar un punto a ${a}` }).click();
    await page.getByLabel(/Repartí los puntos por igual/).check();
    await page.locator('#btn-enviar').click();
    await expect(page.getByText('No cumples una restricción obligatoria')).toBeVisible();
    await page.getByRole('button', { name: 'Enviar', exact: true }).click();
    await page.waitForURL(/\/resultado\/\d+/);
    await expect(page.locator('#resultado-titulo')).toContainText('No Superado');

    // Retroalimentación de un intento NO aprobado: qué está mal, pero no la solución
    await expect(page.getByText('Tu reparto y las restricciones')).toBeVisible();
    await expect(page.getByText(/Cumpliste 2 de 3 restricciones obligatorias/)).toBeVisible();
    await expect(page.getByText('La respuesta de referencia completa se muestra cuando apruebas el reto')).toBeVisible();
    await expect(page.getByText('Tu reparto frente al de referencia')).toHaveCount(0);
    await expect(page.getByText('La justificación correcta era')).toHaveCount(0);
    await expect(page.getByText('Medidor de referencia')).toHaveCount(0);
    await capturar(page, '13-presupuesto-resultado-no-aprobado', 1700);
  });

  test('CU-08 FE2: rebasar la fecha límite pide confirmación', async () => {
    await entrarAlReto(page, 1, 'Planifica el lanzamiento');
    await page.locator('[data-fila-bloque]').first().waitFor();
    const filas = page.locator('[data-fila-bloque]');
    const total = await filas.count();
    for (let i = 0; i < total; i++) await filas.nth(i).getByRole('button', { name: 'Colocar' }).click();
    for (let i = 0; i < 19; i++) await page.getByRole('button', { name: 'Retrasar Despliegue en producción una semana' }).click();
    await expect(page.locator('#resumen-fin')).toContainText('sobre el límite');
    const selects = page.locator('select[id^=entregable-]');
    for (let i = 0; i < (await selects.count()); i++) await selects.nth(i).selectOption({ index: 1 });
    await page.locator('#btn-enviar').click();
    await expect(page.getByText('Tu plan dura 20 semanas')).toBeVisible();
    await page.getByRole('button', { name: 'Seguir editando' }).click();
  });

  test('los reintentos de retos aprobados no vuelven a otorgar XP ni QP (RN-07)', async () => {
    await page.goto('/');
    await page.getByText('Overworld SDLC').waitFor();
    const hud = (await page.locator('header').innerText()).replace(/\s+/g, ' ');
    expect(hud).toContain('1120 / 1500 XP');
    expect(hud).toContain('770 QP');
  });
});
