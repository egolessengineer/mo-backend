-- AlterEnum
ALTER TYPE "documentType" ADD VALUE 'REWORK_DOC';

-- AlterTable
ALTER TABLE "Milestones" ADD COLUMN     "reworkComment" TEXT,
ADD COLUMN     "reworkDocs" TEXT[] DEFAULT ARRAY[]::TEXT[];
