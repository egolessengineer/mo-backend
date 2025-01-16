/*
  Warnings:

  - You are about to drop the column `member` on the `Teams` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Teams" DROP CONSTRAINT "Teams_member_fkey";

-- AlterTable
ALTER TABLE "Teams" DROP COLUMN "member",
ADD COLUMN     "deleted" BOOLEAN DEFAULT false,
ADD COLUMN     "updatedAt" TIMESTAMP(3),
ALTER COLUMN "createdAt" DROP NOT NULL,
ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "TeamMembers" (
    "id" TEXT NOT NULL,
    "isBookmarked" BOOLEAN NOT NULL DEFAULT false,
    "teamId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "deleted" BOOLEAN DEFAULT false,

    CONSTRAINT "TeamMembers_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "TeamMembers" ADD CONSTRAINT "TeamMembers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMembers" ADD CONSTRAINT "TeamMembers_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
