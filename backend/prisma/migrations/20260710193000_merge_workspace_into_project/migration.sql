-- Fusiona Workspace en Project: "Empresa" pasa a ser un solo concepto (Project),
-- en vez de dos entidades paralelas que confundían la navegación. Antes de borrar
-- las tablas de workspace, se migran sus datos (si los hay) a Project/ProjectMember
-- para no perder nada que ya se haya creado en producción.

-- 1. Crear un Project equivalente por cada Workspace existente, reusando el mismo id
--    para que los datos relacionados (miembros, clientes) se puedan re-apuntar directo.
INSERT INTO "projects" ("id", "name", "archived", "createdAt", "updatedAt")
SELECT "id", "name", false, "createdAt", "updatedAt" FROM "workspaces"
ON CONFLICT ("id") DO NOTHING;

-- 2. Migrar membresías: cada WorkspaceMember se convierte en ProjectMember del
--    Project equivalente (mismo id que el Workspace original).
INSERT INTO "project_members" ("id", "projectId", "userId", "createdAt")
SELECT "id", "workspaceId", "userId", "createdAt" FROM "workspace_members"
ON CONFLICT ("projectId", "userId") DO NOTHING;

-- 3. Clientes con workspaceId: si no tenían ya un projectId propio, se les asigna
--    el Project equivalente a su Workspace (si ya tenían projectId, se respeta el
--    que tenían para no pisar una asignación real).
UPDATE "clients"
SET "projectId" = "workspaceId"
WHERE "workspaceId" IS NOT NULL AND "projectId" IS NULL;

-- 4. Secciones por defecto para los proyectos recién creados desde un Workspace
--    (los proyectos nativos siempre tienen "Pendientes"/"Completado"; sin esto,
--    el tablero de tareas de estos proyectos quedaría sin columnas).
INSERT INTO "project_sections" ("id", "projectId", "name", "order", "createdAt")
SELECT gen_random_uuid(), w."id", 'Pendientes', 0, now() FROM "workspaces" w
WHERE NOT EXISTS (SELECT 1 FROM "project_sections" ps WHERE ps."projectId" = w."id");

INSERT INTO "project_sections" ("id", "projectId", "name", "order", "createdAt")
SELECT gen_random_uuid(), w."id", 'Completado', 1, now() FROM "workspaces" w
WHERE NOT EXISTS (
  SELECT 1 FROM "project_sections" ps WHERE ps."projectId" = w."id" AND ps."name" = 'Completado'
);

-- 5. Ahora sí, quitar el sistema de Workspace por completo.
ALTER TABLE "clients" DROP CONSTRAINT "clients_workspaceId_fkey";
ALTER TABLE "workspace_members" DROP CONSTRAINT "workspace_members_userId_fkey";
ALTER TABLE "workspace_members" DROP CONSTRAINT "workspace_members_workspaceId_fkey";

DROP INDEX "clients_workspaceId_idx";

ALTER TABLE "clients" DROP COLUMN "workspaceId";

DROP TABLE "workspace_members";
DROP TABLE "workspaces";
