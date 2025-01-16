/*
  Warnings:

  - You are about to drop the column `purchaser` on the `Projects` table. All the data in the column will be lost.
  - You are about to drop the `ProjectProvider` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "ProjectUsers" AS ENUM ('PURCHASER', 'CP', 'IP');

-- DropForeignKey
ALTER TABLE "Milestones" DROP CONSTRAINT "Milestones_AssignedTo_fkey";

-- DropForeignKey
ALTER TABLE "ProjectProvider" DROP CONSTRAINT "ProjectProvider_projectId_fkey";

-- DropForeignKey
ALTER TABLE "ProjectProvider" DROP CONSTRAINT "ProjectProvider_userId_fkey";

-- DropForeignKey
ALTER TABLE "Projects" DROP CONSTRAINT "Projects_purchaser_fkey";

-- AlterTable
ALTER TABLE "Projects" DROP COLUMN "purchaser";

-- DropTable
DROP TABLE "ProjectProvider";

-- DropEnum
DROP TYPE "ProviderRole";

-- CreateTable
CREATE TABLE "ProjectMembers" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "providerRole" "ProjectUsers",
    "projectId" TEXT,
    "updatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "deleted" BOOLEAN DEFAULT false,

    CONSTRAINT "ProjectMembers_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Milestones" ADD CONSTRAINT "Milestones_AssignedTo_fkey" FOREIGN KEY ("AssignedTo") REFERENCES "ProjectMembers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMembers" ADD CONSTRAINT "ProjectMembers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMembers" ADD CONSTRAINT "ProjectMembers_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
