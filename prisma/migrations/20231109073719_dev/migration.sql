/*
  Warnings:

  - You are about to drop the column `milestoneContractAddress` on the `Escrow` table. All the data in the column will be lost.
  - You are about to drop the column `milestoneContractStatus` on the `Escrow` table. All the data in the column will be lost.
  - You are about to drop the column `milestonesStatus` on the `Escrow` table. All the data in the column will be lost.
  - You are about to drop the column `royaltyContractAddress` on the `Escrow` table. All the data in the column will be lost.
  - You are about to drop the column `royaltyContractStatus` on the `Escrow` table. All the data in the column will be lost.
  - You are about to drop the column `setupAddressesStatus` on the `Escrow` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Escrow" DROP COLUMN "milestoneContractAddress",
DROP COLUMN "milestoneContractStatus",
DROP COLUMN "milestonesStatus",
DROP COLUMN "royaltyContractAddress",
DROP COLUMN "royaltyContractStatus",
DROP COLUMN "setupAddressesStatus";
