/*
  Warnings:

  - You are about to drop the column `doclink` on the `DocumentsLink` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "DocumentsLink" DROP CONSTRAINT "DocumentsLink_doclink_fkey";

-- AlterTable
ALTER TABLE "DocumentsLink" DROP COLUMN "doclink";
