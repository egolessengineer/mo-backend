/*
  Warnings:

  - You are about to drop the column `updateAt` on the `FAQS` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "FAQS" DROP COLUMN "updateAt",
ADD COLUMN     "updatedAt" TIMESTAMP(3),
ALTER COLUMN "createdAt" DROP NOT NULL,
ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "deleted" DROP NOT NULL,
ALTER COLUMN "deleted" SET DEFAULT false;
