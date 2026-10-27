-- AlterTable
ALTER TABLE "Venue" ADD COLUMN     "googleMapsUrl" TEXT,
ADD COLUMN     "googleRating" DOUBLE PRECISION,
ADD COLUMN     "googleReviewCount" INTEGER,
ADD COLUMN     "websiteUrl" TEXT,
ALTER COLUMN "city" DROP NOT NULL,
ALTER COLUMN "state" DROP NOT NULL,
ALTER COLUMN "pincode" DROP NOT NULL;
