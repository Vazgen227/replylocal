import { z } from "zod";
import { endpoint, identity } from "@/server/http";
import { bookings } from "@/server/booking-http";
export const runtime = "nodejs";
export const GET = endpoint(async (request) => {
  const url = new URL(request.url);
  const day = z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .parse(url.searchParams.get("day") ?? undefined);
  const duration = z.coerce
    .number()
    .int()
    .min(5)
    .max(1440)
    .optional()
    .parse(url.searchParams.get("duration") ?? undefined);
  return bookings.slots(await identity(), day, duration);
});
