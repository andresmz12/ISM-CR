-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "hiddenStatusIds" TEXT[] DEFAULT ARRAY[]::TEXT[];
