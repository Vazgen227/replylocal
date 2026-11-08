import { z } from "zod";
import { endpoint, identity, jsonBody, store } from "@/server/http";
import { bookings } from "@/server/booking-http";
export const runtime = "nodejs";
export const POST = endpoint(async (request) => {
  const actor = await identity();
  const input = await jsonBody(
    request,
    z.object({ template: z.literal("service-station"), locale: z.enum(["ru", "uk", "en"]) }).strict(),
  );
  await store.rateLimit(`write:${actor.organizationId}`, 300, 900);
  return bookings.applyTemplate(actor, input.locale);
}, 201);
