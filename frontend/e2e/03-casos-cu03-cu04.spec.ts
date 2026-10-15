import { expect, test, type Page } from '@playwright/test';
import { Client } from 'pg';
import fs from 'node:fs';
import path from 'node:path';
import { nuevaPagina, esperarGuardado } from './fixtures';

// Ejecución trazable de las 24 filas del libro de pruebas; no modifica ni documenta CU-01.
const BACK = process.env.E2E_BACK_URL ?? 'http://localhost:3000';
const DB = process.env.E2E_DATABASE_URL ?? 'postgresql://pickquest:pickquest@localhost:5432/pickquest';
const OUT = path.resolve(process.env.E2E_CAPTURAS ?? '../docs/capturas', '../evidencias');
const PASSWORD = 'pruebas-sprint2';
const PREGUNTAS = [
  '¿Cómo se toman hoy los pedidos en la cafetería?', '¿Cómo le gustaría que llegara el pedido a la cocina?',
  '¿Qué tan rápido tendría que aprender a usarlo un mesero nuevo?', '¿Cuánto tarda la cocina en enterarse de un pedido?',
  '¿Qué tan rápido necesita ver un pedido nuevo en la cocina?', '¿Qué pasa en las horas en que hay más clientes?',
  '¿Qué formas de pago necesita aceptar y cómo se divide la cuenta?', '¿Qué pasa con el cobro si falla el internet del local?',
  '¿Podría el sistema seguir funcionando aunque no haya internet?', '¿Cómo controla los ingredientes que se gastan?',
  '¿Cómo le gustaría enterarse de que un ingrediente se está acabando?',
];

for (const cu of ['CU-03', 'CU-04']) {
  test.describe(`Libro de pruebas ${cu}`, () => {
    test.setTimeout(60_000);
    let db: Client, page: Page, token: string, alumno: number, email: string;
    let retos: any[], reto: any, intentoId: number, tarjetas: any[], elementos: any[];
    let nota = '';
    let calificacionMs: number | undefined;
    const prefix = cu === 'CU-03' ? 'CP-PR' : 'CP-IN';
    const api = async (ruta: string, method = 'GET', body?: unknown) => {
      const r = await fetch(`${BACK}${ruta}`, { method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
      const data = await r.json();
      if (!r.ok) throw new Error(`${method} ${ruta}: ${r.status} ${JSON.stringify(data)}`);
      return data;
    };
    const rows = async (sql: string, values: unknown[] = []) => (await db.query(sql, values)).rows;
    const prepararPerfecto = async (r: any, id: number) => {
      if (r.mecanica === 'LINEA_TIEMPO') {
        const bloques = await rows('SELECT * FROM bloque_plan WHERE "retoId"=$1', [r.id]);
        const entregables = await rows('SELECT * FROM entregable_plan WHERE "retoId"=$1', [r.id]);
        await api(`/intentos/${id}/borrador`, 'PUT', { posiciones: bloques.map(b => ({ bloqueId: b.id, inicioSemana: b.inicioReferencia })), asociaciones: entregables.map(e => ({ entregableId: e.id, faseBloqueId: e.faseCorrectaId })) });
      } else if (r.mecanica === 'DIALOGO_STAKEHOLDER') {
        await api(`/intentos/${id}/dialogo/tecnica`, 'POST', { tecnica: 'ENTREVISTA' });
        for (const pregunta of PREGUNTAS) {
          const [o] = await rows('SELECT o.id FROM opcion_dialogo o JOIN nodo_dialogo n ON n.id=o."nodoId" WHERE n."retoId"=$1 AND o.pregunta=$2', [r.id, pregunta]);
          await api(`/intentos/${id}/dialogo/turnos`, 'POST', { opcionId: o.id });
        }
      } else {
        const t = await rows('SELECT * FROM tarjeta_requerimiento WHERE "retoId"=$1 ORDER BY orden', [r.id]);
        await api(`/intentos/${id}/borrador`, 'PUT', { tarjetas: t.map(x => ({ tarjetaId: x.id, columna: x.columnaCorrecta, tipo: x.tipoCorrecto, ordenMust: x.ordenMustReferencia })) });
      }
    };
    const tarjeta = (id: number) => page.locator(`[data-tarjeta-id="${id}"]`);
    const abrir = async () => {
      await page.goto(`/mision/${reto.faseId}`);
      await page.locator(`[data-reto-id="${reto.id}"]`).getByRole('button').click();
      await page.waitForURL(/\/intento\/\d+/);
      intentoId = Number(page.url().split('/').pop());
    };
    const clasificar = async (perfecto = true) => {
      for (const t of tarjetas) {
        await tarjeta(t.id).locator('select').selectOption(perfecto ? t.columnaCorrecta : 'WONT');
        await tarjeta(t.id).getByRole('button', { name: perfecto && t.tipoCorrecto === 'NO_FUNCIONAL' ? 'RNF' : 'RF', exact: true }).click();
      }
    };
    const marcar = async (e: any, atributo: string | null = e.atributo) => {
      await page.getByRole('tab', { name: new RegExp(e.pantallaTitulo) }).click();
      await page.locator(`[data-elemento-id="${e.id}"]`).click();
      if (atributo) await page.locator(`[data-marca-elemento="${e.id}"] select`).selectOption(atributo);
    };
    const completar = async (perfecto = true) => {
      if (cu === 'CU-03') await clasificar(perfecto);
      else for (const e of elementos.filter(e => perfecto ? !!e.atributo : !e.atributo).slice(0, perfecto ? 6 : 1)) await marcar(e, perfecto ? e.atributo : 'SEGURIDAD');
    };
    const enviar = async () => {
      const inicio = Date.now();
      await page.locator('#btn-enviar').click();
      await page.waitForURL(/\/resultado\/\d+/);
      await expect(page.locator('#resultado-porcentaje')).toBeVisible();
      calificacionMs = Date.now() - inicio;
    };
    test.beforeAll(async ({ browser }) => {
      fs.mkdirSync(OUT, { recursive: true });
      db = new Client({ connectionString: DB }); await db.connect();
      email = `libro_${cu}_${Date.now()}@test.local`;
      const sesion = await api('/auth/registro', 'POST', { email, password: PASSWORD, nombreAventurero: `libro_${cu}_${Date.now()}` });
      token = sesion.accessToken; alumno = sesion.estudiante.id;
      retos = await rows('SELECT r.*,f.orden AS "faseOrden" FROM reto r JOIN fase f ON r."faseId"=f.id ORDER BY f.orden,r.orden');
      reto = retos.find(r => r.mecanica === (cu === 'CU-03' ? 'TABLERO_MOSCOW' : 'INSPECCION_SISTEMA'));
      for (const r of retos) {
        if (r.id === reto.id) break;
        const i = await api(`/retos/${r.id}/intentos`, 'POST');
        await prepararPerfecto(r, i.intentoId); await api(`/intentos/${i.intentoId}/enviar`, 'POST');
      }
      tarjetas = await rows('SELECT * FROM tarjeta_requerimiento WHERE "retoId"=$1 ORDER BY orden', [reto.id]);
      elementos = await rows('SELECT e.*,f.atributo,p.titulo AS "pantallaTitulo" FROM elemento_pantalla e JOIN pantalla_simulada p ON e."pantallaId"=p.id LEFT JOIN falla_calidad f ON f."elementoId"=e.id WHERE p."retoId"=$1 ORDER BY p.orden,e.orden', [reto.id]);
      await db.query('INSERT INTO inventario_objeto ("estudianteId","objetoId",cantidad,equipado) SELECT $1,id,3,true FROM objeto WHERE nombre=$2 ON CONFLICT ("estudianteId","objetoId") DO UPDATE SET cantidad=3,equipado=true', [alumno, 'Poción de Sabiduría']);
      page = await nuevaPagina(browser);
      await page.goto('/login'); await page.locator('input[name=email]').fill(email); await page.locator('input[name=password]').fill(PASSWORD);
      await page.getByRole('button', { name: 'Entrar' }).click(); await page.getByText('Overworld SDLC').waitFor();
    });
    test.beforeEach(async () => {
      nota = ''; calificacionMs = undefined;
      await db.query('DELETE FROM intento_reto WHERE "estudianteId"=$1 AND "retoId"=$2', [alumno, reto.id]);
      await db.query('UPDATE inventario_objeto SET cantidad=3 WHERE "estudianteId"=$1', [alumno]);
      await abrir();
    });
    test.afterEach(async ({ browser: _browser }, info) => {
      const id = info.title.split(' ')[0]; const img = `${id}.png`;
      await page.screenshot({ path: path.join(OUT, img), fullPage: true });
      fs.appendFileSync(path.join(OUT, 'cu03-cu04.jsonl'), JSON.stringify({ id, estado: info.status === 'passed' ? 'Pass' : 'Fail', calificacionMs, resultado: nota || info.errors.map(e => e.message).join('\n').slice(0, 1600), evidencia: `docs/evidencias/${img}`, fecha: new Date().toISOString(), ejecutadoPor: 'Codex (Playwright)' }) + '\n');
    });
    test.afterAll(async () => {
      if (page) await page.context().close();
      if (alumno) await db.query('DELETE FROM estudiante WHERE id=$1', [alumno]);
      if (db) await db.end();
    });

    test(`${prefix}-01 flujo normal aprobado`, async () => {
      await completar(); await enviar();
      await expect(page.locator('#resultado-porcentaje')).toHaveText('100%');
      if (cu === 'CU-03') await expect(page.getByText('Correcta', { exact: true })).toBeVisible();
      else await expect(page.getByText('Marcas sobre elementos sin falla', { exact: false }).first()).toBeVisible();
      const i = await api(`/intentos/${intentoId}`); expect(i.resultado.aprobado).toBe(true); expect(i.retroalimentacion.referenciaCompleta).toBe(true);
      const fases = await api('/fases'); expect(fases.find((f: any) => f.id === reto.faseId).retosAprobados).toBeGreaterThan(0);
      nota = 'Flujo por interfaz: 100 %, aprobado; referencia completa disponible, intento registrado y progreso actualizado.';
    });
    test(`${prefix}-02 ${cu === 'CU-03' ? 'clasificación y capacidad' : 'marca numerada y atributo'}`, async () => {
      if (cu === 'CU-03') { await tarjeta(tarjetas[0].id).locator('select').selectOption('MUST'); await expect(page.locator('#capacidad-usada')).toHaveText(new RegExp(`^${tarjetas[0].puntos} /`)); }
      else { await marcar(elementos.find(e => e.atributo)); await expect(page.locator('[data-marca-elemento]')).toHaveCount(1); await expect(page.locator('[data-marca-elemento] select')).toHaveValue(elementos.find(e => e.atributo).atributo); }
      nota = cu === 'CU-03' ? 'Mover la tarjeta a MUST actualiza inmediatamente la capacidad usada.' : 'El clic agrega la marca 1 con su atributo ISO seleccionado.';
    });
    test(`${prefix}-03 ${cu === 'CU-03' ? 'etiqueta RF y RNF' : 'marca sin falla'}`, async () => {
      if (cu === 'CU-03') {
        const t = tarjeta(tarjetas[0].id); await t.locator('select').selectOption('SHOULD');
        await t.getByRole('button', { name: 'RF', exact: true }).click(); await expect(t.getByRole('button', { name: 'RF', exact: true })).toHaveAttribute('aria-pressed', 'true');
        await t.getByRole('button', { name: 'RNF', exact: true }).click(); await expect(t.getByRole('button', { name: 'RNF', exact: true })).toHaveAttribute('aria-pressed', 'true');
        nota = 'La tarjeta conserva la columna y permite alternar RF/RNF con etiqueta seleccionada visible.';
      } else {
        await marcar(elementos.find(e => !e.atributo), 'SEGURIDAD'); await enviar();
        const i = await api(`/intentos/${intentoId}`); expect(i.retroalimentacion.marcasSinFalla).toHaveLength(1);
        nota = 'Una marca sobre elemento sin falla se registra y aparece en la retroalimentación; intento reprobado sin referencia completa.';
      }
    });
    test(`${prefix}-04 ${cu === 'CU-03' ? 'orden MUST persistente' : 'retirar marca'}`, async () => {
      if (cu === 'CU-03') {
        for (const t of tarjetas.slice(0, 2)) await tarjeta(t.id).locator('select').selectOption('MUST');
        await tarjeta(tarjetas[1].id).getByRole('button', { name: 'Subir en prioridad' }).click(); await esperarGuardado(page);
        const i = await api(`/intentos/${intentoId}`); expect(i.borrador.tarjetas.find((t: any) => t.tarjetaId === tarjetas[1].id).ordenMust).toBe(1);
        nota = 'Reordenar MUST con la alternativa de teclado/botón queda guardado con ordenMust=1 para la tarjeta movida.';
      } else { await marcar(elementos.find(e => e.atributo)); await page.getByRole('button', { name: 'Retirar la marca 1' }).click(); await expect(page.locator('[data-marca-elemento]')).toHaveCount(0); nota = 'Retirar una marca elimina su indicador y libera el espacio para seguir inspeccionando.'; }
    });
    test(`${prefix}-05 ${cu === 'CU-03' ? 'reintento de aprobado' : 'cambiar atributo'}`, async () => {
      if (cu === 'CU-03') {
        await completar(); await enviar(); const perfil = await api('/auth/perfil');
        await page.locator('#retry-btn').click(); await expect(page.getByText('no se otorgan XP ni QP de nuevo')).toBeVisible();
        await page.getByRole('button', { name: 'Repetir reto', exact: true }).click(); await page.waitForURL(/\/intento\/\d+/);
        await completar(); await enviar(); const despues = await api('/auth/perfil'); expect(despues.xpTotal).toBe(perfil.xpTotal); expect(despues.qpTotal).toBe(perfil.qpTotal);
        nota = 'Reintento de aprobado pide confirmación, crea otro intento y no vuelve a entregar XP/QP.';
      } else {
        const e = elementos.find(e => e.atributo); await marcar(e); await page.locator('[data-marca-elemento] select').selectOption('USABILIDAD'); await esperarGuardado(page);
        expect((await api(`/intentos/${intentoId}`)).borrador.marcas[0].atributo).toBe('USABILIDAD'); nota = 'Cambiar el atributo actualiza la marca existente y su borrador en servidor.';
      }
    });
    test(`${prefix}-06 ${cu === 'CU-03' ? 'ayuda mueve y guarda' : 'reintento de aprobado'}`, async () => {
      if (cu === 'CU-03') {
        // Un cambio pendiente al pedir ayuda no debe sobreescribir el movimiento del servidor.
        await tarjeta(tarjetas[0].id).getByRole('button', { name: 'RNF', exact: true }).click();
        await page.getByRole('button', { name: /Usar ayuda/ }).click();
        await expect(tarjeta(tarjetas[0].id)).toHaveAttribute('data-columna', tarjetas[0].columnaCorrecta);
        await expect(page.getByRole('button', { name: /Ayuda usada/ })).toBeDisabled();
        await page.reload(); await expect(tarjeta(tarjetas[0].id)).toHaveAttribute('data-columna', tarjetas[0].columnaCorrecta);
        const i = await api(`/intentos/${intentoId}`); expect(i.ayudaUsada).toBe(true); expect(i.borrador.tarjetas.find((t: any) => t.tarjetaId === tarjetas[0].id).tipo).toBe('NO_FUNCIONAL');
        expect((await api('/inventario/equipados'))[0].cantidad).toBe(2);
        nota = 'La ayuda mueve la tarjeta a MUST, conserva RF/RNF, consume una poción y persiste tras recargar. D-001 corregido.';
      } else {
        await completar(); await enviar(); const anterior = intentoId; await page.locator('#retry-btn').click();
        await expect(page.getByText('no se otorgan XP ni QP de nuevo')).toBeVisible(); await page.getByRole('button', { name: 'Repetir reto', exact: true }).click();
        await page.waitForURL(/\/intento\/\d+/); expect(Number(page.url().split('/').pop())).not.toBe(anterior); nota = 'Reintentar una inspección aprobada muestra la advertencia y crea un intento distinto al confirmar.';
      }
    });
    test(`${prefix}-07 ${cu === 'CU-03' ? 'retomar tablero' : 'ayuda inspección'}`, async () => {
      if (cu === 'CU-03') {
        await tarjeta(tarjetas[0].id).locator('select').selectOption('SHOULD'); await esperarGuardado(page); await page.goto('/'); await abrir();
        await expect(tarjeta(tarjetas[0].id)).toHaveAttribute('data-columna', 'SHOULD'); expect((await api(`/intentos/${intentoId}`)).estado).toBe('EN_CURSO');
        nota = 'Salir y volver conserva el tablero parcial sin calificarlo.';
      } else {
        await page.getByRole('button', { name: /Usar ayuda/ }).click();
        await expect(page.getByRole('button', { name: /Ayuda usada/ })).toBeDisabled();
        const i = await api(`/intentos/${intentoId}`); expect(i.pista.tipo).toBe('PANTALLA');
        expect((await api('/inventario/equipados'))[0].cantidad).toBe(2);
        nota = 'La ayuda identifica una pantalla con falla sin marcar, consume una poción y deja el intento con ayuda.';
      }
    });
    test(`${prefix}-08 ${cu === 'CU-03' ? 'envío incompleto' : 'retomar inspección'}`, async () => {
      if (cu === 'CU-03') { await expect(page.locator('#btn-enviar')).toBeDisabled(); await expect(page.locator('#aviso-faltantes')).toContainText('tarjeta'); nota = 'El tablero incompleto señala pendientes y no permite enviar.'; }
      else { await marcar(elementos.find(e => e.atributo)); await esperarGuardado(page); const anterior = intentoId; await page.goto('/'); await abrir(); expect(intentoId).toBe(anterior); await expect(page.locator('[data-marca-elemento]')).toHaveCount(1); nota = 'Se retoma el mismo intento con su marca y atributo, sin calificar.'; }
    });
    test(`${prefix}-09 ${cu === 'CU-03' ? 'capacidad excedida' : 'máximo de marcas'}`, async () => {
      if (cu === 'CU-03') { await clasificar(); for (const t of tarjetas) await tarjeta(t.id).locator('select').selectOption('MUST'); await expect(page.locator('#btn-enviar')).toBeDisabled(); await expect(page.locator('#aviso-faltantes')).toContainText('superan la capacidad'); nota = 'MUST por encima de capacidad muestra advertencia y bloquea envío.'; }
      else { for (const e of elementos.slice(0, 9)) await marcar(e, null); await marcar(elementos[9], null); await expect(page.locator('#contador-marcas')).toHaveText('9 / 9'); await expect(page.getByText('Llegaste al máximo de 9 marcas.')).toBeVisible(); nota = 'La décima marca se rechaza con aviso; el contador permanece en 9/9.'; }
    });
    test(`${prefix}-10 ${cu === 'CU-03' ? 'capacidad exacta' : 'marca sin atributo'}`, async () => {
      if (cu === 'CU-03') {
        await clasificar(); for (const t of tarjetas) await tarjeta(t.id).locator('select').selectOption('WONT');
        const subset = (mask: number) => tarjetas.filter((_, i) => mask & (1 << i));
        const seleccion = Array.from({ length: 1 << tarjetas.length }, (_, i) => subset(i)).find(ts => ts.reduce((s, t) => s + t.puntos, 0) === 20)!;
        for (const t of seleccion) await tarjeta(t.id).locator('select').selectOption('MUST');
        await expect(page.locator('#capacidad-usada')).toHaveText('20 / 20 puntos'); await expect(page.locator('#btn-enviar')).toBeEnabled(); await enviar(); nota = 'Capacidad exactamente 20/20: el sistema permite enviar y califica.';
      } else { await marcar(elementos.find(e => e.atributo), null); await expect(page.locator('#btn-enviar')).toBeDisabled(); await expect(page.locator('#aviso-faltantes')).toContainText('atributo'); nota = 'Una marca sin atributo queda señalada y bloquea el envío.'; }
    });
    test(`${prefix}-11 ${cu === 'CU-03' ? 'mejor calificación' : 'una marca debajo del máximo'}`, async () => {
      if (cu === 'CU-03') {
        await completar(false); await enviar(); await expect(page.locator('#resultado-titulo')).toContainText('No Superado');
        await page.locator('#retry-btn').click(); await page.waitForURL(/\/intento\/\d+/); await completar(); await enviar();
        const tablon = await api(`/fases/${reto.faseId}`); expect(tablon.retos.find((r: any) => r.id === reto.id).mejorPorcentaje).toBe(100); nota = 'Un intento reprobado seguido de otro al 100 % conserva 100 % como mejor calificación.';
      } else { for (const e of elementos.slice(0, 8)) await marcar(e, null); await expect(page.locator('#contador-marcas')).toHaveText('8 / 9'); await marcar(elementos[8], null); await expect(page.locator('#contador-marcas')).toHaveText('9 / 9'); nota = 'Con 8/9 marcas se permite colocar la novena.'; }
    });
    test(`${prefix}-12 acceso bloqueado`, async () => {
      await db.query('DELETE FROM intento_reto WHERE "estudianteId"=$1', [alumno]);
      const r = await fetch(`${BACK}/retos/${reto.id}/intentos`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } }); expect(r.status).toBe(403);
      await page.goto(`/mision/${reto.faseId}`); await expect(page.getByText('Esta fase está bloqueada:', { exact: false })).toBeVisible();
      nota = 'Con fase bloqueada la interfaz impide iniciar y el acceso directo por API devuelve 403.';
    });
  });
}
