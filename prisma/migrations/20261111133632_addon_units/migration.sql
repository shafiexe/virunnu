-- CreateEnum
CREATE TYPE "AddonUnit" AS ENUM ('FIXED', 'HOUR');

-- AlterTable
ALTER TABLE "BookingAddon" ADD COLUMN     "quantity" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "unit" "AddonUnit" NOT NULL DEFAULT 'FIXED',
ADD COLUMN     "unitPricePaise" INTEGER;

-- AlterTable
ALTER TABLE "VenueAddon" ADD COLUMN     "unit" "AddonUnit" NOT NULL DEFAULT 'FIXED';
