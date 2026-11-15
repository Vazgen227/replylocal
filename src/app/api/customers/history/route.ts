import { z } from "zod";
import { endpoint, identity } from "@/server/http";
import { bookings } from "@/server/booking-http";
export const runtime = "nodejs";
/** Customer history by phone (?phone=) or for a conversation (?conversation=). */
export const GET = endpoint(async (request) => {
  const p = new URL(request.url).searchParams;
  const phone = z.string().trim().max(60).optional().parse(p.get("phone") ?? undefined);
  const conversationId = z.uuid().optional().parse(p.get("conversation") ?? undefined);
  return bookings.history(await identity(), { phone, conversationId });
});
