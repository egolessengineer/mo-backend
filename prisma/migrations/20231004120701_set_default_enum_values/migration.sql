/*
  Warnings:

  - The values [UN_ASSIGNED] on the enum `ProjectStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "DraftType" ADD VALUE 'ADD_PROVIDER';
ALTER TYPE "DraftType" ADD VALUE 'MILESTONES';
ALTER TYPE "DraftType" ADD VALUE 'SUB_MILESTONES';

-- AlterEnum
BEGIN;
CREATE TYPE "ProjectStatus_new" AS ENUM ('ASSIGNED', 'UNASSIGNED', 'IN_PROGRESS', 'COMPLETE');
ALTER TABLE "Projects" ALTER COLUMN "status" TYPE "ProjectStatus_new" USING ("status"::text::"ProjectStatus_new");
ALTER TYPE "ProjectStatus" RENAME TO "ProjectStatus_old";
ALTER TYPE "ProjectStatus_new" RENAME TO "ProjectStatus";
DROP TYPE "ProjectStatus_old";
COMMIT;

-- AlterTable
ALTER TABLE "Milestones" ALTER COLUMN "milestoneStatus" SET DEFAULT 'INIT',
ALTER COLUMN "royaltyType" SET DEFAULT 'PRE_PAYMENT_ROYALTY';

-- AlterTable
ALTER TABLE "PenalityBreach" ALTER COLUMN "penalityType" SET DEFAULT 'PERCENT';

-- AlterTable
ALTER TABLE "ProjectDetails" ALTER COLUMN "royaltyType" SET DEFAULT 'POST_KPI_ROYALTY';

-- AlterTable
ALTER TABLE "Projects" ALTER COLUMN "status" SET DEFAULT 'UNASSIGNED',
ALTER COLUMN "state" SET DEFAULT 'NEW_PROJECT';
