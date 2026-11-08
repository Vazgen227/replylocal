import { z } from "zod";
import { costSchema } from "@/lib/omni-schemas";
import { endpoint, identity, jsonBody } from "@/server/http";
import { omni } from "@/server/omni-http";
export const GET = endpoint(async (req) =>
  omni.report(
    await identity(),
    z
      .string()
      .regex(/^\d{4}-(0[1-9]|1[0-2])-01$/)
      .parse(new URL(req.url).searchParams.get("month")),
  ),
);
export const POST = endpoint(async (req) => {
  const a = await identity();
  await omni.cost(a, await jsonBody(req, costSchema));
  return { ok: true };
});
