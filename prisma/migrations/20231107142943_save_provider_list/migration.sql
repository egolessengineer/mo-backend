-- CreateTable
CREATE TABLE "ProviderList" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "deleted" BOOLEAN DEFAULT false,

    CONSTRAINT "ProviderList_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProviderList_creatorId_memberId_key" ON "ProviderList"("creatorId", "memberId");

-- AddForeignKey
ALTER TABLE "ProviderList" ADD CONSTRAINT "ProviderList_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderList" ADD CONSTRAINT "ProviderList_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
