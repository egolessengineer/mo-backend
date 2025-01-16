-- AlterEnum
ALTER TYPE "TransactionsType" ADD VALUE 'FreeBalanceReleased';

-- AlterTable
ALTER TABLE "Projects" ADD COLUMN     "freeBalanceReleased" BOOLEAN DEFAULT false;
