/*
  Warnings:

  - You are about to drop the column `updateAt` on the `Dispute` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Dispute" DROP COLUMN "updateAt",
ADD COLUMN     "updatedAt" TIMESTAMP(3),
ALTER COLUMN "createdAt" DROP NOT NULL,
ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "deleted" DROP NOT NULL,
ALTER COLUMN "deleted" SET DEFAULT false;
