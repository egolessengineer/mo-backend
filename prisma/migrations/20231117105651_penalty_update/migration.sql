/*
  Warnings:

  - The `timeperiod` column on the `PenalityBreach` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `pentalityDuration` column on the `PenalityBreach` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "PenalityBreach" DROP COLUMN "timeperiod",
ADD COLUMN     "timeperiod" INTEGER,
DROP COLUMN "pentalityDuration",
ADD COLUMN     "pentalityDuration" "PenaltyDurationType";
