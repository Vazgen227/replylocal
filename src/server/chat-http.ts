import "server-only";
import { database } from "./database";
import { createChatStore } from "./chat-store";
import { aiConfigured, openAIProvider } from "./ai-provider";
import { AppError } from "./errors";
export const chats = createChatStore(database, openAIProvider, aiConfigured);
export function visitorToken(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer /, "");
  if (!token || !/^[a-f0-9]{64}$/.test(token))
    throw new AppError(401, "UNAUTHORIZED");
  return token;
}
