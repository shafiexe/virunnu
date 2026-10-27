-- Add email and password to User
ALTER TABLE "User" ADD COLUMN "email" TEXT;
ALTER TABLE "User" ADD COLUMN "password" TEXT;
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- ApplicationStatus enum
CREATE TYPE "ApplicationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- OwnerApplication
CREATE TABLE "OwnerApplication" (
    "id" TEXT NOT NULL,
    "orgName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "website" TEXT,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OwnerApplication_pkey" PRIMARY KEY ("id")
);

-- CatererApplication
CREATE TABLE "CatererApplication" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "cuisines" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "website" TEXT,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CatererApplication_pkey" PRIMARY KEY ("id")
);
