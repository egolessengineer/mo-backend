-- AlterTable
ALTER TABLE "Milestones" ALTER COLUMN "revisionsCounter" SET DEFAULT 0;

-- AlterTable
ALTER TABLE "PenalityBreach" ADD COLUMN     "pentalityDuration" TIMESTAMP(3);
