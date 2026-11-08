import { z } from "zod";
import { emailSchema, passwordSchema } from "@/lib/schemas";
import { endpoint, jsonBody, publicLimit, setSession } from "@/server/http";
import { teams } from "@/server/omni-http";
export const POST = endpoint(async (req) => {
  const v = await jsonBody(
    req,
    z
      .object({
        token: z.string().regex(/^[a-f0-9]{64}$/),
        email: emailSchema,
        name: z.string().trim().min(2).max(100),
        password: passwordSchema,
      })
      .strict(),
  );
  await publicLimit("join", v.email, 5, 100);
  await setSession(
    await teams.registerInvite(v.token, v.email, v.name, v.password),
  );
  return { ok: true };
}, 201);
