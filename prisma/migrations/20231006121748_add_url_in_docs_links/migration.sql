/*
  Warnings:

  - Added the required column `url` to the `DocumentsLink` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "DocumentsLink" ADD COLUMN     "url" VARCHAR(100) NOT NULL;
