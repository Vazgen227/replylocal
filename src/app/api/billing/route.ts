import { z } from "zod";
import { endpoint, identity, jsonBody } from "@/server/http";
import { billing } from "@/server/omni-http";
export const runtime = "nodejs";
export const GET = endpoint(async () => billing.status(await identity()));
export const POST = endpoint(async (req) => {
  const a = await identity(),
    v = await jsonBody(
      req,
      z
        .object({
          action: z.enum(["checkout", "portal"]),
          locale: z.enum(["ru", "uk", "en"]),
        })
        .strict(),
    );
  return v.action === "portal"
    ? billing.portal(a, v.locale)
    : billing.checkout(a, v.locale);
});
