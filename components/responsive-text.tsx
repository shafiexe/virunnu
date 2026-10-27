"use client";

/**
 * Shows different text on mobile vs desktop.
 * Adjust labels here without touching individual components.
 *
 * Usage:
 *   <ResponsiveText mobile="Bookings" desktop="My bookings" />
 */
export function ResponsiveText({ mobile, desktop }: { mobile: string; desktop: string }) {
  return (
    <>
      <span className="md:hidden">{mobile}</span>
      <span className="hidden md:inline">{desktop}</span>
    </>
  );
}
