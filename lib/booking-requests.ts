import type { BookingStatus } from "@prisma/client";

// A request to book is not a booking until the convention centre approves it, and a rejected one never becomes one.
// A request nobody answered before its hold ran out (EXPIRED) is the same. All of them live only in the Enquiries tab,
// so Bookings and Customers hold real business only.
export const REQUEST_STATUSES: BookingStatus[] = ["PENDING", "REJECTED", "EXPIRED"];
export const notRequests = { notIn: REQUEST_STATUSES };
