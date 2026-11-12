-- CreateTable
CREATE TABLE "VenueAddon" (
    "id" TEXT NOT NULL,
    "venueId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "pricePaise" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VenueAddon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingAddon" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "pricePaise" INTEGER NOT NULL,

    CONSTRAINT "BookingAddon_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VenueAddon_venueId_idx" ON "VenueAddon"("venueId");

-- CreateIndex
CREATE INDEX "BookingAddon_bookingId_idx" ON "BookingAddon"("bookingId");

-- AddForeignKey
ALTER TABLE "VenueAddon" ADD CONSTRAINT "VenueAddon_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingAddon" ADD CONSTRAINT "BookingAddon_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
