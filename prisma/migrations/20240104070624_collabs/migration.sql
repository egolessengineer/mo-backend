-- AlterEnum
ALTER TYPE "TokenType" ADD VALUE 'PurchaserInviteToken';

-- CreateTable
CREATE TABLE "Collaborators" (
    "id" TEXT NOT NULL,
    "purchaserId" TEXT NOT NULL,
    "collaboratorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Collaborators_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Collaborators_purchaserId_collaboratorId_key" ON "Collaborators"("purchaserId", "collaboratorId");

-- AddForeignKey
ALTER TABLE "Collaborators" ADD CONSTRAINT "Collaborators_purchaserId_fkey" FOREIGN KEY ("purchaserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Collaborators" ADD CONSTRAINT "Collaborators_collaboratorId_fkey" FOREIGN KEY ("collaboratorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
