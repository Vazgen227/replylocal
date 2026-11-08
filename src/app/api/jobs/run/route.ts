import { endpoint } from "@/server/http";
import { omni } from "@/server/omni-http";
import { AppError } from "@/server/errors";
import { equalSecret } from "@/server/crypto-secrets";
export const runtime = "nodejs";
export const maxDuration = 60;
const run = endpoint(async (req) => {
  const secret = process.env.CRON_SECRET;
  if (!secret) throw new AppError(503, "WORKER_NOT_CONFIGURED");
  if (!equalSecret(req.headers.get("authorization") ?? "", "Bearer " + secret))
    throw new AppError(401, "UNAUTHORIZED");
  let processed = 0;
  const start = Date.now();
  while (Date.now() - start < 20000 && (await omni.runOne())) processed++;
  return { processed };
});
export const GET = run;
export const POST = run;
