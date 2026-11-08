import { z } from "zod";
import { connectionSchema } from "@/lib/omni-schemas";
import { endpoint, identity, jsonBody, store } from "@/server/http";
import { omni } from "@/server/omni-http";
export const runtime = "nodejs";
export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  return endpoint(async (req) => {
    const a = await identity(),
      v = await jsonBody(
        req,
        z
          .object({
            enabled: z.boolean(),
            version: z.number().int().positive(),
          })
          .strict(),
      );
    await store.rateLimit("connect:" + a.organizationId, 20, 900);
    await omni.toggle(
      a,
      z.uuid().parse((await ctx.params).id),
      v.enabled,
      v.version,
    );
    return { ok: true };
  })(request);
}
export async function PUT(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  return endpoint(async (req) => {
    const a = await identity(),
      v = await jsonBody(
        req,
        z
          .object({
            credentials: connectionSchema,
            version: z.number().int().positive(),
          })
          .strict(),
      );
    await store.rateLimit("connect:" + a.organizationId, 20, 900);
    return omni.connect(
      a,
      v.credentials,
      z.uuid().parse((await ctx.params).id),
      v.version,
    );
  })(request);
}
