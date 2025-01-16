-- DropForeignKey
ALTER TABLE "Milestones" DROP CONSTRAINT "Milestones_AssignedTo_fkey";

-- AddForeignKey
ALTER TABLE "Milestones" ADD CONSTRAINT "Milestones_AssignedTo_fkey" FOREIGN KEY ("AssignedTo") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
