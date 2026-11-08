import { wakeWorker } from "@/server/omni-http";
import { z } from "zod";
import { endpoint, jsonBody, store } from "@/server/http";
import { chats, visitorToken } from "@/server/chat-http";
export const runtime = "nodejs";
export const POST = endpoint(async (request) => {
  const token = visitorToken(request);
  const { conversationId } = await jsonBody(
    request,
    z.object({ conversationId: z.uuid() }).strict(),
  );
  await store.rateLimit("handoff:" + token, 5, 900);
  wakeWorker();
  return chats.handoff(conversationId, token);
});

export const maxDuration = 60;
