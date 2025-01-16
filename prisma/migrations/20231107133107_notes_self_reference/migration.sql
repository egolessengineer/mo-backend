-- AlterTable
ALTER TABLE "Notes" ADD COLUMN     "noteId" TEXT;

-- AddForeignKey
ALTER TABLE "Notes" ADD CONSTRAINT "Notes_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "Notes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
