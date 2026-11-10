import type { Page, TestInfo } from '@playwright/test';
import { appendFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { Client } from 'pg';
import { aprobarSinRecompensa, DB_URL } from './fixtures';

/**
 * Apoyo de las pruebas de navegador de CU-05 y CU-07 (mismo estilo que 05-casos-cu02.spec.ts):
 * cada caso crea un estudiante nuevo, deja aprobados —sin recompensa— los retos que solo sirven de
 * requisito para llegar al reto medido, lo resuelve por la interfaz y guarda su evidencia.
 */
export const BACK = process.env.E2E_BACK_URL ?? 'http://localhost:3000';
export const PASSWORD = 'pruebas-sprint3';

/** Carpeta de evidencias dentro del repositorio (en Docker se monta en /docs). */
export function carpetaEvidencias(subcarpeta: string): string {
  return process.env.E2E_PROXY === '1' ? `/docs/evidencias/${subcarpeta}` : path.resolve(`../docs/evidencias/${subcarpeta}`);
}

export async function conectar(): Promise<Client> {
  const db = new Client({ connectionString: DB_URL });
  await db.connect();
  return db;
}

export interface Alumno {
  id: number;
  email: string;
  token: string;
}

/** Registra un estudiante nuevo por la API, con una poción equipada para probar la ayuda. */
export async function crearAlumno(db: Client, prefijo: string): Promise<Alumno> {
  const sufijo = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const email = `${prefijo}_${sufijo}@test.local`;
  const r = await fetch(`${BACK}/auth/registro`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: PASSWORD, nombreAventurero: `${prefijo}_${sufijo}` }),
  });
  const sesion = await r.json();
  if (!r.ok) throw new Error(`registro: ${r.status} ${JSON.stringify(sesion)}`);
  await db.query(
    `INSERT INTO inventario_objeto ("estudianteId","objetoId",cantidad,equipado)
     SELECT $1, id, 3, true FROM objeto WHERE nombre = 'Poción de Sabiduría'`,
    [sesion.estudiante.id],
  );
  return { id: sesion.estudiante.id, email, token: sesion.accessToken };
}

/** Da por aprobados (sin XP ni QP) todos los retos anteriores al medido: solo son requisito de acceso. */
export async function aprobarAnteriores(db: Client, alumno: Alumno, retoId: number) {
  const { rows } = await db.query(
    `SELECT r.id FROM reto r JOIN fase f ON f.id = r."faseId"
     WHERE (f.orden, r.orden) < (SELECT f2.orden, r2.orden FROM reto r2 JOIN fase f2 ON f2.id = r2."faseId" WHERE r2.id = $1)`,
    [retoId],
  );
  for (const fila of rows) await aprobarSinRecompensa(db, alumno.id, fila.id);
}

export async function entrar(page: Page, alumno: Alumno) {
  await page.goto('/login');
  await page.locator('[name=email]').fill(alumno.email);
  await page.locator('[name=password]').fill(PASSWORD);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await page.waitForURL('/');
}

/** Abre el reto desde el tablón de su fase (inicia o continúa el intento). */
export async function abrirReto(page: Page, faseId: number, retoId: number, boton: RegExp = /Iniciar reto|Continuar intento/) {
  await page.goto(`/mision/${faseId}`);
  await page.locator(`[data-reto-id="${retoId}"]`).getByRole('button', { name: boton }).click();
  await page.waitForURL(/\/intento\/\d+/);
  return Number(page.url().split('/').pop());
}

export async function esperarResultado(page: Page) {
  await page.waitForURL(/\/resultado\/\d+/);
  await page.locator('#resultado-porcentaje').waitFor();
}

/**
 * Cierra el caso: captura de evidencia, registro en `ejecuciones.jsonl` (con las credenciales redactadas)
 * y borrado del estudiante de prueba.
 */
export async function cerrarCaso(opciones: {
  subcarpeta: string;
  info: TestInfo;
  page: Page | undefined;
  db: Client;
  alumno: Alumno | undefined;
  observado: string;
}) {
  const { subcarpeta, info, page, db, alumno, observado } = opciones;
  const carpeta = carpetaEvidencias(subcarpeta);
  mkdirSync(carpeta, { recursive: true });
  const id = info.title.match(/CP-[A-Z]+-\d+/)![0];
  let errorCierre: unknown;
  try {
    if (page && !page.isClosed()) {
      await page.screenshot({ path: path.join(carpeta, `${id}.png`), fullPage: true });
      await page.context().close();
    }
  } catch (error) {
    errorCierre = error;
  } finally {
    try {
      appendFileSync(
        path.join(carpeta, 'ejecuciones.jsonl'),
        JSON.stringify({
          id,
          fecha: new Date().toISOString(),
          estado: info.status === 'passed' && !errorCierre ? 'Pass' : 'Fail',
          resultado: [observado || info.errors.map((e) => e.message).join('\n'), errorCierre ? String(errorCierre) : '']
            .filter(Boolean)
            .join('\n')
            .replace(/Bearer [A-Za-z0-9._-]+/g, 'Bearer [redactado]')
            .replace(/[\w.+-]+@test\.local/g, '[correo de prueba]'),
          evidencia: `docs/evidencias/${subcarpeta}/${id}.png`,
        }) + '\n',
      );
    } finally {
      if (alumno) await db.query('DELETE FROM estudiante WHERE id = $1', [alumno.id]);
    }
  }
  if (errorCierre) throw errorCierre;
}
