import { z } from "zod";
import { appointmentActionSchema } from "@/lib/booking";
import { endpoint, identity, jsonBody, store } from "@/server/http";
import { bookings } from "@/server/booking-http";
import { wakeWorker } from "@/server/omni-http";
export const runtime = "nodejs";
export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  return endpoint(async (req) => {
    const actor = await identity();
    const id = z.uuid().parse((await ctx.params).id);
    const input = await jsonBody(req, appointmentActionSchema);
    await store.rateLimit(`operator:${actor.organizationId}`, 300, 900);
    await bookings.act(actor, id, input);
    wakeWorker();
    return { ok: true };
  })(request);
}
