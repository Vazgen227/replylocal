import { z } from "zod";
import { endpoint, identity, jsonBody } from "@/server/http";
import { teams } from "@/server/omni-http";
export const POST = endpoint(async (req) => {
  const a = await identity(),
    v = await jsonBody(
      req,
      z
        .object({ id: z.uuid(), role: z.enum(["admin", "agent"]).nullable() })
        .strict(),
    );
  await teams.member(a, v.id, v.role);
  return { ok: true };
});
