-- CreateTable
CREATE TABLE "Fees" (
    "id" TEXT NOT NULL,
    "commission" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Fees_pkey" PRIMARY KEY ("id")
);
