# ISM CRM

CRM interno para gestión de clientes, historial de interacciones y seguimiento comercial.
Arquitectura API-first en Node.js/Express + PostgreSQL (Prisma), pensada para integrarse
con otras apps internas (paquetería, etc.) vía REST.

## Estado del proyecto

**Fase 1 (completada):** Backend + base de datos + autenticación + API core.
**Fase 2 (pendiente):** Frontend React + Tailwind.
**Fase 3 (pendiente):** Despliegue en Railway.

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
/frontend                 # (fase 2)
```

## Esquema de base de datos (resumen)

- **users**: id, fullName, email, passwordHash, role (ADMIN/SUPERVISOR/AGENT), active
- **statuses**: id, name, order, isDefault — estatus configurables de cliente
- **clients**: id, fullName, phone, phoneAlt, email, address, statusId, assignedAgentId,
  nextFollowUpAt
- **interactions**: id, clientId, userId, notes, resultStatusId, createdAt — historial
  completo de contactos
- **client_assignments**: historial de reasignaciones de cliente entre agentes
- **api_keys**: llaves para integraciones externas (paquetería, etc.), separadas del login

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

## Integraciones externas

Los endpoints `/api/integrations/*` usan autenticación por API key (header `x-api-key`),
independiente del login de usuarios, para que apps externas (paquetería, etc.) puedan
consultar o actualizar el estatus de un cliente. Las API keys se gestionan directamente
en la tabla `api_keys` (hash SHA-256 + `API_KEY_SALT`); un endpoint de administración de
keys se añadirá si se requiere gestión desde la UI.

## Próximos pasos

1. Confirmar el esquema anterior y ajustar si falta algo.
2. Construir el frontend (React + Tailwind): login, listado/detalle de clientes,
   bandeja de tareas del día, dashboard, panel de administración de usuarios/estatus.
3. Preparar despliegue en Railway (3 servicios: Postgres, backend, frontend).
