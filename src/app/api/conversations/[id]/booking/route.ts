import { z } from "zod";
import { intakeSchema } from "@/lib/booking";
import { endpoint, identity, jsonBody } from "@/server/http";
import { bookings } from "@/server/booking-http";
export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };
export async function GET(request: Request, ctx: Context) {
  return endpoint(async () =>
    bookings.forConversation(
      await identity(),
      z.uuid().parse((await ctx.params).id),
    ),
  )(request);
}
export async function PATCH(request: Request, ctx: Context) {
  return endpoint(async (req) => {
    const actor = await identity();
    const id = z.uuid().parse((await ctx.params).id);
    const input = await jsonBody(req, z.object({ intake: intakeSchema }).strict());
    await bookings.saveIntake(actor, id, input.intake);
    return { ok: true };
  })(request);
}
