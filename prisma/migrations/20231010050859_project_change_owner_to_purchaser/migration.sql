/*
  Warnings:

  - You are about to drop the column `owner` on the `Projects` table. All the data in the column will be lost.
  - Added the required column `purchaser` to the `Projects` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Projects" DROP CONSTRAINT "Projects_owner_fkey";

-- AlterTable
ALTER TABLE "Projects" DROP COLUMN "owner",
ADD COLUMN     "purchaser" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "Projects" ADD CONSTRAINT "Projects_purchaser_fkey" FOREIGN KEY ("purchaser") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
