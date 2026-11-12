-- AlterTable
ALTER TABLE "CatererOrder" ADD COLUMN     "shareToken" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "CatererOrder_shareToken_key" ON "CatererOrder"("shareToken");

