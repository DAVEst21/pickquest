# Reporte del Sprint 3 — PickQuest

Rama: `feature/sprint3-casos-faltantes` · Fecha: 9 de noviembre de 2026 · Un commit por etapa (sin `Co-Authored-By`, sin `push`).

Casos de uso implementados o completados: **CU-05, CU-07, CU-09, CU-10, CU-11, CU-12 y CU-13**, más **RF-19 (perfil)**, **RF-20 (clasificación)**, los ajustes comunes (RN-31 en todos los retos, pista persistente, objetos por tema) y la verificación de **CU-02**.

---

## 1. Diagnóstico inicial

| Punto revisado | Hallazgo al empezar | Qué se hizo |
|---|---|---|
| CU-02 (historias de usuario) | Cumplía el flujo normal, FE1, FE2, FA4 y la ayuda. Le faltaba aplicar RN-31 con el umbral de 3 intentos: la pieza correcta de cada casilla viajaba en cuanto el intento no aprobaba | Corregido en `puedeVerReferencia` + `redactarRetroalimentacion`; prueba `cu02-historias` y `sprint3-comunes` |
| RN-31 (referencia tras aprobar o 3 intentos) | Solo se ocultaba mientras el intento no aprobaba; no existía el umbral de 3 intentos no aprobados | Función única `puedeVerReferencia` con pruebas unitarias, aplicada a todas las mecánicas (probado en CU-02, CU-03 y los nuevos) |
| Pista de la ayuda | Ya se guardaba de forma relacional (`UsoAyuda.tipoPista` + claves foráneas), sin JSON | Se extendió a `RANGO_ESCENARIO` (CU-05) y `DOCUMENTO` (CU-07); `GET /intentos/:id` y `POST /retos/:id/intentos` devuelven la misma pista |
| Objetos | 3 objetos (Poción, Pergamino de Claridad, Reliquia) con `equipado`/`cantidad`, sin tema | Se agregó `Objeto.tema`; ahora son 5 objetos (poción y reliquia para cualquier reto, un pergamino por tema); el cinto y la ayuda rechazan un objeto no aplicable |
| Racha | `RachaEstudio` existía pero nada la actualizaba (siempre 0 días, ×1.0) | CU-11 la actualiza; lectura con reinicio perezoso en perfil, reto diario y recompensas de retos |
| Contenido archivado | Existía contenido de Sprints anteriores, casi todo de ágil/arquitectura (fuera de los 3 temas) | No se reutilizó; las 45 preguntas, el material de estudio y los retos nuevos son contenido nuevo |
| Perfil, clasificación y navegación | El perfil era solo el encabezado (nivel, XP, QP, racha, inicial del avatar); no había clasificación; la navegación tenía «Overworld», «Misiones» y tres elementos atenuados «Próximamente» | RF-19, RF-20 y navegación completa (sección 2) |

---

## 2. Resumen de lo implementado

| Etapa | Commit | Contenido |
|---|---|---|
| 1 y 2 | `7f6815c` | Ajustes comunes (RN-31, `diaCalendarioMx`, objetos por tema, pista persistente), verificación de CU-02 y **CU-05** simulador de escenarios |
| 3 | `36be40f` | **CU-07** expediente del proyecto |
| 4 | `973c858` | **CU-12** tienda: catálogo, compra atómica, equipar/desequipar con reemplazo |
| 5 | `8777cc5` | **CU-09** biblioteca, material y repaso con tarjetas (RN-24, RN-25) y `calcularDominio` (RN-26) |
| 6 | `41f2bae` | **CU-10** diagnóstico, plan de estudio y banco de preguntas (RN-26, RN-27) |
| 7 | `1c1a42f` | **CU-11** reto diario contrarreloj con racha real (RN-12, RN-13, RN-29, RNF-SE-05) |
| 8 | `db2a49a` | **CU-13** duelos, **RF-19** perfil, **RF-20** clasificación y navegación con indicadores |
| 9 | `97f8db6` | Limpieza de «próximamente», suite de navegador adaptada y ampliada, README y este reporte |

**Navegación (encabezado):** Mapa · Biblioteca · Plan de estudio · Reto diario · Tienda · Duelos · Clasificación · Perfil. Indicadores: insignia con el número de duelos pendientes por responder y marca «!» en *Reto diario* mientras el de hoy no se haya terminado; además, un aviso visible en todas las pantallas cuando el estudiante tiene duelos pendientes. En pantallas angostas el menú se abre con un botón.

---

## 3. Cumplimiento del anexo A

Estados: **Cumple** · **Cumple con desviación** · **No cumple**. «Back» = endpoint; «Front» = componente.

### CU-05 Calibrar escenarios de calidad (RF-08)

| Paso / flujo | Estado | Back | Front |
|---|---|---|---|
| 1 Seleccionar el reto desde el tablón (objetivo, dificultad, recompensas, RN-02) | Cumple | `GET /fases/:id`, `POST /retos/:id/intentos` | `MisionPage` |
| 2 Necesidad vaga, contexto y 6 partes vacías | Cumple | `POST /retos/:id/intentos` (contenido público sin respuestas) | `RetoEscenario` |
| 3 Elegir fuente, estímulo, artefacto, entorno y respuesta | Cumple | `PUT /intentos/:id/borrador` | `RetoEscenario` |
| 4 Calibrar valor, unidad y carga con deslizadores | Cumple | `PUT /intentos/:id/borrador` | `RetoEscenario` (deslizador + entrada numérica) |
| 5–6 Simular y ver cumplimiento con gráfica frente al umbral | Cumple | `POST /intentos/:id/escenario/simular` | `RetoEscenario` (gráfica) |
| 7 Repetir hasta el límite de 5 simulaciones (RN-20) | Cumple | mismo endpoint, 409 en la sexta | `RetoEscenario` |
| 8–9 Enviar, calificar (RN-20) y marcar partes incorrectas; referencia según RN-31 | Cumple | `POST /intentos/:id/enviar` | `Retroalimentacion` |
| 10 Registrar intento y progreso de la fase | Cumple | `POST /intentos/:id/enviar` | `ResultadoPage` |
| FA1 Reintentar (aviso si ya estaba aprobado) | Cumple | `POST /retos/:id/intentos` | `MisionPage`, `ResultadoPage` |
| FA2 Ayuda: descuenta del inventario y revela el rango aceptable | Cumple | `POST /intentos/:id/ayuda` (`RANGO_ESCENARIO`) | `RetoPage` (cinto) |
| FA3 Guardar y retomar | Cumple | `PUT /intentos/:id/borrador`, `GET /intentos/:id` | `RetoPage` |
| FE1 Partes vacías: no simula ni envía | Cumple | 400 con las partes faltantes | `RetoEscenario` |
| FE2 Límite de simulaciones | Cumple | 409 con aviso | `RetoEscenario` |

### CU-07 Elegir el ciclo de vida con el expediente (RF-10)

| Paso / flujo | Estado | Back | Front |
|---|---|---|---|
| 1 Seleccionar el reto desde el tablón | Cumple | `GET /fases/:id` | `MisionPage` |
| 2 Expediente con documentos y tablero vacío | Cumple | `POST /retos/:id/intentos` | `RetoExpediente` |
| 3 Abrir un documento | Cumple | (cliente) | `RetoExpediente` (carpetas) |
| 4–5 Seleccionar un fragmento y agregarlo como evidencia | Cumple | `PUT /intentos/:id/borrador` | `RetoExpediente` (clic o Enter) |
| 6 Elegir la característica que revela | Cumple | `PUT /intentos/:id/borrador` | `RetoExpediente` |
| 7 Repetir | Cumple | — | `RetoExpediente` |
| 8 Elegir modelo (6 opciones) y vincular ≥ 2 evidencias | Cumple | `PUT /intentos/:id/borrador` | `RetoExpediente` |
| 9–10 Enviar y calificar (RN-22), evidencias irrelevantes; referencia según RN-31 | Cumple | `POST /intentos/:id/enviar` | `Retroalimentacion` |
| 11 Registrar intento y progreso | Cumple | `POST /intentos/:id/enviar` | `ResultadoPage` |
| FA1 / FA3 Reintentar y retomar | Cumple | `POST /retos/:id/intentos` | `MisionPage`, `RetoPage` |
| FA2 Ayuda: resalta un documento con evidencia relevante pendiente | Cumple | `POST /intentos/:id/ayuda` (`DOCUMENTO`) | `RetoExpediente` |
| FE1 Menos de 2 vínculos: no envía | Cumple | 400 | `RetoExpediente` |
| FE2 Fragmento duplicado: avisa y no duplica | Cumple | 400 «ya fue agregada» | `RetoExpediente` |

### CU-09 Repasar un tema con tarjetas (RF-12)

| Paso / flujo | Estado | Back | Front |
|---|---|---|---|
| 1 Elegir tema en la biblioteca | Cumple | `GET /estudio/temas` | `BibliotecaPage` |
| 2 Material: explicación, ejemplos, glosario | Cumple | `GET /estudio/temas/:faseId` | `MaterialPage` |
| 3 «Repasar con tarjetas» | Cumple | `POST /estudio/temas/:faseId/sesiones` | `MaterialPage` |
| 4–6 Frente, voltear (clic o barra espaciadora) y reverso | Cumple | (sesión trae la tarjeta) | `RepasoPage` |
| 7 Autoevaluación (botones o teclas 1, 2, 3) | Cumple | `POST /estudio/sesiones/:id/tarjetas/:tarjetaId` | `RepasoPage` |
| 8 Programar próxima aparición (RN-24) | Cumple | mismo endpoint | — |
| 9–10 Repetir, resumen, dominio (RN-26) y 10 XP una vez al día (RN-25) | Cumple | mismo endpoint (fin de sesión) | `RepasoPage` |
| FA1 Cerrar el material sin repasar: consulta registrada | Cumple | `POST /estudio/temas/:faseId/consultas` | `MaterialPage` |
| FA2 Salir a medias: avance conservado y se retoma | Cumple | `POST …/sesiones` retoma, `GET /estudio/sesiones/:id` | `RepasoPage`, `BibliotecaPage` |
| FE1 Fase bloqueada: 403 «Este tema se desbloquea al completar la fase anterior» | Cumple | 403 | `BibliotecaPage`, `MaterialPage` |

### CU-10 Plan de estudio con diagnóstico (RF-13)

| Paso / flujo | Estado | Back | Front |
|---|---|---|---|
| 1 «Obtener plan de estudio» | Cumple | `POST /plan/diagnosticos` | `PlanPage` |
| 2–3 Diagnóstico de 9 preguntas (3 por tema, al azar, sin la correcta) | Cumple | `POST /plan/diagnosticos` | `DiagnosticoPage` |
| 4 Dominio por tema (RN-26) | Cumple | `POST /plan/diagnosticos/:id/respuestas` | `PropuestaPage` |
| 5–6 Temas débiles (RN-27), plan con tema y motivo | Cumple | misma ruta | `PropuestaPage` |
| 7 Aceptar | Cumple | `POST /plan/:id/aceptar` | `PropuestaPage` |
| 8 Plan activo en el perfil con acceso directo a cada actividad | Cumple | `GET /plan/activo`, `GET /perfil` | `PlanPage`, `PerfilPage` |
| FA1 Quitar o reordenar antes de aceptar | Cumple | `actividadIds` en orden | `PropuestaPage` (subir/bajar/quitar) |
| FA2 Plan activo: muestra avance y pide confirmar; el nuevo reemplaza solo al aceptarse | Cumple | `GET /plan/activo`; reemplazo transaccional al aceptar | `PlanPage` (modal) |
| FE1 Preguntas sin responder: las señala y no genera el plan | Cumple | 400 con `pendientes` | `DiagnosticoPage` |
| FE2 Sin temas débiles: plan de mejora (retos < 3 estrellas + duelos) | Cumple | `esPlanMejora = true` | `PropuestaPage` |

### CU-11 Reto diario (RF-14)

| Paso / flujo | Estado | Back | Front |
|---|---|---|---|
| 1–2 Racha, multiplicador y reglas | Cumple | `GET /reto-diario/hoy` | `RetoDiarioPage` |
| 3 Iniciar (10 preguntas de los temas desbloqueados) | Cumple | `POST /reto-diario` | `RetoDiarioPage` |
| 4–6 Pregunta con temporizador; el sistema indica si la respuesta es correcta y pasa a la siguiente (sin revelar la opción correcta) | Cumple | `…/preguntas/:n/entregar`, `…/respuesta` (devuelve `correcta`, `siguiente` y `aciertos`) | `PreguntaCronometrada` (color en los últimos 5 s) |
| 7 Completar las 10 | Cumple | termina solo tras la décima | `RetoDiarioPage` |
| 8–9 Puntaje, recompensas (RN-29), racha (RN-13) y resumen | Cumple | misma transacción | `RetoDiarioPage` |
| FA1 Tiempo agotado = incorrecta | Cumple | `opcionId: null`; vencida por reloj del servidor | `PreguntaCronometrada` |
| FA2 Abandonar | Cumple | `POST /reto-diario/:id/abandonar` | `RetoDiarioPage` |
| FE1 Ya realizado hoy: resultado y tiempo al siguiente | Cumple | 409 con resultado + `GET /reto-diario/hoy` | `RetoDiarioPage` |
| RNF-SE-05 respuesta tras 20 s + 1 s = incorrecta | Cumple | reloj en el servidor | — |

### CU-12 Tienda (RF-15)

| Paso / flujo | Estado | Back | Front |
|---|---|---|---|
| 1–2 Catálogo con precio, efecto, rareza y saldo | Cumple | `GET /tienda` | `TiendaPage` |
| 3–4 Detalle y retos donde se usa | Cumple | `GET /tienda/objetos/:id` | `TiendaPage` |
| 5–6 Cantidad, verificación y compra atómica (RN-11, RN-28) | Cumple | `POST /tienda/compras` | `TiendaPage` |
| 7–9 Ofrecer y equipar (RN-10) | Cumple | `POST /inventario/:id/equipar` | `TiendaPage` |
| FA1 Comprar sin equipar | Cumple | (queda en inventario) | `TiendaPage` («Ahora no») |
| FA2 Cinto lleno: elegir cuál reemplazar | Cumple | 409 con equipados + `reemplazaObjetoId` | `TiendaPage`, `PerfilPage` |
| FE1 Saldo insuficiente: QP faltantes | Cumple | 400 `qpFaltantes` | `TiendaPage` |
| FE2 Máximo de unidades | Cumple | 400 `limite` | `TiendaPage` |
| Saldo visible en todo momento | Cumple | — | `TiendaPage` y encabezado |

### CU-13 Duelos (RF-16)

| Paso / flujo | Estado | Back | Front |
|---|---|---|---|
| 1–2 Sección de duelos y rivales con temas en común | Cumple | `GET /duelos/rivales` | `DuelosPage` |
| 3–4 Elegir rival y tema, crear y notificar | Cumple con desviación (el rival se identifica por nombre de aventurero, no por `rivalId`) | `POST /duelos`, `GET /duelos/avisos` | `DuelosPage`, aviso en `Pagina` |
| 5–6 Ronda de 5 preguntas con tiempo; resultado oculto al rival | Cumple | `…/preguntas/:n/entregar`, `…/respuesta` | `DueloPage` |
| 7 Aceptar | Cumple | `POST /duelos/:id/aceptar` | `DuelosPage` |
| 8–10 Misma ronda, ganador, XP (sin QP) y resultado a ambos | Cumple | cierre transaccional del duelo | `DueloPage` |
| FA1 Rechazo | Cumple | `POST /duelos/:id/rechazar` | `DuelosPage` |
| FA2 Empate exacto: 30 XP a cada uno | Cumple | `decidirGanador` | `DueloPage` |
| FE1 Expiración a las 48 h | Cumple | se aplica al consultar | `DuelosPage` (historial) |
| FE2 Máximo de 3 duelos pendientes | Cumple | 409 con el límite | `DuelosPage` |
| Aviso del duelo pendiente al iniciar sesión | Cumple | `GET /duelos/avisos` | `Pagina`, `Header` |

### RF-19 Perfil y RF-20 Clasificación

| Requisito | Estado | Back | Front |
|---|---|---|---|
| Nivel, XP, QP y racha real con multiplicador | Cumple | `GET /perfil` | `PerfilPage` |
| Inventario con equipar y desequipar | Cumple | `/inventario/:id/equipar`, `/desequipar` | `PerfilPage` |
| Estrellas por fase | Cumple | `GET /perfil` | `PerfilPage` |
| Editar avatar (URL) y nombre de aventurero (único) | Cumple | `PATCH /perfil` | `PerfilPage` |
| Plan de estudio activo con su avance | Cumple | `GET /perfil` | `PerfilPage` |
| Clasificación por XP, estrellas y `xpAlcanzadaEn` (RN-30), solo nombre, nivel, XP y estrellas, con la fila propia resaltada | Cumple | `GET /clasificacion` | `ClasificacionPage` |

### CU-02 (verificación)

| Punto | Estado | Evidencia |
|---|---|---|
| Flujo normal, FE1, FE2, FA4 y ayuda | Cumple | `cu02-historias.e2e-spec.ts`, `05-casos-cu02.spec.ts` |
| RN-31 (referencia tras aprobar o 3 intentos) | Cumple tras la corrección | `sprint3-comunes.e2e-spec.ts` |

---

## 4. `schema.prisma` final

```prisma
// Esquema de base de datos PickQuest - Sprint 2 (SCS v2.3 / SRS v2.1)
//
// Sprint 2: el contenido de los retos y las respuestas de los estudiantes ya
// NO se guardan en JSON. Cada mecánica tiene sus propias tablas:
//   CU-01 diálogo, CU-02 historias, CU-03 tablero MoSCoW, CU-04 inspección,
//   CU-06 reparto de presupuesto, CU-08 línea de tiempo.
// Las tablas de contenido se borran en cascada con su Reto; las de respuesta,
// con su IntentoReto; las referencias de una respuesta hacia el contenido
// usan Restrict.

generator client {
  provider      = "prisma-client-js"
  binaryTargets = ["native", "linux-musl-openssl-3.0.x", "rhel-openssl-3.0.x"]
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

enum TemaFase {
  CICLO_VIDA
  ELICITACION
  ATRIBUTOS_CALIDAD
}

enum CategoriaHabilidadSDLC {
  CICLO_VIDA
  ELICITACION
  ATRIBUTOS_CALIDAD
}

// Las 8 mecánicas del SRS; en este sprint se implementan 6.
enum Mecanica {
  DIALOGO_STAKEHOLDER // CU-01
  ARMADO_PIEZAS // CU-02 (Sprint 2)
  TABLERO_MOSCOW // CU-03
  INSPECCION_SISTEMA // CU-04
  SIMULADOR_ESCENARIOS // CU-05 (Sprint 3)
  REPARTO_PRESUPUESTO // CU-06
  EXPEDIENTE_PROYECTO // CU-07 (Sprint 3)
  LINEA_TIEMPO // CU-08
}

enum EstadoIntento {
  EN_CURSO
  CALIFICADO
}

enum TecnicaElicitacion {
  ENTREVISTA
  CUESTIONARIO
  OBSERVACION
  TALLER
}

enum ColumnaMoscow {
  MUST
  SHOULD
  COULD
  WONT
}

enum TipoRequerimiento {
  FUNCIONAL
  NO_FUNCIONAL
}

enum AtributoCalidad {
  ADECUACION_FUNCIONAL
  EFICIENCIA_DESEMPENO
  COMPATIBILIDAD
  USABILIDAD
  FIABILIDAD
  SEGURIDAD
  MANTENIBILIDAD
  PORTABILIDAD
}

enum TipoElementoPantalla {
  TITULO
  TEXTO
  CAMPO
  BOTON
  IMAGEN
  MENSAJE
  LISTA
}

enum TipoBloque {
  FASE
  ACTIVIDAD
}

enum ModeloCicloVida {
  CASCADA
  MODELO_V
  INCREMENTAL
  ESPIRAL
  PROTOTIPOS
  AGIL
}

enum TipoObjeto {
  POCION
  PERGAMINO
  RELIQUIA
}

// =====================================================================
// Estudiante, progreso y economía
// =====================================================================

model Estudiante {
  id               Int      @id @default(autoincrement())
  email            String   @unique
  passwordHash     String
  nombreAventurero String   @unique
  avatar           String
  nivel            Int      @default(1)
  xpTotal          Int      @default(0)
  qpTotal          Int      @default(0)
  // Momento en que alcanzó su XP actual: desempate de la clasificación (RN-30).
  xpAlcanzadaEn    DateTime @default(now())

  racha             RachaEstudio?
  intentos          IntentoReto[]
  inventario        InventarioObjeto[]
  compras           CompraObjeto[]
  progresoTarjetas  ProgresoTarjeta[]
  consultasTema     ConsultaTema[]
  sesionesRepaso    SesionRepaso[]
  dominios          DominioTema[]
  diagnosticos      Diagnostico[]
  planes            PlanEstudio[]
  retosDiarios      RetoDiario[]
  duelosComoRetador Duelo[]            @relation("DueloRetador")
  duelosComoRetado  Duelo[]            @relation("DueloRetado")
  duelosGanados     Duelo[]            @relation("DueloGanador")
  respuestasDuelo   RespuestaDuelo[]
  resultadosDuelo   ResultadoDuelo[]
  logros            LogroEstudiante[]
  habilidades       HabilidadSDLC[]

  @@map("estudiante")
}

model RachaEstudio {
  estudianteId    Int       @id
  diasActuales    Int       @default(0)
  diasRecord      Int       @default(0)
  // Decimal, no Float: evita errores de redondeo binario en un multiplicador
  // que afecta directamente el QP otorgado (RN-13).
  multiplicadorQP Decimal   @default(1.00) @db.Decimal(4, 2)
  ultimaActividad DateTime? @db.Date

  estudiante Estudiante @relation(fields: [estudianteId], references: [id], onDelete: Cascade)

  @@map("racha_estudio")
}

model Objeto {
  id      Int        @id @default(autoincrement())
  nombre  String     @unique
  tipo    TipoObjeto
  costoQP Int
  efecto  String
  rareza  String
  // null: sirve en cualquier reto; con valor: solo en los retos de esa fase (RN-10, CU-12).
  tema    TemaFase?

  inventarios  InventarioObjeto[]
  ayudasUsadas UsoAyuda[]
  compras      CompraObjeto[]

  @@map("objeto")
}

model InventarioObjeto {
  estudianteId Int
  objetoId     Int
  cantidad     Int     @default(1)
  equipado     Boolean @default(false)

  estudiante Estudiante @relation(fields: [estudianteId], references: [id], onDelete: Cascade)
  objeto     Objeto     @relation(fields: [objetoId], references: [id], onDelete: Restrict)

  @@id([estudianteId, objetoId])
  @@map("inventario_objeto")
}

model Logro {
  id                  Int    @id @default(autoincrement())
  nombre              String @unique
  condicionDesbloqueo String

  estudiantes LogroEstudiante[]

  @@map("logro")
}

model LogroEstudiante {
  estudianteId  Int
  logroId       Int
  fechaObtenido DateTime @default(now()) @db.Date

  estudiante Estudiante @relation(fields: [estudianteId], references: [id], onDelete: Cascade)
  logro      Logro      @relation(fields: [logroId], references: [id], onDelete: Cascade)

  @@id([estudianteId, logroId])
  @@map("logro_estudiante")
}

model HabilidadSDLC {
  id             Int                    @id @default(autoincrement())
  estudianteId   Int
  categoria      CategoriaHabilidadSDLC
  nivelAlcanzado Int                    @default(1)

  estudiante Estudiante @relation(fields: [estudianteId], references: [id], onDelete: Cascade)

  @@unique([estudianteId, categoria])
  @@map("habilidad_sdlc")
}

// =====================================================================
// Fases, retos e intentos
// =====================================================================

model Fase {
  id          Int      @id @default(autoincrement())
  nombre      String
  tema        TemaFase
  dificultad  String
  orden       Int      @unique
  descripcion String   @db.Text

  retos          Reto[]
  contenidoApoyo ContenidoApoyo?

  // CU-09: material de estudio y tarjetas del tema de la fase.
  material  MaterialTema?
  ejemplos  EjemploTema[]
  glosario  TerminoGlosario[]
  tarjetas  Tarjeta[]
  consultas ConsultaTema[]
  sesiones  SesionRepaso[]

  @@map("fase")
}

model ContenidoApoyo {
  id               Int    @id @default(autoincrement())
  faseId           Int    @unique
  contenidoTeorico String @db.Text
  ejemplos         String @db.Text
  glosario         String @db.Text

  fase Fase @relation(fields: [faseId], references: [id], onDelete: Cascade)

  @@map("contenido_apoyo")
}

model Reto {
  id           Int      @id @default(autoincrement())
  faseId       Int
  orden        Int
  mecanica     Mecanica
  titulo       String
  objetivo     String   @db.Text // se muestra en el tablón (RF-18)
  contexto     String   @db.Text // planteamiento narrativo del reto
  recompensaXp Int
  recompensaQp Int

  fase            Fase            @relation(fields: [faseId], references: [id], onDelete: Cascade)
  intentos        IntentoReto[]
  actividadesPlan ActividadPlan[]

  // CU-01
  stakeholder             Stakeholder?
  requerimientosOcultos   RequerimientoOculto[]
  nodosDialogo            NodoDialogo[]
  // CU-02
  historias               HistoriaUsuario[]
  piezas                  PiezaHistoria[]
  // CU-03
  tablero                 TableroPriorizacion?
  tarjetas                TarjetaRequerimiento[]
  // CU-04
  sistema                 SistemaInspeccion?
  pantallas               PantallaSimulada[]
  // CU-06
  escenario               EscenarioPresupuesto?
  atributosEscenario      AtributoEscenario[]
  opcionesJustificacion   OpcionJustificacion[]
  // CU-08
  plan                    PlanProyecto?
  bloques                 BloquePlan[]
  entregables             EntregablePlan[]
  // CU-05
  escenarioCalidad        EscenarioCalidad?
  unidadesEscenario       UnidadEscenario[]
  opcionesParteEscenario  OpcionParteEscenario[]
  // CU-07
  expediente              Expediente?
  documentosExpediente    DocumentoExpediente[]
  caracteristicasProyecto CaracteristicaProyecto[]

  @@unique([faseId, orden])
  @@map("reto")
}

model IntentoReto {
  id                    Int           @id @default(autoincrement())
  estudianteId          Int
  retoId                Int
  estado                EstadoIntento @default(EN_CURSO)
  porcentaje            Int? // null mientras está EN_CURSO
  calificacionEstrellas Int? // 0-3
  aprobado              Boolean       @default(false)
  usoAyuda              Boolean       @default(false)
  xpGanado              Int           @default(0)
  qpGanado              Int           @default(0)
  creadoEn              DateTime      @default(now())
  actualizadoEn         DateTime      @updatedAt
  calificadoEn          DateTime?

  estudiante Estudiante @relation(fields: [estudianteId], references: [id], onDelete: Cascade)
  // Restrict: no se puede borrar un Reto que ya tiene intentos.
  reto       Reto       @relation(fields: [retoId], references: [id], onDelete: Restrict)

  colocacionesHistoria     RespuestaCasilla[]
  ayuda                    UsoAyuda?
  respuestaDialogo         RespuestaDialogo?
  turnosDialogo            TurnoDialogo[]
  respuestasTarjeta        RespuestaTarjeta[]
  marcasInspeccion         MarcaInspeccion[]
  asignacionesPuntos       AsignacionPuntos[]
  respuestaPresupuesto     RespuestaPresupuesto?
  posicionesBloque         PosicionBloque[]
  asociacionesEntregable   AsociacionEntregable[]
  respuestaEscenario       RespuestaEscenario?
  eleccionesParteEscenario EleccionParteEscenario[]
  simulacionesEscenario    SimulacionEscenario[]
  evidenciasSeleccionadas  EvidenciaSeleccionada[]
  eleccionModelo           EleccionModelo?

  @@index([estudianteId, retoId, estado])
  @@map("intento_reto")
}

// Tipo de pista que devolvió una ayuda (cada tipo apunta a un elemento de contenido).
enum TipoPista {
  DISTRACTORES_RETIRADOS
  OPCION_DIALOGO // opcionId
  COLUMNA_TARJETA // tarjetaId (la columna se obtiene de la tarjeta)
  PANTALLA // pantallaId
  RESTRICCION // atributoEscenarioId (el mínimo se obtiene del atributo)
  DEPENDENCIA // bloqueId y requiereId
  RANGO_ESCENARIO // CU-05: el rango aceptable se lee del escenario del reto
  DOCUMENTO // CU-07: documentoId (documento del expediente que se resalta)
}

// Una ayuda pertenece a un intento concreto (RN-10: máximo 1 por intento).
// La pista se guarda de forma relacional (tipo + referencia al elemento de
// contenido al que apunta) para poder volver a dibujarla al retomar el intento.
model UsoAyuda {
  id        Int        @id @default(autoincrement())
  intentoId Int        @unique
  objetoId  Int
  creadoEn  DateTime   @default(now())
  // null solo en ayudas registradas antes de que se guardara la pista
  tipoPista TipoPista?

  opcionId            Int?
  tarjetaId           Int?
  pantallaId          Int?
  atributoEscenarioId Int?
  bloqueId            Int?
  requiereId          Int?
  documentoId         Int?

  intento           IntentoReto           @relation(fields: [intentoId], references: [id], onDelete: Cascade)
  objeto            Objeto                @relation(fields: [objetoId], references: [id], onDelete: Restrict)
  opcion            OpcionDialogo?        @relation(fields: [opcionId], references: [id], onDelete: Restrict)
  tarjeta           TarjetaRequerimiento? @relation(fields: [tarjetaId], references: [id], onDelete: Restrict)
  pantalla          PantallaSimulada?     @relation(fields: [pantallaId], references: [id], onDelete: Restrict)
  atributoEscenario AtributoEscenario?    @relation(fields: [atributoEscenarioId], references: [id], onDelete: Restrict)
  bloque            BloquePlan?           @relation("PistaBloque", fields: [bloqueId], references: [id], onDelete: Restrict)
  requiere          BloquePlan?           @relation("PistaRequiere", fields: [requiereId], references: [id], onDelete: Restrict)
  documento         DocumentoExpediente?  @relation(fields: [documentoId], references: [id], onDelete: Restrict)

  distractoresRetirados DistractorRetirado[]

  @@map("uso_ayuda")
}

// =====================================================================
// CU-01 Diálogo con stakeholder
// =====================================================================

model Stakeholder {
  retoId          Int                @id
  nombre          String
  rol             String
  retrato         String // clave de imagen/ícono del frontend
  tecnicaCorrecta TecnicaElicitacion
  turnosMaximos   Int

  reto Reto @relation(fields: [retoId], references: [id], onDelete: Cascade)

  @@map("stakeholder")
}

model RequerimientoOculto {
  id          Int    @id @default(autoincrement())
  retoId      Int
  codigo      String
  descripcion String

  reto                 Reto            @relation(fields: [retoId], references: [id], onDelete: Cascade)
  opcionesQueLoRevelan OpcionDialogo[]

  @@unique([retoId, codigo])
  @@map("requerimiento_oculto")
}

model NodoDialogo {
  id           Int     @id @default(autoincrement())
  retoId       Int
  intervencion String  @db.Text // lo que dice el stakeholder al llegar a este nodo
  esInicial    Boolean @default(false) // exactamente uno por reto

  reto              Reto            @relation(fields: [retoId], references: [id], onDelete: Cascade)
  opciones          OpcionDialogo[] @relation("OpcionesDelNodo")
  opcionesQueLlegan OpcionDialogo[] @relation("NodoSiguiente")

  @@map("nodo_dialogo")
}

model OpcionDialogo {
  id                   Int     @id @default(autoincrement())
  nodoId               Int
  orden                Int
  pregunta             String // lo que pregunta el estudiante
  respuestaStakeholder String  @db.Text
  productiva           Boolean // false = pregunta improductiva (resta en RN-16)
  requerimientoId      Int? // requerimiento que revela, si revela uno
  siguienteNodoId      Int? // null = se regresa al nodo inicial

  nodo          NodoDialogo          @relation("OpcionesDelNodo", fields: [nodoId], references: [id], onDelete: Cascade)
  requerimiento RequerimientoOculto? @relation(fields: [requerimientoId], references: [id], onDelete: SetNull)
  siguienteNodo NodoDialogo?         @relation("NodoSiguiente", fields: [siguienteNodoId], references: [id], onDelete: SetNull)
  turnos        TurnoDialogo[]
  ayudas        UsoAyuda[]

  @@map("opcion_dialogo")
}

model RespuestaDialogo {
  intentoId      Int                 @id
  tecnicaElegida TecnicaElicitacion?

  intento IntentoReto @relation(fields: [intentoId], references: [id], onDelete: Cascade)

  @@map("respuesta_dialogo")
}

model TurnoDialogo {
  intentoId Int
  numero    Int
  opcionId  Int

  intento IntentoReto   @relation(fields: [intentoId], references: [id], onDelete: Cascade)
  opcion  OpcionDialogo @relation(fields: [opcionId], references: [id], onDelete: Restrict)

  @@id([intentoId, numero])
  // Una opción no se puede elegir dos veces en el mismo intento.
  @@unique([intentoId, opcionId])
  @@map("turno_dialogo")
}

// =====================================================================
// CU-03 Tablero MoSCoW
// =====================================================================

model TableroPriorizacion {
  retoId    Int @id
  capacidad Int // suma máxima de puntos permitida en MUST

  reto Reto @relation(fields: [retoId], references: [id], onDelete: Cascade)

  @@map("tablero_priorizacion")
}

model TarjetaRequerimiento {
  id                  Int               @id @default(autoincrement())
  retoId              Int
  orden               Int // orden de presentación
  texto               String
  puntos              Int
  columnaCorrecta     ColumnaMoscow
  tipoCorrecto        TipoRequerimiento
  ordenMustReferencia Int? // solo para tarjetas cuya columna correcta es MUST

  reto       Reto               @relation(fields: [retoId], references: [id], onDelete: Cascade)
  respuestas RespuestaTarjeta[]
  ayudas     UsoAyuda[]

  @@map("tarjeta_requerimiento")
}

model RespuestaTarjeta {
  intentoId Int
  tarjetaId Int
  columna   ColumnaMoscow?
  tipo      TipoRequerimiento?
  ordenMust Int?

  intento IntentoReto          @relation(fields: [intentoId], references: [id], onDelete: Cascade)
  tarjeta TarjetaRequerimiento @relation(fields: [tarjetaId], references: [id], onDelete: Restrict)

  @@id([intentoId, tarjetaId])
  @@map("respuesta_tarjeta")
}

// =====================================================================
// CU-04 Inspección de un sistema
// =====================================================================

model SistemaInspeccion {
  retoId           Int    @id
  nombreAplicacion String
  maxMarcas        Int

  reto Reto @relation(fields: [retoId], references: [id], onDelete: Cascade)

  @@map("sistema_inspeccion")
}

model PantallaSimulada {
  id     Int    @id @default(autoincrement())
  retoId Int
  orden  Int
  titulo String

  reto      Reto               @relation(fields: [retoId], references: [id], onDelete: Cascade)
  elementos ElementoPantalla[]
  ayudas    UsoAyuda[]

  @@map("pantalla_simulada")
}

model ElementoPantalla {
  id         Int                  @id @default(autoincrement())
  pantallaId Int
  orden      Int
  tipo       TipoElementoPantalla
  etiqueta   String
  contenido  String?              @db.Text
  variante   String? // pista visual para el render: "texto-plano", "contraste-bajo", "sin-feedback", etc.

  pantalla PantallaSimulada  @relation(fields: [pantallaId], references: [id], onDelete: Cascade)
  falla    FallaCalidad?
  marcas   MarcaInspeccion[]

  @@map("elemento_pantalla")
}

model FallaCalidad {
  id          Int             @id @default(autoincrement())
  elementoId  Int             @unique
  atributo    AtributoCalidad
  explicacion String          @db.Text

  elemento ElementoPantalla @relation(fields: [elementoId], references: [id], onDelete: Cascade)

  @@map("falla_calidad")
}

model MarcaInspeccion {
  intentoId  Int
  elementoId Int
  atributo   AtributoCalidad?

  intento  IntentoReto      @relation(fields: [intentoId], references: [id], onDelete: Cascade)
  elemento ElementoPantalla @relation(fields: [elementoId], references: [id], onDelete: Restrict)

  @@id([intentoId, elementoId])
  @@map("marca_inspeccion")
}

// =====================================================================
// CU-06 Reparto de presupuesto
// =====================================================================

model EscenarioPresupuesto {
  retoId      Int @id
  presupuesto Int

  reto Reto @relation(fields: [retoId], references: [id], onDelete: Cascade)

  @@map("escenario_presupuesto")
}

model AtributoEscenario {
  id                   Int             @id @default(autoincrement())
  retoId               Int
  atributo             AtributoCalidad
  valorBase            Int // 0-100
  ganancia             Decimal         @db.Decimal(4, 2) // puntos de medidor por punto asignado
  minimoObligatorio    Int? // restricción obligatoria del cliente: valor mínimo del medidor
  asignacionReferencia Int

  reto               Reto               @relation(fields: [retoId], references: [id], onDelete: Cascade)
  efectosComoOrigen  EfectoCruzado[]    @relation("EfectoOrigen")
  efectosComoDestino EfectoCruzado[]    @relation("EfectoDestino")
  asignaciones       AsignacionPuntos[]
  ayudas             UsoAyuda[]

  @@unique([retoId, atributo])
  @@map("atributo_escenario")
}

model EfectoCruzado {
  origenId  Int // AtributoEscenario que recibe puntos
  destinoId Int // AtributoEscenario afectado
  factor    Decimal @db.Decimal(4, 2) // negativo = conflicto

  origen  AtributoEscenario @relation("EfectoOrigen", fields: [origenId], references: [id], onDelete: Cascade)
  destino AtributoEscenario @relation("EfectoDestino", fields: [destinoId], references: [id], onDelete: Cascade)

  @@id([origenId, destinoId])
  @@map("efecto_cruzado")
}

model OpcionJustificacion {
  id       Int     @id @default(autoincrement())
  retoId   Int
  orden    Int
  texto    String  @db.Text
  correcta Boolean

  reto       Reto                   @relation(fields: [retoId], references: [id], onDelete: Cascade)
  respuestas RespuestaPresupuesto[]

  @@map("opcion_justificacion")
}

model AsignacionPuntos {
  intentoId           Int
  atributoEscenarioId Int
  puntos              Int

  intento           IntentoReto       @relation(fields: [intentoId], references: [id], onDelete: Cascade)
  atributoEscenario AtributoEscenario @relation(fields: [atributoEscenarioId], references: [id], onDelete: Restrict)

  @@id([intentoId, atributoEscenarioId])
  @@map("asignacion_puntos")
}

model RespuestaPresupuesto {
  intentoId       Int  @id
  justificacionId Int?

  intento       IntentoReto          @relation(fields: [intentoId], references: [id], onDelete: Cascade)
  justificacion OpcionJustificacion? @relation(fields: [justificacionId], references: [id], onDelete: Restrict)

  @@map("respuesta_presupuesto")
}

// =====================================================================
// CU-08 Línea de tiempo
// =====================================================================

model PlanProyecto {
  retoId                Int             @id
  modelo                ModeloCicloVida
  duracionMaximaSemanas Int // fecha límite

  reto Reto @relation(fields: [retoId], references: [id], onDelete: Cascade)

  @@map("plan_proyecto")
}

model BloquePlan {
  id               Int        @id @default(autoincrement())
  retoId           Int
  tipo             TipoBloque
  nombre           String
  duracionSemanas  Int
  inicioReferencia Int // semana de inicio (desde 0) en el plan de referencia

  reto                  Reto                   @relation(fields: [retoId], references: [id], onDelete: Cascade)
  dependencias          DependenciaBloque[]    @relation("BloqueDependiente")
  requeridoPor          DependenciaBloque[]    @relation("BloqueRequerido")
  entregablesQueProduce EntregablePlan[]
  posiciones            PosicionBloque[]
  asociaciones          AsociacionEntregable[]
  pistasComoBloque      UsoAyuda[]             @relation("PistaBloque")
  pistasComoRequerido   UsoAyuda[]             @relation("PistaRequiere")

  @@map("bloque_plan")
}

model DependenciaBloque {
  bloqueId   Int // este bloque...
  requiereId Int // ...no puede empezar antes de que termine este

  bloque   BloquePlan @relation("BloqueDependiente", fields: [bloqueId], references: [id], onDelete: Cascade)
  requiere BloquePlan @relation("BloqueRequerido", fields: [requiereId], references: [id], onDelete: Cascade)

  @@id([bloqueId, requiereId])
  @@map("dependencia_bloque")
}

model EntregablePlan {
  id             Int    @id @default(autoincrement())
  retoId         Int
  nombre         String
  faseCorrectaId Int // BloquePlan de tipo FASE que lo produce

  reto         Reto                   @relation(fields: [retoId], references: [id], onDelete: Cascade)
  faseCorrecta BloquePlan             @relation(fields: [faseCorrectaId], references: [id], onDelete: Cascade)
  asociaciones AsociacionEntregable[]

  @@map("entregable_plan")
}

model PosicionBloque {
  intentoId    Int
  bloqueId     Int
  inicioSemana Int

  intento IntentoReto @relation(fields: [intentoId], references: [id], onDelete: Cascade)
  bloque  BloquePlan  @relation(fields: [bloqueId], references: [id], onDelete: Restrict)

  @@id([intentoId, bloqueId])
  @@map("posicion_bloque")
}

model AsociacionEntregable {
  intentoId    Int
  entregableId Int
  faseBloqueId Int

  intento    IntentoReto    @relation(fields: [intentoId], references: [id], onDelete: Cascade)
  entregable EntregablePlan @relation(fields: [entregableId], references: [id], onDelete: Restrict)
  faseBloque BloquePlan     @relation(fields: [faseBloqueId], references: [id], onDelete: Restrict)

  @@id([intentoId, entregableId])
  @@map("asociacion_entregable")
}

// CU-02: el banco y la referencia privada están separados de las respuestas.
enum TipoPiezaHistoria {
  ROL
  FUNCIONALIDAD
  BENEFICIO
  DADO
  CUANDO
  ENTONCES
}

model HistoriaUsuario {
  id        Int               @id @default(autoincrement())
  retoId    Int
  orden     Int
  necesidad String            @db.Text
  reto      Reto              @relation(fields: [retoId], references: [id], onDelete: Cascade)
  casillas  CasillaHistoria[]

  @@unique([retoId, orden])
  @@map("historia_usuario")
}

model PiezaHistoria {
  id          Int                  @id @default(autoincrement())
  retoId      Int
  tipo        TipoPiezaHistoria
  texto       String
  orden       Int
  reto        Reto                 @relation(fields: [retoId], references: [id], onDelete: Cascade)
  referencias CasillaHistoria[]
  respuestas  RespuestaCasilla[]
  retiradas   DistractorRetirado[]

  @@unique([retoId, orden])
  @@map("pieza_historia")
}

model CasillaHistoria {
  id              Int                @id @default(autoincrement())
  historiaId      Int
  tipo            TipoPiezaHistoria
  piezaCorrectaId Int
  historia        HistoriaUsuario    @relation(fields: [historiaId], references: [id], onDelete: Cascade)
  piezaCorrecta   PiezaHistoria      @relation(fields: [piezaCorrectaId], references: [id], onDelete: Restrict)
  respuestas      RespuestaCasilla[]

  @@unique([historiaId, tipo])
  @@map("casilla_historia")
}

model RespuestaCasilla {
  intentoId Int
  casillaId Int
  piezaId   Int
  intento   IntentoReto     @relation(fields: [intentoId], references: [id], onDelete: Cascade)
  casilla   CasillaHistoria @relation(fields: [casillaId], references: [id], onDelete: Restrict)
  pieza     PiezaHistoria   @relation(fields: [piezaId], references: [id], onDelete: Restrict)

  @@id([intentoId, casillaId])
  @@unique([intentoId, piezaId])
  @@map("respuesta_casilla")
}

model DistractorRetirado {
  usoAyudaId Int
  piezaId    Int
  usoAyuda   UsoAyuda      @relation(fields: [usoAyudaId], references: [id], onDelete: Cascade)
  pieza      PiezaHistoria @relation(fields: [piezaId], references: [id], onDelete: Restrict)

  @@id([usoAyudaId, piezaId])
  @@map("distractor_retirado")
}

// =====================================================================
// CU-05 Simulador de escenarios de calidad (RF-08, RN-20)
// =====================================================================

enum ParteEscenario {
  FUENTE
  ESTIMULO
  ARTEFACTO
  ENTORNO
  RESPUESTA
}

// 1:1 con Reto. El rango aceptable (RN-20) y el modelo de la simulación nunca
// viajan al navegador antes de lo que permiten RN-31 y la ayuda.
model EscenarioCalidad {
  retoId            Int     @id
  necesidadVaga     String  @db.Text
  contextoApp       String  @db.Text
  nombreMetrica     String
  nombreCarga       String // p. ej. "usuarios concurrentes"
  unidadCorrectaId  Int?    @unique // se asigna después de crear las unidades
  valorMinSlider    Decimal @db.Decimal(10, 2)
  valorMaxSlider    Decimal @db.Decimal(10, 2)
  pasoSlider        Decimal @db.Decimal(10, 2)
  cargaMinSlider    Int
  cargaMaxSlider    Int
  pasoCarga         Int
  valorMinAceptable Decimal @db.Decimal(10, 2)
  valorMaxAceptable Decimal @db.Decimal(10, 2)
  cargaMinAceptable Int
  cargaMaxAceptable Int
  // Modelo de la aplicación ficticia: valorApp(carga) = simBase + simPendiente × carga
  simBase           Decimal @db.Decimal(10, 4)
  simPendiente      Decimal @db.Decimal(10, 6)

  reto           Reto             @relation(fields: [retoId], references: [id], onDelete: Cascade)
  unidadCorrecta UnidadEscenario? @relation("UnidadCorrecta", fields: [unidadCorrectaId], references: [id], onDelete: Restrict)

  @@map("escenario_calidad")
}

model UnidadEscenario {
  id     Int    @id @default(autoincrement())
  retoId Int
  nombre String

  reto                  Reto                 @relation(fields: [retoId], references: [id], onDelete: Cascade)
  escenarioComoCorrecta EscenarioCalidad?    @relation("UnidadCorrecta")
  respuestas            RespuestaEscenario[]

  @@map("unidad_escenario")
}

model OpcionParteEscenario {
  id       Int            @id @default(autoincrement())
  retoId   Int
  parte    ParteEscenario
  orden    Int
  texto    String
  correcta Boolean // exactamente una correcta por parte

  reto       Reto                     @relation(fields: [retoId], references: [id], onDelete: Cascade)
  elecciones EleccionParteEscenario[]

  @@unique([retoId, parte, orden])
  @@map("opcion_parte_escenario")
}

// 1:1 con IntentoReto: la medida de respuesta que va calibrando el estudiante.
model RespuestaEscenario {
  intentoId Int      @id
  valor     Decimal? @db.Decimal(10, 2)
  unidadId  Int?
  carga     Int?

  intento IntentoReto      @relation(fields: [intentoId], references: [id], onDelete: Cascade)
  unidad  UnidadEscenario? @relation(fields: [unidadId], references: [id], onDelete: Restrict)

  @@map("respuesta_escenario")
}

model EleccionParteEscenario {
  intentoId Int
  parte     ParteEscenario
  opcionId  Int

  intento IntentoReto          @relation(fields: [intentoId], references: [id], onDelete: Cascade)
  opcion  OpcionParteEscenario @relation(fields: [opcionId], references: [id], onDelete: Restrict)

  @@id([intentoId, parte])
  @@map("eleccion_parte_escenario")
}

model SimulacionEscenario {
  id        Int      @id @default(autoincrement())
  intentoId Int
  numero    Int
  valor     Decimal  @db.Decimal(10, 2)
  carga     Int
  valorApp  Decimal  @db.Decimal(10, 2)
  cumple    Boolean
  creadoEn  DateTime @default(now())

  intento IntentoReto @relation(fields: [intentoId], references: [id], onDelete: Cascade)

  @@unique([intentoId, numero])
  @@map("simulacion_escenario")
}

// =====================================================================
// CU-07 Expediente del proyecto (RF-10, RN-22)
// =====================================================================

enum TipoDocumentoExpediente {
  MINUTA
  CORREO
  FICHA_TECNICA
  PRESUPUESTO
}

// 1:1 con Reto. El modelo correcto y su explicación son la referencia (RN-31).
model Expediente {
  retoId         Int             @id
  nombreProyecto String
  modeloCorrecto ModeloCicloVida
  explicacion    String          @db.Text

  reto Reto @relation(fields: [retoId], references: [id], onDelete: Cascade)

  @@map("expediente")
}

model DocumentoExpediente {
  id     Int                     @id @default(autoincrement())
  retoId Int
  orden  Int
  tipo   TipoDocumentoExpediente
  titulo String

  reto       Reto                 @relation(fields: [retoId], references: [id], onDelete: Cascade)
  fragmentos FragmentoDocumento[]
  ayudas     UsoAyuda[]

  @@unique([retoId, orden])
  @@map("documento_expediente")
}

// p. ej. "Requisitos cambiantes", "Riesgo técnico bajo", "Plazo fijo"
model CaracteristicaProyecto {
  id     Int    @id @default(autoincrement())
  retoId Int
  nombre String

  reto                Reto                    @relation(fields: [retoId], references: [id], onDelete: Cascade)
  fragmentosCorrectos FragmentoDocumento[]
  evidencias          EvidenciaSeleccionada[]

  @@map("caracteristica_proyecto")
}

model FragmentoDocumento {
  id                       Int     @id @default(autoincrement())
  documentoId              Int
  orden                    Int
  texto                    String  @db.Text
  caracteristicaCorrectaId Int? // null = fragmento irrelevante
  respaldaModelo           Boolean @default(false) // relevante para justificar el modelo correcto

  documento              DocumentoExpediente     @relation(fields: [documentoId], references: [id], onDelete: Cascade)
  caracteristicaCorrecta CaracteristicaProyecto? @relation(fields: [caracteristicaCorrectaId], references: [id], onDelete: Restrict)
  evidencias             EvidenciaSeleccionada[]

  @@unique([documentoId, orden])
  @@map("fragmento_documento")
}

model EvidenciaSeleccionada {
  intentoId        Int
  fragmentoId      Int
  caracteristicaId Int?

  intento        IntentoReto             @relation(fields: [intentoId], references: [id], onDelete: Cascade)
  fragmento      FragmentoDocumento      @relation(fields: [fragmentoId], references: [id], onDelete: Restrict)
  caracteristica CaracteristicaProyecto? @relation(fields: [caracteristicaId], references: [id], onDelete: Restrict)
  // Respaldo del modelo: la evidencia vinculada debe estar seleccionada (clave compuesta).
  vinculo        VinculoEvidencia?

  @@id([intentoId, fragmentoId])
  @@map("evidencia_seleccionada")
}

model EleccionModelo {
  intentoId Int             @id
  modelo    ModeloCicloVida

  intento IntentoReto @relation(fields: [intentoId], references: [id], onDelete: Cascade)

  @@map("eleccion_modelo")
}

model VinculoEvidencia {
  intentoId   Int
  fragmentoId Int

  evidencia EvidenciaSeleccionada @relation(fields: [intentoId, fragmentoId], references: [intentoId, fragmentoId], onDelete: Cascade)

  @@id([intentoId, fragmentoId])
  @@map("vinculo_evidencia")
}

// =====================================================================
// CU-12 Tienda (RF-15, RN-10, RN-11, RN-28)
// =====================================================================

// Cada compra descuenta los QP y suma las unidades en la misma transacción (RN-11).
model CompraObjeto {
  id           Int      @id @default(autoincrement())
  estudianteId Int
  objetoId     Int
  cantidad     Int
  qpPagados    Int
  creadoEn     DateTime @default(now())

  estudiante Estudiante @relation(fields: [estudianteId], references: [id], onDelete: Cascade)
  objeto     Objeto     @relation(fields: [objetoId], references: [id], onDelete: Restrict)

  @@index([estudianteId, creadoEn])
  @@map("compra_objeto")
}

// ===================================================================
// CU-09 Repaso con tarjetas (RF-12, RN-24, RN-25, RN-26)
// ===================================================================

enum Autoevaluacion {
  LO_SABIA
  DUDE
  NO_LO_SABIA
}

// 1:1 con Fase: cada fase trata un tema.
model MaterialTema {
  faseId      Int    @id
  explicacion String @db.Text

  fase Fase @relation(fields: [faseId], references: [id], onDelete: Cascade)

  @@map("material_tema")
}

model EjemploTema {
  id     Int    @id @default(autoincrement())
  faseId Int
  orden  Int
  titulo String
  texto  String @db.Text

  fase Fase @relation(fields: [faseId], references: [id], onDelete: Cascade)

  @@unique([faseId, orden])
  @@map("ejemplo_tema")
}

model TerminoGlosario {
  id         Int    @id @default(autoincrement())
  faseId     Int
  termino    String
  definicion String @db.Text

  fase Fase @relation(fields: [faseId], references: [id], onDelete: Cascade)

  @@unique([faseId, termino])
  @@map("termino_glosario")
}

model Tarjeta {
  id      Int    @id @default(autoincrement())
  faseId  Int
  orden   Int
  frente  String @db.Text
  reverso String @db.Text

  fase     Fase              @relation(fields: [faseId], references: [id], onDelete: Cascade)
  progreso ProgresoTarjeta[]
  sesiones TarjetaSesion[]

  @@unique([faseId, orden])
  @@map("tarjeta")
}

// Programación de la próxima aparición de cada tarjeta por estudiante (RN-24).
model ProgresoTarjeta {
  estudianteId   Int
  tarjetaId      Int
  // Día calendario de México en que toca repasarla otra vez.
  proximoRepaso  DateTime       @db.Date
  ultimaAutoeval Autoevaluacion

  estudiante Estudiante @relation(fields: [estudianteId], references: [id], onDelete: Cascade)
  // Restrict: las respuestas del estudiante no se pierden si se intenta borrar contenido.
  tarjeta    Tarjeta    @relation(fields: [tarjetaId], references: [id], onDelete: Restrict)

  @@id([estudianteId, tarjetaId])
  @@map("progreso_tarjeta")
}

// FA1: el estudiante abrió el material y salió sin repasar.
model ConsultaTema {
  id           Int      @id @default(autoincrement())
  estudianteId Int
  faseId       Int
  creadoEn     DateTime @default(now())

  estudiante Estudiante @relation(fields: [estudianteId], references: [id], onDelete: Cascade)
  fase       Fase       @relation(fields: [faseId], references: [id], onDelete: Cascade)

  @@index([estudianteId, faseId])
  @@map("consulta_tema")
}

model SesionRepaso {
  id           Int       @id @default(autoincrement())
  estudianteId Int
  faseId       Int
  iniciadaEn   DateTime  @default(now())
  terminadaEn  DateTime?
  // Día calendario MX en que terminó: apoya RN-25 (una vez al día por tema).
  diaTerminada DateTime? @db.Date
  xpOtorgada   Int       @default(0)

  estudiante Estudiante      @relation(fields: [estudianteId], references: [id], onDelete: Cascade)
  fase       Fase            @relation(fields: [faseId], references: [id], onDelete: Cascade)
  tarjetas   TarjetaSesion[]

  @@index([estudianteId, faseId, terminadaEn])
  @@map("sesion_repaso")
}

model TarjetaSesion {
  sesionId              Int
  tarjetaId             Int
  // Orden en la cola de la sesión; «no lo sabía» la manda al final (RN-24).
  posicion              Int
  // Primera autoevaluación de esta sesión (alimenta el resumen: sabidas, dudadas, no sabidas).
  primeraAutoevaluacion Autoevaluacion?
  // Última autoevaluación de esta sesión.
  autoevaluacion        Autoevaluacion?
  // true al marcar «lo sabía» o «dudé».
  completada            Boolean         @default(false)

  sesion  SesionRepaso @relation(fields: [sesionId], references: [id], onDelete: Cascade)
  tarjeta Tarjeta      @relation(fields: [tarjetaId], references: [id], onDelete: Restrict)

  @@id([sesionId, tarjetaId])
  @@map("tarjeta_sesion")
}

// Dominio del estudiante en un tema, 0-100 (RN-26). Lo recalcula `calcularDominio`.
model DominioTema {
  estudianteId  Int
  tema          TemaFase
  porcentaje    Int
  actualizadoEn DateTime @updatedAt

  estudiante Estudiante @relation(fields: [estudianteId], references: [id], onDelete: Cascade)

  @@id([estudianteId, tema])
  @@map("dominio_tema")
}

// ===================================================================
// Banco de preguntas (CU-10 diagnóstico, CU-11 reto diario y CU-13 duelos)
// ===================================================================

model PreguntaBanco {
  id          Int      @id @default(autoincrement())
  tema        TemaFase
  enunciado   String   @db.Text
  explicacion String?  @db.Text
  activa      Boolean  @default(true)

  opciones    OpcionPregunta[]
  diagnostico PreguntaDiagnostico[]
  retoDiario  PreguntaRetoDiario[]
  duelos      PreguntaDuelo[]

  @@unique([tema, enunciado])
  @@index([tema, activa])
  @@map("pregunta_banco")
}

// Exactamente una opción correcta por pregunta.
model OpcionPregunta {
  id         Int     @id @default(autoincrement())
  preguntaId Int
  orden      Int
  texto      String  @db.Text
  correcta   Boolean

  pregunta              PreguntaBanco          @relation(fields: [preguntaId], references: [id], onDelete: Cascade)
  respuestasDiagnostico RespuestaDiagnostico[]
  respuestasRetoDiario  PreguntaRetoDiario[]
  respuestasDuelo       RespuestaDuelo[]

  @@unique([preguntaId, orden])
  @@map("opcion_pregunta")
}

// ===================================================================
// CU-10 Diagnóstico y plan de estudio (RF-13, RN-26, RN-27)
// ===================================================================

enum EstadoPlan {
  PROPUESTO
  ACTIVO
  REEMPLAZADO
}

enum TipoActividad {
  RETO
  REPASO
  DUELO
}

model Diagnostico {
  id           Int       @id @default(autoincrement())
  estudianteId Int
  creadoEn     DateTime  @default(now())
  terminadoEn  DateTime?

  estudiante Estudiante                 @relation(fields: [estudianteId], references: [id], onDelete: Cascade)
  preguntas  PreguntaDiagnostico[]
  respuestas RespuestaDiagnostico[]
  resultados ResultadoDiagnosticoTema[]
  planes     PlanEstudio[]

  @@index([estudianteId, terminadoEn])
  @@map("diagnostico")
}

model PreguntaDiagnostico {
  diagnosticoId Int
  preguntaId    Int
  orden         Int

  diagnostico Diagnostico   @relation(fields: [diagnosticoId], references: [id], onDelete: Cascade)
  pregunta    PreguntaBanco @relation(fields: [preguntaId], references: [id], onDelete: Restrict)

  @@id([diagnosticoId, preguntaId])
  @@map("pregunta_diagnostico")
}

model RespuestaDiagnostico {
  diagnosticoId Int
  preguntaId    Int
  opcionId      Int
  correcta      Boolean

  diagnostico Diagnostico    @relation(fields: [diagnosticoId], references: [id], onDelete: Cascade)
  opcion      OpcionPregunta @relation(fields: [opcionId], references: [id], onDelete: Restrict)

  @@id([diagnosticoId, preguntaId])
  @@map("respuesta_diagnostico")
}

model ResultadoDiagnosticoTema {
  diagnosticoId Int
  tema          TemaFase
  porcentaje    Int

  diagnostico Diagnostico @relation(fields: [diagnosticoId], references: [id], onDelete: Cascade)

  @@id([diagnosticoId, tema])
  @@map("resultado_diagnostico_tema")
}

model PlanEstudio {
  id            Int        @id @default(autoincrement())
  estudianteId  Int
  diagnosticoId Int
  estado        EstadoPlan
  // FE2: plan de mejora cuando no hay temas débiles.
  esPlanMejora  Boolean    @default(false)
  creadoEn      DateTime   @default(now())
  aceptadoEn    DateTime?

  estudiante  Estudiante      @relation(fields: [estudianteId], references: [id], onDelete: Cascade)
  diagnostico Diagnostico     @relation(fields: [diagnosticoId], references: [id], onDelete: Cascade)
  actividades ActividadPlan[]

  @@index([estudianteId, estado])
  @@map("plan_estudio")
}

model ActividadPlan {
  id     Int           @id @default(autoincrement())
  planId Int
  orden  Int
  tipo   TipoActividad
  tema   TemaFase
  // Solo si tipo = RETO.
  retoId Int?
  // Motivo en lenguaje claro, p. ej. «Tu dominio de Atributos de calidad es 55 %».
  motivo String

  plan PlanEstudio @relation(fields: [planId], references: [id], onDelete: Cascade)
  reto Reto?       @relation(fields: [retoId], references: [id], onDelete: Restrict)

  @@index([planId, orden])
  @@map("actividad_plan")
}

// ===================================================================
// CU-11 Reto diario contrarreloj (RF-14, RN-12, RN-13, RN-29, RNF-SE-05)
// ===================================================================

model RetoDiario {
  id            Int       @id @default(autoincrement())
  estudianteId  Int
  // Día calendario MX (RN-12): el @@unique impide un segundo reto el mismo día.
  dia           DateTime  @db.Date
  // Multiplicador de QP vigente al iniciar.
  multiplicador Decimal   @db.Decimal(3, 2)
  aciertos      Int?
  xpOtorgada    Int       @default(0)
  qpOtorgado    Int       @default(0)
  creadoEn      DateTime  @default(now())
  terminadoEn   DateTime?

  estudiante Estudiante           @relation(fields: [estudianteId], references: [id], onDelete: Cascade)
  preguntas  PreguntaRetoDiario[]

  @@unique([estudianteId, dia])
  @@map("reto_diario")
}

model PreguntaRetoDiario {
  retoDiarioId Int
  // 1..10
  numero       Int
  preguntaId   Int
  // Momento en que el servidor habilitó la pregunta (RNF-SE-05).
  entregadaEn  DateTime?
  opcionId     Int?
  correcta     Boolean?

  retoDiario RetoDiario      @relation(fields: [retoDiarioId], references: [id], onDelete: Cascade)
  pregunta   PreguntaBanco   @relation(fields: [preguntaId], references: [id], onDelete: Restrict)
  opcion     OpcionPregunta? @relation(fields: [opcionId], references: [id], onDelete: Restrict)

  @@id([retoDiarioId, numero])
  @@map("pregunta_reto_diario")
}

// ===================================================================
// CU-13 Duelos (RF-16, RN-14, RN-15, RNF-SE-04, RNF-SE-05)
// ===================================================================

enum EstadoDuelo {
  PENDIENTE
  ACEPTADO
  TERMINADO
  RECHAZADO
  EXPIRADO
}

model Duelo {
  id          Int         @id @default(autoincrement())
  retadorId   Int
  retadoId    Int
  tema        TemaFase
  estado      EstadoDuelo @default(PENDIENTE)
  creadoEn    DateTime    @default(now())
  // creadoEn + 48 h (RN-15).
  expiraEn    DateTime
  // null con empate exacto o sin terminar.
  ganadorId   Int?
  empate      Boolean     @default(false)
  terminadoEn DateTime?

  retador    Estudiante       @relation("DueloRetador", fields: [retadorId], references: [id], onDelete: Cascade)
  retado     Estudiante       @relation("DueloRetado", fields: [retadoId], references: [id], onDelete: Cascade)
  ganador    Estudiante?      @relation("DueloGanador", fields: [ganadorId], references: [id], onDelete: SetNull)
  preguntas  PreguntaDuelo[]
  respuestas RespuestaDuelo[]
  resultados ResultadoDuelo[]

  @@index([retadorId, estado])
  @@index([retadoId, estado])
  @@index([estado, expiraEn])
  @@map("duelo")
}

// 5 preguntas del tema, la misma ronda para ambos estudiantes.
model PreguntaDuelo {
  dueloId    Int
  numero     Int
  preguntaId Int

  duelo    Duelo         @relation(fields: [dueloId], references: [id], onDelete: Cascade)
  pregunta PreguntaBanco @relation(fields: [preguntaId], references: [id], onDelete: Restrict)

  @@id([dueloId, numero])
  @@map("pregunta_duelo")
}

model RespuestaDuelo {
  dueloId      Int
  estudianteId Int
  numero       Int
  // Momento en que el servidor habilitó la pregunta (RNF-SE-05).
  entregadaEn  DateTime
  respondidaEn DateTime?
  opcionId     Int?
  correcta     Boolean   @default(false)
  // Tiempo usado: los segundos hasta responder, o 20 si se agotó.
  segundos     Decimal   @default(20) @db.Decimal(5, 2)

  duelo      Duelo           @relation(fields: [dueloId], references: [id], onDelete: Cascade)
  estudiante Estudiante      @relation(fields: [estudianteId], references: [id], onDelete: Cascade)
  opcion     OpcionPregunta? @relation(fields: [opcionId], references: [id], onDelete: Restrict)

  @@id([dueloId, estudianteId, numero])
  @@map("respuesta_duelo")
}

// Se crea cuando el estudiante termina su ronda; el rival no lo ve hasta que el duelo termina.
model ResultadoDuelo {
  dueloId         Int
  estudianteId    Int
  porcentaje      Int
  segundosTotales Decimal @db.Decimal(6, 2)
  xpOtorgada      Int     @default(0)

  duelo      Duelo      @relation(fields: [dueloId], references: [id], onDelete: Cascade)
  estudiante Estudiante @relation(fields: [estudianteId], references: [id], onDelete: Cascade)

  @@id([dueloId, estudianteId])
  @@map("resultado_duelo")
}
```

---

## 5. Endpoints

| Módulo | Método | Ruta | Descripción | Acceso |
|---|---|---|---|---|
| app | GET | `/` |  | JWT |
| aprendizaje | GET | `/fases` | Listar las fases con su estado para el estudiante autenticado | JWT |
| aprendizaje | GET | `/fases/:faseId` | Tablón de la fase (RF-18): sus retos con estado, objetivo y recompensas | JWT |
| aprendizaje | GET | `/intentos/:intentoId` | Consultar un intento propio | JWT |
| aprendizaje | POST | `/intentos/:intentoId/ayuda` | Usar una ayuda en el intento (RF-03, RN-10) | JWT |
| aprendizaje | PUT | `/intentos/:intentoId/borrador` | Guardar el avance del intento (RF-01; CU-02, CU-03, CU-04, CU-06 y CU-08) | JWT |
| aprendizaje | POST | `/intentos/:intentoId/dialogo/tecnica` | CU-01: registrar la técnica de elicitación elegida | JWT |
| aprendizaje | POST | `/intentos/:intentoId/dialogo/turnos` | CU-01: registrar un turno del diálogo | JWT |
| aprendizaje | POST | `/intentos/:intentoId/enviar` | Enviar el intento para calificarlo (RF-01) | JWT |
| aprendizaje | POST | `/intentos/:intentoId/escenario/simular` | CU-05: simular el escenario de calidad con la medida guardada (RF-08, RN-20) | JWT |
| aprendizaje | POST | `/retos/:retoId/intentos` | Iniciar un intento, o retomar el que está en curso (FA3) | JWT |
| aprendizaje | GET | `/retos/:retoId/libreta` | CU-01: requerimientos descubiertos por el estudiante en intentos calificados | JWT |
| auth | POST | `/auth/login` | Iniciar sesión con email y contraseña | No |
| auth | GET | `/auth/perfil` | Perfil del estudiante autenticado | JWT |
| auth | POST | `/auth/registro` | Registrar un estudiante y devolver su sesión | No |
| clasificacion | GET | `/clasificacion` | RF-20: tabla de clasificación por XP total, con desempate por estrellas y por quien llegó antes (RN-30) | JWT |
| duelos | GET | `/duelos` | CU-13: mis duelos agrupados en pendientes, por jugar, en espera e historial; expira los vencidos (FE1) | JWT |
| duelos | POST | `/duelos` | CU-13: crea el duelo con 5 preguntas al azar del tema; el rival se identifica por nombre de aventurero | JWT |
| duelos | GET | `/duelos/:dueloId` | CU-13: un duelo propio; el resultado del rival solo aparece cuando el duelo terminó | JWT |
| duelos | POST | `/duelos/:dueloId/aceptar` | CU-13: el estudiante retado acepta el duelo (si no expiró) | JWT |
| duelos | POST | `/duelos/:dueloId/preguntas/:numero/entregar` | CU-13: el servidor habilita la pregunta y arranca su reloj; sin la opción correcta | JWT |
| duelos | POST | `/duelos/:dueloId/preguntas/:numero/respuesta` | CU-13: responde una pregunta (20 s + 1 s de tolerancia, RNF-SE-05); no revela si acertó hasta el final | JWT |
| duelos | POST | `/duelos/:dueloId/rechazar` | CU-13 FA1: el estudiante retado rechaza el duelo; queda RECHAZADO sin XP | JWT |
| duelos | GET | `/duelos/avisos` | CU-13: duelos pendientes en los que el estudiante es el retado (aviso al iniciar sesión) | JWT |
| duelos | GET | `/duelos/rivales` | CU-13: estudiantes con un tema desbloqueado en común y esos temas (RN-15) | JWT |
| economia | GET | `/inventario` | Inventario del estudiante con sus unidades y si cada objeto está equipado | JWT |
| economia | POST | `/inventario/:objetoId/desequipar` | Quitar un objeto del cinto (regresa al inventario) | JWT |
| economia | POST | `/inventario/:objetoId/equipar` | CU-12: equipar un objeto en el cinto (máximo 2, RN-10) | JWT |
| economia | GET | `/inventario/equipados` | Objetos equipados del estudiante con su cantidad (cinto de ayudas, RF-03) | JWT |
| economia | GET | `/tienda` | CU-12: catálogo de la tienda con saldo de QP y unidades que ya tiene el estudiante | JWT |
| economia | POST | `/tienda/compras` | CU-12: comprar un objeto con QP | JWT |
| economia | GET | `/tienda/objetos/:objetoId` | CU-12: detalle de un objeto y los retos en los que puede usarse | JWT |
| estudio | GET | `/estudio/sesiones/:sesionId` | CU-09: estado de una sesión de repaso propia | JWT |
| estudio | POST | `/estudio/sesiones/:sesionId/tarjetas/:tarjetaId` | CU-09: autoevaluación de una tarjeta (RN-24); al terminar la sesión otorga 10 XP una vez al día (RN-25) | JWT |
| estudio | GET | `/estudio/temas` | CU-09: biblioteca de estudio, un tema por fase con su estado (RF-12) | JWT |
| estudio | GET | `/estudio/temas/:faseId` | CU-09: explicación, ejemplos y glosario del tema | JWT |
| estudio | POST | `/estudio/temas/:faseId/consultas` | CU-09 FA1: registra que el estudiante cerró el material sin repasar | JWT |
| estudio | POST | `/estudio/temas/:faseId/sesiones` | CU-09: inicia el repaso o retoma la sesión sin terminar (FA2) | JWT |
| perfil | GET | `/perfil` | RF-19: perfil completo del propio estudiante | JWT |
| perfil | PATCH | `/perfil` | RF-19: cambia el nombre de aventurero y/o el avatar | JWT |
| plan | GET | `/plan/:planId` | CU-10: un plan propio (propuesto o activo) | JWT |
| plan | POST | `/plan/:planId/aceptar` | CU-10: acepta el plan con las actividades conservadas y su orden (FA1); reemplaza al plan activo (FA2) | JWT |
| plan | GET | `/plan/activo` | CU-10: plan activo con su avance (null si no tiene) | JWT |
| plan | POST | `/plan/diagnosticos` | CU-10: crea un diagnóstico de 9 preguntas al azar (3 por tema) sin la opción correcta | JWT |
| plan | GET | `/plan/diagnosticos/:diagnosticoId` | CU-10: preguntas de un diagnóstico propio (para retomarlo) | JWT |
| plan | POST | `/plan/diagnosticos/:diagnosticoId/respuestas` | CU-10: termina el diagnóstico, calcula el dominio por tema (RN-26) y propone un plan (RN-27) | JWT |
| reto-diario | POST | `/reto-diario` | CU-11: inicia el reto diario (10 preguntas de los temas desbloqueados) o retoma el del día | JWT |
| reto-diario | POST | `/reto-diario/:retoDiarioId/abandonar` | CU-11 FA2: abandona; lo no respondido cuenta como incorrecto y el reto del día queda realizado | JWT |
| reto-diario | POST | `/reto-diario/:retoDiarioId/preguntas/:numero/entregar` | CU-11: el servidor habilita la pregunta y arranca su reloj; devuelve la pregunta sin la opción correcta | JWT |
| reto-diario | POST | `/reto-diario/:retoDiarioId/preguntas/:numero/respuesta` | CU-11: responde una pregunta; es correcta solo si la opción lo es y llegó en 20 s + 1 s de tolerancia (RNF-SE-05) | JWT |
| reto-diario | GET | `/reto-diario/hoy` | CU-11: racha, multiplicador y reglas; si ya hay reto del día, su estado o resultado y el tiempo al siguiente (FE1) | JWT |

---

## 6. Decisiones ante ambigüedades y desviaciones

1. **Etapas 1 y 2 en un solo commit.** Los ajustes comunes y CU-05 comparten migraciones y archivos de prueba; se confirmaron juntos (`7f6815c`).
2. **El rival de un duelo se identifica por su nombre de aventurero**, no por `rivalId`. El documento pide a la vez no exponer ids internos (RNF-SE-04) y recibir `rivalId`; el nombre de aventurero es único y público, así que `POST /duelos` recibe `{ rival, tema }`.
3. **Campos de la racha.** Se conservaron los nombres de `RachaEstudio` existentes: `diasActuales` (= `diasRacha`) y `ultimaActividad` (= `ultimoDiaLogrado`, día en que se logró el 50 %).
4. **`ContenidoApoyo` se conserva** (lo usa el tablón de la fase); el material de CU-09 vive en tablas nuevas (`material_tema`, `ejemplo_tema`, `termino_glosario`, `tarjeta`).
5. **Columnas añadidas a lo pedido:** `TarjetaSesion.primeraAutoevaluacion` (el resumen cuenta cómo se evaluó cada tarjeta la primera vez; sin ella una tarjeta «no sabida» y luego «sabida» no se podría distinguir) y `SesionRepaso.diaTerminada` (RN-25 por día calendario MX). También restricciones únicas en contenido (p. ej. `[faseId, orden]`) para que el seed sea idempotente.
6. **Plan de estudio.** «Reto desbloqueado» se interpreta literalmente: fase abierta y retos anteriores de la fase aprobados, así que un tema recién abierto aporta primero su primer reto. Si los temas débiles no tienen nada que hacer todavía (p. ej. su fase sigue bloqueada) se genera el plan de mejora para no dejar un plan vacío.
7. **Duelos.** El retado puede aceptar aunque el retador no haya terminado su ronda; un duelo expira si **cualquiera** de los dos no terminó en 48 h (decisión pedida en el documento); el límite de 3 cuenta duelos `PENDIENTE` y `ACEPTADO`. La respuesta de una pregunta de duelo **no** revela si acertó ni cuál era la correcta hasta que el duelo termina (la revisión llega con el resultado). Los bloqueos del duelo se toman en un orden fijo (duelo y luego estudiantes por id) para evitar interbloqueos.
8. **Reto diario.** `POST /reto-diario` retoma el reto del día si sigue en curso; un reto de un día anterior sin terminar se cierra en el siguiente acceso con la racha de su propio día; si la última pregunta venció con el navegador cerrado, el reto se cierra solo. Tras responder, el servidor solo indica si la respuesta fue correcta (CU-11, paso 6); no revela la opción correcta ni la explicación, porque el banco lo comparten el diagnóstico y los duelos (corregido en el seguimiento, sección 11).
9. **Racha.** El reinicio perezoso conserva el récord y la fecha del último día logrado; se aplica en `GET /auth/perfil`, `/perfil`, el reto diario y el anuncio de recompensas del tablón.
10. **Perfil.** El avatar es una URL `http(s)` (o vacío para quitarlo); no hay carga de archivos. El `ValidationPipe` global descarta (no rechaza) los campos desconocidos; por eso `PATCH /perfil` ignora `xpTotal` o `email` en lugar de responder 400.
11. **Clasificación.** Se calcula al consultar y muestra los primeros 50 lugares más la fila propia si queda fuera.
12. **Precios y tipos de objetos.** Poción de Sabiduría 50 QP (cualquier reto), un Pergamino por tema a 30 QP y Reliquia del Arquitecto 300 QP (cualquier reto).
13. **Navegación.** «Misiones» se quitó del encabezado (el tablón se abre desde el mapa y desde «Misión actual» del pie) para dejar las ocho secciones pedidas.
14. **Suites existentes adaptadas al nuevo orden de retos.** `sprint2-aprendizaje.e2e-spec.ts` busca los retos por mecánica en lugar de por posición, y las pruebas de navegador de los retos del Sprint 2 (`01`, `03` y `05`) dan por aprobados (sin recompensa) CU-07 y CU-05 solo para poder llegar a los retos que miden. Las pruebas de CU-05 y CU-07 tienen sus propios archivos (API y, en el seguimiento, navegador).
15. **Verificación con base limpia.** El documento pide `docker compose down -v && docker compose up --build`. Como `-v` borra el volumen con los datos locales del equipo (hay un estudiante real de pruebas con 1,120 XP), la verificación desde cero se hizo con un proyecto de Compose aparte (`-p pickquest_limpio`) y su propio volumen, que sí se destruyó; los datos locales no se tocaron.

---

## 7. Resultado de las pruebas

| Suite | Resultado | Detalle |
|---|---|---|
| Unitarias del backend (Jest) | **283 pasan** en 27 archivos | Incluyen las reglas nuevas: RN-20, RN-22, RN-24, RN-25, RN-26 (`dominio`), RN-27 (`generarPlan`), RN-28 y RN-10 (tienda), RN-13/RN-29 (`racha`: multiplicador, reinicio perezoso, racha por día propio), RNF-SE-05 (`tiempo-pregunta`), RN-14/RN-15 (`duelo.reglas`), RN-30 (`clasificacion.reglas`), `diaCalendarioMx`, RN-31 (`referencia`) y los faltantes de cada mecánica |
| e2e del backend (Jest + Supertest, base real con seed) | **224 pasan** en 15 archivos | `orden-opciones` (9, secciones 11.5 y 11.6), `cu05-escenarios` (11), `cu07-expediente` (11), `cu09-estudio` (15), `cu10-plan` (15), `cu11-reto-diario` (28), `cu12-tienda` (11), `cu13-duelos` (24), `rf19-rf20-perfil-clasificacion` (15), `sprint3-comunes` (RN-31 en CU-02 y CU-03, cinto con objeto no aplicable, pista persistente), `cu02-historias`, `sprint2-aprendizaje` (adaptada al nuevo orden de retos), `auth`, `app` y `swagger` |
| Navegador (Playwright 1.52, Chromium) | **82 casos**, todos pasan (47.9 min) | `01-recorrido` 8 · `02-alternativos` 4 · `03-casos-cu03-cu04` 24 · `04-recuperacion` 6 · `05-casos-cu02` 20 · `06-sprint3` 8 · `07-casos-cu05` 6 · `08-casos-cu07` 6. Corrida completa y ininterrumpida del 10-nov-2026, 11:45 a 12:59 (hora del centro de México); ver sección 11 |
| Frontend | `tsc` y `vite build` sin errores; `oxlint` 0 advertencias y 0 errores | Misma corrida |
| Backend | `nest build` sin errores. `eslint` solo reporta formato de Prettier, que ya fallaba en archivos anteriores al sprint; no hay errores de lógica | No se aplicó `--fix` para no reformatear código de sprints anteriores |
| Arranque desde cero | Correcto | Proyecto de Compose aparte con base vacía: se aplican las 15 migraciones y corre el seed; la corrida completa se hizo sobre ese arranque. Los dos usuarios demo inician sesión y consultan todos los endpoints nuevos (ver decisión 15) |

Defectos encontrados y corregidos durante la verificación:

- **Swagger tumbaba el arranque** por dos DTO con arreglos de objetos anónimos (`ObjetoDetalleDto.retos` y `PreguntaDueloDto.opciones`). Las pruebas e2e no cargaban Swagger, por eso no lo vieron; se corrigieron y se agregó `swagger.e2e-spec.ts`, que construye el documento.
- **La última pregunta del reto diario y de los duelos no mostraba su retroalimentación**: la pantalla saltaba al resumen en cuanto el servidor terminaba la ronda. Ahora la pregunta se queda en pantalla hasta pulsar «Ver resumen» / «Terminar mi ronda».
- **Racha y tablón**: la prueba de Sprint 2 que fijaba el multiplicador en la base necesitó una racha vigente, porque ahora el reinicio perezoso la ponía en cero (comportamiento correcto de RN-13).

Nota del entorno: el `.env` local apunta `CORS_ORIGIN` a un túnel temporal, así que para correr la suite de navegador se usó un archivo de override de Compose (sin modificar el `.env`).


---

## 8. Contenido del seed

Esta tabla describe **todo el contenido educativo** del sistema, para la revisión pedagógica. Los datos salen del seed (`backend/prisma/seed.ts` y `backend/prisma/contenido/`) y se verificaron contra la base cargada. No se transcribe el texto de las respuestas correctas; se indica cuántas hay y dónde están. El texto completo está en los archivos de `contenido/`.

### 8.1 Estructura general

| Contenido | Cantidad | Detalle |
|---|---|---|
| Fases | 3 | 1 Ciclo de vida del software (Básica) · 2 Elicitación de requerimientos · 3 Atributos de calidad. Cada una con su descripción y su contenido de apoyo (teoría, ejemplos, glosario) para el tablón |
| Retos | 8 | F1: CU-07 → CU-08 · F2: CU-01 → CU-02 → CU-03 · F3: CU-04 → CU-05 → CU-06. Cada reto se habilita al aprobar el anterior de su fase (RN-08) |
| Objetos | 5 | Poción de Sabiduría 50 QP, Común, cualquier reto · Pergamino del Ciclo de Vida, Pergamino de Claridad (Elicitación) y Pergamino de Calidad (Atributos de calidad), 30 QP, Poco común, solo en retos de su tema · Reliquia del Arquitecto 300 QP, Épica, cualquier reto |
| Usuarios demo | 2 | `demo@pickquest.dev` (`aventurero_demo`: sin progreso, 3 pociones equipadas) y `rival@pickquest.dev` (`rival_demo`: nivel 2 con 680 XP, fase 1 y dos primeros retos de la fase 2 completos, racha de 3 días, 2 pociones). Contraseña de ambos: `pickquest123` |

### 8.2 Retos (contenido de cada mecánica)

Todos los retos aprueban con 80 % o más (RN-03); sus estrellas son 80/90/100 % → 1/2/3, con máximo 2 si se usó ayuda (RN-04).

| Reto | Escenario y contenido | Calificación | Respuesta correcta (dónde está) |
|---|---|---|---|
| **1.1 CU-07 Expediente** · 130 XP / 90 QP | Proyecto «VidaCita» (app de citas de la clínica Vida). 4 documentos: minuta (5 fragmentos), correo de la directora (5), ficha técnica (4) y presupuesto y calendario (5) = **19 fragmentos**. 6 características: requisitos que cambian, cliente disponible, entregas tempranas, riesgo técnico bajo, equipo pequeño, presupuesto y plazo flexibles por etapas. 6 modelos para elegir: cascada, modelo en V, incremental, espiral, prototipos y ágil. Mínimo 2 vínculos | RN-22: 50 modelo correcto + 30 × (relevantes bien caracterizadas ÷ relevantes) + 20 × (vínculos que respaldan ÷ vínculos, solo con modelo correcto) − 5 por irrelevante | Modelo correcto: **ágil**. **10 fragmentos relevantes** (7 de ellos respaldan el modelo) y **9 irrelevantes**; cada relevante tiene una característica correcta |
| **1.2 CU-08 Línea de tiempo** · 150 XP / 100 QP | «Mercadito Escolar» (tienda en línea escolar), modelo cascada, fecha límite **15 semanas**. 8 bloques: 5 fases (análisis 2 sem., diseño 3, construcción 5, pruebas 3, despliegue 1) y 3 actividades de apoyo (entorno 2 sem., plan de pruebas 2, capacitación 2). **10 dependencias** fin-a-inicio. **5 entregables** que se asocian con la fase que los produce | RN-23: 40 × orden de las fases + 30 × dependencias respetadas + 20 × entregables bien asociados + 10 si termina en el plazo | Plan de referencia: análisis 0–2, entorno 2–4, diseño 2–5, plan de pruebas y capacitación 5–7, construcción 5–10, pruebas 10–13, despliegue 13–14 (termina en la semana 14; en secuencia pura serían 20) |
| **2.1 CU-01 Diálogo** · 200 XP / 120 QP | Don Ramón, dueño de la cafetería «La Esquina». 4 técnicas de elicitación para elegir (entrevista, cuestionario, observación y taller); **12 turnos** como máximo. **10 nodos** de conversación y **36 opciones** de pregunta | RN-16: 20 si elige la técnica correcta + 80 × (requerimientos descubiertos ÷ 6) − 5 por pregunta improductiva. Con 11 de los 12 turnos se descubren los 6 | Técnica correcta: **entrevista**. **6 requerimientos ocultos** (R1 a R3 funcionales: pedidos en tablet, inventario, cobro y división de cuenta; R4 a R6 no funcionales). **9 opciones** los revelan (cubren los 6); **27** son improductivas |
| **2.2 CU-02 Historias de usuario** · 200 XP / 120 QP | **3 historias** (el mesero registra pedidos, la cajera cobra la cuenta y el encargado de inventario recibe avisos de ingredientes escasos), cada una con **6 casillas** (Como, Quiero, Para, Dado, Cuando, Entonces) = **18 casillas**. Banco de **24 piezas**: 4 de cada tipo | RN-17: casillas correctas ÷ 18 | **18 piezas** son la respuesta de una casilla; **6 son distractores** (tema de aeropuerto: piloto, reservar vuelos…) que no corresponden a ninguna |
| **2.3 CU-03 Tablero MoSCoW** · 220 XP / 150 QP | «La Esquina», primera versión con capacidad de **20 puntos** de esfuerzo. **10 tarjetas** de requerimientos, cada una con puntos; se clasifican en MUST, SHOULD, COULD o WONT, se marcan como RF o RNF y se ordenan las MUST | RN-18: 50 × tarjetas en su columna + 30 × tarjetas con su tipo (RF/RNF) + 20 × orden de las MUST; las MUST no pueden pasar de la capacidad | MUST: 4 tarjetas (18 puntos); SHOULD: 3 (10); COULD: 2 (13); WONT: 1 (13). 7 funcionales y 3 no funcionales. Hay tentaciones que rebasan la capacidad (programa de puntos, 8; inventario, 5) |
| **3.1 CU-04 Inspección** · 250 XP / 180 QP | App ficticia «SaludYa» (citas médicas): **3 pantallas** (inicio de sesión, agendar cita, mis citas) de **7 elementos** cada una = 21 elementos. Máximo **9 marcas**; cada marca lleva un atributo de calidad ISO/IEC 25010 | RN-19: cada falla vale 100 ÷ 6; 60 % por marcar su elemento y 40 % por el atributo correcto; cada marca sobre un elemento sin falla resta la mitad de una falla | **6 fallas**: seguridad 1, usabilidad 2, eficiencia de desempeño 1, adecuación funcional 1, fiabilidad 1. **15 elementos** no tienen falla |
| **3.2 CU-05 Simulador** · 280 XP / 200 QP | Ver 8.3 | RN-20 | Ver 8.3 |
| **3.3 CU-06 Reparto de presupuesto** · 300 XP / 220 QP | Plataforma de pagos de una cooperativa estudiantil. **20 puntos** de presupuesto para repartir entre **4 atributos** (seguridad, usabilidad, eficiencia de desempeño y mantenibilidad), con **4 efectos cruzados** (seguridad resta 1.5 a eficiencia y 1 a usabilidad; eficiencia resta 1 a mantenibilidad; mantenibilidad suma 0.5 a eficiencia). **3 restricciones obligatorias** y **3 justificaciones** para elegir | RN-21: 50 × restricciones obligatorias cumplidas + 30 × cercanía al reparto de referencia + 20 si elige la justificación correcta | Reparto de referencia: seguridad 8, usabilidad 6, eficiencia 4, mantenibilidad 2. Mínimos: seguridad 70, usabilidad 60, eficiencia 40. **1 de las 3 justificaciones** es la correcta |

### 8.3 CU-05 en detalle (escenario «Compras Express»)

| Elemento | Contenido |
|---|---|
| Necesidad vaga | «La app tiene que ser rápida en temporada alta.» |
| Contexto de la app ficticia | Compras Express: catálogo, carrito y pago desde el celular; en temporada alta (Buen Fin y diciembre) llegan miles de compradores al mismo tiempo |
| Opciones por parte | **5 partes × 4 opciones = 20 opciones** (fuente, estímulo, artefacto, entorno y respuesta). Cada parte tiene **1 correcta y 3 distractores** |
| Posición de la correcta | En el seed va primera en cada parte, pero la interfaz presenta las opciones y las unidades **mezcladas por intento**, así que no hay posición fija (sección 11.5) |
| Medida de respuesta | Se llama «tiempo de respuesta» y la carga es «usuarios concurrentes» |
| Unidades | **4**: segundos (correcta), milisegundos, minutos y pedidos por hora |
| Deslizador del valor | de 0.5 a 10, de 0.5 en 0.5 |
| Deslizador de la carga | de 100 a 5,000 usuarios, de 100 en 100 |
| Rango aceptable (RN-20) | Valor entre **2 y 3 segundos** con **1,500 a 2,500 usuarios** |
| Modelo de la simulación | Tiempo de respuesta de la app = 0.8 + 0.0008 × carga (segundos): 1,500 usuarios → 2.0 s · 2,000 → 2.4 s · 2,500 → 2.8 s · 5,000 → 4.8 s. El escenario «se cumple» si la app responde en el valor definido o menos y la unidad es la correcta |
| Simulaciones | Máximo **5** por intento |
| Calificación (RN-20) | 12 puntos por cada parte correcta (hasta 60) + 40 si la medida está dentro del rango aceptable |

### 8.4 Estudio y diagnóstico

| Contenido | Cantidad | Detalle |
|---|---|---|
| Material de estudio (CU-09) | 3 temas | Una explicación de 4 párrafos por tema |
| Ejemplos | 13 | Ciclo de vida 4 · Elicitación 5 · Atributos de calidad 4 |
| Glosario | 30 | 10 términos por tema |
| Tarjetas de repaso | 36 | 12 por tema (frente y reverso) |
| Banco de preguntas (CU-10, CU-11 y CU-13) | 45 | 15 por tema, 4 opciones (una correcta) y explicación; la posición de la correcta varía entre preguntas |

El seed es idempotente: vuelve a correr sin duplicar ni borrar progreso, y no reescribe el contenido de un reto que ya tiene intentos.

---

## 9. Pasos para probar manualmente

Usa `demo@pickquest.dev` (y `rival@pickquest.dev` para duelos), contraseña `pickquest123`, en `http://localhost:5173`.

### CU-05 Simulador de escenarios (Fase 3, tras CU-04)

*Preparación:* aprueba CU-07, CU-08, CU-01, CU-02, CU-03 y CU-04 (o entra con un estudiante que ya los tenga).

- **Flujo normal:** abre la fase 3 → «Calibra el escenario de Compras Express» → «Iniciar reto». Elige fuente, estímulo, artefacto, entorno y respuesta; mueve el deslizador de la medida (valor, unidad y carga); pulsa «Simular» y revisa la gráfica contra el umbral; ajusta y vuelve a simular; pulsa «Enviar». El resultado marca las partes incorrectas.
- **FA1:** en el resultado pulsa «Reintentar»; si ya estaba aprobado aparece el aviso de que solo se conserva la mejor calificación y no se repiten recompensas.
- **FA2:** con una Poción equipada, usa la ayuda: se revela el rango aceptable de la medida y el intento queda «con ayuda» (máximo 2 estrellas).
- **FA3:** sal del reto a mitad y vuelve a entrar: se conserva lo elegido.
- **FE1:** deja alguna parte vacía y pulsa «Simular» o «Enviar»: se señalan las partes vacías.
- **FE2:** simula cinco veces; la sexta indica que ya no puedes simular y debes enviar.
- **RN-31:** con un intento no aprobado no aparece el escenario de referencia; aparece al aprobar o tras 3 intentos no aprobados.

### CU-07 Expediente del proyecto (Fase 1, primer reto)

- **Flujo normal:** fase 1 → «Elige el ciclo de vida para VidaCita» → «Iniciar reto». Abre un documento, selecciona un fragmento (clic o Enter), elige la característica que revela; repite. Elige el modelo, vincula al menos dos evidencias y pulsa «Enviar».
- **FA1 / FA3:** igual que en CU-05.
- **FA2:** con una Poción equipada, usa la ayuda: se resalta un documento con una evidencia relevante aún no seleccionada.
- **FE1:** elige un modelo sin vincular dos evidencias y pulsa «Enviar»: pide vincular al menos dos.
- **FE2:** vuelve a seleccionar un fragmento ya agregado: avisa que ya fue agregado y no lo duplica.

### CU-09 Repaso con tarjetas

- **Flujo normal:** *Biblioteca* → «Ciclo de vida del software» → lee la explicación, los ejemplos y el glosario → «Repasar con tarjetas». Voltea con clic o con la barra espaciadora; evalúa con los botones o con las teclas 1 (no lo sabía), 2 (dudé) y 3 (lo sabía). Al terminar ves sabidas/dudadas/no sabidas, «Ganaste 10 XP» y tu dominio.
- **RN-24:** una tarjeta «no lo sabía» vuelve a salir al final de la misma sesión.
- **RN-25:** repite el repaso el mismo día: ya no da XP; en otro tema sí.
- **FA1:** en el material pulsa «Cerrar material» sin repasar.
- **FA2:** a mitad del repaso pulsa «Salir»; en la biblioteca aparece «Repaso pendiente»; al volver, «Continuar el repaso» retoma las tarjetas pendientes.
- **FE1:** con el estudiante demo (fase 2 bloqueada), abre `/estudio/<id de la fase 2>`: «Este tema se desbloquea al completar la fase anterior».

### CU-10 Plan de estudio

- **Flujo normal:** *Plan de estudio* → «Obtener plan de estudio» → responde las 9 preguntas → «Terminar diagnóstico». Revisa tu dominio por tema y las actividades con su motivo → «Aceptar plan». En *Plan de estudio* y en *Perfil* aparecen las actividades con el botón «Ir».
- **FA1:** antes de aceptar, usa subir/bajar y quitar.
- **FA2:** con un plan activo pulsa «Generar un plan nuevo»: aparece tu avance y la confirmación; el plan nuevo reemplaza al anterior solo cuando lo aceptas.
- **FE1:** deja preguntas sin responder y termina: se señalan las pendientes y no se genera el plan.
- **FE2:** contesta bien las 9 con un estudiante que tenga todos los temas ≥ 80 %: el plan es de mejora (retos con menos de 3 estrellas y duelos).

### CU-11 Reto diario

- **Flujo normal:** *Reto diario* → revisa racha, multiplicador y reglas → «Iniciar reto diario» → contesta 10 preguntas (el temporizador cambia de color en los últimos 5 s; después de cada una ves acierto o error) → resumen con XP, QP y racha.
- **FA1:** deja que se agote el tiempo: la pregunta cuenta como incorrecta y sigue la siguiente.
- **FA2:** pulsa «Abandonar»: lo no respondido cuenta como incorrecto y el reto del día queda realizado.
- **FE1:** vuelve a *Reto diario* el mismo día: ves el resultado y el tiempo que falta para el siguiente.
- **Racha:** con ≥ 50 % la racha sube un día y el multiplicador crece 0.1 (tope 2.0); al día siguiente sin hacerlo, la racha vuelve a 0.

### CU-12 Tienda

- **Flujo normal:** *Tienda* (el saldo está arriba) → elige un objeto → revisa su detalle y los retos donde sirve → cantidad → «Comprar» → «Equipar».
- **FA1:** en «¡Compra realizada!» elige «Ahora no»: el objeto queda en el inventario.
- **FA2:** con dos objetos ya equipados, equipa un tercero: elige cuál reemplazar; el reemplazado vuelve al inventario.
- **FE1:** intenta comprar la Reliquia con menos de 300 QP: indica cuántos QP faltan.
- **FE2:** intenta tener más de 5 unidades de un objeto: indica el límite y no cobra.

### CU-13 Duelos (con dos navegadores o ventanas privadas)

- **Flujo normal:** como `demo`: *Duelos* → elige `rival_demo` y «Ciclo de vida del software» → «Retar y jugar mi ronda» y contesta las 5 preguntas. Como `rival`: al entrar ves el aviso y la insignia en *Duelos* → «Aceptar» → contesta la misma ronda. Ambos ven el resultado; el ganador recibe 50 XP, el perdedor 20 y no hay QP.
- **El resultado de uno no se ve antes de terminar:** como `rival`, antes de jugar, el detalle del duelo no muestra puntaje del retador.
- **FA1:** como `rival` pulsa «Rechazar»: el duelo queda en el historial como rechazado, sin XP.
- **FA2:** deja que todas las preguntas se agoten en ambas rondas: empate exacto, 30 XP a cada uno.
- **FE1:** cambia `expiraEn` de un duelo pendiente a una fecha pasada y abre *Duelos*: pasa a «Expirado».
- **FE2:** crea tres duelos pendientes y un cuarto: indica el límite de 3.

### RF-19 Perfil y RF-20 Clasificación

- **Perfil:** *Perfil* muestra nivel, XP, QP, racha con multiplicador, estrellas por fase, inventario (equipar/desequipar) y el plan activo. «Editar nombre y avatar» cambia el nombre (único; uno ocupado muestra el error) y el avatar (URL).
- **Clasificación:** *Clasificación* lista a los estudiantes por XP; tu fila aparece resaltada con «(tú)»; no se muestran correos.

### Comunes

- **RN-31:** en cualquier reto, falla dos veces: la solución no aparece; en el tercer intento no aprobado (o al aprobar) sí.
- **Pista persistente:** usa una ayuda, recarga la página: la pista sigue visible.
- **Objeto no aplicable:** en un reto de Ciclo de vida, el cinto no ofrece el Pergamino de Claridad (de Elicitación).
- **Sin ayudas en el reto diario ni en los duelos.**


---

## 10. Pendientes conocidos

- No hay carga de archivos para el avatar (solo URL).
- La clasificación y los duelos no se actualizan en vivo: se recalculan al consultar (el aviso de duelos se refresca cada minuto).
- El diagnóstico no se puede retomar tras recargar la pantalla de preguntas con respuestas a medias (las elecciones viven en el navegador); sí se puede volver a abrir el mismo diagnóstico.
- El banco tiene 15 preguntas por tema: con la fase 1 sola, el reto diario repite preguntas entre días.
- *(Resuelto en la sección 11.5)* La posición de la respuesta correcta en CU-05 y en otras mecánicas ya no es fija: cada intento presenta las opciones mezcladas.

---

## 11. Seguimiento de la revisión de calidad

Trabajo hecho sobre la misma rama (`feature/sprint3-casos-faltantes`), un commit por punto, sin push y sin tocar el `.env`.

### 11.1 Qué cambió en cada punto

| Punto | Qué se hizo | Archivos principales | Commit |
|---|---|---|---|
| 1. CU-11 paso 6 | La respuesta del reto diario ya no devuelve `opcionCorrectaId` ni `explicacion`. Devuelve `correcta`, `tiempoAgotado`, `siguiente` (número de la próxima pregunta o `null`), `aciertos`, `terminado` y el estado del reto. Eso aplica a `…/respuesta`, al abandono, al resumen final, a `GET /reto-diario/hoy`, a FE1 y a la reanudación. La pantalla muestra «Correcto», «Incorrecto» o «Se acabó el tiempo: cuenta como incorrecta» y solo colorea la opción que el alumno eligió. La última pregunta sigue en pantalla hasta pulsar «Ver resumen». Los duelos no se modificaron | `reto-diario.service.ts`, `reto-diario.dto.ts`, `PreguntaCronometrada.tsx`, `types/index.ts`, `cu11-reto-diario.e2e-spec.ts` (prueba `CU-11 paso 6: la respuesta solo indica si es correcta…` y otra para el abandono; 28 pruebas en el archivo), `06-sprint3.spec.ts` (caso de navegador del reto diario) | `08d5cd6` |
| 2. Navegador de CU-05 y CU-07 | Dos archivos nuevos que resuelven cada reto **por la interfaz**, con el mismo estilo que `05-casos-cu02.spec.ts` (alumno nuevo por caso, captura y una línea en `ejecuciones.jsonl`). Los atajos para dar por aprobados CU-05 y CU-07 se quedaron solo en las suites de los retos del Sprint 2 (`01`, `03` y `05`), donde hacen falta para llegar al reto que se mide; las suites nuevas no los usan | `frontend/e2e/07-casos-cu05.spec.ts`, `08-casos-cu07.spec.ts`, `ayudas-sprint3.ts` | `29a4496` |
| 3. Corrida completa limpia | Una sola corrida ininterrumpida desde cero (ver 11.2); a la tercera pasó todo. Se agregaron al repositorio las capturas de `docs/capturas/` (14 nuevas, de la 20 a la 33, y las anteriores regeneradas) y las evidencias | `docs/evidencias/sprint3/`, `docs/capturas/`, `docs/evidencias/cu05/`, `docs/evidencias/cu07/`, ajuste de los dos archivos de pruebas nuevos para pasar el lint | `ca56df1` |
| 4. Tabla del seed (sección 8) | CU-05 se reescribió desde el seed real (describía conceptos de CU-06). Se agregaron las filas de CU-01, CU-02, CU-03, CU-04, CU-06 y CU-08, con las fórmulas de calificación y sin transcribir los textos correctos. La sección ahora tiene 8.1 a 8.4 | `REPORTE_SPRINT3.md` | `20da319` |

Otras correcciones del reporte: en el commit del punto 4 (`20da319`) se ajustaron el renglón del paso 4–6 de CU-11 y la decisión que decía que el servidor revelaba la explicación, y se quitó la nota que decía que CU-05 y CU-07 no se resolvían por la interfaz. En el commit que agrega esta sección se actualizaron los números de la sección 7 y se retiró el pendiente de las capturas, que ya están en el repositorio.

### 11.2 Resultado de la corrida completa

Fecha: **10 de noviembre de 2026, de las 11:45 a las 12:59** (hora del centro de México; 1 h 14 min). Sistema levantado desde cero en el proyecto de Compose `pickquest_limpio` (volumen propio, 15 migraciones y seed), con un archivo de override para CORS que evita modificar el `.env`. Orden de ejecución y resultado:

| Orden | Suite | Resultado | Duración |
|---|---|---|---|
| 1 | Unitarias del backend (Jest) | **276 de 276** pasan, 26 archivos | 52 s |
| 2 | e2e del backend (Jest + Supertest, `--runInBand`) | **215 de 215** pasan, 14 archivos | 3 min 50 s |
| 3 | Navegador, suite completa de Playwright | **82 de 82** pasan, 0 fallidos, 0 inestables, 0 omitidos, 8 archivos | 47.9 min |
| 4 | Build del backend | Correcto | 29 s |
| 5 | Build del frontend (`tsc` y `vite build`) | Correcto | 25 s |
| 6 | Lint del frontend (`oxlint`) | 0 advertencias, 0 errores | 3 s |

Los códigos de salida de las seis suites son 0 (`codigos.txt`). Hubo dos corridas anteriores que no cuentan: la primera pasó todo pero dejó dos advertencias de lint en mis archivos de pruebas nuevos y guardó el JSON y el HTML en una ruta equivocada; la segunda se interrumpió porque Playwright rechazó el patrón de parámetros que usé para corregir esas advertencias. Se corrigió y se volvió a correr la suite completa, no solo el archivo que falló.

Evidencias, en [`docs/evidencias/sprint3/`](docs/evidencias/sprint3/): `00-arranque-desde-cero.txt`, `01-unitarias-backend.txt`, `02-e2e-backend.txt`, `03-playwright-lista.txt`, `04-build-backend.txt`, `05-build-frontend.txt`, `06-lint-frontend.txt`, `codigos.txt`, `linea-de-tiempo.txt`, `playwright-resultados.json` y `playwright-html/index.html` (abrir con un navegador). Las capturas están en `docs/capturas/` y la evidencia de cada caso, en `docs/evidencias/cu05/` y `docs/evidencias/cu07/` (un PNG por caso; el `ejecuciones.jsonl` de cada carpeta, con correos y tokens ocultos, se genera al correr y desde la sección 11.5 no se versiona). Se revisó que ni los textos ni las capturas incluyan el `.env`, URLs de túneles ni correos que no sean de los usuarios demo.

### 11.3 Casos nuevos de navegador de CU-05 y CU-07

Todos pasan en la corrida anterior; cada uno usa un alumno nuevo y resuelve el reto por la interfaz.

| Caso | Flujo | Qué comprueba | Resultado |
|---|---|---|---|
| CP-ES-01 | CU-05 FN | Elegir las cinco partes, calibrar valor, unidad y carga, simular, ver la gráfica y enviar con partes incorrectas: 88 % (falla el entorno). El escenario pasa de «no cumple» a «cumple» al ajustar | Pasa |
| CP-ES-02 | CU-05 FE1 | Con una parte vacía, Simular y Enviar señalan lo que falta y no proceden | Pasa |
| CP-ES-03 | CU-05 FE2 | Tras 5 simulaciones, la sexta muestra el aviso de límite y el botón queda deshabilitado; la API responde 409 | Pasa |
| CP-ES-04 | CU-05 FA2 | Usar la Poción muestra el rango «entre 2 y 3» (Pociones 3→2) y el 100 % queda con máximo 2 estrellas | Pasa |
| CP-ES-05 | CU-05 FA3 | Salir a mitad y volver conserva lo elegido y la pista revelada | Pasa |
| CP-ES-06 | CU-05 RN-31 | Con un intento no aprobado (0 %) no aparece el rango de referencia; al reintentar y aprobar (100 %) aparece | Pasa |
| CP-EX-01 | CU-07 FN | Abrir documentos, seleccionar fragmentos con clic y con Enter, caracterizar, elegir modelo, vincular y enviar: 77 % (50 + 12 + 20 − 5); la evidencia irrelevante queda marcada | Pasa |
| CP-EX-02 | CU-07 FE1 | Con menos de dos evidencias vinculadas, Enviar muestra el aviso y no envía | Pasa |
| CP-EX-03 | CU-07 FE2 | Seleccionar un fragmento ya agregado muestra el aviso y no lo duplica | Pasa |
| CP-EX-04 | CU-07 FA2 | La ayuda resalta el documento que tiene una evidencia relevante pendiente | Pasa |
| CP-EX-05 | CU-07 FA3 | Salir y volver conserva evidencias, características, modelo y vínculos | Pasa |
| CP-EX-06 | CU-07 RN-31 | Con un intento no aprobado (6 %) no aparece el modelo de referencia; al aprobar (82 %) aparece «Modelo de referencia: Ágil» con sus 10 fragmentos | Pasa |

### 11.4 Pendientes encontrados y no corregidos

Estaban fuera de los cuatro puntos, así que no se tocaron:

1. *(Resuelto en 11.5)* La posición fija de la respuesta correcta en CU-05 y en las demás mecánicas afectadas.
2. **`npm run lint` del backend no pasa**: solo reporta formato de Prettier en archivos que ya lo incumplían antes del sprint. Aplicar `--fix` reformatearía unos 90 archivos, así que no se hizo (se intentó una vez y se revirtió). Conviene un commit aparte, solo de formato.
3. *(Resuelto en 11.5)* Los `ejecuciones.jsonl` que generan las pruebas ya no se versionan.
4. **La suite de navegador depende del `.env` de cada máquina**: el `CORS_ORIGIN` actual apunta a un túnel temporal, así que hizo falta un archivo de override de Compose. Convendría un perfil de Compose para pruebas con los valores correctos.
5. **La suite de navegador tarda 48 minutos** (los archivos de CU-03/CU-04 son los más lentos, unos 5 min cada uno en total). Conviene correrla por archivos o en paralelo antes de cada entrega.
6. Los pendientes de la sección 10 siguen vigentes.

### 11.5 Orden de las opciones: la posición de la correcta ya no es una pista

**Qué se encontró.** El pendiente de CU-05 (la correcta siempre en primera posición) era un caso de un patrón más general: el seed guarda el contenido con un orden fijo y la interfaz lo mostraba tal cual. Se revisó cada mecánica en la base cargada y en el código:

| Mecánica / contenido | Patrón encontrado | Corregido |
|---|---|---|
| CU-05 Simulador | La correcta era la primera de las cuatro opciones de cada una de las cinco partes y «segundos» la primera unidad. La respuesta además llevaba `orden`, que delataba la posición del seed | Sí |
| CU-06 Presupuesto | La justificación correcta era la primera de las tres | Sí |
| CU-07 Expediente | Los seis modelos salían siempre en el mismo orden y el correcto (ágil) siempre era el último; las características salían en un orden fijo | Sí |
| CU-03 MoSCoW | Las tarjetas salían agrupadas por columna (MUST, SHOULD, COULD, WONT) y las MUST en su orden de referencia: el orden de la lista contestaba el reto | Sí |
| CU-01 Diálogo | En cada nodo las preguntas productivas iban primero y las improductivas al final; la técnica correcta («entrevista») era la primera de las cuatro | Sí |
| CU-02 Historias | El banco de 24 piezas seguía el orden de las historias: la pieza de cada casilla quedaba en una posición predecible | Sí |
| Banco de preguntas (diagnóstico, reto diario, duelos) | **No afectado**: la correcta ocupa la posición 1 en 11 preguntas, la 2 en 13, la 3 en 11 y la 4 en 10 de las 45, sin patrón por tema | No hizo falta |

**Cómo se corrigió.** Una función de mezcla determinista (`backend/src/common/orden/mezcla-determinista.ts`, Fisher-Yates con un generador de 32 bits) que toma como semilla el id del intento y el nombre de la lista. Cada intento ve su propio orden y, al retomarlo (FA3) o recargar la pantalla, el orden es el mismo sin guardar nada en la base. El contrato `contenidoPublico` de las mecánicas recibe ahora el id del intento. En CU-05 y CU-03, `orden` pasó a ser la posición en que se presenta cada opción (1 a n), no la del seed. En CU-01 se mezclan las opciones del nodo completo y se filtran las ya elegidas, de modo que al elegir una pregunta las demás conservan su orden relativo. La calificación y los datos del seed no cambiaron; el frontend no necesitó cambios porque ya mostraba las listas en el orden recibido.

**Pruebas nuevas.** `backend/test/orden-opciones.e2e-spec.ts` (8 pruebas e2e) y `mezcla-determinista.spec.ts` (6 pruebas unitarias). Por cada mecánica afectada (CU-01, CU-02, CU-03, CU-05, CU-06, CU-07) se abren varios intentos del mismo reto, se lee de la base dónde está la respuesta correcta y se comprueba que (a) en dos intentos distintos su posición no es siempre la misma y no coincide con la del seed, y (b) al retomar el intento (volver a iniciarlo y recargarlo) el contenido y el borrador no cambian. Para CU-01 hay una prueba más: al elegir una pregunta, las que quedan conservan su orden. Otra prueba revisa la distribución de la correcta en el banco de preguntas. Cada prueba sigue abriendo intentos hasta ver dos órdenes distintos (con tope de 14), para no depender de un único sorteo.

**Archivos y commit.** `common/orden/mezcla-determinista.ts` (y su spec), `mecanicas/tipos.ts`, `aprendizaje.service.ts` y los evaluadores de CU-01, CU-02, CU-03, CU-05, CU-06 y CU-07. Commit `71713a2`.

**Otros dos cambios de este seguimiento.**

- *ejecuciones.jsonl:* los registros que generan las pruebas de navegador (`docs/evidencias/cu02/ejecuciones.jsonl`, `cu05/`, `cu07/` y `docs/evidencias/cu03-cu04.jsonl`, que es el mismo tipo de archivo) se agregaron al `.gitignore` y se quitaron del repositorio con `git rm --cached` (siguen en disco). Commit `9b8291e`.
- *Prueba de navegador del plan de estudio (CU-10):* la corrida mostró que la prueba `06-sprint3` marcaba siempre la primera opción del diagnóstico, y que el tamaño del plan dependía de qué preguntas salieran al azar (con 2 de 3 aciertos en dos temas, el plan tenía una sola actividad). No tenía relación con el orden de las opciones, pero la prueba fallaba de forma intermitente. Ahora responde con una opción incorrecta leída de la base y el resultado es determinista. Commit `6e979d8`.

**Resultado de las pruebas** (10 de noviembre de 2026, entre las 21:50 y las 22:50, hora del centro de México; evidencias en [`docs/evidencias/sprint3/orden-opciones/`](docs/evidencias/sprint3/orden-opciones/)):

| Suite | Resultado |
|---|---|
| Unitarias del backend | **282 de 282** pasan, 27 archivos |
| e2e del backend, completas (`--runInBand`) | **223 de 223** pasan, 15 archivos (215 anteriores + 8 de `orden-opciones`) |
| Playwright, los 8 archivos, con el sistema levantado desde cero en el proyecto de Compose aparte | Primera corrida: **78 pasan**, 1 falla y 3 no se ejecutan, todo en `06-sprint3` (la prueba del plan descrita arriba; las otras tres van detrás en la misma serie). Los siete archivos de las mecánicas (`01`, `02`, `03`, `04`, `05`, `07` y `08`: 74 casos) pasan completos |
| Playwright, `06-sprint3` tras corregir la prueba | **8 de 8** pasan |
| Build del backend, build del frontend y lint del frontend | Correctos; lint con 0 advertencias y 0 errores |

No repetí los 82 casos después de arreglar `06-sprint3`: se corrigió solo esa prueba, ninguna otra depende de ella, y los 74 casos de los otros archivos ya habían pasado en esa misma corrida. Si se prefiere un registro con los 82 en una sola corrida, hay que repetirla (unos 40 minutos). El reporte HTML de Playwright de esta corrida no se guardó porque incluía el rastro de la falla y pesaba 8 MB; quedan el JSON y el texto.

**Pendientes que se encontraron y no se corrigieron.**

- *(Resuelto en 11.6)* **CU-08 Línea de tiempo** tenía el mismo patrón: las fases salían en su orden cronológico correcto (análisis, diseño, construcción, pruebas y despliegue) y los cinco entregables en el mismo orden de las fases.
- **CU-04 Inspección** se revisó y no tiene el patrón: las fallas caen en posiciones distintas en las tres pantallas (4.º y 6.º elemento en una, 4.º y 5.º en otra, 2.º y 3.º en la tercera).
- En CU-07 los fragmentos de cada documento se dejaron en su orden de lectura (es contenido para leer, no una lista de opciones).

### 11.6 Ajustes previos al push y corrida final sobre un clon limpio

**CU-08 (commit `ed0903e`).** Los bloques y los entregables de la línea de tiempo se presentan ahora mezclados por intento, igual que en las demás mecánicas. Se agregó la prueba correspondiente a `orden-opciones.e2e-spec.ts` (ahora 9 pruebas).

**CU-01, nodos agotados (commit `2a7ae23`).** Al mezclar las preguntas, una prueba de navegador (`02-alternativos`, que siempre elige la primera opción) llegó a un caso que antes no aparecía: elegidas varias preguntas que regresan al nodo inicial, el nodo actual y el inicial se agotaban y la lista de preguntas quedaba vacía aunque sobraran turnos y quedaran 20 o más preguntas sin hacer. Ahora, si el nodo actual y el inicial no tienen preguntas pendientes, se ofrece el primer nodo que aún las tenga; solo cuando ya se hicieron todas la lista queda vacía. Cambio en `opcionesDisponibles` y dos pruebas unitarias nuevas. No cambia la calificación.

**README (commit `3914a1f`).** Describe las suites de CU-05 y CU-07 y aclara que los `*.jsonl` no se versionan.

**Corrida final.** Se hizo sobre un **clon limpio de la rama, sin archivo `.env`** (como lo haría un tester), con `docker compose up --build` desde cero (15 migraciones y seed), en el commit `2a7ae23`, el 12 de noviembre de 2026. Todo en una sola corrida y sin repetir nada; evidencias en [`docs/evidencias/sprint3/final/`](docs/evidencias/sprint3/final/):

| Suite | Resultado |
|---|---|
| Unitarias del backend | **283 de 283**, 27 archivos |
| e2e del backend (`--runInBand`) | **224 de 224**, 15 archivos |
| Playwright, los 8 archivos | **82 de 82**, 0 fallidos, 0 inestables, 47.6 min |
| Build del backend, build del frontend | Correctos |
| Lint del frontend | 0 advertencias, 0 errores |

Hubo un intento anterior de esta corrida (commit `3914a1f`) con 78 de 82 casos: falló `02-alternativos` por el caso de CU-01 descrito arriba, y se corrigió. La hora de pared de la corrida final aparece como 10 horas porque el equipo estuvo suspendido durante la noche; el tiempo de ejecución de Playwright fue de 47.6 minutos.
