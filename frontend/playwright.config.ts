import { defineConfig } from '@playwright/test';

/**
 * Suite end-to-end del navegador (ver README, sección «Pruebas»).
 * Corre contra la aplicación YA levantada (docker compose up): no arranca servidores.
 * Los dos archivos de e2e/ se ejecutan en orden y comparten el progreso del usuario demo.
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: /.*\.spec\.ts/,
  globalSetup: './e2e/global-setup.ts',
  timeout: 180_000,
  expect: { timeout: 15_000 },
  workers: 1,
  fullyParallel: false,
  retries: 0,
  reporter: [['list']],
  outputDir: './e2e/.resultados',
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:5173',
    viewport: { width: 1440, height: 1000 },
    locale: 'es-MX',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
});
