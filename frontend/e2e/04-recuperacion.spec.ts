import { expect, test, type Page } from '@playwright/test';
import { Client } from 'pg';
import { entrarAlReto, iniciarSesionDemo, nuevaPagina } from './fixtures';

const BACK = process.env.E2E_BACK_URL ?? 'http://localhost:3000';
const DB = process.env.E2E_DATABASE_URL ?? 'postgresql://pickquest:pickquest@localhost:5432/pickquest';
let db: Client;
test.beforeAll(async () => { db = new Client({ connectionString: DB }); await db.connect(); });
test.afterAll(async () => { await db.end(); });

for (const vista of ['mapa', 'tablón', 'intento', 'resultado']) {
  test(`RNF-RE-02: reintentar carga de ${vista}`, async ({ browser }) => {
    const page = await nuevaPagina(browser);
    try {
      await iniciarSesionDemo(page);
      let ruta = '/', consulta = /\/fases$/;
      if (vista === 'tablón') {
        const r = await db.query('SELECT id FROM fase WHERE orden=1'); ruta = `/mision/${r.rows[0].id}`; consulta = /\/fases\/\d+$/;
      } else if (vista === 'intento' || vista === 'resultado') {
        const r = await db.query('SELECT i.id FROM intento_reto i JOIN estudiante e ON i."estudianteId"=e.id WHERE e.email=$1 AND i.estado=$2 ORDER BY i.id DESC LIMIT 1', ['demo@pickquest.dev', vista === 'intento' ? 'EN_CURSO' : 'CALIFICADO']);
        expect(r.rows).toHaveLength(1); ruta = `/${vista}/${r.rows[0].id}`; consulta = /\/intentos\/\d+$/;
      }
      await page.route(consulta, route => route.abort());
      await page.goto(ruta); await page.reload();
      await expect(page.getByText(`No se pudo cargar ${vista === 'resultado' ? 'el resultado' : vista === 'intento' ? 'el reto' : vista === 'tablón' ? 'el tablón' : 'el mapa'}`, { exact: true })).toBeVisible();
      await page.unroute(consulta);
      await page.getByRole('button', { name: 'Reintentar', exact: true }).click();
      await expect(page.getByRole('button', { name: 'Reintentar', exact: true })).toHaveCount(0);
      await expect(page.locator('main')).not.toContainText('No se pudo cargar');
    } finally { await page.context().close(); }
  });
}

async function completarMoscow(page: Page) {
  const r = await db.query('SELECT t.* FROM tarjeta_requerimiento t JOIN reto r ON r.id=t."retoId" WHERE r.mecanica=$1 ORDER BY t.orden', ['TABLERO_MOSCOW']);
  for (const t of r.rows) {
    const tarjeta = page.locator(`[data-tarjeta-id="${t.id}"]`);
    await tarjeta.locator('select').selectOption(t.columnaCorrecta);
    await tarjeta.getByRole('button', { name: t.tipoCorrecto === 'FUNCIONAL' ? 'RF' : 'RNF', exact: true }).click();
  }
}

test('RNF-RE-03: respuesta perdida después de calificar se recupera sin crear otro intento', async ({ browser }) => {
  const page = await nuevaPagina(browser);
  try {
    await iniciarSesionDemo(page); await entrarAlReto(page, 2, 'Prioriza el sistema de La Esquina');
    const id = Number(page.url().split('/').pop());
    await completarMoscow(page);
    let procesado = false;
    const envio = /\/intentos\/\d+\/enviar$/;
    await page.route(envio, async route => {
      if (route.request().method() !== 'POST') return route.fallback();
      const r = await fetch(`${BACK}/intentos/${id}/enviar`, { method: 'POST', headers: { Authorization: route.request().headers()['authorization'] } });
      expect(r.status).toBe(200); procesado = true; await route.abort();
    });
    await page.locator('#btn-enviar').click(); await expect(page.getByRole('button', { name: 'Reintentar envío' })).toBeVisible(); expect(procesado).toBe(true);
    await page.unroute(envio); await page.getByRole('button', { name: 'Reintentar envío' }).click();
    await page.waitForURL(`**/resultado/${id}`); await expect(page.locator('#resultado-porcentaje')).toHaveText('100%');
    const r = await db.query('SELECT estado,"xpGanado","qpGanado" FROM intento_reto WHERE id=$1', [id]);
    expect(r.rows[0]).toMatchObject({ estado: 'CALIFICADO', xpGanado: 0, qpGanado: 0 });
  } finally { await page.context().close(); }
});

test('RNF-RE-01/03: un borrador que falla conserva respuestas y se reenvía al recuperar conexión', async ({ browser }) => {
  const page = await nuevaPagina(browser);
  try {
    await iniciarSesionDemo(page); await entrarAlReto(page, 2, 'Prioriza el sistema de La Esquina');
    const guardado = /\/intentos\/\d+\/borrador$/;
    await page.route(guardado, route => route.abort());
    await completarMoscow(page);
    await expect(page.getByRole('status').filter({ hasText: 'No se pudo guardar; se reintentará' })).toBeVisible();
    await expect(page.locator('[data-tarjeta-id][data-columna=SIN]')).toHaveCount(0);
    await page.unroute(guardado); await page.locator('#btn-enviar').click();
    await page.waitForURL(/\/resultado\/\d+/); await expect(page.locator('#resultado-porcentaje')).toHaveText('100%');
  } finally { await page.context().close(); }
});
