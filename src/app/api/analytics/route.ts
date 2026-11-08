import { endpoint, identity } from "@/server/http";
import { chats } from "@/server/chat-http";
export const runtime = "nodejs";
export const GET = endpoint(async () => chats.stats(await identity()));
