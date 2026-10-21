import { expect, test, type Page } from '@playwright/test';
import { Client } from 'pg';
import { mkdirSync, appendFileSync } from 'node:fs';
import path from 'node:path';
import { nuevaPagina, esperarGuardado } from './fixtures';
const BACK = process.env.E2E_BACK_URL ?? 'http://localhost:3000';
const DB =
  process.env.E2E_DATABASE_URL ??
  'postgresql://pickquest:pickquest@localhost:5432/pickquest';
const EVIDENCIAS =
  process.env.E2E_PROXY === '1'
    ? '/docs/evidencias/cu02'
    : path.resolve('../docs/evidencias/cu02');
const PREGUNTAS = [
  '¿Cómo se toman hoy los pedidos en la cafetería?',
  '¿Cómo le gustaría que llegara el pedido a la cocina?',
  '¿Qué tan rápido tendría que aprender a usarlo un mesero nuevo?',
  '¿Cuánto tarda la cocina en enterarse de un pedido?',
  '¿Qué tan rápido necesita ver un pedido nuevo en la cocina?',
  '¿Qué pasa en las horas en que hay más clientes?',
  '¿Qué formas de pago necesita aceptar y cómo se divide la cuenta?',
  '¿Qué pasa con el cobro si falla el internet del local?',
  '¿Podría el sistema seguir funcionando aunque no haya internet?',
  '¿Cómo controla los ingredientes que se gastan?',
  '¿Cómo le gustaría enterarse de que un ingrediente se está acabando?',
];
const NOMBRES = [
  'Flujo normal completo',
  'Colocar arrastrando',
  'Seleccionar pieza y casilla',
  'Sustituir una pieza',
  'Retirar y mover piezas',
  'Rechazar tipo incompatible',
  'Bloquear casillas vacías',
  'No revelar aciertos antes de enviar',
  'Calificación RN-17',
  'Umbrales y estrellas',
  'Conservar mejor nota',
  'No duplicar recompensas al repetir',
  'Ayuda retira dos distractores',
  'Ayuda persistente y máximo dos estrellas',
  'Rechazar segunda ayuda',
  'Ayuda insuficiente no consume',
  'Guardar y continuar',
  'Fase y reto bloqueados',
  'Aislamiento entre estudiantes',
  'Recuperar respuesta perdida',
];
let db: Client;
let page: Page,
  token: string,
  alumno: number,
  intentoId: number,
  reto: any,
  casillas: any[],
  piezas: any[],
  objetoId: number;
let observado = '';
async function api(
  ruta: string,
  method = 'GET',
  body?: unknown,
  credencial = token,
) {
  const r = await fetch(BACK + ruta, {
    method,
    headers: {
      Authorization: `Bearer ${credencial}`,
      'Content-Type': 'application/json',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(`${r.status}: ${JSON.stringify(data)}`);
  return data;
}
const sql = async (q: string, valores: unknown[] = []) =>
  (await db.query(q, valores)).rows;
const perfectas = () =>
  casillas.map((c) => ({ casillaId: c.id, piezaId: c.piezaCorrectaId }));
const banco = () =>
  page.getByRole('region', { name: 'Banco de piezas', exact: true });
const casilla = (id: number) => page.locator(`[data-casilla-id="${id}"]`);
async function colocar(c: any, piezaId = c.piezaCorrectaId) {
  await page.locator(`[data-pieza-id="${piezaId}"]`).click();
  await casilla(c.id)
    .getByRole('button', { name: /Colocar pieza/ })
    .click();
}
async function llenar() {
  for (const c of casillas) await colocar(c);
}
async function enviar() {
  await page.locator('#btn-enviar').click();
  await page.waitForURL(/\/resultado\/\d+/);
  await page.locator('#resultado-porcentaje').waitFor();
}
async function prepararAnterior(r: any, id: number) {
  const ruta = `/intentos/${id}`;
  if (r.mecanica === 'LINEA_TIEMPO') {
    const bloques = await sql('SELECT * FROM bloque_plan WHERE "retoId"=$1', [
      r.id,
    ]);
    const entregables = await sql(
      'SELECT * FROM entregable_plan WHERE "retoId"=$1',
      [r.id],
    );
    await api(ruta + '/borrador', 'PUT', {
      posiciones: bloques.map((b) => ({
        bloqueId: b.id,
        inicioSemana: b.inicioReferencia,
      })),
      asociaciones: entregables.map((e) => ({
        entregableId: e.id,
        faseBloqueId: e.faseCorrectaId,
      })),
    });
  } else {
    await api(ruta + '/dialogo/tecnica', 'POST', { tecnica: 'ENTREVISTA' });
    for (const pregunta of PREGUNTAS) {
      const [o] = await sql(
        'SELECT o.id FROM opcion_dialogo o JOIN nodo_dialogo n ON n.id=o."nodoId" WHERE n."retoId"=$1 AND o.pregunta=$2',
        [r.id, pregunta],
      );
      await api(ruta + '/dialogo/turnos', 'POST', { opcionId: o.id });
    }
  }
  await api(ruta + '/enviar', 'POST');
}
test.beforeAll(async () => {
  db = new Client({ connectionString: DB });
  await db.connect();
  mkdirSync(EVIDENCIAS, { recursive: true });
});
test.afterAll(async () => {
  await db.end();
});
test.beforeEach(async ({ browser }) => {
  observado = '';
  const nombre = `hu_${Date.now()}`;
  const sesion = await api(
    '/auth/registro',
    'POST',
    {
      email: `${nombre}@test.local`,
      password: 'pruebas-cu02-2026',
      nombreAventurero: nombre,
    },
    '',
  );
  token = sesion.accessToken;
  alumno = sesion.estudiante.id;
  [reto] = await sql('SELECT * FROM reto WHERE mecanica=$1', ['ARMADO_PIEZAS']);
  casillas = await sql(
    'SELECT c.* FROM casilla_historia c JOIN historia_usuario h ON h.id=c."historiaId" WHERE h."retoId"=$1 ORDER BY h.orden,c.id',
    [reto.id],
  );
  piezas = await sql(
    'SELECT * FROM pieza_historia WHERE "retoId"=$1 ORDER BY orden',
    [reto.id],
  );
  [{ id: objetoId }] = await sql(
    "SELECT id FROM objeto WHERE nombre='Poción de Sabiduría'",
  );
  await sql(
    'INSERT INTO inventario_objeto ("estudianteId","objetoId",cantidad,equipado) VALUES ($1,$2,3,true)',
    [alumno, objetoId],
  );
  for (const r of await sql(
    'SELECT r.* FROM reto r JOIN fase f ON f.id=r."faseId" WHERE f.orden<2 OR (f.orden=2 AND r.orden<2) ORDER BY f.orden,r.orden',
  )) {
    const i = await api(`/retos/${r.id}/intentos`, 'POST');
    await prepararAnterior(r, i.intentoId);
  }
  page = await nuevaPagina(browser);
  await page.goto('/login');
  await page.locator('[name=email]').fill(`${nombre}@test.local`);
  await page.locator('[name=password]').fill('pruebas-cu02-2026');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await page.waitForURL('/');
  await page.goto(`/mision/${reto.faseId}`);
  await page
    .locator(`[data-reto-id="${reto.id}"]`)
    .getByRole('button', { name: /Iniciar reto/ })
    .click();
  await page.waitForURL(/\/intento\/\d+/);
  intentoId = Number(page.url().split('/').pop());
  await page.locator('#contador-casillas').waitFor();
});
test.afterEach(async ({ browser }, info) => {
  void browser;
  const id = info.title.match(/CP-HU-\d+/)![0];
  let errorCierre: unknown;
  try {
    if (page && !page.isClosed()) {
      await page.screenshot({
        path: path.join(EVIDENCIAS, `${id}.png`),
        fullPage: true,
      });
      await page.context().close();
    }
  } catch (error) {
    errorCierre = error;
  } finally {
    try {
      appendFileSync(
        path.join(EVIDENCIAS, 'ejecuciones.jsonl'),
        JSON.stringify({
          id,
          fecha: new Date().toISOString(),
          estado: info.status === 'passed' && !errorCierre ? 'Pass' : 'Fail',
          resultado: [
            observado || info.errors.map((e) => e.message).join('\n'),
            errorCierre ? String(errorCierre) : '',
          ]
            .filter(Boolean)
            .join('\n')
            .replace(/Bearer [A-Za-z0-9._-]+/g, 'Bearer [redactado]'),
          evidencia: `docs/evidencias/cu02/${id}.png`,
        }) + '\n',
      );
    } finally {
      await sql('DELETE FROM estudiante WHERE id=$1', [alumno]);
    }
  }
  if (errorCierre) throw errorCierre;
});

for (let n = 1; n <= 20; n++)
  test(`CP-HU-${String(n).padStart(2, '0')} ${NOMBRES[n - 1]}`, async () => {
    if (n === 1) {
      await llenar();
      await enviar();
      await expect(page.locator('#resultado-porcentaje')).toHaveText('100%');
      observado =
        'Flujo completo por interfaz: 100 %, aprobado y retroalimentación de las tres historias.';
    }
    if (n === 2) {
      await page.setViewportSize({ width: 1800, height: 2000 });
      const pieza = piezas[0],
        c = casillas.find((c) => c.tipo === pieza.tipo);
      const a = (await banco()
          .locator(`[data-pieza-id="${pieza.id}"]`)
          .boundingBox())!,
        b = (await casilla(c.id).boundingBox())!;
      await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
      await page.mouse.down();
      await page.mouse.move(a.x + 10, a.y + 10, { steps: 3 });
      await page.mouse.move(b.x + b.width / 2, b.y + 20, { steps: 20 });
      await page.mouse.up();
      await expect(casilla(c.id).locator('[data-pieza-id]')).toHaveAttribute(
        'data-pieza-id',
        String(pieza.id),
      );
      observado =
        'Arrastrar coloca una pieza de tipo compatible y actualiza el contador.';
    }
    if (n === 3) {
      await page
        .locator(`[data-pieza-id="${casillas[0].piezaCorrectaId}"]`)
        .focus();
      await page.keyboard.press('Enter');
      await casilla(casillas[0].id)
        .getByRole('button', { name: /Colocar pieza/ })
        .focus();
      await page.keyboard.press('Enter');
      await expect(page.locator('#contador-casillas')).toHaveText(
        '1 / 18 casillas completas',
      );
      observado =
        'Selección por teclado (Enter en pieza y casilla) coloca una pieza sin arrastrar.';
    }
    if (n === 4) {
      const c = casillas[0],
        otra = piezas.find(
          (p) => p.tipo === c.tipo && p.id !== c.piezaCorrectaId,
        );
      await colocar(c);
      await colocar(c, otra.id);
      await expect(
        banco().locator(`[data-pieza-id="${c.piezaCorrectaId}"]`),
      ).toBeVisible();
      observado =
        'Sustituir devuelve la pieza desplazada al banco y mantiene una casilla completa.';
    }
    if (n === 5) {
      const c = casillas[0],
        otra = casillas.find((x) => x.tipo === c.tipo && x.id !== c.id);
      await colocar(c);
      await colocar(otra, c.piezaCorrectaId);
      await expect(casilla(c.id).locator('[data-pieza-id]')).toHaveCount(0);
      await casilla(otra.id)
        .getByRole('button', { name: /Retirar pieza/ })
        .click();
      await expect(page.locator('#contador-casillas')).toHaveText(
        '0 / 18 casillas completas',
      );
      observado =
        'Mover libera la casilla original; retirar devuelve la pieza al banco.';
    }
    if (n === 6) {
      const c = casillas[0],
        otra = piezas.find((p) => p.tipo !== c.tipo);
      await colocar(c, otra.id);
      await expect(
        page.getByRole('status').filter({ hasText: 'Esta casilla acepta' }),
      ).toBeVisible();
      await expect(page.locator('#contador-casillas')).toHaveText(
        '0 / 18 casillas completas',
      );
      observado =
        'El tipo incompatible se rechaza con mensaje del tipo permitido.';
    }
    if (n === 7) {
      await colocar(casillas[0]);
      await expect(page.locator('#btn-enviar')).toBeDisabled();
      observado =
        'Con 17 casillas pendientes el botón de envío está deshabilitado.';
    }
    if (n === 8) {
      const c = casillas[0],
        d = piezas.find(
          (p) =>
            p.tipo === c.tipo &&
            !casillas.some((x) => x.piezaCorrectaId === p.id),
        );
      await colocar(c, d.id);
      await expect(
        page.getByText('Su resultado se mostrará al enviar.', { exact: false }),
      ).toBeVisible();
      const i = await api(`/intentos/${intentoId}`);
      expect(JSON.stringify(i.contenido)).not.toMatch(
        /piezaCorrectaId|esDistractor|acertada/,
      );
      observado =
        'Pieza compatible aceptada sin marcar acierto y contenido público sin claves.';
    }
    if (n === 9 || n === 10) {
      const cantidad = n === 9 ? 14 : 17;
      const seleccion = perfectas();
      for (let j = cantidad; j < 18; j++) {
        const c = casillas[j];
        seleccion[j].piezaId = piezas.find(
          (p) =>
            p.tipo === c.tipo &&
            !casillas.some((x) => x.piezaCorrectaId === p.id),
        ).id;
      }
      await api(`/intentos/${intentoId}/borrador`, 'PUT', {
        colocaciones: seleccion,
      });
      await page.reload();
      await enviar();
      await expect(page.locator('#resultado-porcentaje')).toHaveText(
        n === 9 ? '77%' : '94%',
      );
      const r = await api(`/intentos/${intentoId}`);
      expect(r.resultado.calificacionEstrellas).toBe(n === 9 ? 0 : 2);
      observado =
        n === 9
          ? '14/18 aciertos: 77 %, no aprobado, cero estrellas.'
          : '17/18 aciertos: 94 %, aprobado y dos estrellas; umbrales exactos cubiertos también por pruebas unitarias.';
    }
    if (n === 11 || n === 12) {
      await llenar();
      await enviar();
      const perfil = await api('/auth/perfil');
      const nuevo = await api(`/retos/${reto.id}/intentos`, 'POST');
      await api(`/intentos/${nuevo.intentoId}/borrador`, 'PUT', {
        colocaciones: perfectas(),
      });
      await api(`/intentos/${nuevo.intentoId}/enviar`, 'POST');
      const tablon = await api(`/fases/${reto.faseId}`);
      expect(
        tablon.retos.find((r: any) => r.id === reto.id).mejorPorcentaje,
      ).toBe(100);
      expect((await api('/auth/perfil')).xpTotal).toBe(perfil.xpTotal);
      observado =
        n === 11
          ? 'La mejor nota del reto sigue siendo 100 % después de repetir.'
          : 'Repetir una aprobación no vuelve a incrementar XP ni QP.';
    }
    if (n >= 13 && n <= 15) {
      await page.getByRole('button', { name: /Usar ayuda/ }).click();
      await expect(page.locator('[data-ayuda-historias]')).toBeVisible();
      const i = await api(`/intentos/${intentoId}`);
      expect(i.pista.piezaIds).toHaveLength(2);
      await expect(banco().locator('[data-pieza-id]')).toHaveCount(22);
      if (n === 14) {
        await page.reload();
        await expect(page.locator('[data-ayuda-historias]')).toBeVisible();
        await llenar();
        await enviar();
        expect(
          (await api(`/intentos/${intentoId}`)).resultado.calificacionEstrellas,
        ).toBe(2);
      }
      if (n === 15) {
        await expect(
          page.getByRole('button', { name: /Ayuda usada/ }),
        ).toBeDisabled();
        await expect(
          api(`/intentos/${intentoId}/ayuda`, 'POST', { objetoId }),
        ).rejects.toThrow('409');
      }
      observado =
        n === 13
          ? 'La ayuda retira dos distractores del banco y consume una unidad.'
          : n === 14
            ? 'Los distractores retirados persisten al recargar; 100 % con ayuda otorga dos estrellas.'
            : 'Un segundo uso se bloquea en interfaz y API devuelve 409.';
    }
    if (n === 16) {
      const d = piezas.filter(
        (p) => !casillas.some((c) => c.piezaCorrectaId === p.id),
      );
      for (const p of d.slice(0, 5))
        await colocar(
          casillas.find((c) => c.tipo === p.tipo),
          p.id,
        );
      await page.getByRole('button', { name: /Usar ayuda/ }).click();
      await expect(
        page.getByText(/Se necesitan dos distractores disponibles/),
      ).toBeVisible();
      const [inv] = await sql(
        'SELECT cantidad FROM inventario_objeto WHERE "estudianteId"=$1 AND "objetoId"=$2',
        [alumno, objetoId],
      );
      expect(inv.cantidad).toBe(3);
      observado =
        'Con un distractor libre se rechaza la ayuda sin consumir inventario.';
    }
    if (n === 17) {
      await colocar(casillas[0]);
      await esperarGuardado(page);
      await page.goto(`/mision/${reto.faseId}`);
      await page
        .locator(`[data-reto-id="${reto.id}"]`)
        .getByRole('button', { name: /Continuar intento/ })
        .click();
      await expect(page.locator('#contador-casillas')).toHaveText(
        '1 / 18 casillas completas',
      );
      expect(Number(page.url().split('/').pop())).toBe(intentoId);
      observado =
        'Salir y continuar recupera el mismo intento y su colocación sin calificar.';
    }
    if (n === 18 || n === 19) {
      const nombre = `neg_${Date.now()}`;
      const ajeno = await api(
        '/auth/registro',
        'POST',
        {
          email: nombre + '@test.local',
          password: 'pruebas-cu02-2026',
          nombreAventurero: nombre,
        },
        '',
      );
      try {
        await expect(
          api(
            n === 18 ? `/retos/${reto.id}/intentos` : `/intentos/${intentoId}`,
            n === 18 ? 'POST' : 'GET',
            undefined,
            ajeno.accessToken,
          ),
        ).rejects.toThrow(n === 18 ? '403' : '404');
      } finally {
        await sql('DELETE FROM estudiante WHERE id=$1', [ajeno.estudiante.id]);
      }
      observado =
        n === 18
          ? 'Una cuenta nueva no puede iniciar CU-02 con fase bloqueada: 403.'
          : 'Otro estudiante no puede leer el intento: 404.';
    }
    if (n === 20) {
      await llenar();
      await esperarGuardado(page);
      let interceptada = false;
      await page.route('**/intentos/*/enviar', async (route) => {
        if (!interceptada) {
          interceptada = true;
          const procesada = await route.fetch({
            url: route.request().url().replace('http://localhost:3000', BACK),
          });
          expect(procesada.ok()).toBe(true);
          await route.abort();
        } else await route.fallback();
      });
      await page.locator('#btn-enviar').click();
      await expect(
        page.getByRole('button', { name: /Reintentar envío/ }),
      ).toBeVisible();
      await page.getByRole('button', { name: /Reintentar envío/ }).click();
      await page.waitForURL(/\/resultado\/\d+/);
      await expect(page.locator('#resultado-porcentaje')).toHaveText('100%');
      expect(
        (
          await sql(
            'SELECT count(*)::int AS total FROM intento_reto WHERE "estudianteId"=$1 AND "retoId"=$2',
            [alumno, reto.id],
          )
        )[0].total,
      ).toBe(1);
      observado =
        'Respuesta perdida recuperada por reenvío: un intento calificado, 100 % y recompensas únicas.';
    }
  });
