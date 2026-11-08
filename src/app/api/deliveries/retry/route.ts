import { z } from "zod";
import { endpoint, identity, jsonBody } from "@/server/http";
import { omni, wakeWorker } from "@/server/omni-http";
export const POST = endpoint(async (req) => {
  const a = await identity(),
    v = await jsonBody(
      req,
      z
        .object({ id: z.uuid(), confirmPossibleDuplicate: z.literal(true) })
        .strict(),
    );
  await omni.retryDelivery(a, v.id);
  wakeWorker();
  return { ok: true };
});

export const maxDuration = 60;
