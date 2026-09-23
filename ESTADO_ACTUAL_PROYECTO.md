# ESTADO ACTUAL DEL PROYECTO PICKQUEST

> NOTA: este es el diagnóstico INICIAL, previo a construir el backend. Desde entonces se implementaron el esquema de
> Prisma con sus migraciones, los módulos Auth y Aprendizaje, y la conexión del frontend al backend real
> (ver los commits de la rama feature/backend-auth-aprendizaje). Se conserva como referencia histórica.

Diagnóstico hecho el 2026-09-22 sobre el commit 9cc998d (rama main) y revisado después del pull a cc63524, que solo cambia textos de la UI (ver sección 12). Solo se describe lo que existe en el código; no se modificó nada del proyecto.

RESUMEN EN 5 LÍNEAS
- El backend es el proyecto inicial de NestJS 10 sin cambios: un solo endpoint GET / que devuelve "Hello World!". No existe ningún módulo de negocio (Auth, Aprendizaje, Progreso, Economía, Social).
- Prisma está instalado y configurado para PostgreSQL, pero schema.prisma NO TIENE NINGÚN MODELO. No hay migraciones y la base de datos está vacía (0 tablas).
- El frontend (React 19 + Vite 6 + Tailwind 3) tiene 4 pantallas para el estudiante (CU-01 a CU-04), pero funcionan 100% con datos simulados (mocks) en memoria. No hace ni una sola llamada HTTP al backend.
- No hay autenticación, JWT, hashing, guards, Swagger ni integración con Judge0: solo existen las variables JWT_SECRET, JUDGE0_API_URL y JUDGE0_API_KEY en .env.example.
- Con docker compose, la base de datos y el backend arrancan bien. El contenedor del frontend NO se construye porque package.json incluye un paquete que solo funciona en Windows (ver sección 13).

---------------------------------------------------------------------

## 1. ESTRUCTURA COMPLETA DEL REPOSITORIO (sin node_modules)

```
.gitignore
README.md                      -> contiene solo: "# pickquest"
docker-compose.yml
backend/
  .env.example
  .eslintrc.js
  .prettierrc
  Dockerfile
  nest-cli.json
  package.json                 -> NO hay package-lock.json en backend
  README.md                    -> README por defecto de NestJS, sin cambios
  tsconfig.json
  tsconfig.build.json
  prisma/schema.prisma         -> sin modelos
  src/app.controller.ts
  src/app.controller.spec.ts
  src/app.module.ts
  src/app.service.ts
  src/main.ts
  test/app.e2e-spec.ts
  test/jest-e2e.json
frontend/
  .gitignore
  .oxlintrc.json
  Dockerfile
  index.html
  package.json
  package-lock.json
  postcss.config.js
  tailwind.config.ts
  tsconfig.json, tsconfig.app.json, tsconfig.node.json
  vite.config.ts
  README.md                    -> README por defecto de la plantilla Vite
  public/favicon.svg, public/icons.svg
  src/main.tsx
  src/App.tsx
  src/App.css                  -> sobrante de la plantilla Vite; no se importa en ningún lado
  src/index.css
  src/router.tsx
  src/assets/hero.png, react.svg, vite.svg   -> sobrantes de la plantilla; no se usan
  src/components/Header.tsx, Footer.tsx, Toast.tsx
  src/features/overworld/OverworldPage.tsx   (528 líneas)
  src/features/mision/MisionPage.tsx         (453 líneas)
  src/features/reto/RetoPage.tsx             (892 líneas)
  src/features/resultado/ResultadoPage.tsx   (467 líneas)
  src/services/api.ts          -> "API" simulada (mocks)
  src/services/queries.ts      -> hooks de TanStack Query
  src/services/mocks/data.ts   -> datos mock
  src/store/playerStore.ts     -> store de Zustand
  src/types/index.ts           -> tipos del dominio en el frontend
```

No existe una carpeta de documentación (docs/). No hay diagramas, casos de uso ni reglas de negocio escritos en el repo; solo hay referencias sueltas a CU-01..CU-04, CU-08, RN-01, RN-03 y RN-11 en comentarios del código. Desde el commit cc63524 ya no aparecen en los textos visibles de la UI.

## 2. STACK TECNOLÓGICO REAL

Backend (versiones instaladas en el contenedor):
- Node 20.20.2 (imagen node:20-alpine), npm 10.8.2
- NestJS 10.4.22 (@nestjs/common, core, platform-express; cli 10.4.9)
- Prisma 5.22.0 (prisma y @prisma/client). Proveedor: postgresql
- TypeScript 5.9.3
- Jest 29.7 + ts-jest + supertest
- ESLint 8.57 + @typescript-eslint 8 + Prettier 3
- Gestor de paquetes: npm, pero SIN lockfile (las versiones exactas pueden cambiar en cada instalación)
- No están instalados: @nestjs/config, @nestjs/jwt, @nestjs/passport, passport, bcrypt/argon2, class-validator, class-transformer, @nestjs/swagger, ni ningún cliente HTTP (axios, @nestjs/axios).

Frontend (versiones fijadas en package-lock.json):
- React 19.3.0 + react-dom 19.3.0
- Vite 6.0.0 + @vitejs/plugin-react 4.3.4
- TypeScript 6.0.3 (package.json: "~6.0.2")
- react-router-dom 7.18.4 (usa createBrowserRouter)
- @tanstack/react-query 5.103.2
- zustand 5.0.15
- tailwindcss 3.4.17 + postcss + autoprefixer (están en "dependencies", no en "devDependencies")
- oxlint 1.85 como linter (no usa ESLint)
- Gestor de paquetes: npm, con package-lock.json
- No se usa axios ni fetch: no hay cliente HTTP real.

Base de datos: PostgreSQL 16 (imagen postgres:16-alpine) en docker-compose.

Comparación con el diseño documentado:
- "Backend NestJS como monolito modular" -> NestJS SÍ se usa, pero el código aún no tiene módulos: solo AppModule.
- "Frontend SPA en React" -> SÍ coincide (React + Vite, SPA con react-router).
- "PostgreSQL vía Prisma" -> la configuración SÍ existe (datasource postgresql y @prisma/client), pero no hay modelos, no se genera PrismaService y nada del código usa Prisma.

## 3. ESTRUCTURA DE CARPETAS FRENTE A LA CONVENCIÓN DOCUMENTADA

Backend. Convención: backend/src/modules/{auth, aprendizaje, progreso, economia, social} + common
- Realidad: no existen ni backend/src/modules/ ni backend/src/common/. Solo están los 4 archivos del proyecto inicial de Nest (app.controller, app.service, app.module, main) y su spec.

Frontend. Convención: frontend/src/{features, components, services}
- Realidad: SÍ la sigue. Además tiene carpetas que no aparecen en la convención: src/store/ (Zustand), src/types/ y src/services/mocks/.
- features/ está organizado por pantalla (overworld, mision, reto, resultado), no por módulo de dominio.

## 4. MÓDULOS DEL BACKEND

| Módulo      | Estado     | Detalle |
|-------------|------------|---------|
| Auth        | NO EXISTE  | Sin archivos, sin dependencias. Solo existe JWT_SECRET en .env.example |
| Aprendizaje | NO EXISTE  | - |
| Progreso    | NO EXISTE  | - |
| Economía    | NO EXISTE  | - |
| Social      | NO EXISTE  | - |
| common      | NO EXISTE  | - |
| AppModule   | Proyecto inicial | AppController + AppService "Hello World" |

AppModule no tiene imports. main.ts escucha en process.env.PORT o 3000 y no configura CORS, prefijo global, ValidationPipe ni Swagger.

## 5. ESQUEMA DE PRISMA (contenido completo y literal de backend/prisma/schema.prisma)

```prisma
// This is your Prisma schema file,
// learn more about it in the docs: https://pris.ly/d/prisma-schema

generator client {
  provider      = "prisma-client-js"
  binaryTargets = ["native", "linux-musl-openssl-3.0.x"]
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

- Entidades/modelos: NINGUNO. Tampoco hay enums, relaciones, índices ni reglas onDelete.
- `npx prisma validate` -> "The schema at prisma/schema.prisma is valid".
- binaryTargets incluye linux-musl-openssl-3.0.x para Alpine (el commit 6caf13f también agregó openssl al Dockerfile).

El único modelo de dominio que existe está en el frontend, en src/types/index.ts, como interfaces TypeScript (no son tablas). Sirve de pista de lo que se esperaba modelar:
- TemaFase = 'ELICITACION' | 'ATRIBUTOS_CALIDAD' | 'CODIGO_PRUEBAS'
- EstadoFase = 'bloqueada' | 'desbloqueada' | 'en_progreso' | 'completada'
- Fase { id: number; nombre: string; tema: TemaFase; dificultad: string; orden: number; estado: EstadoFase; descripcionNarrativa?: string; subtitulo?: string; sprint?: string; progreso?: number (0-100); calificacionEstrellas?: number (0-3); recompensaQp?: number; recompensaXp?: number; bloqueoRazon?: string; icono?: string; esBoss?: boolean }
- ObjetivoMision { id: string; texto: string; descripcion: string; tag: string; requerido?: boolean; umbral?: number }
- ItemGarantizado { nombre: string; tipo: string; descripcion: string }
- RecompensasFase { xp: number; qp: number; itemGarantizado?: ItemGarantizado; rangoMaestria?: string }
- Reto { id: number; faseId: number; criteriosAceptacion: string; calificacionMinima: number (comentario: "0.8 según RN-03 (80%)"); titulo?; subtitulo?; escenario?; tiempoSugerido?: string; objetivos?: ObjetivoMision[]; recompensas?: RecompensasFase }
- HitoDesglose { id: string; nombre: string; descripcion: string; puntos: number; superado: boolean }
- IntentoReto { id: number; retoId: number; faseId: number; calificacionEstrellas: number (0-3); porcentaje: number (0-100); xpGanado: number; qpGanado: number; aprobado: boolean; usoAyuda: boolean; desgloseHitos?: HitoDesglose[] }
- Estudiante { nivel: number; xpTotal: number; xpSiguienteNivel: number; qpTotal: number; racha: { diasActuales: number }; titulo?: string; avatarUrl?: string }
- Consumible { id: string; nombre: string; tipo: string; descripcion: string; icono: string; usado: boolean }  (se define pero no se usa en ningún lado)

Nota: "estado" (EstadoFase) está dentro de Fase. En un modelo relacional ese estado debería depender de cada estudiante (algo como ProgresoFase), no de la fase global.

## 6. MIGRACIONES

- No existe la carpeta backend/prisma/migrations.
- `npx prisma migrate status` -> "No migration found in prisma/migrations. The current database is not managed by Prisma Migrate."
- En la BD (psql \dt) -> "Did not find any relations" (0 tablas).
- ¿La BD coincide con schema.prisma? Sí, pero solo porque ambos están vacíos.
- No hay seed (ni prisma/seed.ts ni la clave "prisma.seed" en package.json).

## 7. ENDPOINTS DE LA API

Endpoints que realmente existen (verificado con curl y con los logs de Nest):
- GET /  -> 200 "Hello World!"
Cualquier otra ruta devuelve 404 (por ejemplo, GET /api -> 404).

Swagger/OpenAPI: no existe (no está @nestjs/swagger ni hay configuración en main.ts).

Endpoints que el frontend "espera" según las funciones simuladas de services/api.ts (no hay rutas HTTP definidas, solo nombres de funciones):
- getFases()                             -> CU-01, listado de fases
- getFaseDetalle(faseId)                 -> CU-02, fase + reto
- enviarIntento(faseId, retoId, payload) -> CU-03, payload = { respuesta: { clasificaciones?: Record<number,string>, tradeoff?: 'A'|'B' }, usoAyuda: boolean }
- getIntento(intentoId)                  -> CU-04
- getEstudiante()                        -> perfil del estudiante autenticado

## 8. AUTENTICACIÓN

No está implementada en ninguna capa:
- Backend: no hay JWT, estrategia de passport, hashing de contraseñas ni guards. Solo existe JWT_SECRET=changeme en .env.example, que ningún código lee (tampoco se instaló @nestjs/config).
- Frontend: no hay pantallas de login ni de registro, no se guarda ningún token y no hay rutas protegidas. El "estudiante autenticado" es un mock fijo.

## 9. INTEGRACIÓN CON JUDGE0

No existe. Solo están JUDGE0_API_URL= y JUDGE0_API_KEY= (vacías) en .env.example. No hay cliente HTTP ni servicio. El único reto implementado (en el frontend) es de clasificación y opción múltiple, no de código; la "evaluación" es una función local en services/api.ts.

## 10. PRUEBAS

Backend (ejecutadas dentro del contenedor):
- `npm test` -> 1 suite, 1 test, PASA (src/app.controller.spec.ts: "should return Hello World!").
- `npm run test:e2e` -> 1 suite, 1 test, PASA (test/app.e2e-spec.ts: GET / -> 200 "Hello World!").
- Son las pruebas por defecto del proyecto inicial. No hay pruebas de lógica de negocio.

Frontend:
- No hay ninguna prueba: ni framework de testing (Vitest/Jest) ni archivos *.test/*.spec.
- `npm run build` (tsc -b && vite build) -> COMPILA SIN ERRORES (probado en un contenedor desechable; bundle JS de 469 kB).
- `oxlint` -> 0 warnings, 0 errores.

Lint del backend:
- `eslint "{src,test}/**/*.ts"` -> 84 errores, todos "Delete ␍" (prettier/prettier). Los archivos tienen fin de línea CRLF porque git está configurado con core.autocrlf=true en esta máquina Windows, y Prettier 3 exige LF por defecto. No hay .gitattributes. Nota: `npm run lint` usa --fix, así que en la práctica reescribiría los archivos.

## 11. CONFIGURACIÓN

backend/.env.example:
```
DATABASE_URL=postgresql://pickquest:pickquest@db:5432/pickquest
JWT_SECRET=changeme
JUDGE0_API_URL=
JUDGE0_API_KEY=
```
- No existe un .env real (está en .gitignore). El host "db" solo se resuelve dentro de la red de docker-compose. Para correr el backend fuera de Docker habría que usar localhost.
- El frontend no tiene .env ni usa variables VITE_*. No hay URL del API configurada ni proxy en vite.config.ts.

docker-compose.yml (servicios):
- db: postgres:16-alpine, usuario/contraseña/BD = pickquest, puerto 5432:5432, volumen db_data.
- backend: build ./backend, puerto 3000:3000, DATABASE_URL apuntando a db. Monta ./backend en /app (bind mount) y usa un volumen anónimo para /app/node_modules. Solo recibe DATABASE_URL: NO recibe JWT_SECRET ni las variables de JUDGE0. depends_on db (sin healthcheck).
- frontend: build ./frontend, puerto 5173:5173, con bind mount del código. depends_on backend.
- No hay servicio para Judge0.

Dockerfiles:
- backend: node:20-alpine + openssl, npm install, CMD npm run start:dev. No ejecuta prisma generate ni migrate.
- frontend: node:20-alpine, npm install, CMD npm run dev -- --host.

Scripts:
- backend: build, format, start, start:dev, start:debug, start:prod, lint (con --fix), test, test:watch, test:cov, test:debug, test:e2e. No hay scripts de prisma (migrate, generate, seed).
- frontend: dev (vite), build (tsc -b && vite build), lint (oxlint), preview.

## 12. ESTADO DE GIT

- Rama: main, al día con origin/main (git@github.com:DAVEst21/pickquest.git).
- Árbol de trabajo limpio al empezar el diagnóstico. Después de este diagnóstico, el único archivo nuevo es ESTADO_ACTUAL_PROYECTO.md, sin commitear.
- Commits:
  - cc63524 2026-09-22 (Camila Sanchez) refactor: ocultar identificadores internos (CU-*, RN-*) de la UI. Solo cambia textos en Header, MisionPage, OverworldPage, ResultadoPage, RetoPage y mocks/data.ts (por ejemplo, "RN-01: Requiere fase anterior" -> "Requiere fase anterior" y "RN-11 (x/2)" -> "Usos: x/2"). No cambia lógica. En RetoPage deja una línea vacía donde estaba la etiqueta "CU-08".
  - 9cc998d (Dave) 2026-09-22 feat(frontend): implementar CU-01 a CU-04 para actor estudiante
  - 6caf13f (Dave) 2026-09-21 fix: agregar soporte de openssl en Dockerfile de backend para Prisma
  - 06aca14 (Dave) 2026-09-21 chore: estructura inicial del proyecto con Docker
  - 23a9af8 (Dave) 2026-09-21 first commit
- TODO/FIXME/HACK en el código: ninguno.

## 13. FRONTEND: QUÉ HACE CADA PANTALLA

Rutas (src/router.tsx):
- /                      -> OverworldPage (CU-01, mapa de fases del SDLC)
- /mision/:faseId        -> MisionPage (CU-02, briefing de la misión)
- /reto/:faseId          -> RetoPage (CU-03, resolver el reto)
- /resultado/:intentoId  -> ResultadoPage (CU-04, resultado del intento)
- *                      -> redirige a /

Flujo de datos: página -> hook de React Query (services/queries.ts) -> función de services/api.ts -> datos de services/mocks/data.ts, con retrasos simulados de 250 a 700 ms. Los intentos se guardan en un Map en memoria (se pierden al recargar). El jugador (XP, QP, nivel, racha) vive en Zustand (store/playerStore.ts), también en memoria.

Datos mock: 7 fases (1 Planificación y 2 Elicitación: completadas; 3 Calidad & Arquitectura: en_progreso; 4 Diseño Detallado: desbloqueada; 5, 6 y 7: bloqueadas), un solo reto (id 204) y un intento fallido de ejemplo (id 204, 68%).

Evaluación simulada (services/api.ts, enviarIntento):
- Respuestas correctas fijas: req1 = 'seguridad', req2 = 'desempeno', req3 = 'usabilidad', tradeoff = 'A'.
- Puntaje: cada requisito vale 1 y el tradeoff vale 2, sobre un total de 5. porcentaje = round(aciertos/5*100). aprobado = porcentaje >= 80.
- Estrellas: 100% -> 3; 80-99% -> 2; 50-79% -> 1; <50% -> 0.
- Si aprueba: +350 XP y +180 QP. Si no: 0.
- usoAyuda se registra, pero no afecta ni el puntaje ni las recompensas.

Store (playerStore): al aprobar suma XP y QP. Subida de nivel: mientras xpTotal >= xpSiguienteNivel, sube un nivel y el umbral aumenta 500. Valores iniciales: nivel 5, 750/1000 XP, 1420 QP, racha de 4 días, avatar con una URL externa de googleusercontent.

Borradores: RetoPage guarda el borrador en localStorage con la clave draft_reto_{faseId}.

## 14. DISCREPANCIAS E INCONSISTENCIAS ENCONTRADAS (reportadas, no corregidas)

Arranque/infraestructura:
1. BLOQUEANTE PARA DOCKER: frontend/package.json declara "@oxlint/binding-win32-x64-msvc" como devDependency explícita. Es un binario solo para Windows, así que `npm install` en el contenedor Linux falla con EBADPLATFORM y el servicio frontend de docker-compose no se puede construir.
2. El backend no tiene package-lock.json (el frontend sí), así que los builds no son reproducibles.
3. docker-compose no pasa JWT_SECRET ni JUDGE0_* al backend.
4. DATABASE_URL en .env.example usa el host "db", que solo sirve dentro de Docker.
5. No hay CORS en main.ts. Cuando el frontend (5173) llame al backend (3000) desde el navegador, las peticiones serán bloqueadas.
6. Hay finales de línea CRLF en el repo y no hay .gitattributes, por eso fallan los 84 errores de lint de Prettier en el backend.
7. @types/express ^5 (instalado 5.0.6) no coincide con NestJS 10, que usa Express 4. Hoy no causa errores de compilación.
8. Node no está instalado en la máquina host: todo se probó dentro de contenedores.

Lógica del frontend:
9. En RetoPage el estado inicial del ejercicio ya ES la respuesta correcta (clasificaciones 1: seguridad, 2: desempeno, 3: usabilidad; tradeoff 'A'). Si el estudiante envía sin tocar nada, obtiene 100% y 3 estrellas.
10. retoId está fijo en 204 al enviar (RetoPage, línea 157) y el contenido del reto (requisitos y trade-offs) está escrito directamente en el JSX. getFaseDetalle devuelve el MISMO reto (RETO_FASE_3) para cualquier fase y, si el id no existe, cae en la fase 3. Por eso todas las fases muestran el mismo ejercicio.
11. Las recompensas no cuadran entre sí:
    - MisionPage muestra +350 XP / +120 QP (RETO_FASE_3.recompensas).
    - La evaluación en api.ts otorga +350 XP / +180 QP, y RetoPage muestra "+180 QP".
    - La fase 3 del mock dice recompensaQp 400 / recompensaXp 650.
12. El umbral de 80% (RN-03) está fijo en varios sitios (api.ts, ResultadoPage con targetThreshold = 80, textos) en lugar de leer Reto.calificacionMinima (0.8), que existe pero no se usa en la evaluación.
13. usoAyuda (consumibles "Poción de Pistas" y "Pergamino de Descarte") se registra, pero no tiene ningún efecto en el puntaje ni en las recompensas.
14. OverworldPage no recorre la lista de fases: las tarjetas se dibujan a mano con índices fijos (fases[0]..fases[3]), y las fases 5, 6 y 7 (Implementación, ..., Despliegue) están escritas directamente en el JSX. Si el backend devolviera otras fases, el mapa no cambiaría.
15. Header y Footer enlazan siempre a /mision/3. Hay varios valores por defecto que apuntan a la fase 3 (useParams faseId = '3', `fase?.id || 3`, `intento?.retoId || '204'`).
16. getIntento con un id inexistente no da error: devuelve el intento fallido mock con ese id.
17. useEstudiante() / getEstudiante() y setEstudiante del store existen pero nadie los usa. El store arranca con valores fijos duplicados de ESTUDIANTE_MOCK. incrementarQP e incrementarXP tampoco se usan. incrementarXP no recalcula el nivel.
18. El tipo Consumible está definido pero no se usa. Los consumibles de RetoPage son estado local fijo.
19. "estado" de la fase es global (en Fase), no depende de cada estudiante.
20. Quedan restos de las plantillas: App.css, src/assets/*, y los README de backend y frontend son los genéricos. El README raíz está vacío.
21. Solo existen pantallas para el actor estudiante. No hay pantallas de login/registro, perfil, tienda/economía, ni social/ranking, a pesar de que existen como módulos en el diseño.

## 15. RESULTADO DE LEVANTAR EL PROYECTO

Método: `docker compose up -d --build` (Node no está instalado en el host).

- db (PostgreSQL 16): ARRANCA. Puerto 5432.
- backend (NestJS): ARRANCA. "Found 0 errors", "Mapped {/, GET} route", "Nest application successfully started". http://localhost:3000/ -> 200 "Hello World!".
- Migraciones: no hay nada que migrar (no hay modelos ni carpeta de migraciones). No se ejecutó ninguna.
- frontend: FALLA al construir la imagen. Error exacto:

```
> [frontend 4/5] RUN npm install:
npm error code EBADPLATFORM
npm error notsup Unsupported platform for @oxlint/binding-win32-x64-msvc@1.85.0: wanted {"os":"win32","cpu":"x64"} (current: {"os":"linux","cpu":"x64"})
npm error notsup Valid os:   win32
npm error notsup Actual os:  linux
target frontend: failed to solve: process "/bin/sh -c npm install" did not complete successfully: exit code: 1
```

  Como diagnóstico, en un contenedor desechable con el código copiado (sin tocar el repo), `npm ci --force` + `npm run build` + `oxlint` funcionan sin errores. Es decir, el único bloqueo del frontend es esa dependencia de plataforma.
