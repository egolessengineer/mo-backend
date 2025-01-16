/*
  Warnings:

  - You are about to drop the column `collaboratorId` on the `Collaborators` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[purchaserId,collaboratorEmail]` on the table `Collaborators` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `collaboratorEmail` to the `Collaborators` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "AcceptedStatus" AS ENUM ('ACCEPTED', 'REJECTED', 'PENDING');

-- DropForeignKey
ALTER TABLE "Collaborators" DROP CONSTRAINT "Collaborators_collaboratorId_fkey";

-- DropIndex
DROP INDEX "Collaborators_purchaserId_collaboratorId_key";

-- AlterTable
ALTER TABLE "Collaborators" DROP COLUMN "collaboratorId",
ADD COLUMN     "accpetedStatus" "AcceptedStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "collaboratorEmail" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Collaborators_purchaserId_collaboratorEmail_key" ON "Collaborators"("purchaserId", "collaboratorEmail");

-- AddForeignKey
ALTER TABLE "Collaborators" ADD CONSTRAINT "Collaborators_collaboratorEmail_fkey" FOREIGN KEY ("collaboratorEmail") REFERENCES "User"("email") ON DELETE RESTRICT ON UPDATE CASCADE;
