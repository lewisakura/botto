-- AlterTable
ALTER TABLE "Wallet" ADD COLUMN     "loan" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "loanPaybackDate" TIMESTAMP(3);
