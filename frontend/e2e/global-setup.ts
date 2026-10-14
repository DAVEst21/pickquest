import { Client } from 'pg';

const FRONT = process.env.E2E_FRONT_URL ?? 'http://localhost:5173';
const BACK = process.env.E2E_BACK_URL ?? 'http://localhost:3000';
const DATABASE_URL = process.env.E2E_DATABASE_URL ?? 'postgresql://pickquest:pickquest@localhost:5432/pickquest';
/** Origen que ve el navegador de la prueba (lo mismo que la app en uso real). */
const ORIGEN = 'http://localhost:5173';

async function esperar(url: string, nombre: string) {
  const limite = Date.now() + 180_000;
  for (;;) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {
      /* todavía no está arriba */
    }
    if (Date.now() > limite) throw new Error(`${nombre} no respondió en ${url}. ¿Está levantado (docker compose up)?`);
    await new Promise((r) => setTimeout(r, 2000));
  }
}

/**
 * Antes de correr:
 * 1. espera a que la app esté arriba;
 * 2. revisa que el .env no deje roto CORS ni la URL del API (error frecuente);
 * 3. reinicia el progreso del usuario demo para que la suite sea repetible.
 */
export default async function globalSetup() {
  await esperar(`${BACK}/docs`, 'El backend');
  await esperar(FRONT, 'El frontend');

  const preflight = await fetch(`${BACK}/auth/login`, {
    method: 'OPTIONS',
    headers: { Origin: ORIGEN, 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'content-type' },
  });
  if (preflight.headers.get('access-control-allow-origin') !== ORIGEN) {
    throw new Error(
      `El backend no permite el origen ${ORIGEN} (CORS_ORIGIN="${preflight.headers.get('access-control-allow-origin')}"). ` +
        'Revisa CORS_ORIGIN en el .env de la raíz: debe ser http://localhost:5173 (o bórralo) y hay que recrear el backend.',
    );
  }

  const modulo = await (await fetch(`${FRONT}/src/services/http.ts`)).text();
  const apiUrl = /VITE_API_URL"\s*:\s*"([^"]*)"/.exec(modulo)?.[1];
  if (apiUrl !== undefined && apiUrl !== '' && apiUrl.replace(/\/$/, '') !== 'http://localhost:3000') {
    throw new Error(
      `El frontend está configurado para llamar a ${apiUrl} (VITE_API_URL del .env), no a http://localhost:3000. ` +
        'Corrígelo en el .env de la raíz y recrea el frontend.',
    );
  }

  const cliente = new Client({ connectionString: DATABASE_URL });
  await cliente.connect();
  try {
    const demo = "(SELECT id FROM estudiante WHERE email = 'demo@pickquest.dev')";
    await cliente.query(`DELETE FROM intento_reto WHERE "estudianteId" = ${demo}`);
    await cliente.query(`UPDATE estudiante SET "xpTotal" = 0, "qpTotal" = 0, nivel = 1 WHERE email = 'demo@pickquest.dev'`);
    await cliente.query(`UPDATE inventario_objeto SET cantidad = 3, equipado = true WHERE "estudianteId" = ${demo}`);
  } finally {
    await cliente.end();
  }
}
