import { startChatSchema } from "@/lib/chat-schemas";
import { endpoint, jsonBody, store } from "@/server/http";
import { chats } from "@/server/chat-http";
export const runtime = "nodejs";
export const POST = endpoint(async (request) => {
  const input = await jsonBody(request, startChatSchema);
  await store.rateLimit("public-chat-global", 500, 900);
  return chats.start(input);
}, 201);
