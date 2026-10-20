/** Cuenta de revisión local: completa los retos mediante la API sin modificar resultados por SQL.
 * Uso: npm run revision:preparar (API y base de esta instalación deben estar levantadas).
 * Las credenciales se generan en ejecución y solo se guardan fuera del repositorio.
 */
import { PrismaClient } from '@prisma/client';
import { randomBytes } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { PLAN_DIALOGO_PERFECTO } from '../test/ayudas-e2e';
const db = new PrismaClient();
const base = process.env.REVISION_API_URL ?? 'http://localhost:3000';
const salida = process.env.REVISION_SALIDA ?? '/tmp/pickquest-revision.json';
async function main() {
  let email = 'revision.sprint2@pickquest.dev';
  if (await db.estudiante.findUnique({ where: { email } }))
    email = `revision.sprint2.${Date.now()}@pickquest.dev`;
  const password =
    process.env.REVISION_PASSWORD ?? randomBytes(15).toString('base64url');
  const nombreAventurero = `revision_sprint2_${Date.now()}`;
  const credenciales = { email, password };
  writeFileSync(
    salida,
    JSON.stringify({ ...credenciales, completado: false }, null, 2),
    { mode: 0o600 },
  );
  let token = '';
  async function api(
    ruta: string,
    cuerpo?: unknown,
    method = 'POST',
  ): Promise<any> {
    const r = await fetch(base + ruta, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
    });
    const dato = await r.json();
    if (!r.ok) throw new Error(`${r.status}: ${JSON.stringify(dato)}`);
    return dato;
  }
  const registro = await api('/auth/registro', {
    ...credenciales,
    nombreAventurero,
  });
  token = registro.accessToken;
  const retos = await db.reto.findMany({
    orderBy: [{ fase: { orden: 'asc' } }, { orden: 'asc' }],
  });
  const resultados: object[] = [];
  for (const reto of retos) {
    const intento = await api(`/retos/${reto.id}/intentos`),
      ruta = `/intentos/${intento.intentoId}`;
    let borrador: object;
    if (reto.mecanica === 'DIALOGO_STAKEHOLDER') {
      await api(ruta + '/dialogo/tecnica', { tecnica: 'ENTREVISTA' });
      for (const pregunta of PLAN_DIALOGO_PERFECTO) {
        const opcion = await db.opcionDialogo.findFirstOrThrow({
          where: { pregunta, nodo: { retoId: reto.id } },
        });
        await api(ruta + '/dialogo/turnos', { opcionId: opcion.id });
      }
    } else {
      switch (reto.mecanica) {
        case 'ARMADO_PIEZAS': {
          const casillas = await db.casillaHistoria.findMany({
            where: { historia: { retoId: reto.id } },
          });
          borrador = {
            colocaciones: casillas.map((c) => ({
              casillaId: c.id,
              piezaId: c.piezaCorrectaId,
            })),
          };
          break;
        }
        case 'LINEA_TIEMPO': {
          const bloques = await db.bloquePlan.findMany({
            where: { retoId: reto.id },
          });
          const entregables = await db.entregablePlan.findMany({
            where: { retoId: reto.id },
          });
          borrador = {
            posiciones: bloques.map((b) => ({
              bloqueId: b.id,
              inicioSemana: b.inicioReferencia,
            })),
            asociaciones: entregables.map((e) => ({
              entregableId: e.id,
              faseBloqueId: e.faseCorrectaId,
            })),
          };
          break;
        }
        case 'TABLERO_MOSCOW': {
          const tarjetas = await db.tarjetaRequerimiento.findMany({
            where: { retoId: reto.id },
          });
          borrador = {
            tarjetas: tarjetas.map((t) => ({
              tarjetaId: t.id,
              columna: t.columnaCorrecta,
              tipo: t.tipoCorrecto,
              ordenMust: t.ordenMustReferencia,
            })),
          };
          break;
        }
        case 'INSPECCION_SISTEMA': {
          const fallas = await db.fallaCalidad.findMany({
            where: { elemento: { pantalla: { retoId: reto.id } } },
          });
          borrador = {
            marcas: fallas.map((f) => ({
              elementoId: f.elementoId,
              atributo: f.atributo,
            })),
          };
          break;
        }
        case 'REPARTO_PRESUPUESTO': {
          const atributos = await db.atributoEscenario.findMany({
            where: { retoId: reto.id },
          });
          const justificacion = await db.opcionJustificacion.findFirstOrThrow({
            where: { retoId: reto.id, correcta: true },
          });
          borrador = {
            asignaciones: atributos.map((a) => ({
              atributoEscenarioId: a.id,
              puntos: a.asignacionReferencia,
            })),
            justificacionId: justificacion.id,
          };
          break;
        }
        default:
          throw new Error(`La herramienta no sabe resolver ${reto.mecanica}`);
      }
      await api(ruta + '/borrador', borrador, 'PUT');
    }
    const res = await api(ruta + '/enviar');
    if (
      res.resultado.porcentaje !== 100 ||
      res.resultado.calificacionEstrellas !== 3 ||
      res.resultado.usoAyuda
    )
      throw new Error('El reto no quedó resuelto perfectamente');
    resultados.push({
      mecanica: reto.mecanica,
      intentoId: intento.intentoId,
      ...res.resultado,
    });
  }
  const login = await api('/auth/login', credenciales);
  token = login.accessToken;
  const fases = await api('/fases', undefined, 'GET');
  const perfil = await api('/auth/perfil', undefined, 'GET');
  if (!fases.every((f: any) => f.estado === 'completada'))
    throw new Error('Faltan fases por completar');
  if (
    perfil.xpTotal !== retos.reduce((n, r) => n + r.recompensaXp, 0) ||
    perfil.qpTotal !== retos.reduce((n, r) => n + r.recompensaQp, 0)
  )
    throw new Error('Las recompensas no coinciden');
  writeFileSync(
    salida,
    JSON.stringify(
      { ...credenciales, completado: true, perfil, fases, resultados },
      null,
      2,
    ),
    { mode: 0o600 },
  );
  console.log(
    JSON.stringify({
      email,
      credencialesGuardadasEn: salida,
      retos: resultados.length,
      fasesCompletadas: fases.length,
      xp: perfil.xpTotal,
      qp: perfil.qpTotal,
    }),
  );
}
main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
