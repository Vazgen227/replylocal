import { connectionSchema } from "@/lib/omni-schemas";
import { endpoint, identity, jsonBody, store } from "@/server/http";
import { omni } from "@/server/omni-http";
export const runtime = "nodejs";
export const GET = endpoint(async () => ({
  connections: await omni.connections(await identity()),
}));
export const POST = endpoint(async (req) => {
  const actor = await identity();
  await store.rateLimit("connect:" + actor.organizationId, 20, 900);
  return omni.connect(actor, await jsonBody(req, connectionSchema));
}, 201);
