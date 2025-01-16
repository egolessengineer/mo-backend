/*
  Warnings:

  - You are about to drop the column `postKpiRoyality` on the `ProjectDetails` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ProjectDetails" DROP COLUMN "postKpiRoyality",
ADD COLUMN     "postKpiRoyalty" DOUBLE PRECISION;
