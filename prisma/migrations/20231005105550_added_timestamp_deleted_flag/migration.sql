-- AlterTable
ALTER TABLE "About" ADD COLUMN     "deleted" BOOLEAN DEFAULT false;

-- AlterTable
ALTER TABLE "Address" ADD COLUMN     "deleted" BOOLEAN DEFAULT false;

-- AlterTable
ALTER TABLE "DRAFTS" ADD COLUMN     "deleted" BOOLEAN DEFAULT false;

-- AlterTable
ALTER TABLE "Documents" ADD COLUMN     "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "deleted" BOOLEAN DEFAULT false,
ADD COLUMN     "updatedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "DocumentsLink" ADD COLUMN     "deleted" BOOLEAN DEFAULT false;

-- AlterTable
ALTER TABLE "Escrow" ADD COLUMN     "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "deleted" BOOLEAN DEFAULT false,
ADD COLUMN     "updatedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Experiences" ADD COLUMN     "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "deleted" BOOLEAN DEFAULT false,
ADD COLUMN     "updatedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Milestones" ADD COLUMN     "deleted" BOOLEAN DEFAULT false;

-- AlterTable
ALTER TABLE "PenalityBreach" ADD COLUMN     "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "deleted" BOOLEAN DEFAULT false,
ADD COLUMN     "updatedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Permissions" ADD COLUMN     "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "deleted" BOOLEAN DEFAULT false,
ADD COLUMN     "updatedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "ProjectDetails" ADD COLUMN     "deleted" BOOLEAN DEFAULT false;

-- AlterTable
ALTER TABLE "ProjectProvider" ADD COLUMN     "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "deleted" BOOLEAN DEFAULT false,
ADD COLUMN     "updatedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Projects" ADD COLUMN     "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "deleted" BOOLEAN DEFAULT false,
ADD COLUMN     "updatedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "deleted" BOOLEAN DEFAULT false;

-- AlterTable
ALTER TABLE "VerficationToken" ADD COLUMN     "deleted" BOOLEAN DEFAULT false;
