import { z } from "zod";
import { endpoint, identity } from "@/server/http";
import { chats } from "@/server/chat-http";
export const runtime = "nodejs";
export const GET = endpoint(async (req) => {
  const p = new URL(req.url).searchParams;
  const filter = z
    .object({
      search: z.string().max(200),
      channel: z.enum([
        "all",
        "website",
        "telegram",
        "whatsapp",
        "viber",
        "instagram",
      ]),
      status: z.enum(["all", "waiting", "closed"]),
      mine: z.boolean(),
      page: z.coerce.number().int().min(0).max(10000),
    })
    .parse({
      search: p.get("search") ?? "",
      channel: p.get("channel") ?? "all",
      status: p.get("status") ?? "all",
      mine: p.get("mine") === "true",
      page: p.get("page") ?? 0,
    });
  const rows = await chats.list(await identity(), { ...filter, limit: 26 });
  return { threads: rows.slice(0, 25), hasNext: rows.length > 25 };
});
