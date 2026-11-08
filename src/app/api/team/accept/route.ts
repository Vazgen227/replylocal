import { z } from "zod";
import { endpoint, identity, jsonBody, setSession } from "@/server/http";
import { teams } from "@/server/omni-http";
export const POST = endpoint(async (req) => {
  const a = await identity(),
    v = await jsonBody(
      req,
      z.object({ token: z.string().regex(/^[a-f0-9]{64}$/) }).strict(),
    );
  await setSession(await teams.accept(a, v.token));
  return { ok: true };
});
