import { z } from "zod";
import { endpoint, identity, jsonBody, setSession } from "@/server/http";
import { teams } from "@/server/omni-http";
export const GET = endpoint(async () => {
  const a = await identity();
  return { currentId: a.organizationId, workspaces: await teams.workspaces(a) };
});
export const POST = endpoint(async (req) => {
  const a = await identity(),
    v = await jsonBody(req, z.object({ id: z.uuid() }).strict());
  await setSession(await teams.switch(a, v.id));
  return { ok: true };
});
