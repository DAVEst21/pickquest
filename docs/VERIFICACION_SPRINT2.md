# Cierre de correcciones del Sprint 2

> Este informe corresponde al cierre anterior a CU-02. La ampliación del Sprint 2 está documentada en [VERIFICACION_CU02.md](VERIFICACION_CU02.md).

Referencia: `archivos/TSP_A26_PICKSITOS_SRS_SPRINT2.pdf`. Base: `feature/sprint2-mecanicas`, commit inicial `57d1f23`.

## Base de datos y ramas

La base se reconstruyó desde cero con las seis migraciones y el seed de esta rama. Se verificaron tres fases, cinco retos, tres objetos y un estudiante demo. No existe la tabla `fase_habilidad` de la versión anterior de `develop`.

El respaldo previo está en `/tmp/pickquest-antes-sprint2.dump` en la máquina de ejecución. `respaldo/develop-6c5589f` conserva el commit anterior de `develop`. No se integró ese código. Al cerrar las verificaciones, `develop` se recrea desde el mismo commit final que `feature/sprint2-mecanicas`.

## Cambios y contratos

| Requisito | Comportamiento corregido | Evidencia automatizada |
|---|---|---|
| CU-03 FA2, RF-03 | La ayuda mueve una tarjeta a su columna correcta, conserva RF/RNF y persiste el tablero. No consume el objeto si no hay columnas que corregir. | Backend `FA2 mueve una tarjeta…`, `FA2 sin tarjeta…`; navegador CP-PR-06 |
| RNF-RE-02 | Reintentar carga de mapa, tablón, intento y resultado | `04-recuperacion.spec.ts`, cuatro escenarios |
| RNF-RE-03, RN-07 | Un reenvío devuelve el resultado existente sin duplicar intento ni recompensas. La interfaz consulta el estado antes de guardar. | Backend envíos repetidos/simultáneos; navegador respuesta perdida y borrador fallido |
| RNF-PE-04, RNF-RE-04 | Bloqueo de la fila del estudiante dentro de READ COMMITTED: serializa sus escrituras sin conflictos de predicado entre estudiantes distintos. | `test/carga-sprint2.ts`, cinco lotes de 30; integración de doble inicio y doble envío |
| RF-18 | Mapa con mecánicas por fase y acceso Iniciar/Continuar, manteniendo tablón y objetivos | Recorrido del navegador y capturas |

Cambios aditivos de API:

- `GET /fases` y `GET /fases/:id`: `fase.mecanicas`, en orden de los retos.
- `POST /intentos/:id/ayuda`: `borradorActualizado` en MoSCoW. El resto de las mecánicas conserva su contrato.
- `POST /intentos/:id/enviar`: un intento propio ya calificado responde `200` con su resultado. Los cambios de borrador y las nuevas ayudas siguen respondiendo `409` después de calificar.

Todas las escrituras de aprendizaje adquieren `SELECT ... FOR UPDATE` sobre la fila del estudiante antes de consultar o modificar sus intentos, inventario y recompensas. El aislamiento READ COMMITTED permite ver el estado confirmado después de esperar el bloqueo. Se mantiene un reintento acotado ante conflictos transitorios. Otros dominios que en el futuro modifiquen esas mismas entidades deben respetar este bloqueo.

La ayuda de MoSCoW puede rebasar la capacidad de MUST; no mueve otras tarjetas y se mantiene el bloqueo de envío hasta corregir el exceso. Se conserva el máximo de una ayuda por intento y dos estrellas con ayuda.

## Ejecución del libro de pruebas

Se ejecutan CP-PR-01 a CP-PR-12 y CP-IN-01 a CP-IN-12 con estudiantes temporales independientes del demo. Las evidencias por fila están en `evidencias/`; el registro de ejecuciones incluye fecha, resultado, captura y, cuando se envía, tiempo hasta visualizar la calificación.

Solo se completan I2:J13 y L2:N13 de las hojas **Caso de Prueba CU-03** y **Caso de Prueba CU-04**. Las otras partes del Excel, incluida la hoja de CU-01, se conservan. No se alteran los resultados esperados para hacer pasar pruebas. Las reejecuciones e incidencias de infraestructura se distinguen de defectos del producto en observaciones.

Los Excel conservan los mismos enlaces e identificadores de Drive. Se mantienen fórmulas, validaciones y formatos; los cambios se verifican por lectura posterior.

## Decisiones y límites

- La referencia completa solo se entrega cuando el intento aprueba. Los flujos del SRS piden soluciones después de calificar, mientras RNF-SE-02 prohíbe enviarlas: esta contradicción requiere validación del responsable del SRS; no se declara cumplimiento literal de ambos textos.
- Perfil completo RF-19 y funciones de Sprint 3 fuera de este cambio.
- La prueba de carga usa cinco lotes de 30 estudiantes concurrentes y mide HTTP API; la latencia de navegador se registra por separado. Un resultado local no certifica otro entorno.
- La matriz de navegadores del SRS (dos versiones de Chrome, Firefox, Edge y Safari) requiere validación explícita; ejecutar Chromium de Playwright no prueba por sí solo esa matriz.

## Resultados

- Backend: 119 pruebas unitarias y 71 de integración aprobadas; integración repetida después del cambio de concurrencia.
- Base: seis migraciones aplicadas, seed limpio y `prisma migrate diff` sin diferencias.
- Frontend: compilación correcta y oxlint sin advertencias ni errores. Vite conserva el aviso de bundle de aproximadamente 545 kB.
- Libro CU-03/CU-04: 24 resultados Pass; los fallos iniciales del arnés y la interrupción por reinicio del backend quedan conservados en el historial.
- Concurrencia antes de la corrección: 17/30 envíos correctos; 13 errores 409 en LINEA_TIEMPO.
- Concurrencia después: cinco lotes de 30, **150/150 envíos correctos**, sin errores. Máximos HTTP: línea de tiempo 1007 ms, diálogo 641 ms, MoSCoW 646 ms, inspección 494 ms, presupuesto 604 ms. Informes originales en `evidencias/carga-antes.json` y `evidencias/carga-despues.json`.
- Navegador: los 41 escenarios tienen última ejecución aprobada. Última pasada completa: 40/41; CP-IN-07 consultaba la API antes de terminar la ayuda. Se corrigió la sincronización del arnés y se reejecutaron **7/7** escenarios (CP-IN-07 y los seis de recuperación). No se cambió el resultado esperado ni el comportamiento del producto para hacer pasar ese caso.
- Libro de pruebas: 24/24 Pass en Drive. CU-01 y Leyenda se conservaron byte por byte; solo se modificaron las celdas de ejecución de CU-03 y CU-04.
- Comprobación básica de inicio de sesión y mapa: Chromium 136.0.7103.25, Firefox 137.0 y WebKit 18.4, todos Pass. Esto no certifica Chrome/Edge/Safari ni sus dos últimas versiones.

Los tiempos de reparación de la bitácora se registran como minutos de reloj transcurridos del ciclo compartido de implementación y verificación. Las tareas se solapan; el total del Excel no representa horas de esfuerzo exclusivo.

Tiempo máximo observado desde enviar hasta visualizar calificación en los casos documentados: **1331 ms** (ejecuciones individuales de navegador, no carga de 30 navegadores).

## Estado de entrega

Docker se reconstruyó con el código final. Se verificaron frontend y Swagger con HTTP 200, inicio de sesión del demo y base sin diferencias respecto a Prisma. Queda un estudiante demo, cero intentos, nivel 1, 0 XP, 0 QP y tres pociones equipadas.

Las imágenes públicas se construyeron usando una configuración temporal vacía de Docker (`DOCKER_CONFIG=/tmp/pickquest-docker`) porque el gestor de credenciales de Docker Desktop/WSL fallaba. No se modificó la configuración global ni se guardaron credenciales en el repositorio.
