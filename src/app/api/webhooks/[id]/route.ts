import { z } from "zod";
import { endpoint } from "@/server/http";
import { omni, wakeWorker } from "@/server/omni-http";
import { rawBody } from "@/server/crypto-secrets";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function GET(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const p = new URL(request.url).searchParams;
    return new Response(
      await omni.challenge(
        z.uuid().parse((await ctx.params).id),
        p.get("hub.mode"),
        p.get("hub.verify_token"),
        p.get("hub.challenge"),
      ),
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return new Response("Forbidden", { status: 403 });
  }
}
export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  return endpoint(async (req) => {
    const result = await omni.ingest(
      z.uuid().parse((await ctx.params).id),
      await rawBody(req),
      req.headers,
    );
    wakeWorker();
    return result;
  })(request);
}
