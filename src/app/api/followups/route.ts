import { endpoint, identity } from "@/server/http";
import { bookings } from "@/server/booking-http";
export const runtime = "nodejs";
export const GET = endpoint(async () => bookings.followups(await identity()));
