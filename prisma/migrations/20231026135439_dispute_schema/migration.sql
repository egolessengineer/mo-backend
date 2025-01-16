-- CreateEnum
CREATE TYPE "DisputeNature" AS ENUM ('FUNDS', 'DEADLINE', 'OTHER');

-- CreateEnum
CREATE TYPE "DisputeStatus" AS ENUM ('INREVIEW', 'CLOSED', 'RESOLVED', 'LEGALWAY');

-- CreateEnum
CREATE TYPE "ResolutionType" AS ENUM ('FAQ', 'WRITTEN');

-- AlterTable
ALTER TABLE "Funds" ADD COLUMN     "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "deleted" BOOLEAN DEFAULT false,
ADD COLUMN     "updatedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Transactions" ADD COLUMN     "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "deleted" BOOLEAN DEFAULT false,
ADD COLUMN     "updatedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "Dispute" (
    "id" TEXT NOT NULL,
    "projectId" TEXT,
    "milestoneId" TEXT,
    "disputeNature" "DisputeNature" NOT NULL,
    "raisedBy" TEXT,
    "raisedTo" TEXT,
    "disputeDescription" TEXT,
    "evidenceDocLink" TEXT[],
    "disputeComment" TEXT,
    "status" "DisputeStatus" NOT NULL,
    "closedBy" TEXT,
    "isMoAgree" BOOLEAN,
    "isRaisedByAgree" BOOLEAN,
    "isRaisedToAgree" BOOLEAN,
    "inFavourOf" TEXT,
    "resolutionType" "ResolutionType",
    "resolutionDescription" TEXT,
    "resolutionDocLink" TEXT[],
    "resolutionComment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updateAt" TIMESTAMP(3) NOT NULL,
    "deleted" BOOLEAN NOT NULL,

    CONSTRAINT "Dispute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FAQS" (
    "id" TEXT NOT NULL,
    "question" TEXT,
    "answer" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updateAt" TIMESTAMP(3) NOT NULL,
    "deleted" BOOLEAN NOT NULL,

    CONSTRAINT "FAQS_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "Milestones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_raisedBy_fkey" FOREIGN KEY ("raisedBy") REFERENCES "ProjectMembers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_raisedTo_fkey" FOREIGN KEY ("raisedTo") REFERENCES "ProjectMembers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_inFavourOf_fkey" FOREIGN KEY ("inFavourOf") REFERENCES "ProjectMembers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_closedBy_fkey" FOREIGN KEY ("closedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
