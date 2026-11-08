import "server-only";
import { after } from "next/server";
import { database } from "./database";
import { chats } from "./chat-http";
import { providerFetch } from "./provider-fetch";
import { createOmniStore } from "./omni-store";
import { createTeamStore } from "./team-store";
import { createBilling } from "./billing";
export const omni = createOmniStore(database, chats, providerFetch);
export const teams = createTeamStore(database);
export const billing = createBilling(database);
export function wakeWorker() {
  after(async () => {
    const start = Date.now();
    try {
      while (Date.now() - start < 20000 && (await omni.runOne())) {}
    } catch {
      console.error("[worker] background execution interrupted");
    }
  });
}
