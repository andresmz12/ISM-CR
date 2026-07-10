-- AlterTable
ALTER TABLE "clients" ADD COLUMN     "emailNormalized" TEXT;

-- Backfill: clientes creados antes de esta columna quedarían con emailNormalized
-- NULL para siempre si no se rellena aquí, y el webhook de /integrations/emails
-- no los encontraría aunque tengan email.
UPDATE "clients" SET "emailNormalized" = LOWER(TRIM("email")) WHERE "email" IS NOT NULL AND TRIM("email") <> '';

-- CreateIndex
CREATE INDEX "clients_emailNormalized_idx" ON "clients"("emailNormalized");
