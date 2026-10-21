import { expect, test, type Page } from '@playwright/test';
import {
  abrirFaseDesdeElMapa,
  capturar,
  enviarYLeerResultado,
  esperarGuardado,
  iniciarSesionDemo,
  nuevaPagina,
} from './fixtures';

/**
 * Recorrido completo con el usuario demo: mapa → tablón → reto → resultado de
 * las 6 mecánicas (CU-08, CU-01, CU-03, CU-04 y CU-06), resolviendo cada reto
 * como lo haría una persona. Guarda las capturas de docs/capturas/.
 * El progreso del usuario demo se reinicia en global-setup.ts.
 */
test.describe.configure({ mode: 'serial' });

test.describe('Recorrido completo: mapa → tablón → reto → resultado', () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    page = await nuevaPagina(browser);
    await iniciarSesionDemo(page);
  });
  test.afterAll(async () => {
    await page.context().close();
  });

  test('mapa: dibuja las 3 fases del backend y solo la primera está disponible', async () => {
    const estados = await page.locator('[data-fase-orden]').evaluateAll((els) => els.map((e) => e.getAttribute('data-estado')));
    expect(estados).toEqual(['desbloqueada', 'bloqueada', 'bloqueada']);
    expect((await page.content()).toLowerCase()).not.toContain('sprint');
    await capturar(page, '01-mapa', 1300);
  });

  test('CU-08 Línea de tiempo (fase 1)', async () => {
    await abrirFaseDesdeElMapa(page, 1);
    const reto = page.locator('[data-reto-id]').filter({ hasText: 'Planifica el lanzamiento' });
    await expect(reto).toHaveAttribute('data-estado', 'DISPONIBLE');
    await capturar(page, '02-tablon-fase', 1100);
    await reto.getByRole('button', { name: /Iniciar reto/ }).click();
    await page.waitForURL(/\/intento\/\d+/);
    await page.locator('[data-fila-bloque]').first().waitFor();

    const REF: Record<string, number> = {
      'Análisis de requisitos': 0,
      'Diseño del sistema': 2,
      'Construcción (programación)': 5,
      'Pruebas del sistema': 10,
      'Despliegue en producción': 13,
      'Preparar el entorno de desarrollo y el repositorio': 2,
      'Escribir el plan y los casos de prueba': 5,
      'Preparar la capacitación del personal': 5,
    };
    const fila = (nombre: string) => page.locator('[data-fila-bloque]').filter({ hasText: nombre });

    // RF-01: el avance se guarda en el servidor y sobrevive a recargar
    await fila('Análisis de requisitos').getByRole('button', { name: 'Colocar' }).click();
    await fila('Diseño del sistema').getByRole('button', { name: 'Colocar' }).click();
    for (let i = 0; i < 2; i++) await page.getByRole('button', { name: 'Retrasar Diseño del sistema una semana' }).click();
    await esperarGuardado(page);
    await page.reload();
    await page.locator('[data-fila-bloque]').first().waitFor();
    await expect(fila('Diseño del sistema')).toContainText('Semana 3');

    for (const [nombre, inicio] of Object.entries(REF)) {
      const f = fila(nombre);
      if ((await f.innerText()).includes('Colocar')) await f.getByRole('button', { name: 'Colocar' }).click();
      if (nombre.startsWith('Preparar el entorno')) continue; // este se coloca arrastrando
      const actual = Number(((await f.innerText()).match(/Semana (\d+)/) ?? [0, 1])[1]) - 1;
      for (let i = actual; i < inicio; i++) await f.getByRole('button', { name: /Retrasar/ }).click();
    }
    // arrastrar la barra 2 semanas (40 px por semana) la deja en la semana 3
    const barra = fila('Preparar el entorno').locator('[data-bloque-id]');
    const caja = (await barra.boundingBox())!;
    await page.mouse.move(caja.x + caja.width / 2, caja.y + caja.height / 2);
    await page.mouse.down();
    await page.mouse.move(caja.x + caja.width / 2 + 40, caja.y + caja.height / 2, { steps: 4 });
    await page.mouse.move(caja.x + caja.width / 2 + 80, caja.y + caja.height / 2, { steps: 4 });
    await page.mouse.up();
    await expect(fila('Preparar el entorno')).toContainText('Semana 3');

    await expect(page.locator('#btn-enviar')).toBeDisabled(); // FE1: faltan entregables
    const ENTREGABLES: Record<string, string> = {
      'Documento de requisitos (SRS)': 'Análisis de requisitos',
      'Documento de diseño y arquitectura': 'Diseño del sistema',
      'Código fuente de la tienda en línea': 'Construcción (programación)',
      'Reporte de resultados de pruebas': 'Pruebas del sistema',
      'Sistema en producción con su manual de usuario': 'Despliegue en producción',
    };
    for (const [entregable, fase] of Object.entries(ENTREGABLES)) await page.getByLabel(entregable).selectOption({ label: fase });
    await expect(page.locator('#btn-enviar')).toBeEnabled();
    await esperarGuardado(page);
    await capturar(page, '03-linea-tiempo-en-curso');

    const r = await enviarYLeerResultado(page);
    expect(r.porcentaje).toBe(100);
    expect(r.titulo).toContain('Superado');
    expect([r.xp, r.qp]).toEqual(['+150', '+100']);
    await expect(page.getByRole('heading', { name: /Plan de referencia/ })).toBeVisible(); // aprobado: referencia completa
    await capturar(page, '04-linea-tiempo-resultado', 2300);
  });

  test('CU-01 Diálogo con Don Ramón (fase 2, reto 1)', async () => {
    await abrirFaseDesdeElMapa(page, 2);
    await page.getByRole('button', { name: /Iniciar reto/ }).first().click();
    await page.waitForURL(/\/intento\/\d+/);
    await page.getByText('Don Ramón').first().waitFor();
    await expect(page.locator('#btn-enviar')).toBeDisabled(); // sin técnica no se puede terminar
    await page.locator('[data-tecnica=ENTREVISTA]').click();
    await page.getByText('¿Qué le preguntas?').waitFor();

    const PLAN = [
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
    for (let i = 0; i < PLAN.length; i++) {
      await page.locator('[data-opcion-id]').filter({ hasText: PLAN[i] }).click();
      await expect(page.locator('#turnos-restantes')).toHaveText(new RegExp(`^${11 - i} de`));
      if (i === 5) await capturar(page, '05-dialogo-en-curso', 1500);
    }
    await expect(page.locator('#libreta-contador')).toHaveText(/^6 de 6/);
    await page.reload(); // el servidor conserva el diálogo
    await expect(page.locator('#libreta-contador')).toHaveText(/^6 de 6/);

    const r = await enviarYLeerResultado(page);
    expect(r.porcentaje).toBe(100);
    await capturar(page, '06-dialogo-resultado', 2000);
  });

  test('CU-02 Historias de usuario (fase 2, reto 2)', async () => {
    await abrirFaseDesdeElMapa(page, 2);
    await page.locator('[data-reto-id]').filter({ hasText: 'Historias para La Esquina' }).getByRole('button', { name: /Iniciar reto/ }).click();
    await page.waitForURL(/\/intento\/\d+/);
    const textos = [
      ['mesero', 'registrar el pedido de una mesa', 'evitar que se pierdan pedidos', 'una mesa con clientes y un mesero autenticado', 'el mesero confirma los productos del pedido', 'el pedido queda asociado a la mesa y aparece en cocina'],
      ['cajera', 'registrar el pago de una cuenta', 'cerrar la venta con un comprobante', 'una cuenta abierta con su importe calculado', 'la cajera confirma un pago válido', 'la cuenta queda pagada y se genera su comprobante'],
      ['encargado de inventario', 'recibir avisos de ingredientes escasos', 'reponer ingredientes antes de que se agoten', 'un ingrediente con un mínimo de existencias configurado', 'las existencias del ingrediente caen por debajo del mínimo', 'el sistema muestra un aviso de reposición al encargado'],
    ];
    for (let h = 0; h < 3; h++) {
      const casillas = page.locator('[data-historia-id]').nth(h).locator('[data-casilla-id]');
      for (let c = 0; c < 6; c++) {
        await page.getByRole('region', { name: 'Banco de piezas', exact: true }).getByText(textos[h][c], { exact: true }).click();
        await casillas.nth(c).getByRole('button', { name: /Colocar pieza/ }).click();
      }
    }
    await esperarGuardado(page);
    await capturar(page, 'cu02-historias-en-curso', 1800);
    const resultado = await enviarYLeerResultado(page);
    expect(resultado.porcentaje).toBe(100);
    await capturar(page, 'cu02-historias-resultado', 1800);
  });

  test('CU-03 Tablero MoSCoW (fase 2, reto 3), con ayuda y pista que sobrevive a recargar', async () => {
    await page.locator('#siguiente-btn').click();
    await page.waitForURL(/\/intento\/\d+/);
    await page.getByText('Capacidad usada en MUST').waitFor();

    const tarjeta = (texto: string) => page.locator('[data-tarjeta-id]').filter({ hasText: texto });
    // una tarjeta se mueve ARRASTRÁNDOLA a WON'T
    const asa = tarjeta('Aplicación móvil para que los clientes').getByRole('button', { name: /Arrastrar/ });
    const a = (await asa.boundingBox())!;
    const destino = (await page.locator('[data-zona=WONT]').boundingBox())!;
    await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
    await page.mouse.down();
    await page.mouse.move(a.x + a.width / 2 + 20, a.y + a.height / 2 + 20, { steps: 5 });
    await page.mouse.move(destino.x + destino.width / 2, destino.y + 120, { steps: 25 });
    await page.mouse.up();
    await expect(tarjeta('Aplicación móvil para que los clientes')).toHaveAttribute('data-columna', 'WONT');

    // ayuda: la pista resalta una tarjeta y dice su columna; sobrevive a recargar la página
    await page.getByRole('button', { name: /Usar ayuda/ }).click();
    await expect(page.getByText('pertenece a la columna')).toBeVisible();
    await esperarGuardado(page);
    await page.reload();
    await page.getByText('Capacidad usada en MUST').waitFor();
    await expect(page.getByText('pertenece a la columna')).toBeVisible();
    await expect(page.getByRole('button', { name: /Ayuda usada/ })).toBeDisabled();

    const TARJETAS: [string, string, string][] = [
      ['Los meseros toman el pedido en una tablet', 'MUST', 'RF'],
      ['Cobrar la cuenta en efectivo y con tarjeta', 'MUST', 'RF'],
      ['Poder seguir tomando pedidos aunque se caiga el internet', 'MUST', 'RNF'],
      ['El pedido aparece en la pantalla de la cocina', 'MUST', 'RNF'],
      ['Descontar ingredientes del inventario', 'SHOULD', 'RF'],
      ['Dividir la cuenta entre varios comensales', 'SHOULD', 'RF'],
      ['Un mesero nuevo aprende a usar el sistema', 'SHOULD', 'RNF'],
      ['Programa de puntos y recompensas', 'COULD', 'RF'],
      ['Reporte semanal de ventas', 'COULD', 'RF'],
      ['Aplicación móvil para que los clientes', 'WONT', 'RF'],
    ];
    for (const [texto, columna, tipo] of TARJETAS) {
      if ((await tarjeta(texto).getAttribute('data-columna')) !== columna) await tarjeta(texto).locator('select').selectOption(columna);
      await tarjeta(texto).getByRole('button', { name: tipo, exact: true }).click();
    }
    await expect(page.locator('#capacidad-usada')).toHaveText(/^18 \/ 20/);
    // FE2: una tarjeta de más en MUST rebasa la capacidad y bloquea el envío
    await tarjeta('Programa de puntos').locator('select').selectOption('MUST');
    await expect(page.locator('#btn-enviar')).toBeDisabled();
    await tarjeta('Programa de puntos').locator('select').selectOption('COULD');
    await expect(page.locator('#btn-enviar')).toBeEnabled();
    await esperarGuardado(page);
    await capturar(page, '07-moscow-en-curso-con-pista', 1500);

    const r = await enviarYLeerResultado(page);
    expect(r.porcentaje).toBe(100);
    await capturar(page, '08-moscow-resultado', 2000);
  });

  test('CU-04 Inspección de SaludYa (fase 3, reto 1)', async () => {
    await abrirFaseDesdeElMapa(page, 3);
    await page.getByRole('button', { name: /Iniciar reto/ }).first().click();
    await page.waitForURL(/\/intento\/\d+/);
    await page.getByText('Haz clic (o Enter) en un elemento').waitFor();

    const MARCAS: [string, string, string][] = [
      ['Inicio de sesión', 'Contraseña', 'Seguridad'],
      ['Inicio de sesión', '¿Olvidaste tu contraseña?', 'Usabilidad'],
      ['Agendar cita', 'Estado de la búsqueda', 'Eficiencia de desempeño'],
      ['Agendar cita', 'Confirmar cita', 'Usabilidad'],
      ['Mis citas', 'Próximas citas', 'Adecuación funcional'],
      ['Mis citas', 'Aviso del sistema', 'Fiabilidad'],
    ];
    let k = 0;
    for (const [pantalla, elemento, atributo] of MARCAS) {
      await page.getByRole('tab', { name: new RegExp(pantalla) }).click();
      await page.getByRole('button', { name: elemento, exact: true }).click();
      k++;
      if (k === 1) await expect(page.locator('#btn-enviar')).toBeDisabled(); // marca sin atributo
      await page.getByLabel(`Atributo de calidad afectado por la marca ${k}`).selectOption({ label: atributo });
    }
    await expect(page.locator('#contador-marcas')).toHaveText(/^6 \/ 9/);
    await esperarGuardado(page);
    await capturar(page, '09-inspeccion-en-curso', 1500);

    const r = await enviarYLeerResultado(page);
    expect(r.porcentaje).toBe(100);
    await capturar(page, '10-inspeccion-resultado', 2300);
  });

  test('CU-06 Reparto de presupuesto (fase 3, reto 2)', async () => {
    await page.locator('#siguiente-btn').click();
    await page.waitForURL(/\/intento\/\d+/);
    await page.locator('#puntos-restantes').waitFor();

    const REPARTO: Record<string, number> = { Seguridad: 8, Usabilidad: 6, 'Eficiencia de desempeño': 4, Mantenibilidad: 2 };
    for (const [atributo, puntos] of Object.entries(REPARTO)) {
      for (let i = 0; i < puntos; i++) await page.getByRole('button', { name: `Agregar un punto a ${atributo}` }).click();
    }
    await expect(page.locator('#puntos-restantes')).toHaveText(/^0/);
    await expect(page.getByRole('button', { name: 'Agregar un punto a Seguridad' })).toBeDisabled(); // FE1
    await expect(page.locator('[data-atributo=SEGURIDAD] [data-medidor]')).toHaveAttribute('data-medidor', '70');
    await expect(page.locator('#btn-enviar')).toBeDisabled(); // sin justificación
    await page.getByLabel(/Prioricé Seguridad y Usabilidad/).check();
    await expect(page.locator('#btn-enviar')).toBeEnabled();
    await esperarGuardado(page);
    await capturar(page, '11-presupuesto-en-curso', 1500);

    const r = await enviarYLeerResultado(page);
    expect(r.porcentaje).toBe(100);
    await capturar(page, '12-presupuesto-resultado', 2000);
  });

  test('las 3 fases quedan completadas y el HUD suma las recompensas (RN-07)', async () => {
    await page.goto('/');
    await page.getByText('Overworld SDLC').waitFor();
    const estados = await page.locator('[data-fase-orden]').evaluateAll((els) => els.map((e) => e.getAttribute('data-estado')));
    expect(estados).toEqual(['completada', 'completada', 'completada']);
    const hud = (await page.locator('header').innerText()).replace(/\s+/g, ' ');
    expect(hud).toContain('1320 / 1500 XP'); // 150 + 200 + 220 + 250 + 300
    expect(hud).toContain('890 QP'); // 100 + 120 + 150 + 180 + 220
  });
});
