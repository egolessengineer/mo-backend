/*
  Warnings:

  - The `endPointType` column on the `Milestones` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `penalityType` column on the `PenalityBreach` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "PenaltyType" AS ENUM ('WARNING', 'PENALTY');

-- CreateEnum
CREATE TYPE "AmountType" AS ENUM ('PERCENT', 'AMOUNT');

-- CreateEnum
CREATE TYPE "EndPointType" AS ENUM ('DATE', 'DATETIME');

-- AlterTable
ALTER TABLE "Milestones" DROP COLUMN "endPointType",
ADD COLUMN     "endPointType" "EndPointType";

-- AlterTable
ALTER TABLE "PenalityBreach" ADD COLUMN     "valueIn" "AmountType" NOT NULL DEFAULT 'AMOUNT',
DROP COLUMN "penalityType",
ADD COLUMN     "penalityType" "PenaltyType" NOT NULL DEFAULT 'PENALTY';
