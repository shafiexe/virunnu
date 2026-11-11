-- AlterTable
ALTER TABLE "Caterer" ADD COLUMN     "remindAfterDays" INTEGER NOT NULL DEFAULT 7;

-- AlterTable
ALTER TABLE "CatererCustomer" ADD COLUMN     "lastRemindedAt" TIMESTAMP(3);

