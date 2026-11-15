import { z } from "zod";
import { followupActionSchema } from "@/lib/booking";
import { endpoint, identity, jsonBody, store } from "@/server/http";
import { bookings } from "@/server/booking-http";
export const runtime = "nodejs";
export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  return endpoint(async (req) => {
    const actor = await identity();
    const id = z.uuid().parse((await ctx.params).id);
    const input = await jsonBody(req, followupActionSchema);
    await store.rateLimit(`operator:${actor.organizationId}`, 300, 900);
    await bookings.actFollowup(actor, id, input);
    return { ok: true };
  })(request);
}
