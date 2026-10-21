import type { Browser, Page, Route } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

/** Carpeta donde la suite guarda las capturas de pantalla (se versionan en el repositorio). */
export const CARPETA_CAPTURAS =
  process.env.E2E_CAPTURAS ?? path.resolve(fileURLToPath(new URL('.', import.meta.url)), '../../docs/capturas');

export const DEMO = { email: 'demo@pickquest.dev', password: 'pickquest123' };

/**
 * Reenvía una petición a otro host con el fetch de Node (route.fetch de
 * Playwright cierra sockets con el servidor de Vite cuando se piden cientos de
 * módulos a la vez) y reintenta si la conexión se corta.
 */
async function reenviar(route: Route, origen: string, destino: string) {
  const peticion = route.request();
  const cabeceras = { ...peticion.headers() };
  delete cabeceras.host;
  delete cabeceras['content-length'];
  const cuerpo = ['GET', 'HEAD'].includes(peticion.method()) ? undefined : (peticion.postDataBuffer() ?? undefined);
  for (let intento = 1; ; intento++) {
    try {
      const respuesta = await fetch(peticion.url().replace(origen, destino), {
        method: peticion.method(),
        headers: cabeceras,
        body: cuerpo,
      });
      const cabecerasRespuesta = Object.fromEntries(respuesta.headers.entries());
      delete cabecerasRespuesta['content-encoding']; // Node ya descomprimió el cuerpo
      delete cabecerasRespuesta['content-length'];
      await route.fulfill({
        status: respuesta.status,
        headers: cabecerasRespuesta,
        body: Buffer.from(await respuesta.arrayBuffer()),
      });
      return;
    } catch (error) {
      if (intento >= 3) {
        await route.abort().catch(() => undefined);
        throw error;
      }
      await new Promise((r) => setTimeout(r, 300 * intento));
    }
  }
}

/**
 * Abre una página nueva. Si se corre dentro de Docker (E2E_PROXY=1) el navegador
 * no ve «localhost:5173» ni «localhost:3000», así que esas direcciones se
 * redirigen al frontend y al backend del compose; la aplicación sigue creyendo
 * que está en localhost (mismo origen y mismo CORS que en uso real).
 */
export async function nuevaPagina(browser: Browser): Promise<Page> {
  const contexto = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'es-MX' });
  if (process.env.E2E_PROXY === '1') {
    const front = process.env.E2E_FRONT_URL ?? 'http://frontend:5173';
    const back = process.env.E2E_BACK_URL ?? 'http://backend:3000';
    await contexto.route('http://localhost:5173/**', (r) => reenviar(r, 'http://localhost:5173', front));
    await contexto.route('http://localhost:3000/**', (r) => reenviar(r, 'http://localhost:3000', back));
  }
  return contexto.newPage();
}

export async function iniciarSesionDemo(page: Page) {
  await page.goto('/login');
  await page.locator('input[name=email]').fill(DEMO.email);
  await page.locator('input[name=password]').fill(DEMO.password);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await page.getByText('Overworld SDLC').waitFor();
}

/**
 * Guarda una captura en docs/capturas/<nombre>.png con una ventana alta para que
 * se vea la pantalla completa (las barras fijas no tapan el contenido).
 */
export async function capturar(page: Page, nombre: string, alto = 1700) {
  await page.setViewportSize({ width: 1440, height: alto });
  await page.waitForTimeout(1200); // animaciones (anillo del resultado, barras de progreso)
  await page.screenshot({ path: path.join(CARPETA_CAPTURAS, `${nombre}.png`) });
  await page.setViewportSize({ width: 1440, height: 1000 });
}

export async function esperarGuardado(page: Page) {
  await page.getByText('Avance guardado en el servidor').waitFor({ timeout: 10_000 });
}

/** Pulsa «Enviar» y espera el resultado; devuelve lo que muestra la pantalla de resultado. */
export async function enviarYLeerResultado(page: Page) {
  await page.locator('#btn-enviar').click();
  await page.waitForURL(/\/resultado\/\d+/);
  await page.locator('#resultado-porcentaje').waitFor();
  return {
    porcentaje: Number((await page.locator('#resultado-porcentaje').innerText()).replace('%', '')),
    titulo: await page.locator('#resultado-titulo').innerText(),
    xp: await page.locator('#resultado-xp').innerText(),
    qp: await page.locator('#resultado-qp').innerText(),
  };
}

export async function abrirFaseDesdeElMapa(page: Page, orden: number) {
  await page.goto('/');
  await page.locator(`[data-fase-orden="${orden}"]`).click();
  await page.waitForURL(/\/mision\/\d+/);
}

/** Entra a un reto desde el tablón de su fase (iniciar, continuar o reintentar con confirmación). */
export async function entrarAlReto(page: Page, faseOrden: number, tituloReto: string) {
  await abrirFaseDesdeElMapa(page, faseOrden);
  const fila = page.locator('[data-reto-id]').filter({ hasText: tituloReto });
  const estado = await fila.getAttribute('data-estado');
  await fila.getByRole('button').click();
  if (estado === 'APROBADO') {
    await page.getByText('no se otorgan XP ni QP de nuevo').waitFor();
    await page.getByRole('button', { name: 'Reintentar', exact: true }).last().click();
  }
  await page.waitForURL(/\/intento\/\d+/);
}
