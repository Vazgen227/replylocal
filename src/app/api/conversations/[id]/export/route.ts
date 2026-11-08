import { z } from "zod";
import { identity, store } from "@/server/http";
import { chats } from "@/server/chat-http";
import { AppError } from "@/server/errors";
export const runtime = "nodejs";
export async function GET(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await identity();
    await store.rateLimit("export:" + actor.userId, 10, 900);
    const thread = await chats.export(
      actor,
      z.uuid().parse((await ctx.params).id),
    );
    return new Response(JSON.stringify(thread, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="conversation-${thread.id}.json"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    return Response.json(
      { error: e instanceof AppError ? e.code : "SERVER_ERROR" },
      { status: e instanceof AppError ? e.status : 500 },
    );
  }
}
