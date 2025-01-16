-- CreateEnum
CREATE TYPE "TokenType" AS ENUM ('ForgotPasswordToken', 'EmailVerificationToken');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- CreateEnum
CREATE TYPE "MilestoneStatus" AS ENUM ('INIT', 'IN_PROGRESS', 'IN_REVIEW', 'REWORK', 'COMPLETED', 'STOP');

-- CreateEnum
CREATE TYPE "PenalityType" AS ENUM ('PERCENT');

-- CreateEnum
CREATE TYPE "PenaltyDurationType" AS ENUM ('ByHour', 'ByDay');

-- CreateEnum
CREATE TYPE "RoyaltyType" AS ENUM ('PRE_PAYMENT_ROYALTY', 'POST_KPI_ROYALTY');

-- CreateEnum
CREATE TYPE "milestoneType" AS ENUM ('milestone', 'submilestone');

-- CreateEnum
CREATE TYPE "documentType" AS ENUM ('RESEARCH', 'TermAndCondition');

-- CreateEnum
CREATE TYPE "Category" AS ENUM ('DESIGN', 'RESEARCH', 'DEVELOPMENT', 'TESTING', 'OTHER');

-- CreateEnum
CREATE TYPE "DraftType" AS ENUM ('DOCUMENT', 'PROJECT_DETAILS');

-- CreateEnum
CREATE TYPE "ProjectCurrency" AS ENUM ('HBAR', 'USDC');

-- CreateEnum
CREATE TYPE "ProviderRole" AS ENUM ('CP', 'IP');

-- CreateEnum
CREATE TYPE "DurationType" AS ENUM ('Days', 'Weeks', 'Months', 'Year');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('PROVIDER', 'PURCHASER', 'ADMIN');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('ASSIGNED', 'UN_ASSIGNED', 'IN_PROGRESS', 'COMPLETE');

-- CreateEnum
CREATE TYPE "ProjectState" AS ENUM ('NEW_PROJECT', 'ADD_MILESTONES', 'ADD_ESCROW', 'CONTRACT_DEPLOYED', 'COMPLETE');

-- CreateEnum
CREATE TYPE "FundTransferType" AS ENUM ('ProjectCompleted', 'MilestoneCompleted');

-- CreateEnum
CREATE TYPE "ContractDeployStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'SUCCESS', 'FAILED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "password" TEXT,
    "walletAddress" TEXT,
    "isEmailVerified" BOOLEAN DEFAULT false,
    "isAboutComplete" BOOLEAN DEFAULT false,
    "isAddressComplete" BOOLEAN DEFAULT false,
    "isExperienceComplete" BOOLEAN DEFAULT false,
    "role" "Role",
    "isActive" BOOLEAN DEFAULT true,
    "updatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Address" (
    "id" TEXT NOT NULL,
    "street" TEXT,
    "city" TEXT,
    "state" TEXT,
    "postalCode" TEXT,
    "country" TEXT,
    "userId" TEXT,
    "updatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Address_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerficationToken" (
    "id" TEXT NOT NULL,
    "tokenType" "TokenType" NOT NULL,
    "token" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "VerficationToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "About" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "about" TEXT,
    "gender" "Gender",
    "portfolioLink" TEXT[],
    "countryCode" TEXT,
    "phoneNumber" INTEGER,
    "isPhoneVerified" BOOLEAN DEFAULT false,
    "profilePictureLink" TEXT,
    "userId" TEXT,
    "updatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "About_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Experiences" (
    "id" TEXT NOT NULL,
    "position" TEXT,
    "company" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "userId" TEXT,

    CONSTRAINT "Experiences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Milestones" (
    "id" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "requirements" TEXT,
    "endPoint" DOUBLE PRECISION,
    "endPointType" "DurationType",
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "fundAllocation" INTEGER,
    "revisions" INTEGER,
    "revisionsCounter" INTEGER,
    "acceptanceCriteria" TEXT,
    "isPenaltyExcluded" BOOLEAN DEFAULT true,
    "milestoneStatus" "MilestoneStatus",
    "fundTransfer" "FundTransferType",
    "dateAssigned" TIMESTAMP(3),
    "AssignedTo" TEXT,
    "milestoneType" "milestoneType",
    "royaltyType" "RoyaltyType",
    "prePaymentRoyalty" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "milestoneId" TEXT,
    "projectId" TEXT,

    CONSTRAINT "Milestones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PenalityBreach" (
    "id" TEXT NOT NULL,
    "milestoneId" TEXT,
    "penalityType" "PenalityType" NOT NULL,
    "pentality" DOUBLE PRECISION,
    "timeperiod" "PenaltyDurationType",

    CONSTRAINT "PenalityBreach_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Projects" (
    "id" TEXT NOT NULL,
    "status" "ProjectStatus",
    "state" "ProjectState",
    "isIndividualProvidersVisible" BOOLEAN DEFAULT false,
    "isFundFreezed" BOOLEAN DEFAULT false,
    "providerAssignedDate" TIMESTAMP(3),
    "currentEditor" TEXT,

    CONSTRAINT "Projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentsLink" (
    "id" TEXT NOT NULL,
    "type" "documentType" NOT NULL,
    "doclink" TEXT,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "DocumentsLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Documents" (
    "id" TEXT NOT NULL,
    "requirements" TEXT,
    "termsAndConditions" TEXT,
    "remark" TEXT,
    "Doclinks" TEXT[],
    "projectId" TEXT,

    CONSTRAINT "Documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectDetails" (
    "id" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "category" "Category",
    "currency" "ProjectCurrency",
    "duration" DOUBLE PRECISION,
    "durationType" "DurationType",
    "totalProjectFund" INTEGER,
    "royaltyType" "RoyaltyType",
    "postKpiRoyality" DOUBLE PRECISION,
    "scope" TEXT,
    "deliverables" TEXT,
    "deliverablesByCP" TEXT,
    "projectId" TEXT,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "ProjectDetails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectProvider" (
    "id" TEXT NOT NULL,
    "dateAssigned" TIMESTAMP(3),
    "userId" TEXT,
    "providerRole" "ProviderRole",
    "projectId" TEXT,

    CONSTRAINT "ProjectProvider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DRAFTS" (
    "id" TEXT NOT NULL,
    "draftType" "DraftType",
    "projectId" TEXT,
    "value" JSONB,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "DRAFTS_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permissions" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "projectId" TEXT,
    "ProjectDetailsDuration" BOOLEAN DEFAULT true,
    "ProjectTotalProjectFund" BOOLEAN DEFAULT true,
    "ProjectPenalty" BOOLEAN DEFAULT true,
    "DocumentTermsAndConditions" BOOLEAN DEFAULT true,
    "MilestoneFundAllocation" BOOLEAN DEFAULT true,
    "MilestoneRevisionsCounter" BOOLEAN DEFAULT true,
    "MilestonesShowAll" BOOLEAN DEFAULT true,
    "FundsShowIndividualFund" BOOLEAN DEFAULT true,
    "FundsTab" BOOLEAN DEFAULT true,
    "FundAllocation" BOOLEAN DEFAULT true,
    "FundLeft" BOOLEAN DEFAULT true,
    "Members" BOOLEAN DEFAULT true,
    "EscrowProjectDetails" BOOLEAN DEFAULT true,
    "EscrowpartiesInvolved" BOOLEAN DEFAULT true,
    "EscrowMilestoneFund" BOOLEAN DEFAULT true,
    "EscrowRoyalty" BOOLEAN DEFAULT true,
    "EscrowPenalty" BOOLEAN DEFAULT true,

    CONSTRAINT "Permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Escrow" (
    "id" TEXT NOT NULL,
    "projectId" TEXT,
    "escrowAddress" TEXT,
    "milestoneContractAddress" TEXT,
    "royaltyContractAddress" TEXT,
    "escrowDeployedStatus" "ContractDeployStatus" DEFAULT 'PENDING',
    "royaltyContractStatus" "ContractDeployStatus" DEFAULT 'PENDING',
    "milestoneContractStatus" "ContractDeployStatus" DEFAULT 'PENDING',
    "error" JSONB,

    CONSTRAINT "Escrow_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Address_userId_key" ON "Address"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "About_userId_key" ON "About"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Documents_projectId_key" ON "Documents"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectDetails_projectId_key" ON "ProjectDetails"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "Escrow_projectId_key" ON "Escrow"("projectId");

-- AddForeignKey
ALTER TABLE "Address" ADD CONSTRAINT "Address_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerficationToken" ADD CONSTRAINT "VerficationToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "About" ADD CONSTRAINT "About_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Experiences" ADD CONSTRAINT "Experiences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Milestones" ADD CONSTRAINT "Milestones_AssignedTo_fkey" FOREIGN KEY ("AssignedTo") REFERENCES "ProjectProvider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Milestones" ADD CONSTRAINT "Milestones_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Milestones" ADD CONSTRAINT "Milestones_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "Milestones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PenalityBreach" ADD CONSTRAINT "PenalityBreach_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "Milestones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Projects" ADD CONSTRAINT "Projects_currentEditor_fkey" FOREIGN KEY ("currentEditor") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentsLink" ADD CONSTRAINT "DocumentsLink_doclink_fkey" FOREIGN KEY ("doclink") REFERENCES "Documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Documents" ADD CONSTRAINT "Documents_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectDetails" ADD CONSTRAINT "ProjectDetails_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectProvider" ADD CONSTRAINT "ProjectProvider_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectProvider" ADD CONSTRAINT "ProjectProvider_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DRAFTS" ADD CONSTRAINT "DRAFTS_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Permissions" ADD CONSTRAINT "Permissions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Permissions" ADD CONSTRAINT "Permissions_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Escrow" ADD CONSTRAINT "Escrow_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
