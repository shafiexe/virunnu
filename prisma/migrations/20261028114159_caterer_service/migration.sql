-- CreateEnum
CREATE TYPE "EnquiryStatus" AS ENUM ('PENDING', 'ATTENDED', 'IGNORED');

-- AlterTable
ALTER TABLE "Caterer" ADD COLUMN     "email" TEXT,
ADD COLUMN     "facebookUrl" TEXT,
ADD COLUMN     "instagramUrl" TEXT,
ADD COLUMN     "photos" TEXT[],
ADD COLUMN     "services" TEXT[],
ADD COLUMN     "websiteUrl" TEXT,
ADD COLUMN     "whatsappNumber" TEXT,
ADD COLUMN     "youtubeUrl" TEXT;

-- CreateTable
CREATE TABLE "CateringEnquiry" (
    "id" TEXT NOT NULL,
    "catererId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "eventDate" TIMESTAMP(3),
    "guestCount" INTEGER,
    "message" TEXT,
    "status" "EnquiryStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CateringEnquiry_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "CateringEnquiry" ADD CONSTRAINT "CateringEnquiry_catererId_fkey" FOREIGN KEY ("catererId") REFERENCES "Caterer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
