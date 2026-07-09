# ISM CRM

CRM interno para gestión de clientes, historial de interacciones y seguimiento comercial.
Arquitectura API-first en Node.js/Express + PostgreSQL (Prisma), pensada para integrarse
con otras apps internas (paquetería, etc.) vía REST.

## Estado del proyecto

**Fase 1 (completada):** Backend + base de datos + autenticación + API core.
**Fase 2 (completada):** Frontend React + Tailwind.
**Fase 3 (en curso):** Despliegue en Railway — backend ya desplegado y verificado
(`/api/health` responde `{"status":"ok"}`); falta desplegar el frontend como segundo servicio.

## Estructura de carpetas

```
/backend
  /prisma
    schema.prisma      # esquema de base de datos
    seed.js             # datos iniciales (estatus + admin)
  /src
    /config             # prisma client, swagger
    /controllers         # lógica de negocio
    /middleware           # auth (JWT + API key), roles
    /routes                # definición de endpoints + docs OpenAPI
    /utils                  # validación con zod
    app.js
    server.js
  Dockerfile
  railway.json
/frontend
  /src
    /api        # cliente axios con JWT automático
    /context     # AuthContext (login/logout/sesión)
    /components   # Layout, Kanban, modales, badges
    /pages          # Login, Dashboard, Clientes, Detalle, Tareas, Admin
  Dockerfile      # build de Vite + nginx (SPA)
  nginx.conf.template
  railway.json
```

## Esquema de base de datos (resumen)

- **users**: id, fullName, email, passwordHash, role (ADMIN/SUPERVISOR/AGENT), active
- **statuses**: id, name, order, isDefault — estatus configurables de cliente
- **clients**: id, fullName, phone, phoneAlt, email, address, statusId, assignedAgentId,
  source (origen del lead), tags (etiquetas libres), nextFollowUpAt
- **interactions**: id, clientId, userId, type (CALL/EMAIL/WHATSAPP/SMS/VISIT/OTHER),
  notes, resultStatusId, createdAt — historial completo de contactos
- **client_assignments**: historial de reasignaciones de cliente entre agentes
- **audit_logs**: registro genérico de cambios de campo por cliente (quién, qué campo,
  valor anterior/nuevo) — por ahora se usa para cambios de estatus
- **api_keys**: llaves para integraciones externas (paquetería, etc.), separadas del login

### Detalles de diseño (inspirados en CRMs grandes como HubSpot/Pipedrive)

- **Detección de duplicados**: al crear un cliente se busca coincidencia de teléfono/teléfono
  alterno contra la base existente; si hay coincidencia se devuelve una advertencia
  (`duplicateWarning`) sin bloquear la creación — con 30+ agentes capturando en paralelo,
  bloquear generaría fricción, así que se avisa y el agente decide.
- **Actividades tipadas**: cada interacción tiene un `type` para poder reportar volumen de
  llamadas vs. emails vs. whatsapp por agente.
- **Auditoría de estatus**: todo cambio de estatus de un cliente (ya sea editado directamente
  o resultado de una interacción) queda en `audit_logs` con quién lo hizo y cuándo.
- **Tareas vencidas**: además de "tareas de hoy" (`/clients/tasks/today`), existe
  `/clients/tasks/overdue` para detectar seguimientos que ya pasaron su fecha y nadie
  atendió — la base para futuras alertas/notificaciones.
- **Importación desde Excel** (`POST /clients/import` + asistente en la UI): el archivo
  (.xlsx/.xls/.csv, hasta 2000 filas) se parsea en el navegador con SheetJS, se mapean
  las columnas (con autodetección de encabezados en español), y el backend deduplica por
  teléfono normalizado (solo dígitos: "8888-1234" = "88881234") con opción de omitir o
  crear duplicados. Devuelve resumen de creados/duplicados/errores por fila.
- **Errores async controlados**: todos los controllers van envueltos en `asyncHandler`
  (Express 4 no propaga promesas rechazadas) y el error handler global traduce errores
  de Prisma (P2002/P2003/P2025) a respuestas 409/404 útiles.

## Roles

- **ADMIN**: acceso total, gestiona usuarios/estatus/reasignaciones.
- **SUPERVISOR**: ve todos los clientes y reportes, puede reasignar.
- **AGENT**: solo ve/edita los clientes que tiene asignados.

## Cómo probar localmente

1. Instala PostgreSQL local o usa un contenedor:
   ```bash
   docker run --name ism-crm-db -e POSTGRES_PASSWORD=password -e POSTGRES_DB=ism_crm -p 5432:5432 -d postgres:16
   ```
2. En `/backend`, copia `.env.example` a `.env` y ajusta `DATABASE_URL`, `JWT_SECRET`, etc.
3. Instala dependencias y aplica migraciones:
   ```bash
   cd backend
   npm install
   npx prisma migrate dev --name init
   npm run seed
   ```
4. Levanta el servidor:
   ```bash
   npm run dev
   ```
5. Documentación interactiva (Swagger): `http://localhost:4000/api/docs`
6. Login de prueba (creado por el seed): `admin@ism.local` / `ChangeMe123!`
   (se puede sobreescribir con `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` en `.env`)

### Flujo de prueba rápido con curl

```bash
# Login
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@ism.local","password":"ChangeMe123!"}'

# Usa el token devuelto para crear un cliente
curl -X POST http://localhost:4000/api/clients \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"fullName":"Juan Pérez","phone":"5551234567"}'
```

### Frontend

1. Con el backend corriendo (ver arriba), en otra terminal:
   ```bash
   cd frontend
   npm install
   cp .env.example .env   # ajusta VITE_API_URL si el backend no está en localhost:4000
   npm run dev
   ```
2. Abre `http://localhost:5173`, inicia sesión con el usuario del seed
   (`admin@ism.local` / `ChangeMe123!`).
3. Pantallas disponibles: Dashboard, Clientes (vista Kanban por estatus con
   arrastrar-y-soltar, y vista de Tabla con búsqueda/filtros/paginación), Detalle de
   cliente (registrar interacción + historial), Tareas (seguimientos de hoy y
   vencidos), y para Admin: gestión de Usuarios y de Estatus.

Verificado de punta a punta con Playwright: login, creación de cliente con detección
de duplicados, registro de interacción que cambia el estatus del cliente en el
Kanban, y reflejo inmediato en el dashboard — sin errores de consola.

## Integraciones externas

Los endpoints `/api/integrations/*` usan autenticación por API key (header `x-api-key`),
independiente del login de usuarios, para que apps externas (paquetería, etc.) puedan
consultar o actualizar el estatus de un cliente. Las API keys se gestionan directamente
en la tabla `api_keys` (hash SHA-256 + `API_KEY_SALT`); un endpoint de administración de
keys se añadirá si se requiere gestión desde la UI.

## Despliegue en Railway

El proyecto se despliega como 3 servicios dentro del mismo proyecto de Railway:

1. **Postgres**: servicio de base de datos (Add → Database → PostgreSQL).
2. **backend**: Root Directory = `backend`. Variables: `DATABASE_URL` (referenciando
   `${{Postgres.DATABASE_URL}}`), `JWT_SECRET`, `CORS_ORIGIN` (URL pública del frontend),
   `API_KEY_SALT`.
3. **frontend**: Root Directory = `frontend`. Variable de build: `VITE_API_URL`
   (URL pública del backend + `/api`, ej. `https://ism-cr-production.up.railway.app/api`).
   Railway inyecta `PORT` automáticamente y el `nginx.conf.template` lo usa para escuchar
   en el puerto correcto.

Cada servicio detecta su `Dockerfile` una vez configurado el Root Directory correspondiente.

## Próximos pasos

1. Terminar de configurar y verificar el servicio de frontend en Railway.
2. Ajustar `CORS_ORIGIN` del backend a la URL final del frontend.
3. (Opcional) Endpoint de administración de API keys desde la UI, para no depender de SQL directo.
