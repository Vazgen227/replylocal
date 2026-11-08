import { wakeWorker } from "@/server/omni-http";
import { z } from "zod";
import { operatorReplySchema } from "@/lib/chat-schemas";
import { endpoint, identity, jsonBody, store } from "@/server/http";
import { chats } from "@/server/chat-http";
export const runtime = "nodejs";
export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  return endpoint(async (req) => {
    const actor = await identity();
    const id = z.uuid().parse((await ctx.params).id);
    const input = await jsonBody(req, operatorReplySchema);
    await store.rateLimit("operator:" + actor.organizationId, 300, 900);
    wakeWorker();
    return chats.reply(actor, id, input.clientId, input.text);
  })(request);
}

export const maxDuration = 60;
