# Adenda al reporte del Sprint 2

Para las correcciones y verificaciones posteriores, consultar [VERIFICACION_SPRINT2.md](docs/VERIFICACION_SPRINT2.md). Los resultados siguientes corresponden al hito original de esta adenda.

Rama `feature/sprint2-mecanicas`. Cambios hechos después de `REPORTE_SPRINT2.md`. No se hizo merge ni se crearon etiquetas.

Commits:

```
bc7c2cd fix(aprendizaje): pista de la ayuda persistente y retroalimentación sin la referencia en intentos no aprobados (RF-03, RF-01)
b973f5d test(frontend): suite de Playwright del recorrido completo con capturas en docs/capturas
18c0379 docs: README de la raíz (stack, cómo levantarlo, pruebas, estructura, usuario demo) y README breves; ESTADO_ACTUAL marcado como histórico
+ el commit que agrega esta adenda
```

(Los puntos 1 y 2 quedaron en un solo commit porque tocan los mismos archivos del servicio y de las pruebas e2e.)

## 1. La pista de la ayuda sobrevive a recargar el intento

**Defecto corregido:** la pista (la opción, tarjeta, pantalla, restricción o dependencia señalada) solo vivía en el estado de la pantalla; al recargar o retomar el intento se perdía, aunque el intento seguía marcado como «ayuda usada».

**Qué se hizo**

- **Base de datos (migración `20260930120000_pista_ayuda_relacional`, sin JSON).** `UsoAyuda` guarda el tipo de pista (enum `TipoPista`) y una referencia por clave foránea al elemento al que apunta:

  | Tipo de pista | Columnas que usa | Se obtiene del contenido |
  |---|---|---|
  | `OPCION_DIALOGO` (CU-01) | `opcionId` | — |
  | `COLUMNA_TARJETA` (CU-03) | `tarjetaId` | la columna correcta (`tarjeta.columnaCorrecta`) |
  | `PANTALLA` (CU-04) | `pantallaId` | — |
  | `RESTRICCION` (CU-06) | `atributoEscenarioId` | el mínimo (`minimoObligatorio`) |
  | `DEPENDENCIA` (CU-08) | `bloqueId` y `requiereId` | — |

  `tipoPista` es nulo solo en ayudas registradas antes de este cambio (siguen valiendo como «ayuda usada», sin pista que dibujar). Las referencias usan `Restrict`, igual que el resto de las tablas de respuesta.
- **Backend.** `POST /intentos/:id/ayuda` guarda la pista junto con el consumo del objeto, en la misma transacción. `GET /intentos/:id` y `POST /retos/:id/intentos` (al retomar) devuelven `pista` (o `null`). Funciones puras de conversión en `mecanicas/pista.ts`. De la pista de CU-06 se quitó `medidorActual` (dependía del estado del reparto y no se podía reconstruir; la interfaz no lo usaba).
- **Frontend.** `RetoPage` arranca con la pista que devuelve el servidor, así que los cinco componentes la vuelven a dibujar tras recargar.

**Pruebas**

- Unitarias (`pista.spec.ts`): ida y vuelta de cada tipo, columnas que quedan en `null`, valores que se obtienen del contenido y ayudas sin pista guardada.
- e2e del backend: en el recorrido de las 5 mecánicas, tras usar la ayuda se comprueba que la fila de `UsoAyuda` tiene el tipo esperado y que `GET /intentos/:id` y el retomar devuelven exactamente la misma pista; una prueba aparte verifica las columnas relacionales (ids no nulos, las demás en `null`) y que una ayuda antigua sin pista no rompe nada.
- Playwright: en CU-03 y en CU-01 se usa la ayuda, se recarga la página y se comprueba que la pista sigue visible.

## 2. La retroalimentación de un intento no aprobado no revela la solución

Antes, cualquier intento calificado mostraba la respuesta de referencia, de modo que se podía reprobar a propósito para leerla.

**Regla.** El servidor redacta la retroalimentación según `intento.aprobado` (`mecanicas/retroalimentacion.ts`, función pura) y agrega `referenciaCompleta: true | false`. Se aplica tanto al enviar como al consultar el intento después.

| Mecánica | Intento NO aprobado muestra | Solo si queda aprobado |
|---|---|---|
| CU-08 Línea de tiempo | plazo (fin vs. límite), dependencias incumplidas, entregables mal asociados (con la fase que elegiste) | plan de referencia, fin de referencia, fase correcta de cada entregable |
| CU-03 MoSCoW | tarjeta por tarjeta: columna y tipo elegidos y si son correctos; concordancia del orden | columna y tipo correctos, orden de referencia de MUST |
| CU-04 Inspección | fallas encontradas (con si el atributo fue correcto), **cuántas** fallas faltaron, marcas sin falla | fallas no encontradas, atributo correcto y explicación de cada falla |
| CU-06 Presupuesto | tus puntos, medidores, restricciones cumplidas e incumplidas, tu justificación y si fue correcta | reparto y medidores de referencia, justificación correcta |
| CU-01 Diálogo | tu técnica y si fue correcta, requerimientos descubiertos, **cuántos** faltaron, preguntas improductivas, turnos | técnica correcta, requerimientos no descubiertos |

**Frontend.** La pantalla de resultado muestra un aviso («Aquí ves en qué te equivocaste, pero no la solución. La respuesta de referencia completa se muestra cuando apruebas el reto») y dibuja solo lo que llega.

**Pruebas.** Unitarias de la redacción (por mecánica: ninguna clave de referencia en un intento no aprobado, retroalimentación completa en uno aprobado, y lo que está mal sí se conserva). En el e2e se ajustaron las pruebas que leían la referencia de intentos reprobados y se agregó, por mecánica, la verificación de que un intento reprobado no recibe ningún campo de referencia (tampoco al volver a consultarlo) y uno aprobado sí. En Playwright se verifica que el resultado reprobado de CU-06 muestra las restricciones incumplidas y no «Tu reparto frente al de referencia» ni «La justificación correcta era».

## 3. Suite de Playwright en `frontend/e2e/`

- **Qué cubre (11 pruebas):** `01-recorrido.spec.ts` resuelve las 5 mecánicas por la interfaz (mapa → tablón → reto → resultado), incluyendo arrastrar una barra del Gantt y una tarjeta de MoSCoW, recarga con el avance conservado, la ayuda con su pista y los totales de XP/QP; `02-alternativos.spec.ts` cubre las confirmaciones y excepciones (libreta vacía, envío automático al agotar turnos, restricción incumplida, plazo rebasado) y la retroalimentación de un intento no aprobado.
- **Archivos:** `playwright.config.ts`, `e2e/global-setup.ts`, `e2e/fixtures.ts`, los dos `.spec.ts`; script `npm run test:e2e`; dependencias de desarrollo `@playwright/test` (1.52.0, igual que la imagen de Docker) y `pg`.
- **Antes de correr**, `global-setup.ts`: espera a que la aplicación esté arriba, **revisa CORS y la URL del API** (el error del `.env` más frecuente) y falla con un mensaje claro si están mal; y **reinicia el progreso del usuario demo** (borra sus intentos, 0 XP y QP, 3 pociones equipadas) para que la suite sea repetible. Solo toca al usuario `demo@pickquest.dev`.
- **Cómo ejecutarla** (detalle en el README):
  - Con Docker, sin instalar nada: `docker compose --profile e2e run --rm e2e` (servicio `e2e` del compose; usa la imagen oficial de Playwright y redirige `localhost:5173` y `localhost:3000` del navegador al frontend y backend del compose).
  - En la máquina: `cd frontend && npm ci && npx playwright install chromium && npm run test:e2e`.
- **Capturas** en `docs/capturas/` (se regeneran en cada corrida): `01-mapa`, `02-tablon-fase`, `03/04` línea de tiempo (en curso y resultado), `05/06` diálogo, `07/08` MoSCoW (el «en curso» **con la pista de la ayuda visible**, tras recargar la página), `09/10` inspección, `11/12` presupuesto y `13-presupuesto-resultado-no-aprobado`.
- **Resultado:** 11 de 11 pasan.

**Hallazgos durante la verificación**

- En Windows y macOS el servidor de Vite del contenedor **no se enteraba de los cambios de archivos** (los bind mounts no emiten eventos) y seguía sirviendo módulos viejos hasta reiniciar el contenedor. Se agregó `CHOKIDAR_USEPOLLING: "true"` al servicio `frontend` del compose y se comprobó que un cambio se refleja en segundos.
- El backend en modo `watch` también había quedado con código viejo tras una compilación manual dentro del contenedor; se resolvió reiniciándolo (`docker restart pickquest-backend-1`). Si algo no refleja un cambio de backend, ese es el primer paso.

## 4. Documentación

- `README.md` de la raíz reescrito: descripción, stack, cómo levantarlo (con la **advertencia sobre `CORS_ORIGIN` y `VITE_API_URL` del `.env`** y su síntoma), variables de entorno, usuario demo, cómo correr las pruebas (unitarias, e2e del backend y Playwright), compilación y lint, galería de capturas, estructura de carpetas y enlaces a los reportes.
- `backend/README.md` y `frontend/README.md`: plantillas reemplazadas por una página breve con sus comandos y un enlace al README de la raíz.
- `ESTADO_ACTUAL_PROYECTO.md`: se conservó con un aviso al inicio que lo marca como **documento histórico** (describe el proyecto antes del Sprint 1).

## 5. Estado de las pruebas tras estos cambios

| Tipo | Resultado |
|---|---|
| Unitarias backend | 13 suites, **119 pruebas**, todas pasan (antes 101) |
| e2e backend | 3 suites, **69 pruebas**, todas pasan (antes 66) |
| Playwright | **11 de 11** pasan |
| Compilación y lint | backend y frontend compilan; `oxlint` con 0 advertencias y 0 errores |

## 6. Cosas que conviene saber

- Las pistas de ayudas anteriores a la migración no tienen tipo guardado: aparecen como «ayuda usada» sin pista (solo afecta intentos creados antes de este cambio).
- Un intento aprobado sigue mostrando la solución completa; un estudiante que ya aprobó un reto y lo reintenta y reprueba **no** la ve en ese intento (la regla es por intento).
- El `.env` local de la raíz sigue apuntando a túneles de Cloudflare inactivos; no se modificó. Para correr la suite con el compose normal hay que corregir `CORS_ORIGIN` y `VITE_API_URL` (o borrarlos). En las pruebas de esta adenda se sobrescribieron por línea de comandos al invocar `docker compose`.
- Las capturas se guardan en el repositorio (≈2.5 MB); si el equipo prefiere no versionarlas, basta con ignorar `docs/capturas/` y regenerarlas con la suite.
