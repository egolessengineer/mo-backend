/*
  Warnings:

  - The `pentalityDuration` column on the `PenalityBreach` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "PenalityBreach" DROP COLUMN "pentalityDuration",
ADD COLUMN     "pentalityDuration" INTEGER;
