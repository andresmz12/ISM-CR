-- Columnas de teléfono normalizado (solo dígitos) para que la detección de
-- duplicados no dependa del formato con el que se capturó el número.
ALTER TABLE "clients" ADD COLUMN "phoneNormalized" TEXT;
ALTER TABLE "clients" ADD COLUMN "phoneAltNormalized" TEXT;

-- Backfill de los clientes existentes.
UPDATE "clients" SET
  "phoneNormalized" = NULLIF(regexp_replace("phone", '[^0-9]', '', 'g'), ''),
  "phoneAltNormalized" = CASE
    WHEN "phoneAlt" IS NULL THEN NULL
    ELSE NULLIF(regexp_replace("phoneAlt", '[^0-9]', '', 'g'), '')
  END;

-- CreateIndex
CREATE INDEX "clients_phoneNormalized_idx" ON "clients"("phoneNormalized");

-- CreateIndex
CREATE INDEX "clients_phoneAltNormalized_idx" ON "clients"("phoneAltNormalized");
