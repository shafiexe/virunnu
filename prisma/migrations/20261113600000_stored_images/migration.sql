-- CreateTable
CREATE TABLE "StoredImage" (
    "id" TEXT NOT NULL,
    "orgId" TEXT,
    "contentType" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoredImage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StoredImage_orgId_idx" ON "StoredImage"("orgId");
