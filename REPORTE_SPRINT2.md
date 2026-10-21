# Reporte Sprint 2 — PickQuest

Este reporte describe el hito inicial del Sprint 2. Los cambios posteriores están en [ADENDA_SPRINT2.md](ADENDA_SPRINT2.md) y el cierre actual en [VERIFICACION_SPRINT2.md](docs/VERIFICACION_SPRINT2.md).

Rama `feature/sprint2-mecanicas` (a partir de `feature/db-sync-scs`). Fecha: 2026-10-14.

Commits de la rama:

```
ffbbe4b chore: compose en modo desarrollo y sin variables de Judge0
d59a393 feat(db): modelo relacional por mecánica, migración y seed del Sprint 2 (CU-01, CU-03, CU-04, CU-06, CU-08)
90a040e feat(aprendizaje): motor de mecánicas, intentos EN_CURSO/CALIFICADO y borrador en servidor (RF-01, RF-02, RF-03, RN-02, RN-04..RN-10, RN-13)
52983fd feat(frontend): mecánicas CU-08, CU-03, CU-01, CU-06 y CU-04, tablón de fase y resultado con retroalimentación (RF-04, RF-06, RF-07, RF-09, RF-11, RF-18)
0328942 fix(frontend): MoSCoW en 2 columnas hasta pantallas 2xl (CU-03, RNF-US-04)
+ el commit que agrega este reporte
```

## 1. Resumen de lo implementado

| CU | Mecánica | RF / RN | Backend | Frontend |
|---|---|---|---|---|
| CU-08 Línea de tiempo | `LINEA_TIEMPO` | RF-11, RN-23 | `mecanicas/linea-tiempo/` (fórmula pura, DTO, evaluador) | `RetoLineaTiempo`: Gantt por semanas, barras arrastrables (dnd-kit) y controles − / +, fin calculado vs. fecha límite, entregables con selector |
| CU-03 Tablero MoSCoW | `TABLERO_MOSCOW` | RF-06, RN-18 | `mecanicas/tablero-moscow/` | `RetoTableroMoscow`: 5 zonas con dnd-kit sortable, selector «Mover a…», flechas ↑ ↓ en MUST, RF/RNF, contador de capacidad |
| CU-01 Diálogo con stakeholder | `DIALOGO_STAKEHOLDER` | RF-04, RN-16 | `mecanicas/dialogo-stakeholder/`; el servidor conduce el diálogo turno por turno; `GET /retos/:id/libreta` | `RetoDialogo`: retrato y burbujas, elección de técnica, turnos, libreta, envío automático al agotar turnos |
| CU-06 Reparto de presupuesto | `REPARTO_PRESUPUESTO` | RF-09, RN-21 | `mecanicas/reparto-presupuesto/` | `RetoPresupuesto`: medidores en vivo, controles + / − y deslizador, restricciones, justificación |
| CU-04 Inspección | `INSPECCION_SISTEMA` | RF-07, RN-19 | `mecanicas/inspeccion-sistema/` | `RetoInspeccion` + `PantallaFalsa`: «app falsa» dibujada con componentes, marcas numeradas, atributo ISO 25010 por marca |

Requerimientos comunes:

- **RF-01** (calificar, registrar, recompensar solo la primera aprobación, actualizar progreso, **avance en servidor**): `POST /intentos/:id/enviar` (transacción Serializable, un reintento ante conflicto y luego 409) y `PUT /intentos/:id/borrador` con debounce de ~800 ms y guardado al salir de la pantalla. Se eliminó el borrador en `localStorage`.
- **RF-02**: reintentar = iniciar un intento nuevo tras uno calificado; la mejor calificación se calcula con solo los intentos `CALIFICADO`. El frontend avisa de RN-05 y RN-07 y pide confirmación si el reto ya estaba aprobado.
- **RF-03 / RN-10**: la ayuda ahora pertenece a un intento (`UsoAyuda.intentoId` único → máximo 1), consume una unidad de un objeto **equipado** (`EconomiaService`) y devuelve la pista de la mecánica, que el frontend resalta.
- **RF-18**: `GET /fases/:id` es el tablón de la fase con todos sus retos y su estado `BLOQUEADO / DISPONIBLE / EN_CURSO / APROBADO`.
- **RN-01, RN-08, RN-09** (desbloqueo): se conservaron `calcularEstadosFases`, `retoActual` y `retoDesbloqueado`; ahora solo cuentan intentos `CALIFICADO`.
- **RN-02 y RN-13**: `ProgresoService` aplica `RachaEstudio.multiplicadorQP` (1.00 si no hay racha) y redondea; el tablón y la cabecera del intento muestran el QP ya multiplicado y es el mismo que se otorga.
- **RNF-SE-02**: el contenido público de cada mecánica no incluye claves ni datos de referencia (lo verifica un e2e por mecánica, por nombre de campo y por texto).
- **RNF-MA-01**: `progreso` y `economia` dejaron de estar vacíos; `aprendizaje` no escribe en sus tablas.
- **RNF-US-04**: toda acción de arrastrar tiene alternativa (selector, botones − / +, flechas).
- Fases: ahora son 3 (`CICLO_VIDA`, `ELICITACION`, `ATRIBUTOS_CALIDAD`) con `Fase.descripcion` en la base de datos; el mapa dibuja N fases según el backend. Los 9 retos de opción múltiple quedaron archivados en `backend/prisma/contenido-archivado/retos-opcion-multiple-sprint1.ts` (solo datos, sin uso).
- Limpieza: se eliminaron `ModoRespuesta`, `CODIGO_PRUEBAS`, `Judge0`, `EjercicioIso25010`, `EjercicioOpciones`, `EjercicioGenerico`, `retoIso25010.ts`, `services/mocks/`, el módulo `evaluacion.ts` y el campo duplicado `createdAt`. El compose quedó en modo desarrollo y sin `.tools/` en el commit.

## 2. `schema.prisma` final (completo)

```prisma
// Esquema de base de datos PickQuest - Sprint 2 (SCS v2.3 / SRS v2.1)
//
// Sprint 2: el contenido de los retos y las respuestas de los estudiantes ya
// NO se guardan en JSON. Cada mecánica tiene sus propias tablas:
//   CU-01 diálogo con stakeholder, CU-03 tablero MoSCoW, CU-04 inspección,
//   CU-06 reparto de presupuesto, CU-08 línea de tiempo.
// Las tablas de contenido se borran en cascada con su Reto; las de respuesta,
// con su IntentoReto; las referencias de una respuesta hacia el contenido
// usan Restrict.

generator client {
  provider      = "prisma-client-js"
  binaryTargets = ["native", "linux-musl-openssl-3.0.x"]
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
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

// Las 8 mecánicas del SRS; en este sprint solo se implementan 5.
enum Mecanica {
  DIALOGO_STAKEHOLDER // CU-01
  ARMADO_PIEZAS // CU-02 (Sprint 3)
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
  id               Int    @id @default(autoincrement())
  email            String @unique
  passwordHash     String
  nombreAventurero String @unique
  avatar           String
  nivel            Int    @default(1)
  xpTotal          Int    @default(0)
  qpTotal          Int    @default(0)

  racha       RachaEstudio?
  intentos    IntentoReto[]
  inventario  InventarioObjeto[]
  logros      LogroEstudiante[]
  habilidades HabilidadSDLC[]

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

  inventarios  InventarioObjeto[]
  ayudasUsadas UsoAyuda[]

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

  fase     Fase          @relation(fields: [faseId], references: [id], onDelete: Cascade)
  intentos IntentoReto[]

  // CU-01
  stakeholder           Stakeholder?
  requerimientosOcultos RequerimientoOculto[]
  nodosDialogo          NodoDialogo[]
  // CU-03
  tablero               TableroPriorizacion?
  tarjetas              TarjetaRequerimiento[]
  // CU-04
  sistema               SistemaInspeccion?
  pantallas             PantallaSimulada[]
  // CU-06
  escenario             EscenarioPresupuesto?
  atributosEscenario    AtributoEscenario[]
  opcionesJustificacion OpcionJustificacion[]
  // CU-08
  plan                  PlanProyecto?
  bloques               BloquePlan[]
  entregables           EntregablePlan[]

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

  ayuda                  UsoAyuda?
  respuestaDialogo       RespuestaDialogo?
  turnosDialogo          TurnoDialogo[]
  respuestasTarjeta      RespuestaTarjeta[]
  marcasInspeccion       MarcaInspeccion[]
  asignacionesPuntos     AsignacionPuntos[]
  respuestaPresupuesto   RespuestaPresupuesto?
  posicionesBloque       PosicionBloque[]
  asociacionesEntregable AsociacionEntregable[]

  @@index([estudianteId, retoId, estado])
  @@map("intento_reto")
}

// Una ayuda pertenece a un intento concreto (RN-10: máximo 1 por intento).
model UsoAyuda {
  id        Int      @id @default(autoincrement())
  intentoId Int      @unique
  objetoId  Int
  creadoEn  DateTime @default(now())

  intento IntentoReto @relation(fields: [intentoId], references: [id], onDelete: Cascade)
  objeto  Objeto      @relation(fields: [objetoId], references: [id], onDelete: Restrict)

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
```

Migración: `backend/prisma/migrations/20260930000000_sprint2_modelo_relacional/migration.sql` (una sola; borra ayudas, intentos, retos, contenido de apoyo, fases y habilidades, reinicia XP/QP/nivel de los estudiantes y aplica el esquema nuevo). Se probó sobre la base que ya existía (`prisma migrate deploy` + `migrate diff` vacío) y sobre un volumen nuevo (`docker compose down -v && docker compose up --build`).

## 3. Endpoints finales

Todos devuelven JSON y están documentados en Swagger (`/docs`). Guard = `JwtAuthGuard` (Bearer). Un estudiante solo accede a sus intentos; de lo contrario, 404.

| Método | Ruta | Guard | Entrada | Respuesta y códigos |
|---|---|---|---|---|
| GET | `/` | — | — | "Hello World!" (boilerplate, sin cambios) |
| POST | `/auth/registro` | — | `RegistroDto` | `SesionDto`; 409 si el email o el nombre ya existen |
| POST | `/auth/login` | — | `LoginDto` | `SesionDto` (200); 401 |
| GET | `/auth/perfil` | JWT | — | `PerfilEstudianteDto` |
| GET | `/fases` | JWT | — | `FaseDto[]`: igual que antes, **más `descripcion`** |
| GET | `/fases/:faseId` | JWT | — | **Tablón (RF-18)** `FaseTablonDto`: `fase`, `retos[]` con `id, orden, titulo, objetivo, mecanica, recompensaXp, recompensaQp` (ya multiplicada, RN-02), `estado` (`BLOQUEADO`/`DISPONIBLE`/`EN_CURSO`/`APROBADO`), `mejorPorcentaje`, `mejorCalificacionEstrellas`; y `contenidosApoyo`. 404 |
| POST | `/retos/:retoId/intentos` | JWT | — | Inicia **o retoma** el intento `EN_CURSO` (FA3): `IntentoEnCursoDto` {`intentoId`, `reto`, `fase`, `contenido` público, `borrador`, `ayudaUsada`, `contenidosApoyo`}. 201; **403** si la fase o el reto están bloqueados (RN-01, RN-08); 404; 501 si la mecánica no está implementada |
| GET | `/retos/:retoId/libreta` | JWT | — | CU-01: requerimientos descubiertos en intentos calificados `{codigo, descripcion}[]` (`[]` si el reto no es un diálogo). 404 |
| GET | `/intentos/:intentoId` | JWT | — | `EN_CURSO`: `IntentoEnCursoDto`. `CALIFICADO`: `IntentoCalificadoDto` {`resultado` (porcentaje, estrellas, aprobado, XP, QP, usoAyuda, `creadoEn`, `calificadoEn`), `retroalimentacion`}. 404 |
| PUT | `/intentos/:intentoId/borrador` | JWT | Cuerpo según la mecánica: CU-03 `{tarjetas}`, CU-04 `{marcas}`, CU-06 `{asignaciones, justificacionId}`, CU-08 `{posiciones, asociaciones}` (validado por DTO de la mecánica, campos desconocidos rechazados) | `{actualizadoEn}`; 400 (cuerpo inválido, más marcas que el máximo, más puntos que el presupuesto, o el diálogo, que usa sus propios endpoints); 404; **409** si el intento ya está calificado |
| POST | `/intentos/:intentoId/dialogo/tecnica` | JWT | `{tecnica}` | Estado del diálogo (200). 400 si ya hubo un turno; 404; 409 |
| POST | `/intentos/:intentoId/dialogo/turnos` | JWT | `{opcionId}` | Estado del diálogo + `turno` (respuesta del stakeholder y requerimiento revelado), siguiente nodo con sus preguntas (solo `id` y `pregunta`) y `turnosRestantes` (200). 400 si no hay técnica, no quedan turnos o la pregunta no está disponible; 404; 409 |
| POST | `/intentos/:intentoId/ayuda` | JWT | `{objetoId}` | `{intentoId, objetoId, pista}` (200). Consume una unidad del objeto equipado (RN-10). 400 si el objeto no es del estudiante, no está equipado o no tiene unidades; **409** si ya se usó una ayuda en el intento o el intento está calificado; 404 |
| POST | `/intentos/:intentoId/enviar` | JWT | — | `IntentoCalificadoDto` (200). **400 con `faltantes`** si no se puede enviar; 409 si ya está calificado o hay conflicto de concurrencia (tras un reintento); 404 |
| GET | `/inventario/equipados` | JWT | — | `ObjetoEquipadoDto[]` {`objetoId, nombre, tipo, efecto, rareza, cantidad`} |

Eliminados: `POST /retos/:retoId/ayuda`, `/retos/:retoId/ayudas`, `/fases/:faseId/retos/:retoId/ayuda(s)` y `/fases/:faseId/retos/:retoId/intentos` (los alias con `faseId`, que se ignoraba).

## 4. Decisiones ante ambigüedades y desviaciones

**Desviaciones de este documento**

1. **Commits por etapa.** Las etapas 1 y 2 y la limpieza tienen su propio commit, pero las 5 mecánicas se integraron juntas: el registro de evaluadores, los DTO de respuesta y `RetoPage` son compartidos, así que no existe un estado intermedio que compile con una sola mecánica. El backend de las 5 va en un commit (con sus pruebas) y el frontend de las 5 en otro.
2. **Fórmula del medidor duplicada en el frontend.** El documento pedía implementarla "una sola vez en un archivo compartible". Backend y frontend son paquetes separados sin código común, así que hay dos copias idénticas (`reparto-presupuesto.calificacion.ts` califica; `features/reto/presupuesto/medidores.ts` solo muestra) con un comentario cruzado. La calificación siempre la calcula el servidor.
3. **`@dnd-kit/utilities`** también se agregó a `package.json` (además de `core` y `sortable`) porque el frontend la importa directamente.
4. **`ContenidoApoyo` se conservó** y se sembró una guía breve por fase (no estaba en el alcance, pero el botón «Guía Técnica» ya existía).
5. **Ruta del frontend:** `/reto/:faseId` pasó a `/intento/:intentoId` (el tablón o el resultado inician o retoman el intento y navegan a él).

**Decisiones**

6. **`AtributoEscenario.minimoObligatorio`** se interpretó como el **valor mínimo que debe alcanzar el medidor** (0–100) de ese atributo, no como puntos asignados. El reparto de referencia del seed cumple las 3 restricciones.
7. **Semanas desde 0.** `inicioSemana` e `inicioReferencia` cuentan desde 0 (la interfaz muestra «Semana n+1»). El fin del plan es `máx(inicio + duración)`; una dependencia se respeta si `inicio(bloque) ≥ inicio(requerido) + duración(requerido)`.
8. **Concordancia de orden (RN-23).** Para cada par de fases se compara el signo de `inicio` contra el signo de `inicioReferencia`; un empate de inicio cuenta como discordante si la referencia no empata.
9. **Normalización de MoSCoW.** El servidor guarda `ordenMust` como 1..n según la posición dentro de MUST; fuera de MUST es `null`. La concordancia con menos de 2 tarjetas en común sigue la regla del documento.
10. **Aritmética exacta.** RN-16/18/19/21/23 se calculan como fracciones de enteros y se trunca al final (`Math.floor`), para evitar que 6 × 100/6 en punto flotante dé 99.99… y se trunque a 99. Hay una prueba que lo cubre.
11. **CU-01 — técnica obligatoria para enviar.** El documento solo pide confirmar con libreta vacía (FE1); además el servidor devuelve 400 si no se eligió técnica (sin técnica no hay entrevista). La técnica no se puede cambiar tras el primer turno.
12. **CU-01 — envío automático (FE2).** Lo dispara el cliente al llegar a 0 turnos; el servidor rechaza turnos de más. Si un nodo agota sus preguntas se regresa al nodo inicial; si tampoco ahí quedan, se muestran 0 preguntas y el estudiante termina cuando quiera.
13. **CU-01 — borrador.** El estado del diálogo (técnica y turnos) es el borrador; `PUT /borrador` en un diálogo responde 400.
14. **Ayuda.** Cualquier objeto equipado da la pista de la mecánica; los efectos de texto de los objetos (descartar opción, +50 % XP) no se implementan. La pista **no se guarda**: tras recargar, el intento sigue marcado como "ayuda usada" pero la pista ya no se vuelve a dibujar. «Máximo 2 objetos equipados» (RN-10) no se valida en ningún endpoint porque equipar objetos es del Sprint 3; el seed deja 1 equipado.
15. **Estado de un reto.** `EN_CURSO` tiene precedencia sobre `APROBADO` (un reintento en marcha figura `EN_CURSO`); la mejor calificación sigue mostrándose.
16. **QP anunciados.** `recompensaQp` del tablón y de la cabecera del intento ya llevan el multiplicador; la XP no se multiplica.
17. **Migración destructiva.** Además de borrar el contenido, reinicia `xpTotal`, `qpTotal` y `nivel` de los estudiantes porque su progreso ya no existe. Conserva estudiantes, rachas, objetos e inventario.
18. **Unicidad del `EN_CURSO`.** Se controla en el servicio dentro de la transacción Serializable (Prisma no expresa el índice parcial); una prueba e2e lo verifica con dos peticiones simultáneas.
19. **Seed idempotente con intentos.** Si un reto ya tiene intentos, el seed actualiza sus datos básicos pero **no reescribe su contenido** (las respuestas lo referencian); para aplicar cambios de contenido hay que reiniciar la base.
20. **Umbral del 80 %** (RN-03): constante global en backend (`calificacion-estrellas.ts`) y en el frontend (`UMBRAL_APROBACION`).
21. **Hardcodeado en el frontend** (solo presentación, nada de contenido ni respuestas): íconos por tema, nombres de mecánicas, nombres de atributos ISO, descripciones de las 4 técnicas, el ícono de cada retrato.
22. **Caché de intentos.** `useIntento` usa `staleTime: Infinity` y `gcTime: 0` para que un refetch nunca pise lo que el estudiante está haciendo.
23. **501** en la API para las mecánicas del Sprint 3; el frontend muestra «Este reto estará disponible próximamente».
24. **`.env` local.** El `.env` de la raíz (ignorado por git) tiene `CORS_ORIGIN` y `VITE_API_URL` apuntando a túneles de Cloudflare ya inactivos, y como docker compose lo lee, el navegador no podía llamar al backend. Para las pruebas se sobrescribieron por la línea de comandos (`CORS_ORIGIN=http://localhost:5173 VITE_API_URL=http://localhost:3000 docker compose up -d --force-recreate backend frontend`) **sin tocar el archivo**; para trabajar en local conviene borrar esas dos líneas. El compose temporal del túnel quedó respaldado en `.tools/docker-compose.tunel-temporal.yml` (sin commit).

## 5. Resultado de las pruebas

| Tipo | Qué | Resultado |
|---|---|---|
| Unitarias backend (`npm test`) | 11 suites, **101 pruebas**: fórmulas RN-16, 18, 19, 21 y 23 (caso perfecto, caso en cero, intermedio calculado a mano, límites y truncado); faltantes de cada mecánica (FE1/FE2); concordancia de orden de MUST; opciones disponibles del diálogo; `calcularEstadoReto`; multiplicador RN-13; y las suites anteriores que siguen aplicando (`estado-fases`, `calificacion-estrellas`, `nivel`) | **101 / 101 pasan** |
| e2e backend (`npm run test:e2e`, base real con el seed) | 3 suites, **66 pruebas**: bloqueo RN-01/RN-08 (403); retomar FA3 con borrador; contenido público sin campos ni textos de referencia (5 mecánicas); enviar con faltantes → 400 (5 mecánicas); RN-07 (primera aprobación sí, segunda no, también con envíos simultáneos); RN-04 y RN-10 (máx. 2 estrellas, consume una unidad, segunda ayuda 409, objeto no equipado o agotado 400); recorrido completo de las 3 fases con RN-01 y RN-09; aislamiento entre estudiantes (404); RN-02/RN-13 con multiplicador 1.5; RN-05 con un reintento peor; reglas propias de cada CU | **66 / 66 pasan** |
| Compilación | `npm run build` (backend) y `npm run build` (frontend: `tsc -b` + `vite build`) | Sin errores (aviso informativo de Vite: bundle de 540 kB) |
| Lint | `oxlint` del frontend | 0 advertencias y 0 errores (igual que antes) |
| Arranque limpio | `docker compose down -v && docker compose up --build`: 5 migraciones, seed (3 fases, 5 retos, 3 objetos, usuario demo) y servidores arriba | Correcto |
| Recorrido manual en la interfaz real | Navegador headless (Playwright) con el usuario demo, sin tocar el repo: mapa → tablón → reto → resultado → reintento de los 5 retos, incluyendo arrastrar una barra del Gantt y una tarjeta de MoSCoW, recarga con avance conservado, FE1/FE2 de cada CU, ayuda y confirmación de reintento | **~45 comprobaciones, todas correctas**: los 5 retos al 100 %, +1120 XP, +770 QP, nivel 3, las 3 fases completadas, sin errores de consola |

El script del recorrido manual vive fuera del repositorio (no hay infraestructura de pruebas de frontend).

## 6. Contenido del seed, para revisión del equipo

**Fases**

| Orden | Fase | Tema | Dificultad | Descripción (base de datos) | Retos |
|---|---|---|---|---|---|
| 1 | Ciclo de vida del software | `CICLO_VIDA` | Básica | Cómo se organiza el trabajo: etapas, qué necesita cada una para empezar y cómo planificarlas en el tiempo | 1 |
| 2 | Elicitación de requerimientos | `ELICITACION` | Intermedia | Descubrir lo que necesita un cliente conversando y decidir qué se construye primero | 2 |
| 3 | Atributos de calidad | `ATRIBUTOS_CALIDAD` | Avanzada | Detectar fallas con ISO/IEC 25010 y repartir recursos limitados entre atributos que compiten | 2 |

Cada fase tiene además una guía (teoría, ejemplos y glosario) breve.

**Retos**

| Fase.Reto | CU | Título | XP | QP | Contenido creado |
|---|---|---|---|---|---|
| 1.1 | CU-08 | Planifica el lanzamiento de Mercadito Escolar | 150 | 100 | Modelo **cascada**, fecha límite **15 semanas**. 5 fases (Análisis 2 sem, Diseño 3, Construcción 5, Pruebas 3, Despliegue 1) y 3 actividades (Preparar entorno 2, Plan de pruebas 2, Capacitación 2). 10 dependencias. 5 entregables (SRS, diseño, código, reporte de pruebas, sistema + manual). En secuencia pura dura 20 semanas: solo se cumple el plazo poniendo en paralelo las actividades. Plan de referencia (inicio): 0, 2, 5, 10, 13 / 2, 5, 5 |
| 2.1 | CU-01 | Entrevista con Don Ramón | 200 | 120 | Dueño de la cafetería «La Esquina»; técnica correcta **Entrevista**; **12 turnos**; **10 nodos** con 3 a 5 opciones (36 en total, 10 improductivas). 6 requerimientos ocultos: R1 pedidos en tablet que llegan a cocina, R2 inventario con aviso, R3 pagos y cuenta dividida, **R4 pedido en cocina < 3 s (RNF)**, **R5 aprendizaje < 15 min (RNF)**, **R6 operación sin internet (RNF)**. Recorrido perfecto: 11 turnos |
| 2.2 | CU-03 | Prioriza el sistema de La Esquina | 220 | 150 | 10 tarjetas (3 RNF), capacidad de MUST = **20**. MUST (18 pts): tablet→cocina 5, cobro 5, sin internet 5 (RNF), cocina < 3 s 3 (RNF). SHOULD: inventario 5, dividir cuenta 3, mesero nuevo 2 (RNF). COULD: programa de puntos 8 (atractiva: meterla a MUST rebasa la capacidad), reporte semanal 5. WON'T: app móvil 13 |
| 3.1 | CU-04 | Inspecciona la app SaludYa | 250 | 180 | App de citas médicas, 3 pantallas de 7 elementos, **máx. 9 marcas**, 6 fallas en 5 atributos: contraseña visible (Seguridad), «¿Olvidaste tu contraseña?» de bajo contraste (Usabilidad), carga de 12 s (Eficiencia de desempeño), botón sin retroalimentación (Usabilidad), cita duplicada (Adecuación funcional), la app se cierra sola (Fiabilidad). 15 elementos sin falla |
| 3.2 | CU-06 | Equilibra la plataforma de pagos | 300 | 220 | Presupuesto **20**; Seguridad (base 30, ganancia 5, mín. 70, ref. 8), Usabilidad (40, 5, mín. 60, ref. 6), Eficiencia (40, 4, mín. 40, ref. 4), Mantenibilidad (30, 4, ref. 2). Efectos cruzados: Seg→Efic −1.5, Seg→Usab −1.0, Efic→Mant −1.0 y Mant→Efic +0.5. Medidores de referencia: 70, 62, 45 y 34 (cumple las 3 restricciones). 3 justificaciones (1 correcta) |

Objetos: Poción de Sabiduría (50 QP), Pergamino de Claridad (100 QP) y Reliquia del Arquitecto (300 QP). El usuario demo (`demo@pickquest.dev` / `pickquest123`) arranca con 3 Pociones **equipadas**.

## 7. Pasos para probar manualmente cada CU

Preparación: `docker compose down -v && docker compose up --build` (ver la decisión 24 sobre el `.env`), abrir `http://localhost:5173`, iniciar sesión con el usuario demo. Para volver a probar desde cero se reinicia el volumen. Las semanas se muestran desde 1 (columna `S1`…).

Convenciones: **N** = flujo normal, **FA** = alternativo, **FE** = de excepción.

### CU-08 Planificar un proyecto en una línea de tiempo (fase 1, RF-11, RN-23)

- **N:** Mapa → fase «Ciclo de vida del software» → tablón → «Iniciar reto». Colocar cada bloque con «Colocar» y fijar su inicio (arrastrando la barra o con − / +): Análisis S1, Diseño S3, Construcción S6, Pruebas S11, Despliegue S14, Preparar entorno S3, Plan de pruebas S6, Capacitación S6. Asociar cada entregable con su fase (SRS→Análisis, diseño→Diseño, código→Construcción, reporte→Pruebas, sistema+manual→Despliegue). «Enviar solución». **Esperado:** 100 %, 3 estrellas, +150 XP, +100 QP; la fase 1 queda completada y la fase 2 se desbloquea. El resultado muestra el plan de referencia.
- **N (menor puntaje):** todo en S1 y todos los entregables a «Análisis» → 14 %, reprobado, sin recompensa; la retroalimentación lista las dependencias incumplidas y los entregables mal asociados.
- **FA1 reintento:** en el resultado o en el tablón, «Repetir reto / Reintentar» → aparece el aviso de que no se otorgan XP ni QP de nuevo (RN-05, RN-07) → confirmar → intento nuevo. Con un 100 % la mejor marca se conserva.
- **FA2 ayuda:** «Usar ayuda» en el cinto → una dependencia queda resaltada con una pista; el botón queda deshabilitado (máx. 1 por intento); una unidad de poción menos; aunque saques 100 %, el máximo son 2 estrellas.
- **FA3 retomar:** colocar dos bloques, esperar «Avance guardado en el servidor», recargar la página o salir y volver desde el tablón («Continuar intento») → los bloques siguen colocados.
- **FA4 arrastrar o botones:** mover una barra arrastrándola y la misma con − / +; ambas dan el mismo resultado.
- **FE1:** con bloques sin colocar o entregables sin asociar, «Enviar» queda deshabilitado y la barra inferior muestra qué falta; por API, `POST /intentos/:id/enviar` responde 400 con `faltantes`.
- **FE2:** dejar el plan en más de 15 semanas (p. ej. Despliegue en S20) → el resumen lo marca en rojo y, al enviar, pide confirmación; «Enviar» sí permite continuar y se pierden los 10 puntos del plazo.
- **Bloqueo:** con un estudiante nuevo, `POST /retos/<id de la fase 2>/intentos` responde 403.

### CU-03 Priorizar requerimientos en un tablero MoSCoW (fase 2, reto 2, RF-06, RN-18)

Requiere haber aprobado el reto 1 de la fase 2 (RN-08).

- **N:** MUST en este orden: tablet→cocina (RF), cobrar (RF), seguir sin internet (RNF), cocina < 3 s (RNF); SHOULD: inventario (RF), dividir cuenta (RF), mesero nuevo (RNF); COULD: programa de puntos (RF) y reporte semanal (RF); WON'T: app móvil (RF). El contador marca 18 / 20. **Esperado:** 100 %, +220 XP, +150 QP.
- **FA (arrastrar o seleccionar):** mover una tarjeta arrastrándola desde su asa y otra con el selector «Mover a…»; reordenar MUST arrastrando o con ↑ ↓.
- **FA2 ayuda:** resalta una tarjeta mal colocada o sin colocar y dice su columna correcta.
- **FE1:** con tarjetas en «Sin clasificar» o sin RF/RNF, «Enviar» queda deshabilitado.
- **FE2:** mover «Programa de puntos» (8 pts) a MUST → 26 / 20 en rojo y «Enviar» deshabilitado con el aviso; al sacarla se puede enviar.
- **Penalizaciones:** invertir el orden de dos tarjetas de MUST, o poner una tarjeta en la columna equivocada, baja el puntaje; la retroalimentación muestra la columna y el tipo elegidos y los correctos, y el orden de referencia de MUST.

### CU-01 Descubrir requerimientos dialogando con un stakeholder (fase 2, reto 1, RF-04, RN-16)

- **N:** «Iniciar reto» → elegir **Entrevista** → hacer las 11 preguntas, en este orden: «¿Cómo se toman hoy los pedidos…?», «¿Cómo le gustaría que llegara el pedido a la cocina?», «¿Qué tan rápido tendría que aprender a usarlo un mesero nuevo?», «¿Cuánto tarda la cocina en enterarse de un pedido?», «¿Qué tan rápido necesita ver un pedido nuevo en la cocina?», «¿Qué pasa en las horas en que hay más clientes?», «¿Qué formas de pago necesita aceptar…?», «¿Qué pasa con el cobro si falla el internet del local?», «¿Podría el sistema seguir funcionando aunque no haya internet?», «¿Cómo controla los ingredientes que se gastan?», «¿Cómo le gustaría enterarse de que un ingrediente se está acabando?». La libreta llega a 6 de 6. «Terminar entrevista». **Esperado:** 100 %, 3 estrellas, +200 XP, +120 QP; el resultado lista los 6 requerimientos y la «libreta acumulada».
- **N (puntaje parcial):** técnica equivocada → pierde los 20 puntos; elegir solo la técnica correcta y terminar → 20 %; cada pregunta improductiva (p. ej. «¿De qué color quiere que sea la aplicación?») resta 5.
- **FA2 ayuda:** resalta una pregunta del nodo actual que revela un requerimiento aún no descubierto.
- **FA3 retomar:** recargar a mitad de la entrevista → conserva técnica, conversación, libreta y turnos restantes.
- **FE1:** elegir la técnica y pulsar «Terminar entrevista» con la libreta vacía → aviso de confirmación; «Seguir editando» regresa; confirmar permite enviar (20 %).
- **FE2:** gastar los 12 turnos → la entrevista se envía sola y abre el resultado.
- **FE (sin técnica):** «Terminar entrevista» deshabilitado hasta elegir la técnica; por API, preguntar sin técnica → 400.

### CU-04 Detectar fallas de calidad inspeccionando un sistema (fase 3, reto 1, RF-07, RN-19)

Requiere haber completado la fase 2.

- **N:** recorrer las 3 pantallas de «SaludYa»; marcar y asignar: «Contraseña» → Seguridad, «¿Olvidaste tu contraseña?» → Usabilidad, «Estado de la búsqueda» (carga de 12 s) → Eficiencia de desempeño, «Confirmar cita» → Usabilidad, «Próximas citas» (duplicada) → Adecuación funcional, «Aviso del sistema» → Fiabilidad. **Esperado:** 100 %, +250 XP, +180 QP; la retroalimentación explica cada falla.
- **N (parcial):** una falla marcada con atributo equivocado vale el 60 % de su valor; cada marca sobre un elemento sin falla resta la mitad del valor de una falla (8.33 puntos).
- **FA4:** cambiar el atributo de una marca o retirarla con el ícono de papelera mientras el intento sigue en curso.
- **FA2 ayuda:** la pestaña de una pantalla con una falla sin marcar pulsa y se muestra la pista.
- **FE1:** marcar elementos hasta llegar a 9 marcas; intentar una décima muestra «Llegaste al máximo de 9 marcas…» (y por API, `PUT /borrador` con 10 marcas → 400).
- **FE2:** una marca sin atributo deja «Enviar» deshabilitado con el aviso.
- **Sin marcas:** enviar sin marcar nada es válido y da 0 %.

### CU-06 Equilibrar atributos de calidad repartiendo un presupuesto (fase 3, reto 2, RF-09, RN-21)

- **N:** asignar Seguridad 8, Usabilidad 6, Eficiencia de desempeño 4, Mantenibilidad 2 (medidores 70, 62, 45, 34) y elegir la justificación «Prioricé Seguridad y Usabilidad…». **Esperado:** 100 %, +300 XP, +220 QP; la retroalimentación muestra el reparto de referencia y los medidores.
- **N (parcial):** reparto 5-5-5-5 con la justificación equivocada → 57 %, reprobado (2 de 3 restricciones: Seguridad llega a 55 < 70).
- **FA (control):** usar los botones + / − y el deslizador; el medidor cambia al instante y los efectos cruzados se ven (subir Seguridad baja Eficiencia y Usabilidad).
- **FA2 ayuda:** señala la restricción más lejos de cumplirse con el reparto actual.
- **FE1:** con 0 puntos restantes, «+» queda deshabilitado en todos los atributos (y por API, `PUT /borrador` con 24 puntos → 400).
- **FE2:** con una restricción incumplida, «Enviar» pide confirmar y lista cuáles; confirmar sí envía.
- **Faltante:** sin elegir justificación, «Enviar» queda deshabilitado.

### Flujos comunes

- **RN-07:** repetir un reto ya aprobado y volver a aprobarlo muestra +0 XP / +0 QP en el resultado y el HUD no cambia.
- **RN-04:** cualquier intento con ayuda y 100 % da 2 estrellas, no 3.
- **RN-08:** en la fase 2, el reto 2 aparece «Bloqueado» en el tablón hasta aprobar el reto 1.
- **RN-01 / RN-09:** la fase 2 se completa solo al aprobar sus dos retos; entonces se desbloquea la fase 3.
- **RN-05:** un intento peor después de uno mejor no quita la mejor marca ni la aprobación (se ve en el tablón y en el resultado).
- **Aislamiento:** con otro usuario, abrir `/intento/<id de otro estudiante>` muestra «Intento no encontrado».

## 8. Pendientes conocidos

- **Sprint 3 (fuera de alcance):** CU-02, CU-05, CU-07 y sus mecánicas (`ARMADO_PIEZAS`, `SIMULADOR_ESCENARIOS`, `EXPEDIENTE_PROYECTO` existen en el enum pero responden 501), repaso con tarjetas y reto diario (el contenido archivado está listo), lógica de racha (el multiplicador vale siempre 1.00), tienda, compra y equipar objetos (y validar el máximo de 2 equipados), duelos, tabla de clasificación, logros y habilidades; los módulos `social` y esas tablas siguen como estaban.
- **La pista de la ayuda no se guarda:** al recargar el intento, el cinto indica "ayuda usada" pero la pista no se vuelve a mostrar.
- **Los efectos propios de cada objeto** (descartar una opción, +50 % de XP) no existen; todos los objetos dan la pista de la mecánica.
- **Intentos abandonados:** un `EN_CURSO` nunca caduca; solo se retoma. No hay índice único parcial en la base de datos (se controla en el servicio).
- **Pruebas de frontend:** no existe infraestructura (vitest o similar); la interfaz se verificó con un recorrido de navegador que no está en el repositorio. Conviene añadir Playwright o similar al proyecto.
- **Accesibilidad del arrastre:** las alternativas (selectores y botones) están implementadas y verificadas con el navegador; el sensor de teclado de dnd-kit está activo pero no se probó con lectores de pantalla.
- **Tamaño del bundle** del frontend: 540 kB (aviso de Vite); se puede dividir con importaciones dinámicas.
- **Documentación desactualizada:** `ESTADO_ACTUAL_PROYECTO.md`, `DIAGNOSTICO_SPRINT2.md` (sin commit) y los README de `backend/` y `frontend/` describen estados anteriores o son plantillas.
- **`.env` local** apunta a túneles de Cloudflare inactivos (ver decisión 24).
- **Ruido en jest:** con las suites en paralelo y la máquina cargada aparece "A worker process has failed to exit gracefully"; con `--runInBand` no ocurre y no hay fugas.
- **`npm audit`** reporta vulnerabilidades en dependencias de desarrollo del frontend; no se atendieron.
- `GET /` sigue devolviendo el "Hello World!" del esqueleto de Nest.
