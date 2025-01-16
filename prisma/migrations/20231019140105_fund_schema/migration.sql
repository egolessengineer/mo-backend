-- CreateEnum
CREATE TYPE "FundingType" AS ENUM ('PROJECT', 'MILESTONE');

-- AlterTable
ALTER TABLE "ProjectDetails" ADD COLUMN     "leftProjectFund" TEXT;

-- AlterTable
ALTER TABLE "Projects" ADD COLUMN     "assignedFundTo" "FundingType",
ADD COLUMN     "fundTransferType" "FundTransferType";

-- CreateTable
CREATE TABLE "Funds" (
    "id" TEXT NOT NULL,
    "fundType" "milestoneType",
    "milestoneId" TEXT NOT NULL,
    "enableFundTransfer" BOOLEAN DEFAULT false,
    "enableRoyalityTransfer" BOOLEAN DEFAULT false,
    "isFundTransferred" BOOLEAN DEFAULT false,
    "isRoyalityTransferred" BOOLEAN DEFAULT false,
    "fundTranscationId" TEXT,
    "royalityTranscationId" TEXT,

    CONSTRAINT "Funds_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Funds_milestoneId_key" ON "Funds"("milestoneId");

-- AddForeignKey
ALTER TABLE "Funds" ADD CONSTRAINT "Funds_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "Milestones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
