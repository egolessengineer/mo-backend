/*
  Warnings:

  - A unique constraint covering the columns `[teamId,userId]` on the table `TeamMembers` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "TeamMembers_teamId_userId_key" ON "TeamMembers"("teamId", "userId");
