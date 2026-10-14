# PickQuest — frontend

Aplicación web de PickQuest hecha con React, Vite y TypeScript. Cómo levantarla, las variables de entorno (`VITE_API_URL`), las pruebas y la estructura del proyecto están en el [README de la raíz](../README.md).

Comandos útiles (dentro del contenedor: `docker compose exec frontend <comando>`):

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo con hot reload (lo usa el compose) |
| `npm run build` | `tsc -b` y compilación de producción |
| `npm run lint` | oxlint |
| `npm run test:e2e` | Suite de Playwright (ver la sección «Pruebas» de la raíz; con Docker: `docker compose --profile e2e run --rm e2e`) |
