/*
  Warnings:

  - The values [PROJECT_FUND,MILESTONE_FUND,MILESTONE_COMPLETED,MILESTONE_ROYALTY_COMPLETED,MILESTONE_ROYALTY_FORCE_CLOSED,MILESTONE_FORCED_CLOSED] on the enum `TransactionsType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "TransactionsType_new" AS ENUM ('ProjectFunded', 'MilestoneFunded', 'MilestoneStateChanged', 'MilestonePayout', 'MilestoneForceClosed', 'SubMilestoneStateChanged', 'MilestoneRoyaltyFunded', 'MilestoneRoyaltyForceClosed', 'RoyaltyPaid', 'PROJECT_COMPLETED', 'BALANCE_RELEASE', 'MILESTONE_FORCED_CLOSED_FEE', 'MILESTONE_ROYALTY_FORCE_CLOSED_FEE', 'MILESTONE_ROYALTY_COMPLETED_FEE', 'MILESTONE_COMPLETED_FEE', 'PROJECT_COMPLETED_FEE', 'BALANCE_RELEASE_FEE');
ALTER TABLE "Transactions" ALTER COLUMN "type" TYPE "TransactionsType_new" USING ("type"::text::"TransactionsType_new");
ALTER TYPE "TransactionsType" RENAME TO "TransactionsType_old";
ALTER TYPE "TransactionsType_new" RENAME TO "TransactionsType";
DROP TYPE "TransactionsType_old";
COMMIT;
