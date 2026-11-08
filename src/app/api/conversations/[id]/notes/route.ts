import { z } from "zod";
import { endpoint, identity, jsonBody } from "@/server/http";
import { omni } from "@/server/omni-http";
export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  return endpoint(async (req) => {
    const a = await identity(),
      v = await jsonBody(
        req,
        z.object({ content: z.string().trim().min(1).max(2000) }).strict(),
      );
    await omni.note(a, z.uuid().parse((await ctx.params).id), v.content);
    return { ok: true };
  })(request);
}
