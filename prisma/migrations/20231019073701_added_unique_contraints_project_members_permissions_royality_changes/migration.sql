/*
  Warnings:

  - You are about to drop the column `prePaymentRoyalty` on the `Milestones` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[userId,projectId]` on the table `Permissions` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[userId,projectId]` on the table `ProjectMembers` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Milestones" DROP COLUMN "prePaymentRoyalty",
ADD COLUMN     "bonusAmount" DOUBLE PRECISION,
ALTER COLUMN "royaltyType" DROP DEFAULT;

-- CreateIndex
CREATE UNIQUE INDEX "Permissions_userId_projectId_key" ON "Permissions"("userId", "projectId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectMembers_userId_projectId_key" ON "ProjectMembers"("userId", "projectId");
