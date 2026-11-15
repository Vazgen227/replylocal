import { z } from "zod";
import { checkOrigin, endpoint, identity, jsonBody, store } from "@/server/http";
import { alerts } from "@/server/omni-http";
export const runtime = "nodejs";
export const GET = endpoint(async () => alerts.status(await identity()));
export const POST = endpoint(async (request) => {
  const actor = await identity();
  const input = await jsonBody(
    request,
    z.object({ locale: z.enum(["ru", "uk", "en"]) }).strict(),
  );
  await store.rateLimit(`telegram-link:${actor.userId}`, 20, 900);
  return alerts.link(actor, input.locale);
});
export const DELETE = endpoint(async (request) => {
  checkOrigin(request);
  await alerts.unlink(await identity());
  return { ok: true };
});
