-- AlterTable
ALTER TABLE "clients" ADD COLUMN     "trackingCode" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "clients_trackingCode_key" ON "clients"("trackingCode");
