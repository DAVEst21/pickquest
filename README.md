# PickQuest

PickQuest es una plataforma gamificada para aprender el ciclo de vida del software (SDLC). La persona avanza por un mapa de fases (el *Overworld*) y en cada fase resuelve retos que no son de opción múltiple, sino **mecánicas de juego** que ejercitan una habilidad real de ingeniería de software. Cada intento se califica en el servidor (porcentaje, estrellas, XP y QP), se conserva la mejor calificación y la siguiente fase se desbloquea al completar la anterior.

Retos disponibles (Sprint 2):

| Fase | Reto | Mecánica |
|---|---|---|
| 1. Ciclo de vida del software | Planificar un proyecto en una línea de tiempo (CU-08) | Gantt con dependencias y fecha límite |
| 2. Elicitación de requerimientos | Descubrir requerimientos dialogando con un stakeholder (CU-01) | Diálogo ramificado conducido por el servidor |
| 2. Elicitación de requerimientos | Construir historias de usuario armando sus piezas (CU-02) | Piezas Como/Quiero/Para y Dado/Cuando/Entonces |
| 2. Elicitación de requerimientos | Priorizar requerimientos en un tablero MoSCoW (CU-03) | Tablero de priorización |
| 3. Atributos de calidad | Detectar fallas de calidad inspeccionando un sistema (CU-04) | Inspección de una aplicación ficticia |
| 3. Atributos de calidad | Equilibrar atributos de calidad repartiendo un presupuesto (CU-06) | Medidores con efectos cruzados |

Las respuestas correctas y los datos de referencia **nunca viajan al navegador** antes de calificar.

## Stack

| Capa | Tecnología |
|---|---|
| Backend | NestJS 10, TypeScript, Prisma 5, JWT (passport), Swagger |
| Base de datos | PostgreSQL 16 (modelo relacional: sin JSON de contenido ni de respuestas) |
| Frontend | React 19, Vite, TypeScript, Tailwind 3, TanStack Query, Zustand, React Router, dnd-kit |
| Pruebas | Jest y Supertest (backend), Playwright (navegador) |
| Infraestructura | Docker Compose |

## Cómo levantarlo

Requisitos: Docker con Docker Compose.

```bash
docker compose up --build
```

Al arrancar, el backend aplica las migraciones (`prisma migrate deploy`), carga el seed (idempotente) y queda en modo desarrollo con recarga; el frontend corre con Vite (hot reload).

| Servicio | URL |
|---|---|
| Aplicación (frontend) | http://localhost:5173 |
| API (backend) | http://localhost:3000 |
| Documentación de la API (Swagger) | http://localhost:3000/docs |
| PostgreSQL | `localhost:5432` (usuario, clave y base `pickquest`) |

Para empezar de cero (borra la base de datos): `docker compose down -v && docker compose up --build`.

### ⚠️ Advertencia: `CORS_ORIGIN` y `VITE_API_URL` en el `.env`

Docker Compose lee automáticamente un archivo `.env` en la raíz (está en el `.gitignore`) y esas variables **tienen prioridad** sobre los valores por defecto del compose. Si ese archivo conserva direcciones de otro entorno —por ejemplo túneles de Cloudflare ya apagados— la aplicación abre pero no funciona:

- `VITE_API_URL` es la dirección a la que el navegador llama al backend. Para trabajo local debe ser `http://localhost:3000` (o no estar definida).
- `CORS_ORIGIN` es el origen que el backend permite. Para trabajo local debe ser `http://localhost:5173` (o no estar definida).

Síntoma típico: la pantalla de inicio de sesión dice «No se pudo conectar con el servidor». Si cambias el `.env`, recrea los contenedores: `docker compose up -d --force-recreate backend frontend`.

### Variables de entorno

| Variable | Dónde | Por defecto | Para qué |
|---|---|---|---|
| `DATABASE_URL` | backend | la del compose | Conexión a PostgreSQL (obligatoria) |
| `JWT_SECRET` | backend | `changeme` | Firma de los tokens (obligatoria; cámbiala fuera de desarrollo) |
| `JWT_EXPIRES_IN` | backend | `1d` | Vigencia del token |
| `CORS_ORIGIN` | backend | `http://localhost:5173` | Origen permitido por CORS |
| `PORT` | backend | `3000` | Puerto del API |
| `VITE_API_URL` | frontend | `http://localhost:3000` | URL del backend que usa el navegador |

Ejemplos en `backend/.env.example` y `frontend/.env.example`.

## Usuario demo

| Campo | Valor |
|---|---|
| Correo | `demo@pickquest.dev` |
| Contraseña | `pickquest123` |

Arranca sin intentos, con nivel 1 y 3 Pociones de Sabiduría **equipadas** (las que usa la ayuda de los retos). También puedes registrar usuarios nuevos desde la pantalla de registro.

## Pruebas

Todo se corre con la aplicación levantada (`docker compose up`).

### Unitarias del backend (Jest)

Fórmulas de calificación (RN-16, 18, 19, 21 y 23), faltantes de cada mecánica, estados de fase y de reto, multiplicador de QP, persistencia de pistas y retroalimentación:

```bash
docker compose exec backend npm test
```

### e2e del backend (Jest + Supertest)

Usan la base de datos real con el seed cargado, crean estudiantes de prueba y los borran al terminar:

```bash
docker compose exec backend npm run test:e2e
```

### e2e del navegador (Playwright)

La suite está en `frontend/e2e/` y recorre la aplicación real como lo haría una persona: mapa → tablón → reto → resultado de las 5 mecánicas (arrastrando barras y tarjetas), los flujos alternativos y de excepción más importantes (confirmaciones, envío automático, ayuda, recarga con el avance conservado) y la retroalimentación de un intento no aprobado. Guarda capturas de pantalla en `docs/capturas/`.

Antes de empezar la suite **reinicia el progreso del usuario demo** (borra sus intentos, y deja 0 XP, 0 QP y 3 pociones), y avisa con un mensaje claro si el `.env` dejó mal `CORS_ORIGIN` o `VITE_API_URL`.

**Con Docker (recomendado; no requiere instalar nada):**

```bash
docker compose --profile e2e run --rm e2e
```

El servicio `e2e` usa la imagen oficial de Playwright (con el navegador incluido), instala las dependencias de `frontend/` y corre `playwright test` contra el frontend y el backend del compose.

**Desde tu máquina** (requiere Node 20+ y que la aplicación esté en `localhost:5173` y `localhost:3000`):

```bash
cd frontend
npm ci
npx playwright install chromium
npm run test:e2e
```

La suite también ejecuta los 24 casos del libro de CU-03/CU-04 con estudiantes temporales y guarda evidencia en `docs/evidencias/`. Las pruebas de recuperación simulan fallos de carga, guardado y respuesta de envío perdida.

Variables opcionales de la suite: `E2E_BASE_URL` (por defecto `http://localhost:5173`), `E2E_FRONT_URL` y `E2E_BACK_URL` (para las comprobaciones previas), `E2E_DATABASE_URL` (por defecto `postgresql://pickquest:pickquest@localhost:5432/pickquest`) y `E2E_CAPTURAS` (carpeta de las capturas).

Para reejecutar únicamente recuperación después del recorrido completo, sin reiniciar el demo:

```bash
docker compose --profile e2e run --rm -e E2E_CONSERVAR_DEMO=1 e2e sh -c 'npm ci --no-audit --no-fund && npx playwright test e2e/04-recuperacion.spec.ts'
```

### Carga de 30 estudiantes

Con la API levantada y el seed cargado:

```bash
docker compose exec backend npx ts-node --transpile-only test/carga-sprint2.ts
```

Ejecuta seis lotes de 30 envíos concurrentes, uno por mecánica; crea y elimina sus propios estudiantes. El informe HTTP se escribe en `/tmp/carga-sprint2.json` dentro del contenedor. No incluye el tiempo de renderizado del navegador.

### Compilación y lint

```bash
docker compose exec backend npm run build
docker compose exec frontend npm run build   # tsc -b + vite build
docker compose exec frontend npm run lint    # oxlint
```

## Capturas

Generadas por la suite de Playwright (`docs/capturas/`):

| | |
|---|---|
| Mapa | ![Mapa](docs/capturas/01-mapa.png) |
| Tablón de una fase | ![Tablón](docs/capturas/02-tablon-fase.png) |
| Línea de tiempo (en curso / resultado) | ![CU-08 en curso](docs/capturas/03-linea-tiempo-en-curso.png) ![CU-08 resultado](docs/capturas/04-linea-tiempo-resultado.png) |
| Diálogo con stakeholder | ![CU-01 en curso](docs/capturas/05-dialogo-en-curso.png) ![CU-01 resultado](docs/capturas/06-dialogo-resultado.png) |
| Tablero MoSCoW (con la pista de la ayuda) | ![CU-03 en curso](docs/capturas/07-moscow-en-curso-con-pista.png) ![CU-03 resultado](docs/capturas/08-moscow-resultado.png) |
| Inspección de un sistema | ![CU-04 en curso](docs/capturas/09-inspeccion-en-curso.png) ![CU-04 resultado](docs/capturas/10-inspeccion-resultado.png) |
| Reparto de presupuesto | ![CU-06 en curso](docs/capturas/11-presupuesto-en-curso.png) ![CU-06 resultado](docs/capturas/12-presupuesto-resultado.png) |
| Resultado de un intento no aprobado (sin la solución) | ![No aprobado](docs/capturas/13-presupuesto-resultado-no-aprobado.png) |

## Estructura de carpetas

```
pickquest/
├── docker-compose.yml          # db, backend, frontend y (con --profile e2e) la suite de navegador
├── backend/                    # API NestJS
│   ├── prisma/
│   │   ├── schema.prisma       # modelo relacional
│   │   ├── migrations/         # migraciones SQL
│   │   ├── seed.ts             # 3 fases, 6 retos, objetos y usuario demo (idempotente)
│   │   ├── contenido/          # contenido educativo de cada reto
│   │   └── contenido-archivado/# retos de opción múltiple del Sprint 1 (solo datos)
│   ├── src/
│   │   ├── common/             # Prisma, configuración y utilidades
│   │   └── modules/
│   │       ├── auth/           # registro, login, perfil, JWT
│   │       ├── aprendizaje/    # fases, tablón, intentos, borrador, ayuda, calificación
│   │       │   └── mecanicas/  # un evaluador por mecánica + fórmulas puras de calificación
│   │       ├── progreso/       # XP, QP, nivel y multiplicador
│   │       ├── economia/       # inventario y objetos equipados
│   │       └── social/         # vacío (Sprint 3)
│   └── test/                   # pruebas e2e del backend
├── frontend/                   # React + Vite
│   ├── src/
│   │   ├── components/         # Header, Footer, modales...
│   │   ├── features/           # auth, overworld, mision (tablón), reto (una carpeta por mecánica), resultado
│   │   ├── services/           # cliente HTTP, TanStack Query
│   │   ├── store/              # Zustand (sesión y perfil)
│   │   └── types/
│   └── e2e/                    # suite de Playwright
├── docs/capturas/              # capturas generadas por la suite de Playwright
├── REPORTE_SPRINT2.md          # reporte del Sprint 2 (esquema, endpoints, decisiones, pruebas manuales)
└── ADENDA_SPRINT2.md           # ajustes posteriores al reporte
```

## Más documentación

- [`REPORTE_SPRINT2.md`](REPORTE_SPRINT2.md): esquema de la base de datos, endpoints, decisiones, contenido del seed y pasos de prueba manual de cada caso de uso.
- [`ADENDA_SPRINT2.md`](ADENDA_SPRINT2.md): cambios hechos después del reporte.
- [`docs/VERIFICACION_SPRINT2.md`](docs/VERIFICACION_SPRINT2.md): correcciones, contratos, trazabilidad y resultados de esta entrega.
- [`ESTADO_ACTUAL_PROYECTO.md`](ESTADO_ACTUAL_PROYECTO.md): diagnóstico **histórico** del proyecto antes del Sprint 1 (no describe el estado actual).


### CU-02 y cuenta de revisión

CU-02 forma parte del Sprint 2 y se abre desde el mismo mapa y tablón que los demás retos. El orden de Elicitación es diálogo → historias de usuario → MoSCoW. La migración conserva el ID y los intentos de MoSCoW al moverlo al tercer lugar; no requiere borrar la base.

Para generar una cuenta independiente con los seis retos resueltos al 100 %, usando las operaciones de la API:

```bash
docker compose exec backend npm run revision:preparar
```

La herramienta genera credenciales nuevas y las guarda en `/tmp/pickquest-revision.json` dentro del contenedor (fuera de Git). Si el correo previsto ya existe, crea otro sin sobrescribirlo. La cuenta no se usa para pruebas destructivas. Consulta los resultados de esta entrega en [Verificación de CU-02](docs/VERIFICACION_CU02.md).
