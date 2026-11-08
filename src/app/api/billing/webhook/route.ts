import { endpoint } from "@/server/http";
import { billing } from "@/server/omni-http";
import { rawBody } from "@/server/crypto-secrets";
export const runtime = "nodejs";
export const POST = endpoint(async (req) =>
  billing.webhook(
    await rawBody(req),
    req.headers.get("stripe-signature") ?? "",
  ),
);
