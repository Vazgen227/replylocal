import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import {
  createStore,
  type Database,
  type Query,
  type Identity,
} from "../src/server/store";
import { createChatStore } from "../src/server/chat-store";
import type { AIContext, AIResult } from "../src/server/ai-provider";
import { startChatSchema } from "../src/lib/chat-schemas";
import { retrieveKnowledge } from "../src/server/retrieval";
const pg = new PGlite();
const query: Query = async (sql, params) =>
  (await pg.query(sql, params)).rows as never;
const db: Database = {
  query,
  transaction: (work) =>
    pg.transaction((tx) =>
      work(async (sql, params) => (await tx.query(sql, params)).rows as never),
    ),
};
const store = createStore(db);
let alice: Identity, bob: Identity;
let configured = true,
  calls = 0,
  lastContext: AIContext;
let generate: (c: AIContext) => Promise<AIResult> = async (c) => ({
  answer: "Inspection costs 250 UAH.",
  handoff: false,
  sourceIds: [c.entries[0].id],
  inputTokens: 120,
  outputTokens: 20,
});
const chats = createChatStore(
  db,
  async (c) => {
    calls++;
    lastContext = c;
    return generate(c);
  },
  () => configured,
);
const bad = (code: string) => (e: unknown) =>
  (e as { code: string }).code === code;
async function publish(actor: Identity, overrides = {}) {
  const c = await chats.config(actor);
  await chats.saveConfig(actor, {
    enabled: true,
    autoReply: true,
    welcome: "Welcome",
    dailyLimit: 50,
    version: c.version,
    ...overrides,
  });
  return chats.config(actor);
}
async function start(actor = alice) {
  const c = await chats.config(actor);
  return chats.start({
    publicId: c.publicId,
    name: "Visitor",
    contact: "visitor@example.test",
    locale: "en",
    consent: true,
  });
}
before(async () => {
  for (const file of ["001_initial.sql", "002_chat.sql", "003_omnichannel.sql"])
    await pg.exec(
      await readFile(new URL("../db/" + file, import.meta.url), "utf8"),
    );
  for (const name of ["Alice", "Bob"]) {
    const token = await store.register({
      name,
      companyName: name + " Business",
      email: name.toLowerCase() + "@example.test",
      password: "a sufficiently long password",
    });
    const actor = (await store.identity(token))!;
    if (name === "Alice") alice = actor;
    else bob = actor;
  }
  await store.saveEntry(alice, {
    kind: "service",
    title: "Inspection",
    content: "Visual inspection costs 250 UAH.",
    price: 250,
    currency: "UAH",
    durationMinutes: 30,
    sku: "",
  });
  await store.saveEntry(bob, {
    kind: "rule",
    title: "Secret Bob policy",
    content: "Bob private password: not for Alice",
    price: null,
    currency: "USD",
    durationMinutes: null,
    sku: "",
  });
});
after(async () => {
  await pg.close();
});
test("chat is disabled by default and anonymous start is rejected", async () => {
  const c = await chats.config(alice);
  assert.equal(c.enabled, false);
  await assert.rejects(start(), bad("CHAT_DISABLED"));
  assert.equal(
    startChatSchema.safeParse({
      publicId: c.publicId,
      name: "Visitor",
      contact: "",
      locale: "en",
      consent: false,
    }).success,
    false,
  );
});
test("publishing config is role-scoped and detects stale changes", async () => {
  const c = await publish(alice);
  assert.equal(c.enabled, true);
  await assert.rejects(
    chats.saveConfig(
      { ...alice, role: "agent" },
      {
        enabled: false,
        autoReply: true,
        welcome: "",
        dailyLimit: 50,
        version: c.version,
      },
    ),
    bad("FORBIDDEN"),
  );
  await assert.rejects(
    chats.saveConfig(alice, {
      enabled: true,
      autoReply: true,
      welcome: "",
      dailyLimit: 50,
      version: c.version - 1,
    }),
    bad("CONFLICT"),
  );
});
test("a visitor can only read their own session with the opaque token", async () => {
  const a = await start(),
    b = await start();
  assert.equal(a.thread.visitorName, "Visitor");
  await assert.rejects(
    chats.visitorThread(a.thread.id, b.token),
    bad("NOT_FOUND"),
  );
  await assert.rejects(
    chats.visitorThread(a.thread.id, "invalid"),
    bad("NOT_FOUND"),
  );
  const [row] = await query(
    "SELECT token_hash FROM conversations WHERE id=$1",
    [a.thread.id],
  );
  assert.notEqual(row.token_hash, a.token);
});
test("real message pipeline retrieves only tenant knowledge, stores citations and records usage", async () => {
  const a = await start();
  const before = calls;
  const thread = await chats.post(
    a.thread.id,
    a.token,
    randomUUID(),
    "How much does inspection cost?",
  );
  assert.equal(calls, before + 1);
  assert.equal(thread.messages.at(-1)?.sender, "assistant");
  assert.match(thread.messages.at(-1)!.content, /250/);
  assert.ok(thread.messages.at(-1)!.sources.length);
  assert.equal(JSON.stringify(lastContext).includes("Secret Bob"), false);
  assert.equal(lastContext.companyName, "Alice Business");
  const stats = await chats.stats(alice);
  assert.ok(stats.aiReplies >= 1);
  assert.equal(stats.inputTokens, 120);
});
test("retries are idempotent and do not call AI twice", async () => {
  const a = await start();
  const id = randomUUID(),
    count = calls;
  await chats.post(a.thread.id, a.token, id, "Inspection price");
  const result = await chats.post(a.thread.id, a.token, id, "Inspection price");
  assert.equal(result.messages.filter((m) => m.sender === "visitor").length, 1);
  assert.equal(calls, count + 1);
});
test("another company cannot read, act, reply or delete a known conversation id", async () => {
  const a = await start();
  await assert.rejects(chats.thread(bob, a.thread.id), bad("NOT_FOUND"));
  await assert.rejects(
    chats.action(bob, a.thread.id, 1, "takeover"),
    bad("NOT_FOUND"),
  );
  await assert.rejects(
    chats.reply(bob, a.thread.id, randomUUID(), "No"),
    bad("NOT_FOUND"),
  );
  await assert.rejects(chats.remove(bob, a.thread.id), bad("NOT_FOUND"));
  assert.equal((await chats.list(bob)).length, 0);
});
test("visitor handoff stops AI; operator reply is delivered and deduplicated", async () => {
  const a = await start();
  await chats.handoff(a.thread.id, a.token);
  const before = calls;
  await chats.post(a.thread.id, a.token, randomUUID(), "Inspection?");
  assert.equal(calls, before);
  const id = randomUUID();
  await chats.reply(alice, a.thread.id, id, "An operator is here.");
  await chats.reply(alice, a.thread.id, id, "An operator is here.");
  const result = await chats.visitorThread(a.thread.id, a.token);
  assert.equal(result.mode, "human");
  assert.equal(
    result.messages.filter((m) => m.sender === "operator").length,
    1,
  );
});
test("operator takeover while AI is in flight discards the stale response", async () => {
  const a = await start();
  let enter!: () => void, release!: (r: AIResult) => void;
  const entered = new Promise<void>((r) => (enter = r));
  generate = () => {
    enter();
    return new Promise((r) => (release = r));
  };
  const operation = chats.post(
    a.thread.id,
    a.token,
    randomUUID(),
    "Inspection please",
  );
  await entered;
  const current = await chats.thread(alice, a.thread.id);
  await chats.action(alice, a.thread.id, current.version, "takeover");
  release({
    answer: "Must be discarded",
    handoff: false,
    sourceIds: [lastContext.entries[0].id],
    inputTokens: 10,
    outputTokens: 3,
  });
  const result = await operation;
  assert.equal(result.mode, "human");
  assert.equal(
    result.messages.some((m) => m.content === "Must be discarded"),
    false,
  );
  generate = async (c) => ({
    answer: "250 UAH",
    handoff: false,
    sourceIds: [c.entries[0].id],
    inputTokens: 10,
    outputTokens: 3,
  });
});
test("provider failure keeps the visitor question and queues it for a person", async () => {
  const a = await start();
  const normal = generate;
  generate = async () => {
    throw new Error("provider secret must never appear");
  };
  const thread = await chats.post(
    a.thread.id,
    a.token,
    randomUUID(),
    "Inspection request",
  );
  assert.equal(thread.mode, "human");
  assert.ok(thread.messages.some((m) => m.sender === "visitor"));
  assert.equal(JSON.stringify(thread).includes("provider secret"), false);
  generate = normal;
});
test("fabricated source IDs trigger handoff instead of an ungrounded answer", async () => {
  const a = await start();
  const normal = generate;
  generate = async () => ({
    answer: "Fabricated business fact",
    handoff: false,
    sourceIds: [randomUUID()],
    inputTokens: 1,
    outputTokens: 1,
  });
  const result = await chats.post(
    a.thread.id,
    a.token,
    randomUUID(),
    "Inspection price",
  );
  assert.equal(result.mode, "human");
  assert.equal(
    result.messages.some((m) => m.content === "Fabricated business fact"),
    false,
  );
  generate = normal;
});
test("daily cap is enforced before another provider call", async () => {
  await publish(alice, { dailyLimit: 1 });
  const a = await start(),
    before = calls;
  const result = await chats.post(
    a.thread.id,
    a.token,
    randomUUID(),
    "Inspection price",
  );
  assert.equal(calls, before);
  assert.equal(result.mode, "human");
  await publish(alice);
});
test("without a configured AI key the real operator chat still works", async () => {
  configured = false;
  const a = await start(),
    before = calls;
  const result = await chats.post(
    a.thread.id,
    a.token,
    randomUUID(),
    "Inspection price",
  );
  assert.equal(calls, before);
  assert.equal(result.mode, "human");
  configured = true;
});
test("missing facts trigger handoff without calling the provider", async () => {
  await publish(bob);
  const b = await start(bob);
  await query("DELETE FROM knowledge_entries WHERE organization_id=$1", [
    bob.organizationId,
  ]);
  const before = calls,
    result = await chats.post(b.thread.id, b.token, randomUUID(), "No facts");
  assert.equal(calls, before);
  assert.equal(result.mode, "human");
});
test("closed conversations reject messages and can be reopened by operator", async () => {
  const a = await start();
  await chats.action(alice, a.thread.id, a.thread.version, "close");
  await assert.rejects(
    chats.post(a.thread.id, a.token, randomUUID(), "Hello"),
    bad("CHAT_CLOSED"),
  );
  const current = await chats.thread(alice, a.thread.id);
  await chats.action(alice, a.thread.id, current.version, "reopen");
  assert.equal(
    (await chats.visitorThread(a.thread.id, a.token)).status,
    "open",
  );
});
test("expired visitor access does not remove operator access", async () => {
  const a = await start();
  await query(
    "UPDATE conversations SET expires_at=now()-interval '1 second' WHERE id=$1",
    [a.thread.id],
  );
  await assert.rejects(
    chats.visitorThread(a.thread.id, a.token),
    bad("NOT_FOUND"),
  );
  assert.equal((await chats.thread(alice, a.thread.id)).id, a.thread.id);
});
test("deleting a conversation cascades messages and events", async () => {
  const a = await start();
  await chats.remove(alice, a.thread.id);
  const [count] = await query(
    "SELECT count(*)::int AS count FROM messages WHERE conversation_id=$1",
    [a.thread.id],
  );
  assert.equal(count.count, 0);
  await assert.rejects(
    chats.visitorThread(a.thread.id, a.token),
    bad("NOT_FOUND"),
  );
});
test("retrieval bounds input and preserves unknown prices", async () => {
  const entries = (await store.workspace(alice)).entries;
  const result = retrieveKnowledge(entries, "inspection");
  assert.equal(result[0].title, "Inspection");
  assert.equal(retrieveKnowledge(entries, "unrelated subject").length, 0);
});

test("interrupted serverless generation is recovered to an operator on the next authorized read", async () => {
  const a = await start();
  await query(
    "UPDATE conversations SET processing_id=$2,processing_until=now()-interval '1 second' WHERE id=$1",
    [a.thread.id, randomUUID()],
  );
  const thread = await chats.visitorThread(a.thread.id, a.token);
  assert.equal(thread.mode, "human");
  assert.equal(thread.busy, false);
  assert.ok(
    thread.messages.some(
      (m) => m.sender === "system" && m.content.includes("could not"),
    ),
  );
});
