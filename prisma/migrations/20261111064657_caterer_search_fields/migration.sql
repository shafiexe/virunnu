-- AlterTable
ALTER TABLE "Caterer" ADD COLUMN     "address" TEXT,
ADD COLUMN     "fssaiNumber" TEXT,
ADD COLUMN     "googleMapsUrl" TEXT,
ADD COLUMN     "googleRating" DOUBLE PRECISION,
ADD COLUMN     "googleReviewCount" INTEGER,
ADD COLUMN     "lat" DOUBLE PRECISION,
ADD COLUMN     "leadTimeHours" INTEGER,
ADD COLUMN     "lng" DOUBLE PRECISION,
ADD COLUMN     "maxGuests" INTEGER,
ADD COLUMN     "mealTypes" TEXT[],
ADD COLUMN     "minGuests" INTEGER,
ADD COLUMN     "pastEvents" JSONB,
ADD COLUMN     "serviceAreas" TEXT[],
ADD COLUMN     "serviceRadiusKm" INTEGER,
ADD COLUMN     "startingPriceRupees" INTEGER,
ADD COLUMN     "teamSize" INTEGER,
ADD COLUMN     "yearsExperience" INTEGER;

-- AlterTable
ALTER TABLE "CatererApplication" ADD COLUMN     "details" JSONB;
