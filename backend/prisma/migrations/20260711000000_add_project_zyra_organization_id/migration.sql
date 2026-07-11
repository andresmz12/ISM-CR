-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "zyraOrganizationId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "projects_zyraOrganizationId_key" ON "projects"("zyraOrganizationId");

