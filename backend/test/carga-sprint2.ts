/** Verificación reproducible de 30 estudiantes concurrentes en las cinco mecánicas.
 * Ejecutar con la API arriba: npx ts-node --transpile-only test/carga-sprint2.ts
 * Solo crea y elimina sus propios estudiantes; no toca al usuario demo.
 */
import { PrismaClient } from '@prisma/client';
import { performance } from 'node:perf_hooks';
import { writeFileSync } from 'node:fs';
import { PLAN_DIALOGO_PERFECTO } from './ayudas-e2e';
const db = new PrismaClient();
const base = 'http://localhost:3000';
const alumnos: { id: number; token: string }[] = [];
async function api(ruta: string, token = '', body?: unknown, method = 'POST') {
  const r = await fetch(base + ruta, { method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  const data = await r.json();
  if (!r.ok) throw new Error(`${r.status} ${ruta}: ${JSON.stringify(data)}`);
  return data;
}
async function main() {
  const resultados: object[] = [];
  try {
    // Registro en lotes pequeños; la concurrencia de 30 se aplica al envío medido.
    for (let n = 0; n < 30; n++) {
      const nombre = `carga_${Date.now()}_${n}`;
      const sesion = await api('/auth/registro', '', { email: `${nombre}@test.local`, password: 'pruebas-carga-2026', nombreAventurero: nombre });
      alumnos.push({ id: sesion.estudiante.id, token: sesion.accessToken });
    }
    const retos = await db.reto.findMany({ orderBy: [{ fase: { orden: 'asc' } }, { orden: 'asc' }] });
    for (const reto of retos) {
      const ids: number[] = [];
      for (const alumno of alumnos) {
        const i = await api(`/retos/${reto.id}/intentos`, alumno.token); ids.push(i.intentoId);
        const ruta = `/intentos/${i.intentoId}`;
        if (reto.mecanica === 'DIALOGO_STAKEHOLDER') {
          await api(ruta + '/dialogo/tecnica', alumno.token, { tecnica: 'ENTREVISTA' });
          for (const pregunta of PLAN_DIALOGO_PERFECTO) {
            const opcion = await db.opcionDialogo.findFirstOrThrow({ where: { pregunta, nodo: { retoId: reto.id } } });
            await api(ruta + '/dialogo/turnos', alumno.token, { opcionId: opcion.id });
          }
        } else {
          let cuerpo: object;
          if (reto.mecanica === 'LINEA_TIEMPO') {
            const bloques = await db.bloquePlan.findMany({ where: { retoId: reto.id } });
            const entregables = await db.entregablePlan.findMany({ where: { retoId: reto.id } });
            cuerpo = { posiciones: bloques.map(b => ({ bloqueId: b.id, inicioSemana: b.inicioReferencia })), asociaciones: entregables.map(e => ({ entregableId: e.id, faseBloqueId: e.faseCorrectaId })) };
          } else if (reto.mecanica === 'TABLERO_MOSCOW') {
            const tarjetas = await db.tarjetaRequerimiento.findMany({ where: { retoId: reto.id } });
            cuerpo = { tarjetas: tarjetas.map(t => ({ tarjetaId: t.id, columna: t.columnaCorrecta, tipo: t.tipoCorrecto, ordenMust: t.ordenMustReferencia })) };
          } else if (reto.mecanica === 'INSPECCION_SISTEMA') {
            const fallas = await db.fallaCalidad.findMany({ where: { elemento: { pantalla: { retoId: reto.id } } } });
            cuerpo = { marcas: fallas.map(f => ({ elementoId: f.elementoId, atributo: f.atributo })) };
          } else {
            const atributos = await db.atributoEscenario.findMany({ where: { retoId: reto.id } });
            const justificacion = await db.opcionJustificacion.findFirstOrThrow({ where: { retoId: reto.id, correcta: true } });
            cuerpo = { asignaciones: atributos.map(a => ({ atributoEscenarioId: a.id, puntos: a.asignacionReferencia })), justificacionId: justificacion.id };
          }
          await api(ruta + '/borrador', alumno.token, cuerpo, 'PUT');
        }
      }
      const envios = await Promise.all(alumnos.map(async (alumno, j) => {
        const inicio = performance.now();
        try {
          const res = await api(`/intentos/${ids[j]}/enviar`, alumno.token);
          return { ms: Math.round(performance.now() - inicio), aprobado: res.resultado.aprobado, error: null };
        } catch (e) { return { ms: Math.round(performance.now() - inicio), aprobado: false, error: String(e) }; }
      }));
      const ms = envios.map(e => e.ms).sort((a,b) => a-b);
      const resultado = { mecanica: reto.mecanica, estudiantes: 30, aprobados: envios.filter(e => e.aprobado).length, maxMs: ms[29], p95Ms: ms[28], errores: envios.filter(e => e.error), cumpleTresSegundosAPI: envios.every(e => e.aprobado && e.ms < 3000) };
      resultados.push(resultado); console.log(JSON.stringify(resultado));
      if (envios.some(e => !e.aprobado)) throw new Error('No se puede continuar el recorrido: hubo envíos fallidos');
    }
  } finally {
    writeFileSync('/tmp/carga-sprint2.json', JSON.stringify({ fecha: new Date().toISOString(), resultados, alcance: 'HTTP API, cinco lotes de 30 envíos simultáneos; no incluye render del navegador.' }, null, 2));
    await db.estudiante.deleteMany({ where: { id: { in: alumnos.map(a => a.id) } } });
    await db.$disconnect();
  }
}
main().catch(e => { console.error(e); process.exitCode = 1; });
