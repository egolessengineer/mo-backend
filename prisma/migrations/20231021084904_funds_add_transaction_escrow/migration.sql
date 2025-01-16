/*
  Warnings:

  - You are about to drop the column `fundTranscationId` on the `Funds` table. All the data in the column will be lost.
  - You are about to drop the column `isFundTransferred` on the `Funds` table. All the data in the column will be lost.
  - You are about to drop the column `isRoyalityTransferred` on the `Funds` table. All the data in the column will be lost.
  - You are about to drop the column `milestoneId` on the `Funds` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[fundTypeId]` on the table `Funds` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `fundTypeId` to the `Funds` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "TransactionParty" AS ENUM ('PURCHASER', 'CP', 'IP', 'ADMIN', 'ESCROW');

-- CreateEnum
CREATE TYPE "TransactionsType" AS ENUM ('PROJECT_FUND', 'MILESTONE_FUND', 'MILESTONE_COMPLETED', 'PROJECT_COMPLETED', 'BALANCE_RELEASE', 'MILESTONE_ROYALTY_COMPLETED', 'MILESTONE_ROYALTY_FORCE_CLOSED', 'MILESTONE_FORCED_CLOSED', 'MILESTONE_FORCED_CLOSED_FEE', 'MILESTONE_ROYALTY_FORCE_CLOSED_FEE', 'MILESTONE_ROYALTY_COMPLETED_FEE', 'MILESTONE_COMPLETED_FEE', 'PROJECT_COMPLETED_FEE', 'BALANCE_RELEASE_FEE');

-- DropForeignKey
ALTER TABLE "Funds" DROP CONSTRAINT "Funds_milestoneId_fkey";

-- DropIndex
DROP INDEX "Funds_milestoneId_key";

-- AlterTable
ALTER TABLE "Funds" DROP COLUMN "fundTranscationId",
DROP COLUMN "isFundTransferred",
DROP COLUMN "isRoyalityTransferred",
DROP COLUMN "milestoneId",
ADD COLUMN     "fundTranscationIdFromEscrow" TEXT,
ADD COLUMN     "fundTranscationIdToEscrow" TEXT,
ADD COLUMN     "fundTransferred" BOOLEAN DEFAULT false,
ADD COLUMN     "fundTypeId" TEXT NOT NULL,
ADD COLUMN     "royalityTransferred" BOOLEAN DEFAULT false;

-- AlterTable
ALTER TABLE "Milestones" ALTER COLUMN "fundAllocation" SET DATA TYPE DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "Transactions" (
    "id" TEXT NOT NULL,
    "from" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "userId" TEXT,
    "type" "TransactionsType" NOT NULL,
    "value" TEXT NOT NULL,
    "amount" DOUBLE PRECISION,
    "status" "ContractDeployStatus" NOT NULL,
    "txHash" TEXT,
    "projectId" TEXT,

    CONSTRAINT "Transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Funds_fundTypeId_key" ON "Funds"("fundTypeId");

-- AddForeignKey
ALTER TABLE "Funds" ADD CONSTRAINT "Funds_fundTypeId_fkey" FOREIGN KEY ("fundTypeId") REFERENCES "Milestones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transactions" ADD CONSTRAINT "Transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transactions" ADD CONSTRAINT "Transactions_value_fkey" FOREIGN KEY ("value") REFERENCES "Milestones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transactions" ADD CONSTRAINT "Transactions_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
