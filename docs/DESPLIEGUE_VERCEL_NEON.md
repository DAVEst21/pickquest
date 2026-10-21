# Despliegue de PickQuest con Vercel y Neon

## Arquitectura y rama

Se conserva React/Vite, NestJS y Prisma 5. El frontend se publica como sitio
estático; NestJS usa el soporte nativo de Vercel. PostgreSQL reside en Neon.

Crear dos proyectos Vercel sobre `DAVEst21/pickquest`:

| Proyecto propuesto | Root Directory | Framework | Production Branch |
|---|---|---|---|
| `pickquest-api` | `backend` | NestJS | `develop` |
| `pickquest-web` | `frontend` | Vite | `develop` |

Dominios asignados: `https://pickquest-web.vercel.app` y
`https://pickquest-api.vercel.app`.

Seleccionar **Node.js 22.x**. Los archivos `vercel.json` de cada directorio
configuran el build. La API se sitúa en `iad1`, cerca del proyecto Neon existente
en AWS Ohio. El frontend añade el fallback de React Router a `index.html`.

La rama de producción se configura en Vercel; `vercel.json` no cambia ese ajuste.
Verificar que esté seleccionada `develop` antes de publicar. No conectar las
previews a la base de producción: usar una rama independiente de Neon y sus
propias variables, o dejar las previews deshabilitadas hasta configurarlas.

## Variables

Configurar las variables privadas únicamente en el backend:

| Nombre | Valor |
|---|---|
| `DATABASE_URL` | URL con pool de Neon (`-pooler`), TLS habilitado |
| `DIRECT_URL` | URL directa de la misma base y rama, para migraciones |
| `JWT_SECRET` | Secreto aleatorio propio de este entorno |
| `JWT_EXPIRES_IN` | `1d`, o la vigencia elegida |
| `CORS_ORIGIN` | Origen HTTPS estable del frontend, sin `/` final |
| `NODE_ENV` | `production` |

En el frontend configurar `VITE_API_URL` con la URL HTTPS estable de la API, sin
`/` final. Esta variable se incorpora durante el build: reconstruir el frontend
después de modificarla. No copiar credenciales de Neon ni `JWT_SECRET` al frontend.

Usar las URLs entregadas por Neon, conservando sus opciones TLS. El ejemplo
`backend/.env.neon.example` no contiene credenciales. Su límite inicial de tres
conexiones por instancia es un punto de partida que debe verificarse con carga.

Ignorar `.vercel/` y los archivos `.env.*.local`. Docker Compose mantiene su base
local y configura ambas URLs apuntando al servicio `db`. Si se usa un `.env`
anterior fuera de Compose, añadir `DIRECT_URL`; en local puede coincidir con
`DATABASE_URL`.

## Build y migraciones

`npm run build:vercel` genera Prisma Client y compila NestJS. No modifica la base
de datos. Se incluyen los targets de Prisma para Linux local, Alpine y el runtime
de Vercel. El backend conserva `src/main.ts` y el arranque estándar de NestJS.

El build y el inicio de una función no deben cargar el seed ni ejecutar
migraciones. Aplicar las migraciones una sola vez por versión, después de verificar
la rama y las variables del destino y antes de desplegar código que las necesite.
En una copia preparada del backend con las dependencias instaladas:

```bash
npm run prisma:generate
npm run prisma:deploy
npm run prisma:seed
```

Para los dos últimos comandos, suministrar las variables del destino mediante
un entorno seguro o un archivo local ignorado. Nest carga `.env`; Prisma 5 también
lo usa para sus comandos. No asumir que los scripts Prisma cargan `.env.local`.
No pegar secretos en los argumentos del shell, logs ni Git.

En la primera instalación vacía aplicar las siete migraciones y cargar el seed.
Para futuras versiones probar primero las migraciones en una rama de Neon. Usar
`prisma migrate dev` únicamente en desarrollo. No usar `migrate reset` en el entorno
publicado. Actualizar el contenido educativo de forma controlada: el seed conserva
el contenido de retos que ya tienen intentos y crea una cuenta demo con contraseña
pública, que debe tratarse como cuenta de demostración.

Si se trasladan datos locales existentes, restaurar esquema, datos, secuencias e
historial `_prisma_migrations` en una base vacía, verificarlo y aplicar solo lo
pendiente. La migración histórica del Sprint 2 borra intentos anteriores y reinicia
el progreso: no volver a ejecutarla sobre información que se quiera conservar.

## Verificación antes de publicar

1. Confirmar acceso al espacio correcto de Vercel y al repositorio GitHub.
2. Confirmar la rama de Neon, su base, su estado y las variables antes de migrar.
3. Verificar generación de Prisma, compilación del backend, unitarias y build del
   frontend. El build local no certifica el empaquetado del runtime de Vercel.
4. Probar el despliegue: registro/login, mapa, inicio y autoguardado de un intento,
   envío, resultado y recuperación al recargar una ruta interna.
5. Repetir la medición de concurrencia contra un entorno aislado. Las pruebas e2e
   existentes crean y borran estudiantes y reinician el usuario demo; no ejecutarlas
   contra la base publicada con estudiantes reales.

## Destinos configurados

El espacio Vercel es `DAVE` (`dave-97d1`), con plan Hobby. Se crearon y vincularon
los dos proyectos indicados arriba. Las vistas previas automáticas permanecen
deshabilitadas hasta configurar sus URLs y variables propias; los cambios de
`develop` corresponden al entorno Production de ambos proyectos.

En Neon se reutiliza `pickquest-db`, con PostgreSQL 18, la rama `production` y una
rama aislada `preview` para preparar migraciones. Docker Compose conserva su
PostgreSQL 16 local. Las conexiones y el contenido inicial se preparan sin
transferir estudiantes ni progreso de la base local.

Si la integración Vercel de ChatGPT devuelve HTTP 403 para el espacio, usar la
sesión autorizada de Vercel CLI con `--scope dave-97d1`. La autorización de la app
Vercel en GitHub es independiente de la integración GitHub de ChatGPT. No crear
recursos en otro destino como alternativa a un permiso faltante.

## Referencias

- [NestJS en Vercel](https://vercel.com/docs/frameworks/backend/nestjs)
- [Vite en Vercel](https://vercel.com/docs/frameworks/frontend/vite)
- [Prisma con Neon](https://neon.com/docs/guides/prisma)
- [Migraciones Prisma en desarrollo y producción](https://www.prisma.io/docs/orm/v6/prisma-migrate/workflows/development-and-production)
