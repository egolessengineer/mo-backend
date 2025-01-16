-- AlterTable
ALTER TABLE "Milestones" ADD COLUMN     "isDeployedOnContract" TEXT;

-- AddForeignKey
ALTER TABLE "Milestones" ADD CONSTRAINT "Milestones_isDeployedOnContract_fkey" FOREIGN KEY ("isDeployedOnContract") REFERENCES "Transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
