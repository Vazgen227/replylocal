import { wakeWorker } from "@/server/omni-http";
import { z } from "zod";
import { conversationActionSchema } from "@/lib/chat-schemas";
import {
  checkOrigin,
  endpoint,
  identity,
  jsonBody,
  store,
} from "@/server/http";
import { chats } from "@/server/chat-http";
export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };
export async function GET(request: Request, ctx: Context) {
  return endpoint(async () =>
    chats.thread(await identity(), z.uuid().parse((await ctx.params).id)),
  )(request);
}
export async function PATCH(request: Request, ctx: Context) {
  return endpoint(async (req) => {
    const actor = await identity();
    const id = z.uuid().parse((await ctx.params).id);
    const input = await jsonBody(req, conversationActionSchema);
    await store.rateLimit("operator:" + actor.organizationId, 300, 900);
    wakeWorker();
    return chats.action(actor, id, input.version, input.action);
  })(request);
}
export async function DELETE(request: Request, ctx: Context) {
  return endpoint(async (req) => {
    checkOrigin(req);
    const actor = await identity();
    const id = z.uuid().parse((await ctx.params).id);
    await chats.remove(actor, id);
    return { ok: true };
  })(request);
}

export const maxDuration = 60;
