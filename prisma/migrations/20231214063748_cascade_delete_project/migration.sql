-- DropForeignKey
ALTER TABLE "DRAFTS" DROP CONSTRAINT "DRAFTS_projectId_fkey";

-- DropForeignKey
ALTER TABLE "Documents" DROP CONSTRAINT "Documents_projectId_fkey";

-- DropForeignKey
ALTER TABLE "Milestones" DROP CONSTRAINT "Milestones_projectId_fkey";

-- DropForeignKey
ALTER TABLE "Permissions" DROP CONSTRAINT "Permissions_projectId_fkey";

-- DropForeignKey
ALTER TABLE "ProjectDetails" DROP CONSTRAINT "ProjectDetails_projectId_fkey";

-- DropForeignKey
ALTER TABLE "ProjectMembers" DROP CONSTRAINT "ProjectMembers_projectId_fkey";

-- AddForeignKey
ALTER TABLE "Milestones" ADD CONSTRAINT "Milestones_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Documents" ADD CONSTRAINT "Documents_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectDetails" ADD CONSTRAINT "ProjectDetails_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMembers" ADD CONSTRAINT "ProjectMembers_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DRAFTS" ADD CONSTRAINT "DRAFTS_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Permissions" ADD CONSTRAINT "Permissions_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
