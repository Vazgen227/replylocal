import { checkOrigin, endpoint, identity, store } from "@/server/http";
import { alerts } from "@/server/omni-http";
export const runtime = "nodejs";
export const POST = endpoint(async (request) => {
  checkOrigin(request);
  const actor = await identity();
  await store.rateLimit(`telegram-test:${actor.userId}`, 10, 900);
  await alerts.test(actor);
  return { ok: true };
});
