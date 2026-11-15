import { endpoint } from "@/server/http";
import { alerts, wakeWorker } from "@/server/omni-http";
import { rawBody } from "@/server/crypto-secrets";
export const runtime = "nodejs";
export const maxDuration = 30;
/** Webhook of the platform alert bot: account linking and booking buttons. */
export const POST = endpoint(async (request) => {
  await alerts.handle(await rawBody(request), request.headers);
  // Confirming or declining queues a message to the customer.
  wakeWorker();
  return { ok: true };
});
