# PickQuest — backend

API de PickQuest hecha con NestJS, Prisma y PostgreSQL. Cómo levantarla, las variables de entorno, las pruebas y la estructura del proyecto están en el [README de la raíz](../README.md).

Comandos útiles (dentro del contenedor: `docker compose exec backend <comando>`):

| Comando | Qué hace |
|---|---|
| `npm run start:dev` | Servidor con recarga (lo usa el compose) |
| `npm test` | Pruebas unitarias |
| `npm run test:e2e` | Pruebas e2e (requieren la base con el seed) |
| `npx prisma migrate deploy` | Aplica las migraciones |
| `npx prisma db seed` | Carga el seed (idempotente) |

Swagger: http://localhost:3000/docs
