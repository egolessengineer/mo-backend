-- AlterTable
ALTER TABLE "DocumentsLink" ADD COLUMN     "fileName" TEXT,
ADD COLUMN     "mimeType" TEXT;

-- AlterTable
ALTER TABLE "Milestones" ADD COLUMN     "deliverablesLink" TEXT[];
