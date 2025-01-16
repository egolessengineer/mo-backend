-- CreateEnum
CREATE TYPE "Error" AS ENUM ('HEDERA', 'API');

-- CreateTable
CREATE TABLE "Errors" (
    "id" TEXT NOT NULL,
    "type" "Error" NOT NULL,
    "metadata" TEXT,
    "body" TEXT,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "Errors_pkey" PRIMARY KEY ("id")
);
