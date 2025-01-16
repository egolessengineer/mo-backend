-- AlterTable
ALTER TABLE "Escrow" ADD COLUMN     "addMilestoneStatus" "ContractDeployStatus" DEFAULT 'PENDING',
ADD COLUMN     "escrowContractId" TEXT,
ADD COLUMN     "setupAddressesStatus" "ContractDeployStatus" DEFAULT 'PENDING',
ADD COLUMN     "transferOwnershipStatus" "ContractDeployStatus" DEFAULT 'PENDING';
