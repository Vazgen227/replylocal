import "server-only";
import { database } from "./database";
import { createBookingStore } from "./booking-store";
export const bookings = createBookingStore(database);
