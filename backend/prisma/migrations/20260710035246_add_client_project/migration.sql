-- AlterTable
ALTER TABLE "clients" ADD COLUMN     "projectId" TEXT;

-- CreateIndex
CREATE INDEX "clients_projectId_idx" ON "clients"("projectId");

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
