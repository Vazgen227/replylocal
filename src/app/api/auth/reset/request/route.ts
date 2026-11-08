import { z } from "zod";
import { endpoint, jsonBody } from "@/server/http";
import { teams, wakeWorker } from "@/server/omni-http";
export const POST = endpoint(async (req) => {
  const v = await jsonBody(
    req,
    z
      .object({ email: z.string().trim().toLowerCase().email().max(254) })
      .strict(),
  );
  await teams.requestReset(v.email);
  wakeWorker();
  return { ok: true };
}, 202);

export const maxDuration = 60;
