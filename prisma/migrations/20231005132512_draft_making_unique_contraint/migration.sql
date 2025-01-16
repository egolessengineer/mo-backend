/*
  Warnings:

  - A unique constraint covering the columns `[draftType,projectId,deleted]` on the table `DRAFTS` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "About" ALTER COLUMN "phoneNumber" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "DRAFTS" ALTER COLUMN "deleted" DROP DEFAULT,
ALTER COLUMN "deleted" SET DATA TYPE TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "DRAFTS_draftType_projectId_deleted_key" ON "DRAFTS"("draftType", "projectId", "deleted");
