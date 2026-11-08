import { z } from "zod";
import { inviteSchema } from "@/lib/omni-schemas";
import { endpoint, identity, jsonBody } from "@/server/http";
import { teams, wakeWorker } from "@/server/omni-http";
export const GET = endpoint(async () => teams.list(await identity()));
export const POST = endpoint(async (req) => {
  const a = await identity(),
    v = await jsonBody(req, inviteSchema),
    result = await teams.invite(a, v.email, v.role);
  wakeWorker();
  return result;
}, 201);
export const PATCH = endpoint(async (req) => {
  const a = await identity(),
    v = await jsonBody(req, z.object({ enabled: z.boolean() }).strict());
  await teams.notifications(a, v.enabled);
  return { ok: true };
});
export const DELETE = endpoint(async (req) => {
  const a = await identity(),
    v = await jsonBody(req, z.object({ id: z.uuid() }).strict());
  await teams.revoke(a, v.id);
  return { ok: true };
});

export const maxDuration = 60;
