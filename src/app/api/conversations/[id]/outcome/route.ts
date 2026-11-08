import { z } from "zod";
import { outcomeSchema } from "@/lib/omni-schemas";
import { endpoint, identity, jsonBody } from "@/server/http";
import { omni } from "@/server/omni-http";
export async function GET(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  return endpoint(async () =>
    omni.outcome(await identity(), z.uuid().parse((await ctx.params).id)),
  )(request);
}
export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  return endpoint(async (req) => {
    const a = await identity(),
      v = await jsonBody(req, outcomeSchema);
    await omni.saveOutcome(a, z.uuid().parse((await ctx.params).id), v);
    return { ok: true };
  })(request);
}
