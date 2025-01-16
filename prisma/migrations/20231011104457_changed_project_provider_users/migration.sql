/*
  Warnings:

  - You are about to drop the column `providerRole` on the `ProjectMembers` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ProjectMembers" DROP COLUMN "providerRole",
ADD COLUMN     "projectUsers" "ProjectUsers";
