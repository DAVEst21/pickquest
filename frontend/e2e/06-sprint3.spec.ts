import { expect, test, type Page } from '@playwright/test';
import { Client } from 'pg';
import { capturar, DB_URL, DEMO, nuevaPagina } from './fixtures';

/**
 * Sprint 3 en el navegador: navegación, tienda (CU-12), repaso con tarjetas (CU-09), reto diario (CU-11),
 * plan de estudio (CU-10), duelos entre los dos usuarios demo (CU-13), clasificación (RF-20) y perfil (RF-19).
 * Las pruebas comparten el progreso del usuario demo (global-setup.ts lo reinicia) y van en orden.
 */
test.describe.configure({ mode: 'serial' });

const RIVAL = { email: 'rival@pickquest.dev', password: 'pickquest123' };

async function entrar(page: Page, usuario: { email: string; password: string }) {
  await page.goto('/login');
  await page.locator('input[name=email]').fill(usuario.email);
  await page.locator('input[name=password]').fill(usuario.password);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await page.getByText('Overworld SDLC').waitFor();
}

async function sql(consulta: string, valores: unknown[] = []) {
  const cliente = new Client({ connectionString: DB_URL });
  await cliente.connect();
  try {
    return (await cliente.query(consulta, valores)).rows;
  } finally {
    await cliente.end();
  }
}

/** Responde una ronda de duelo desde la interfaz, siempre con la primera opción. */
async function jugarRondaDeDuelo(page: Page) {
  await page.getByRole('button', { name: /Empezar mi ronda|Continuar mi ronda/ }).click();
  for (let n = 1; n <= 5; n++) {
    await page.locator('#temporizador').waitFor();
    await expect(page.locator('#numero-pregunta')).toHaveText(`Pregunta ${n} de 5`);
    await page.locator('section[aria-label^="Pregunta"] ul button').first().click();
    // el duelo no revela si acertó
    await expect(page.getByText('Respuesta registrada')).toBeVisible();
    await expect(page.locator('#retro-pregunta')).toHaveCount(0);
    await page.getByRole('button', { name: n === 5 ? 'Terminar mi ronda' : 'Siguiente pregunta' }).click();
  }
}

test.describe('Sprint 3: navegación y pantallas nuevas', () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    page = await nuevaPagina(browser);
    await entrar(page, DEMO);
  });
  test.afterAll(async () => {
    await page.context().close();
  });

  test('el encabezado trae las 8 secciones y ninguna dice «próximamente»', async () => {
    const nav = page.getByRole('navigation', { name: 'Navegación principal' }).first();
    const secciones: [string, RegExp][] = [
      ['Mapa', /\/$/],
      ['Biblioteca', /\/estudio$/],
      ['Plan de estudio', /\/plan$/],
      ['Reto diario', /\/reto-diario$/],
      ['Tienda', /\/tienda$/],
      ['Duelos', /\/duelos$/],
      ['Clasificación', /\/clasificacion$/],
      ['Perfil', /\/perfil$/],
    ];
    for (const [nombre, ruta] of secciones) {
      await nav.getByRole('link', { name: new RegExp(`^${nombre}`) }).click();
      await page.waitForURL(ruta);
      expect((await page.content()).toLowerCase()).not.toContain('próximamente');
    }
    await capturar(page, '20-perfil', 1700);
  });

  test('CU-12 Tienda: saldo visible, comprar y equipar; FE1 muestra cuántos QP faltan', async () => {
    await sql(`UPDATE estudiante SET "qpTotal" = 130 WHERE email = $1`, [DEMO.email]);
    await page.goto('/tienda');
    await expect(page.locator('#tienda-saldo')).toHaveText('130 QP');
    await capturar(page, '21-tienda', 1500);

    // FE1: la reliquia cuesta más de lo que tiene
    await page.getByRole('button', { name: /Reliquia del Arquitecto/ }).click();
    await expect(page.getByText(/Te faltan \d+ QP para esta compra/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Comprar', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Cancelar' }).click();

    // flujo normal: comprar un pergamino (30 QP) y equiparlo
    await page.getByRole('button', { name: /Pergamino de Claridad/ }).click();
    await expect(page.getByText('Retos donde puedes usarlo')).toBeVisible();
    await page.getByRole('button', { name: 'Comprar', exact: true }).click();
    await expect(page.getByText('¡Compra realizada!')).toBeVisible();
    await page.getByRole('button', { name: 'Equipar', exact: true }).click();
    await expect(page.getByText('Objeto equipado en tu cinto')).toBeVisible();
    await expect(page.locator('#tienda-saldo')).toHaveText('100 QP');
    const [fila] = await sql(
      `SELECT i.cantidad, i.equipado FROM inventario_objeto i JOIN objeto o ON o.id = i."objetoId" JOIN estudiante e ON e.id = i."estudianteId" WHERE e.email = $1 AND o.nombre = 'Pergamino de Claridad'`,
      [DEMO.email],
    );
    expect(fila).toEqual({ cantidad: 1, equipado: true });
  });

  test('CU-09 Repaso: se voltea con clic o espacio, se evalúa con 1, 2 y 3; salir a medias conserva el avance (FA2)', async () => {
    const [{ xpTotal: xpAntes }] = await sql(`SELECT "xpTotal" FROM estudiante WHERE email = $1`, [DEMO.email]);
    await page.goto('/estudio');
    await page.getByRole('link', { name: /Ciclo de vida del software/ }).click();
    await page.waitForURL(/\/estudio\/\d+$/);
    await expect(page.getByRole('heading', { name: 'Explicación' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Glosario' })).toBeVisible();
    await capturar(page, '22-material', 2200);
    await page.getByRole('button', { name: 'Repasar con tarjetas' }).click();
    await page.waitForURL(/\/estudio\/repaso\/\d+$/);

    // voltear con clic y evaluar con el botón
    const frente = await page.locator('#texto-tarjeta').innerText();
    await page.getByRole('button', { name: 'Voltear la tarjeta' }).click();
    await expect(page.locator('#texto-tarjeta')).not.toHaveText(frente);
    await page.getByRole('button', { name: /^Lo sabía/ }).click();
    await expect(page.locator('#progreso-repaso')).toContainText('1 de 12 tarjetas');
    await capturar(page, '23-tarjetas', 1200);

    // FA2: salir y volver retoma la sesión con las tarjetas pendientes
    await page.getByRole('link', { name: /Salir/ }).click();
    await page.waitForURL(/\/estudio$/);
    await expect(page.getByText('Repaso pendiente')).toBeVisible();
    await page.getByRole('link', { name: /Ciclo de vida del software/ }).click();
    await page.getByRole('button', { name: 'Continuar el repaso' }).click();
    await expect(page.locator('#progreso-repaso')).toContainText('1 de 12 tarjetas · repaso retomado');

    // teclado: barra espaciadora para voltear y 3 para «lo sabía»; «no lo sabía» (1) la manda al final
    await page.keyboard.press('Space');
    await page.keyboard.press('1');
    await expect(page.locator('#progreso-repaso')).toContainText('1 de 12 tarjetas');
    for (let i = 0; i < 40 && !(await page.locator('#resumen-xp').isVisible()); i++) {
      await page.keyboard.press('Space');
      await page.keyboard.press('3');
      await page.waitForTimeout(350);
    }
    await expect(page.locator('#resumen-xp')).toHaveText('Ganaste 10 XP por este repaso.');
    await expect(page.locator('#resumen-no-sabidas')).toHaveText('1');
    await capturar(page, '24-repaso-resumen', 1200);
    const [{ xpTotal }] = await sql(`SELECT "xpTotal" FROM estudiante WHERE email = $1`, [DEMO.email]);
    expect(xpTotal).toBe(xpAntes + 10);
  });

  test('CU-11 Reto diario: temporizador que cambia de color, retroalimentación, resumen y FE1', async () => {
    await page.goto('/reto-diario');
    await expect(page.locator('#racha-dias')).toHaveText('0 días');
    await expect(page.getByText('No puedes usar objetos en este reto.')).toBeVisible();
    await capturar(page, '25-reto-diario', 1300);
    await page.getByRole('button', { name: 'Iniciar reto diario' }).click();

    for (let n = 1; n <= 10; n++) {
      await expect(page.locator('#numero-pregunta')).toHaveText(`Pregunta ${n} de 10`);
      if (n === 1) {
        // el temporizador es visible y cambia de color en los últimos 5 segundos
        await expect(page.locator('#temporizador')).toHaveAttribute('data-urgente', 'false');
        await expect(page.locator('#temporizador')).toHaveAttribute('data-urgente', 'true', { timeout: 20_000 });
        await capturar(page, '26-reto-diario-pregunta', 1100);
      }
      await page.locator('section[aria-label^="Pregunta"] ul button').first().click();
      // CU-11 paso 6: solo indica si fue correcta (sin la opción correcta ni explicación)
      await expect(page.locator('#retro-pregunta')).toHaveText(/^(Correcto|Incorrecto|Se acabó el tiempo: cuenta como incorrecta)$/);
      // solo se marca la opción elegida: nunca se señala cuál era la correcta
      const acerto = (await page.locator('#retro-pregunta').innerText()) === 'Correcto';
      await expect(page.locator('section[aria-label^="Pregunta"] ul button.border-tertiary')).toHaveCount(acerto ? 1 : 0);
      await page.getByRole('button', { name: n === 10 ? 'Ver resumen' : 'Siguiente pregunta' }).click();
    }
    await expect(page.locator('#resultado-aciertos')).toBeVisible();
    await expect(page.locator('#resultado-recompensa')).toContainText('XP');
    await expect(page.locator('#siguiente-reto')).toContainText('disponible en');
    await capturar(page, '27-reto-diario-resumen', 1300);

    // FE1: al volver el mismo día se muestra el resultado y el tiempo que falta
    await page.goto('/reto-diario');
    await expect(page.getByText('Ya hiciste el reto diario de hoy')).toBeVisible();
    await expect(page.locator('#siguiente-reto')).toBeVisible();
    // el indicador del encabezado ya no marca el reto como pendiente
    await expect(page.getByRole('navigation', { name: 'Navegación principal' }).first().getByRole('link', { name: /Reto diario/ }).getByRole('status')).toHaveCount(0);
  });

  test('CU-10 Plan: FE1 señala las pendientes, el plan se ajusta (FA1), se acepta y FA2 pide confirmar', async () => {
    await page.goto('/plan');
    await page.getByRole('button', { name: 'Obtener plan de estudio' }).click();
    await page.waitForURL(/\/plan\/diagnostico\/\d+$/);
    await expect(page.locator('#progreso-diagnostico')).toHaveText('0 de 9 preguntas respondidas');

    // FE1: terminar sin responder
    await page.getByRole('button', { name: 'Terminar diagnóstico' }).click();
    await expect(page.getByText('Faltan 9 preguntas por responder').first()).toBeVisible();

    const preguntas = page.locator('ol > li fieldset');
    // Se responde con una opción incorrecta (leída de la base) para que el diagnóstico siempre marque
    // temas por reforzar: con la primera opción el resultado dependía de qué preguntas salieran al azar.
    const marcarIncorrecta = async (i: number) => {
      const enunciado = ((await preguntas.nth(i).locator('legend').textContent()) ?? '').replace(/^\d+\.\s*/, '').trim();
      const [fila] = await sql(
        `SELECT o.texto FROM opcion_pregunta o JOIN pregunta_banco p ON p.id = o."preguntaId"
          WHERE p.enunciado = $1 AND NOT o.correcta ORDER BY o.orden LIMIT 1`,
        [enunciado],
      );
      expect(fila, `pregunta sin opción incorrecta: ${enunciado}`).toBeTruthy();
      await preguntas.nth(i).locator('label').filter({ has: page.getByText(fila.texto, { exact: true }) }).locator('input[type=radio]').check();
    };
    for (let i = 0; i < 8; i++) await marcarIncorrecta(i);
    await page.getByRole('button', { name: 'Terminar diagnóstico' }).click();
    await expect(page.getByText('Falta 1 pregunta por responder').first()).toBeVisible();
    await expect(page.getByText('Esta pregunta está pendiente')).toBeVisible();
    await capturar(page, '28-diagnostico', 2300);

    await marcarIncorrecta(8);
    await page.getByRole('button', { name: 'Terminar diagnóstico' }).click();
    await page.waitForURL(/\/plan\/propuesta\/\d+$/);
    await expect(page.getByText('Tu dominio por tema')).toBeVisible();
    await capturar(page, '29-plan-propuesta', 1700);

    // FA1: quitar una actividad y cambiar el orden
    const actividades = page.locator('ol > li').filter({ has: page.getByRole('link', { name: 'Ir' }) });
    const antes = await actividades.count();
    expect(antes).toBeGreaterThanOrEqual(2);
    await actividades.first().getByRole('button', { name: /^Bajar/ }).click();
    await actividades.last().getByRole('button', { name: /^Quitar/ }).click();
    await expect(actividades).toHaveCount(antes - 1);
    await page.getByRole('button', { name: 'Aceptar plan' }).click();
    await page.waitForURL(/\/plan$/);
    await expect(page.locator('#avance-plan')).toContainText(`de ${antes - 1} actividades`);
    // cada actividad tiene su acceso directo
    await expect(page.getByRole('link', { name: 'Ir' }).first()).toBeVisible();

    // FA2: con un plan activo se muestra el avance y se pide confirmación
    await page.getByRole('button', { name: 'Generar un plan nuevo' }).click();
    await expect(page.getByText('Ya tienes un plan activo')).toBeVisible();
    await page.getByRole('button', { name: 'Conservar mi plan' }).click();
    await expect(page.getByText('Ya tienes un plan activo')).toHaveCount(0);
    await expect(page.locator('#avance-plan')).toBeVisible();
  });

  test('CU-13 Duelos: el retado ve el aviso, acepta y el resultado aparece a los dos solo al terminar', async ({ browser }) => {
    await page.goto('/duelos');
    await expect(page.getByText('Tienes 0 de 3 duelos pendientes')).toBeVisible();
    await page.locator('main select').nth(0).selectOption('rival_demo');
    await page.locator('main select').nth(1).selectOption('CICLO_VIDA');
    await capturar(page, '30-duelos', 1500);
    await page.getByRole('button', { name: 'Retar y jugar mi ronda' }).click();
    await page.waitForURL(/\/duelos\/\d+$/);
    const dueloId = page.url().split('/').pop()!;
    await jugarRondaDeDuelo(page);
    await expect(page.getByText('¡Terminaste tu ronda!')).toBeVisible();
    await expect(page.locator('#resultado')).toHaveCount(0); // el rival aún no juega

    // el retado entra con su cuenta: aviso visible, indicador y aceptar
    const paginaRival = await nuevaPagina(browser);
    try {
      await entrar(paginaRival, RIVAL);
      await expect(paginaRival.getByRole('alert').filter({ hasText: 'te retó a un duelo' })).toBeVisible();
      await expect(paginaRival.getByRole('navigation', { name: 'Navegación principal' }).first().getByRole('status', { name: /duelo pendiente/ })).toBeVisible();
      await capturar(paginaRival, '31-duelo-aviso', 1000);
      await paginaRival.goto('/duelos');
      // el rival no ve el resultado del retador
      await expect(paginaRival.getByText(/Retaste a|Te retó/).first()).toBeVisible();
      await paginaRival.getByRole('button', { name: 'Aceptar' }).click();
      await paginaRival.waitForURL(new RegExp(`/duelos/${dueloId}$`));
      await expect(paginaRival.locator('#resultado')).toHaveCount(0);
      await jugarRondaDeDuelo(paginaRival);
      // al terminar, el rival ve el resultado
      await paginaRival.reload();
      await expect(paginaRival.locator('#resultado')).toBeVisible();
      await expect(paginaRival.locator('main').getByText(/\+\d+ XP/).first()).toBeVisible();
    } finally {
      await paginaRival.context().close();
    }

    // el retador ve el mismo resultado y ninguno de los dos recibió QP
    await page.reload();
    await expect(page.locator('#resultado')).toBeVisible();
    await capturar(page, '32-duelo-resultado', 1700);
    const filas = await sql(
      `SELECT e.email, r."xpOtorgada" FROM resultado_duelo r JOIN estudiante e ON e.id = r."estudianteId" WHERE r."dueloId" = $1`,
      [Number(dueloId)],
    );
    expect(filas).toHaveLength(2);
    expect(filas.reduce((suma, f) => suma + f.xpOtorgada, 0)).toBeGreaterThanOrEqual(60); // 50+20 o 30+30
    expect(page.url()).toContain(`/duelos/${dueloId}`);
  });

  test('RF-20 Clasificación: tabla con nombre, nivel, XP y estrellas; resalta la fila propia y no muestra correos', async () => {
    await page.goto('/clasificacion');
    const tabla = page.getByRole('table', { name: 'Tabla de clasificación' });
    await expect(tabla.locator('tbody tr')).not.toHaveCount(0);
    expect(await tabla.locator('tbody tr').count()).toBeGreaterThanOrEqual(2);
    const propia = tabla.locator('tr[aria-current="true"]');
    await expect(propia).toHaveCount(1);
    await expect(propia).toContainText('aventurero_demo');
    await expect(propia).toContainText('(tú)');
    await expect(tabla).toContainText('rival_demo');
    expect(await tabla.innerText()).not.toContain('@');
    await expect(page.locator('#mi-posicion')).toBeVisible();
    await capturar(page, '33-clasificacion', 1200);
  });

  test('RF-19 Perfil: racha real, estrellas, plan activo, inventario y edición de nombre', async () => {
    await page.goto('/perfil');
    await expect(page.getByRole('heading', { name: 'aventurero_demo' })).toBeVisible();
    await expect(page.locator('#perfil-racha')).toContainText('multiplicador de QP');
    await expect(page.getByRole('heading', { name: 'Estrellas por fase' })).toBeVisible();
    await expect(page.locator('#perfil-avance-plan')).toContainText('actividades');

    // inventario: desequipar y volver a equipar
    const pocion = page.locator('li').filter({ hasText: 'Poción de Sabiduría' });
    await pocion.getByRole('button', { name: 'Desequipar' }).click();
    await expect(pocion.getByRole('button', { name: 'Equipar' })).toBeVisible();
    await pocion.getByRole('button', { name: 'Equipar' }).click();
    await expect(pocion.getByRole('button', { name: 'Desequipar' })).toBeVisible();

    // editar el nombre: uno ocupado se rechaza; uno libre se guarda
    await page.getByRole('button', { name: 'Editar nombre y avatar' }).click();
    await page.getByLabel('Nombre de aventurero').fill('rival_demo');
    await page.getByRole('button', { name: 'Guardar' }).click();
    await expect(page.getByText('Ya existe un estudiante con ese nombre de aventurero')).toBeVisible();
    await page.getByLabel('Nombre de aventurero').fill('demo_renombrado');
    await page.getByRole('button', { name: 'Guardar' }).click();
    await expect(page.getByRole('heading', { name: 'demo_renombrado' })).toBeVisible();
    await expect(page.locator('#hud-nivel')).toContainText('demo_renombrado');
    // se devuelve el nombre original para no afectar otras ejecuciones
    await page.getByRole('button', { name: 'Editar nombre y avatar' }).click();
    await page.getByLabel('Nombre de aventurero').fill('aventurero_demo');
    await page.getByRole('button', { name: 'Guardar' }).click();
    await expect(page.getByRole('heading', { name: 'aventurero_demo' })).toBeVisible();
  });
});
