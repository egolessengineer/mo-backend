/*
  Warnings:

  - You are about to drop the column `valueIn` on the `Milestones` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Milestones" DROP COLUMN "valueIn",
ADD COLUMN     "royaltyValueIn" "AmountType" NOT NULL DEFAULT 'PERCENT';
