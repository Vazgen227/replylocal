import { z } from "zod";
import { endpoint, jsonBody } from "@/server/http";
import { teams } from "@/server/omni-http";
export const POST = endpoint(async (req) => {
  const v = await jsonBody(
    req,
    z
      .object({
        token: z.string().regex(/^[a-f0-9]{64}$/),
        password: z.string().min(12).max(128),
      })
      .strict(),
  );
  await teams.reset(v.token, v.password);
  return { ok: true };
});
