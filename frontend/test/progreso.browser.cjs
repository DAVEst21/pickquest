/* Prueba de navegador. Requiere Playwright externo al bundle de producción.
 * NODE_PATH=/ruta/node_modules node frontend/test/progreso.browser.cjs
 * La sesión demo autentica contra la API real. Las respuestas interceptadas
 * pertenecen exclusivamente a esta prueba; no se escribe progreso.
 */
const { chromium } = require('playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
    });
    const sesion = await page.request.post('http://localhost:3000/auth/login', {
      data: { email: 'demo@pickquest.dev', password: 'pickquest123' },
    });
    assert.equal(sesion.status(), 200);
    const { accessToken } = await sesion.json();
    const real = await page.request.get('http://localhost:3000/progreso', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    assert.equal(real.status(), 200);
    const datosReales = await real.json();
    await page.addInitScript(
      (token) =>
        localStorage.setItem(
          'pickquest-sesion',
          JSON.stringify({ state: { token }, version: 0 }),
        ),
      accessToken,
    );
    await page.goto('http://localhost:5173/', {
      waitUntil: 'domcontentloaded',
    });
    await page
      .getByRole('navigation', { name: 'Navegación principal' })
      .getByRole('link', { name: 'Progreso de aprendizaje' })
      .click();
    await page.waitForURL('**/progreso');
    await page
      .getByRole('heading', { name: 'Progreso de aprendizaje', exact: true })
      .waitFor();
    assert.equal(
      await page
        .getByRole('navigation', { name: 'Navegación principal' })
        .getByRole('link', { name: 'Progreso de aprendizaje' })
        .getAttribute('aria-current'),
      'page',
    );
    assert(
      !(
        await page
          .getByRole('navigation', { name: 'Ruta de navegación' })
          .innerText()
      ).includes('Ficha Dev'),
    );

    const fixture = {
      ...datosReales,
      sinHistorial: false,
      habilidades: datosReales.habilidades.map((h, i) => ({
        ...h,
        nivel: i + 1,
        dominio: 50,
        fases: [{ id: 991, nombre: 'Fase exclusiva de prueba', dominio: 50 }],
      })),
      logros: ['BRONCE', 'PLATA', 'ORO'].map((rareza, i) => ({
        id: 991 + i,
        nombre: `Trofeo de prueba ${i}`,
        descripcion: `Condición de prueba ${i}`,
        rareza,
        fechaObtenido: '2026-10-07',
      })),
    };
    let modo = 'datos';
    let liberarCarga;
    await page.route('**/progreso', async (route) => {
      if (route.request().resourceType() === 'document')
        return route.continue();
      if (modo === 'carga')
        await new Promise((resolve) => {
          liberarCarga = resolve;
        });
      if (modo === 'error')
        return route.fulfill({
          status: 503,
          json: { message: 'Falla controlada de prueba' },
        });
      await route.fulfill({
        json: modo === 'vacio' ? { ...fixture, sinHistorial: true } : fixture,
      });
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page
      .getByRole('heading', { name: 'Árbol de habilidades del SDLC' })
      .waitFor();
    for (const h of fixture.habilidades) {
      await page.getByRole('button', { name: new RegExp(h.nombre) }).click();
      assert(
        (await page.locator('#detalle-habilidad').innerText()).includes(
          h.nombre,
        ),
      );
      assert(
        (await page.locator('#detalle-habilidad').innerText()).includes(
          'Fase exclusiva de prueba',
        ),
      );
      assert(
        (await page.locator('#detalle-habilidad').innerText()).includes('50%'),
      );
    }
    for (const [i, rareza] of ['Bronce', 'Plata', 'Oro'].entries()) {
      await page
        .getByRole('button', { name: new RegExp(`Trofeo de prueba ${i}`) })
        .click();
      const detalle = await page.locator('#detalle-logro').innerText();
      assert(detalle.includes(`Condición de prueba ${i}`));
      assert(detalle.includes(rareza));
    }
    for (const width of [320, 390, 768, 1280, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `Desbordamiento a ${width}px`,
      );
      if (width < 1280) {
        await page.getByRole('button', { name: 'Abrir navegación' }).click();
        const menu = page.getByRole('navigation', { name: 'Navegación móvil' });
        assert.equal(
          await menu
            .getByRole('link', { name: 'Progreso de aprendizaje' })
            .getAttribute('aria-current'),
          'page',
        );
        await menu
          .getByRole('link', { name: 'Overworld', exact: true })
          .click();
        await page.waitForURL('http://localhost:5173/');
        await page.getByRole('button', { name: 'Abrir navegación' }).click();
        await page
          .getByRole('navigation', { name: 'Navegación móvil' })
          .getByRole('link', { name: 'Progreso de aprendizaje' })
          .click();
        await page.waitForURL('**/progreso');
      }
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.screenshot({
      path: '/tmp/pickquest-progreso-desktop.png',
      fullPage: true,
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({
      path: '/tmp/pickquest-progreso-mobile.png',
      fullPage: true,
    });
    modo = 'vacio';
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page
      .getByRole('heading', { name: '¡Tu aventura está por comenzar!' })
      .waitFor();
    assert.equal(
      await page
        .getByRole('heading', { name: 'Tu avance', exact: true })
        .count(),
      0,
    );
    modo = 'error';
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page
      .getByRole('heading', { name: 'No pudimos recuperar tu progreso' })
      .waitFor();
    modo = 'datos';
    await page.getByRole('button', { name: 'Reintentar', exact: true }).click();
    await page
      .getByRole('heading', { name: 'Tu avance', exact: true })
      .waitFor();
    modo = 'carga';
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.getByText('Cargando tu progreso...', { exact: true }).waitFor();
    modo = 'datos';
    liberarCarga();
    await page
      .getByRole('heading', { name: 'Tu avance', exact: true })
      .waitFor();
    assert(
      !/FA1|FA2|RN-07|Flujo Normal/.test(
        await page.locator('main').innerText(),
      ),
    );
    console.log(
      'PASS: API real, header, separación de Ficha Dev, siete habilidades, tres rarezas, móvil/escritorio (320–1920px), bienvenida, error/reintento y carga.',
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
