import { wakeWorker } from "@/server/omni-http";
import { z } from "zod";
import { visitorMessageSchema } from "@/lib/chat-schemas";
import { checkOrigin, endpoint, jsonBody, store } from "@/server/http";
import { chats, visitorToken } from "@/server/chat-http";
export const runtime = "nodejs";
export const maxDuration = 60;
export const GET = endpoint(async (request) => {
  const id = z
    .uuid()
    .parse(new URL(request.url).searchParams.get("conversationId"));
  const token = visitorToken(request);
  await store.rateLimit("poll:" + token, 600, 900);
  return chats.visitorThread(id, token);
});
export const POST = endpoint(async (request) => {
  checkOrigin(request);
  const token = visitorToken(request);
  const input = await jsonBody(request, visitorMessageSchema);
  await store.rateLimit("message:" + token, 30, 900);
  wakeWorker();
  return chats.post(input.conversationId, token, input.clientId, input.text);
});
