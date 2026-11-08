import { saveBookingSettingsSchema } from "@/lib/booking";
import { endpoint, identity, jsonBody, store } from "@/server/http";
import { bookings } from "@/server/booking-http";
export const runtime = "nodejs";
export const GET = endpoint(async () => bookings.settings(await identity()));
export const PATCH = endpoint(async (request) => {
  const actor = await identity();
  const input = await jsonBody(request, saveBookingSettingsSchema);
  await store.rateLimit(`write:${actor.organizationId}`, 300, 900);
  await bookings.saveSettings(actor, input.settings, input.version);
  return { ok: true };
});
