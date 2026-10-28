-- Replace HOTEL and RESTAURANT with combined HOTEL_RESTAURANT in VenueType enum
-- No rows use HOTEL or RESTAURANT yet, so we recreate the enum cleanly.

-- 1. Create replacement enum
CREATE TYPE "VenueType_new" AS ENUM ('CONVENTION_CENTER', 'AUDITORIUM', 'BANQUET_HALL', 'RESORT', 'HOTEL_RESTAURANT');

-- 2. Migrate Venue table
ALTER TABLE "Venue" ALTER COLUMN "venueType" DROP DEFAULT;
ALTER TABLE "Venue" ALTER COLUMN "venueType" TYPE "VenueType_new"
  USING (CASE "venueType"::text
    WHEN 'HOTEL' THEN 'HOTEL_RESTAURANT'
    WHEN 'RESTAURANT' THEN 'HOTEL_RESTAURANT'
    ELSE "venueType"::text
  END)::"VenueType_new";
ALTER TABLE "Venue" ALTER COLUMN "venueType" SET DEFAULT 'CONVENTION_CENTER'::"VenueType_new";

-- 3. Migrate OwnerApplication table
ALTER TABLE "OwnerApplication" ALTER COLUMN "venueType" DROP DEFAULT;
ALTER TABLE "OwnerApplication" ALTER COLUMN "venueType" TYPE "VenueType_new"
  USING (CASE "venueType"::text
    WHEN 'HOTEL' THEN 'HOTEL_RESTAURANT'
    WHEN 'RESTAURANT' THEN 'HOTEL_RESTAURANT'
    ELSE "venueType"::text
  END)::"VenueType_new";
ALTER TABLE "OwnerApplication" ALTER COLUMN "venueType" SET DEFAULT 'CONVENTION_CENTER'::"VenueType_new";

-- 4. Swap enum types
DROP TYPE "VenueType";
ALTER TYPE "VenueType_new" RENAME TO "VenueType";
