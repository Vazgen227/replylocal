import { chatConfigSchema } from "@/lib/chat-schemas";
import { endpoint, identity, jsonBody, store } from "@/server/http";
import { chats } from "@/server/chat-http";
export const runtime = "nodejs";
export const GET = endpoint(async () => chats.config(await identity()));
export const PATCH = endpoint(async (request) => {
  const actor = await identity();
  const input = await jsonBody(request, chatConfigSchema);
  await store.rateLimit("config:" + actor.organizationId, 60, 900);
  await chats.saveConfig(actor, input);
  return { ok: true };
});
