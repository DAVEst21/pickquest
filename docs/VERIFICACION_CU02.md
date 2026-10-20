# CU-02 incorporado al Sprint 2

Base: `feature/sprint2-mecanicas`, commit `f0cd251`. Entrega en `feature/sprint2-cu02-historias`.

## Implementación y recorrido

CU-02 se abre por el mismo recorrido que los otros retos: iniciar sesión → mapa → Elicitación → tablón → Iniciar reto / Continuar intento → envío → resultado. El orden es CU-01, CU-02, CU-03. Al repetir un reto aprobado se solicita confirmación, se conserva la mejor nota y no se duplican recompensas.

El reto contiene tres historias de la cafetería, 18 casillas y seis distractores. Se admiten arrastre y selección de pieza/casilla, sustitución, movimiento y retirada. La calificación se calcula en el servidor por RN-17, truncando a porcentaje entero como las otras mecánicas. El resultado muestra las elecciones y sus aciertos, sin enviar la asociación privada de piezas correctas.

La ayuda retira exactamente dos distractores que sigan en el banco, se guarda relacionalmente y persiste al recargar. Si no hay dos disponibles se revierte toda la operación, incluido el consumo del objeto. Siguen vigentes una ayuda por intento y máximo dos estrellas con ayuda.

## Base y compatibilidad

Siete migraciones. La nueva migración mueve MoSCoW de la posición 2 a la 3 conservando su ID. El seed rechaza sobrescribir una posición perteneciente a otra mecánica. No se borró la base original; respaldo de esta ejecución en `/tmp/pickquest-antes-cu02.dump`.

La actualización se comprobó sobre una copia de ese respaldo con un intento aprobado de MoSCoW y diez respuestas: se conservaron después de migrar y ejecutar dos veces el seed. Evidencia: `evidencias/cu02/migracion.txt`.

Una fase antes completada vuelve a estar pendiente si falta aprobar el nuevo reto; no se borran las aprobaciones ni las recompensas anteriores.

## Documentación y ejecución

El Word de Drive conserva su ID, incorpora la especificación de CU-02, catálogo/matriz en Sprint 2 y revisión 2.2. Se revisaron visualmente el índice y las páginas de CU-02 después de actualizar campos y paginación. La exportación está en `archivos/TSP_A26_PICKSITOS_SRS_SPRINT2_CU02.pdf`; el PDF completo original se conserva como referencia histórica.

La nueva hoja `Caso de Prueba CU-02` usa A1:N21 con 20 casos. Las hojas CU-01, CU-03, CU-04 y los estilos originales se conservaron byte por byte en el paquete Excel. La leyenda incorpora CU-02 y RN-17. Los resultados se toman de `evidencias/cu02/ejecuciones.jsonl`; `casos.json` contiene sus pasos y resultados esperados.

La bitácora agrega D-005: el cliente Prisma podía quedar desactualizado al arrancar con un volumen persistente de node_modules. El CMD ahora ejecuta prisma generate antes de migrar y cargar el seed. Los cuatro defectos históricos y sus responsables se conservaron. No se inventó un tiempo de reparación: ese campo de D-005 queda vacío porque no se midió.

Docker estaba detenido al comenzar esta entrega. Se reconstruyeron y levantaron los servicios. Las imágenes se construyen con una configuración temporal de Docker vacía porque el gestor de credenciales de Windows/WSL presenta errores de interoperabilidad; no se modificó la configuración global.

D-006 documenta el fallo de compilación descubierto al incorporar la herramienta de cuenta de revisión: scripts fuera de src cambiaron la raíz inferida y un caché fuera de dist dejó emisiones incompletas. Se restringió el build a src, se excluyeron scripts/test/prisma y se ubicó su caché en dist/.tsbuildinfo. El arranque volvió a responder HTTP 200. El tiempo de reloj medido está en `evidencias/cu02/defecto-compilacion.json`.

## Incidencias del arnés

La primera ejecución nueva de integración agotó el timeout del arranque y luego, bajo carga simultánea del entorno, el de una preparación de caso. Se ajustó el límite de la suite de CU-02 sin cambiar el timeout transaccional del producto ni las expectativas; la reejecución pasó 7/7.

CP-HU-20 primero intentó acceder a localhost dentro del contenedor de navegador: se corrigió el proxy de la simulación de respuesta perdida. Otra reejecución encontró colisión de trazas al correr dos procesos de Playwright sobre el mismo directorio; las reejecuciones aisladas usan un directorio de salida separado. Estas incidencias son del arnés y se distinguen de defectos del producto. La primera regresión completa también se interrumpió por el fallo real de arranque D-006 y por un selector ambiguo del nuevo recorrido (mesero coincidía con varias cláusulas); se corrigió el selector, sin cambiar datos ni resultados esperados.

## Resultados y cuenta de revisión

- Backend final: **127/127 unitarias y 78/78 de integración**, en una ejecución sin fallos; TypeScript sin errores. Se verificó también la compilación de Nest y el arranque de las imágenes reconstruidas.
- Navegador: **62/62 escenarios en una pasada completa**, incluidos los 20 casos de CU-02 y la regresión de las otras cinco mecánicas. El recorrido confirma mapa → tablón → intento → resultado y las tres fases completadas.
- CP-HU-03 se repitió con selección mediante teclado (Enter en pieza y casilla), con resultado Pass; el recorrido completo también cubre selección por clic. La limpieza del arnés elimina su estudiante temporal incluso si falla el cierre de capturas/trazas.
- Frontend: compilación correcta, oxlint **0 advertencias y 0 errores**. Se conserva el aviso de Vite de un bundle de aproximadamente 550 kB; no impide compilar.
- Carga: seis lotes de 30 envíos simultáneos, **180/180 aprobados**, sin errores. Máximo observado: **626 ms**; CU-02: **557 ms**. Evidencia: `evidencias/cu02/carga.json`. Mide HTTP API, no 30 navegadores ni otro entorno.
- Prisma: `migrate diff` sin diferencias respecto de la base. La base temporal de prueba de migración se eliminó al terminar.
- Drive: los tres archivos publicados se descargaron nuevamente y coincidieron byte por byte con sus versiones actualizadas. Hashes en `evidencias/cu02/verificacion-drive.json`. Nueva hoja CU-02: **20/20 Pass**; las otras hojas de casos y sus estilos se conservaron.
- Compatibilidad: pruebas de navegador con Chromium de Playwright 1.52. Esta ejecución no certifica la matriz de dos versiones de Chrome, Firefox, Edge y Safari del SRS.

La cuenta independiente `revision.sprint2@pickquest.dev` se creó al terminar las pruebas. Sus seis intentos se completaron mediante las operaciones normales de la API, al 100 %, con tres estrellas y sin ayudas. Tiene 1320 XP, 890 QP y las tres fases completadas. La contraseña se generó fuera del repositorio y no se versiona. El comando `npm run revision:preparar` permite generar otra cuenta sin sobrescribir la existente. Se verificó por navegador el inicio de sesión, las tres fases completadas, el tablón con CU-02 aprobado y la confirmación de reintento (cancelada para conservar los seis intentos perfectos). Las evidencias están en `evidencias/cu02/cuenta-revision*`.

No se modificó develop ni se incluyeron los diagramas locales en Git. La cuenta de revisión queda fuera de cualquier limpieza de estudiantes temporales.
