-- CreateIndex
CREATE INDEX "CatererBill_createdAt_idx" ON "CatererBill"("createdAt");

-- CreateIndex
CREATE INDEX "CatererPayment_billId_idx" ON "CatererPayment"("billId");

-- CreateIndex
CREATE INDEX "CatererPayment_paidOn_idx" ON "CatererPayment"("paidOn");

-- CreateIndex
CREATE INDEX "CatererPurchasePayment_purchaseId_idx" ON "CatererPurchasePayment"("purchaseId");

-- CreateIndex
CREATE INDEX "CatererPurchasePayment_paidOn_idx" ON "CatererPurchasePayment"("paidOn");

