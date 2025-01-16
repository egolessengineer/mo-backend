/*
  Warnings:

  - You are about to drop the column `bonusAmount` on the `Milestones` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Milestones" DROP COLUMN "bonusAmount",
ADD COLUMN     "royaltyAmount" DOUBLE PRECISION;
