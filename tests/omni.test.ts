import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { randomUUID, createHmac } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import Stripe from "stripe";
import {
  createStore,
  type Database,
  type Query,
  type Identity,
} from "../src/server/store";
import { createChatStore } from "../src/server/chat-store";
import { createOmniStore } from "../src/server/omni-store";
import { createTeamStore } from "../src/server/team-store";
import { createBilling } from "../src/server/billing";
import { unseal } from "../src/server/crypto-secrets";
import {
  parseChannel,
  sendChannel,
  type Credentials,
} from "../src/server/channels";
import {
  connectionSchema,
  outcomeSchema,
  costSchema,
  type Provider,
} from "../src/lib/omni-schemas";
import { aiEntitlement } from "../src/server/entitlements";
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
const store = createStore(db),
  teams = createTeamStore(db),
  billing = createBilling(db);
let alice: Identity, bob: Identity, aliceSession: string;
const calls: Array<{ url: string; body: Record<string, unknown> }> = [];
let sendBehavior = "ok",
  serial = 0;
const fetcher: typeof fetch = async (input, init) => {
  const url = String(input),
    body = JSON.parse(String(init?.body ?? "{}"));
  calls.push({ url, body });
  if (url.includes("getMe"))
    return Response.json({
      ok: true,
      result: { id: 100, username: "test_bot" },
    });
  if (url.includes("getBusinessConnection"))
    return Response.json({
      ok: true,
      result: {
        user: { id: 777 },
        is_enabled: true,
        rights: { can_reply: true },
      },
    });
  if (url.includes("setWebhook"))
    return Response.json({ ok: true, result: true });
  if (url.includes("get_account_info"))
    return Response.json({ status: 0, id: "company-viber", name: "Company" });
  if (url.includes("set_webhook")) return Response.json({ status: 0 });
  if (url.includes("fields="))
    return Response.json(
      url.includes("instagram")
        ? { id: "2002", username: "company" }
        : { id: "1001", display_phone_number: "123" },
    );
  if (url.includes("api.resend.com"))
    return Response.json({ id: randomUUID() });
  if (sendBehavior === "timeout") throw new Error("Network timeout");
  if (sendBehavior === "429") return Response.json({}, { status: 429 });
  serial++;
  if (url.includes("sendMessage"))
    return Response.json({ ok: true, result: { message_id: serial } });
  if (url.includes("send_message"))
    return Response.json({ status: 0, message_token: String(serial) });
  return Response.json(
    url.includes("instagram")
      ? { message_id: "m" + serial }
      : { messages: [{ id: "m" + serial }] },
  );
};
let aiCalls = 0;
const chats = createChatStore(
  db,
  async (c) => {
    aiCalls++;
    return {
      answer: "Inspection costs 250 UAH.",
      handoff: false,
      sourceIds: [c.entries[0].id],
      inputTokens: 12,
      outputTokens: 7,
    };
  },
  () => true,
);
const omni = createOmniStore(db, chats, fetcher);
const connections = new Map<Provider, string>();
const bad = (code: string) => (e: unknown) =>
  (e as { code: string }).code === code;
async function secret(id: string) {
  const [r] = await query<{ credentials: string; organization_id: string }>(
    "SELECT * FROM channel_connections WHERE id=$1",
    [id],
  );
  return unseal<Credentials>(r.credentials, id + ":" + r.organization_id);
}
async function deliver(
  provider: Provider,
  payload: unknown,
  id = connections.get(provider)!,
) {
  const raw = JSON.stringify(payload),
    c = await secret(id),
    headers = new Headers();
  if (provider === "telegram")
    headers.set("x-telegram-bot-api-secret-token", c.hookSecret);
  else
    headers.set(
      provider === "viber"
        ? "x-viber-content-signature"
        : "x-hub-signature-256",
      (provider === "viber" ? "" : "sha256=") +
        createHmac("sha256", provider === "viber" ? c.accessToken : c.appSecret)
          .update(raw)
          .digest("hex"),
    );
  return omni.ingest(id, raw, headers);
}
function event(
  provider: Provider,
  n: number,
  text = "How much does inspection cost?",
) {
  const now = Date.now();
  if (provider === "telegram")
    return {
      update_id: n,
      message: {
        message_id: n,
        date: Math.floor(now / 1000),
        chat: { id: 300 + n, type: "private" },
        from: { id: 300 + n, first_name: "Telegram Customer" },
        text,
      },
    };
  if (provider === "viber")
    return {
      event: "message",
      timestamp: now,
      message_token: String(BigInt("900000000000000000") + BigInt(n)),
      sender: { id: "viber-user-" + n, name: "Viber Customer" },
      message: { type: "text", text },
    };
  if (provider === "whatsapp")
    return {
      entry: [
        {
          changes: [
            {
              value: {
                metadata: { phone_number_id: "1001" },
                contacts: [
                  { wa_id: String(400 + n), profile: { name: "WA Customer" } },
                ],
                messages: [
                  {
                    id: "wa-" + n,
                    from: String(400 + n),
                    timestamp: String(Math.floor(now / 1000)),
                    type: "text",
                    text: { body: text },
                  },
                ],
              },
            },
          ],
        },
      ],
    };
  return {
    entry: [
      {
        id: "2002",
        messaging: [
          {
            sender: { id: String(500 + n) },
            recipient: { id: "2002" },
            timestamp: now,
            message: { mid: "ig-" + n, text },
          },
        ],
      },
    ],
  };
}
async function drain() {
  for (let i = 0; i < 100; i++) {
    if (!(await omni.runOne())) return;
  }
  throw new Error("Worker did not drain");
}
async function find(provider: Provider) {
  const [r] = await query<{ id: string }>(
    "SELECT id FROM conversations WHERE channel=$1 ORDER BY updated_at DESC LIMIT 1",
    [provider],
  );
  return r.id;
}
function sendCalls() {
  return calls.filter((c) =>
    /sendMessage|send_message|\/messages$/.test(c.url),
  );
}
before(async () => {
  process.env.APP_URL = "https://replylocal.example";
  process.env.CHANNEL_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
  process.env.RESEND_API_KEY = "test-resend";
  process.env.EMAIL_FROM = "test@example.test";
  process.env.BILLING_ENFORCED = "false";
  for (const file of ["001_initial.sql", "002_chat.sql", "003_omnichannel.sql"])
    await pg.exec(
      await readFile(new URL("../db/" + file, import.meta.url), "utf8"),
    );
  for (const name of ["Alice", "Bob"]) {
    const session = await store.register({
      name,
      companyName: name + " Company",
      email: name.toLowerCase() + "@example.test",
      password: "a sufficiently long password",
    });
    const actor = (await store.identity(session))!;
    if (name === "Alice") {
      alice = actor;
      aliceSession = session;
    } else bob = actor;
    await chats.config(actor);
    await store.saveEntry(actor, {
      kind: "service",
      title: "Inspection",
      content: "Inspection costs 250 UAH.",
      price: 250,
      currency: "UAH",
      durationMinutes: 30,
      sku: "",
    });
  }
  for (const provider of [
    "telegram",
    "whatsapp",
    "viber",
    "instagram",
  ] as Provider[]) {
    const input = connectionSchema.parse({
      provider,
      label: provider,
      accessToken:
        provider === "telegram"
          ? "123456:abcdefghijklmnopqrstuvwxyz"
          : "test-token-abcdefghijklmnopqrstuvwxyz",
      appSecret: "test-meta-secret",
      accountId:
        provider === "whatsapp"
          ? "1001"
          : provider === "instagram"
            ? "2002"
            : "",
    });
    const { id } = await omni.connect(alice, input);
    connections.set(provider, id);
    await omni.toggle(alice, id, true, 1);
  }
});
after(async () => {
  await pg.close();
});

test("credentials use authenticated encryption and are never exposed through connection responses", async () => {
  const id = connections.get("telegram")!,
    [r] = await query<{ credentials: string }>(
      "SELECT credentials FROM channel_connections WHERE id=$1",
      [id],
    );
  assert.ok(!r.credentials.includes("abcdefghijklmnopqrstuvwxyz"));
  assert.throws(() => unseal(r.credentials, id + ":" + bob.organizationId));
  const rows = await omni.connections(alice);
  assert.equal(rows.length, 4);
  assert.ok(!JSON.stringify(rows).includes("accessToken"));
  assert.ok(!JSON.stringify(rows).includes("test-meta-secret"));
  assert.equal((await omni.connections(bob)).length, 0);
  await assert.rejects(() => omni.toggle(bob, id, false, 2), bad("NOT_FOUND"));
  await assert.rejects(
    () =>
      omni.connect(
        { ...alice, role: "agent" },
        connectionSchema.parse({
          provider: "viber",
          label: "Bot",
          accessToken: "long-test-token",
        }),
      ),
    bad("FORBIDDEN"),
  );
});
test("all four signed providers enter one tenant inbox and duplicate webhooks do not create duplicate replies", async () => {
  const beforeAI = aiCalls,
    beforeSend = sendCalls().length;
  for (const provider of connections.keys()) {
    const input = event(provider, 1);
    await deliver(provider, input);
    await deliver(provider, input);
  }
  assert.equal((await chats.list(alice)).length, 0); // Durable inbox events are processed by the worker.
  await drain();
  const rows = await chats.list(alice);
  assert.equal(rows.length, 4);
  assert.deepEqual(
    new Set(rows.map((r) => r.channel)),
    new Set(connections.keys()),
  );
  assert.equal((await chats.list(bob)).length, 0);
  assert.equal(aiCalls - beforeAI, 4);
  assert.equal(sendCalls().length - beforeSend, 4);
  for (const c of rows) {
    const thread = await chats.thread(alice, c.id);
    assert.equal(
      thread.messages.filter((m) => m.sender === "visitor").length,
      1,
    );
    assert.equal(
      thread.messages.filter((m) => m.sender === "assistant").length,
      1,
    );
  }
});
test("forged signatures, wrong Meta account and an Instagram echo cannot create messages", async () => {
  await assert.rejects(
    () =>
      omni.ingest(
        connections.get("whatsapp")!,
        JSON.stringify(event("whatsapp", 2)),
        new Headers(),
      ),
    bad("INVALID_SIGNATURE"),
  );
  const before = (await chats.list(alice)).length;
  const wrong = JSON.stringify(event("whatsapp", 2)).replaceAll("1001", "9999");
  await deliver("whatsapp", JSON.parse(wrong));
  await deliver("instagram", {
    entry: [
      {
        id: "2002",
        messaging: [
          {
            sender: { id: "100" },
            recipient: { id: "2002" },
            message: { mid: "echo", text: "Echo", is_echo: true },
          },
        ],
      },
    ],
  });
  await drain();
  assert.equal((await chats.list(alice)).length, before);
  const id = connections.get("instagram")!,
    c = await secret(id);
  assert.equal(
    await omni.challenge(id, "subscribe", c.verifyToken, "1234"),
    "1234",
  );
  await assert.rejects(
    () => omni.challenge(id, "subscribe", "wrong", "1234"),
    bad("INVALID_SIGNATURE"),
  );
});
test("delivery receipts are scoped to the connected account and advance to read", async () => {
  const id = await find("whatsapp"),
    [d] = await query<{ provider_message_id: string }>(
      "SELECT provider_message_id FROM delivery_outbox WHERE conversation_id=$1",
      [id],
    );
  await deliver("whatsapp", {
    entry: [
      {
        changes: [
          {
            value: {
              metadata: { phone_number_id: "1001" },
              statuses: [{ id: d.provider_message_id, status: "read" }],
            },
          },
        ],
      },
    ],
  });
  assert.equal((await omni.outcome(alice, id)).deliveries[0].status, "read");
  await deliver("whatsapp", {
    entry: [
      {
        changes: [
          {
            value: {
              metadata: { phone_number_id: "1001" },
              statuses: [{ id: d.provider_message_id, status: "delivered" }],
            },
          },
        ],
      },
    ],
  });
  assert.equal((await omni.outcome(alice, id)).deliveries[0].status, "read");
});
test("attachments require a human and notes never reach provider payloads", async () => {
  await deliver("viber", {
    event: "message",
    timestamp: Date.now(),
    message_token: "attachment-event",
    sender: { id: "attachment-user", name: "Photo Customer" },
    message: { type: "picture", media: "https://untrusted.example/image" },
  });
  await drain();
  const id = await find("viber"),
    t = await chats.thread(alice, id);
  assert.equal(t.mode, "human");
  const count = sendCalls().length;
  await omni.note(alice, id, "private cost = 42");
  await drain();
  assert.equal(sendCalls().length, count);
  assert.ok(!JSON.stringify(calls).includes("private cost = 42"));
  await assert.rejects(() => omni.outcome(bob, id), bad("NOT_FOUND"));
});
test("operator replies enqueue transactionally, split Instagram text, and preserve idempotency", async () => {
  const id = await find("instagram"),
    clientId = randomUUID(),
    count = sendCalls().length;
  await chats.reply(alice, id, clientId, "a".repeat(2100));
  await chats.reply(alice, id, clientId, "a".repeat(2100));
  await drain();
  const messages = sendCalls().slice(count);
  assert.equal(messages.length, 3);
  assert.deepEqual(
    messages.map((m) => (m.body.message as { text: string }).text.length),
    [1000, 1000, 100],
  );
});
test("ambiguous send failures are not retried automatically; explicit retry is available", async () => {
  const id = await find("telegram");
  sendBehavior = "timeout";
  await chats.reply(alice, id, randomUUID(), "A unique operator reply");
  const before = sendCalls().length;
  await drain();
  const d = (await omni.outcome(alice, id)).deliveries.find(
    (d) => d.content === "A unique operator reply",
  )!;
  assert.equal(d.status, "uncertain");
  await drain();
  assert.equal(sendCalls().length, before + 1);
  await assert.rejects(() => omni.retryDelivery(bob, d.id), bad("NOT_FOUND"));
  sendBehavior = "ok";
  await omni.retryDelivery(alice, d.id);
  await drain();
  assert.equal(
    (await omni.outcome(alice, id)).deliveries.find((v) => v.id === d.id)!
      .status,
    "sent",
  );
});
test("429 responses back off and the expired reply window is shown as a delivery failure", async () => {
  const id = await find("whatsapp");
  sendBehavior = "429";
  await chats.reply(alice, id, randomUUID(), "Rate limited");
  await drain();
  assert.equal((await omni.outcome(alice, id)).deliveries[0].status, "pending");
  sendBehavior = "ok";
  await query("UPDATE background_jobs SET run_at=now() WHERE status='pending'");
  await drain();
  assert.equal((await omni.outcome(alice, id)).deliveries[0].status, "sent");
  await query(
    "UPDATE conversations SET last_inbound_at=now()-interval '25 hours' WHERE id=$1",
    [id],
  );
  const count = sendCalls().length;
  await chats.reply(alice, id, randomUUID(), "Outside the allowed window");
  await drain();
  const d = (await omni.outcome(alice, id)).deliveries[0];
  assert.equal(d.lastError, "REPLY_WINDOW_CLOSED");
  assert.equal(d.status, "failed");
  assert.equal(sendCalls().length, count);
});
test("outcomes, channel spend and separate currencies produce a transparent conversion report", async () => {
  const id = await find("telegram"),
    o = await omni.outcome(alice, id);
  const v = outcomeSchema.parse({
    version: o.version,
    stage: "won",
    value: 1000,
    grossProfit: 350,
    currency: "UAH",
    assignedTo: alice.userId,
    nextStep: "Call tomorrow",
  });
  await omni.saveOutcome(alice, id, v);
  await assert.rejects(() => omni.saveOutcome(alice, id, v), bad("CONFLICT"));
  const month = new Date().toISOString().slice(0, 7) + "-01";
  const cost = costSchema.parse({
    channel: "telegram",
    month,
    currency: "UAH",
    amount: 100,
    version: 0,
  });
  await omni.cost(alice, cost);
  await assert.rejects(() => omni.cost(alice, cost), bad("CONFLICT"));
  await omni.cost(alice, { ...cost, currency: "USD", amount: 20 });
  const report = await omni.report(alice, month);
  const uah = report.rows.find(
      (r) => r.channel === "telegram" && r.currency === "UAH",
    )!,
    usd = report.rows.find(
      (r) => r.channel === "telegram" && r.currency === "USD",
    )!;
  assert.equal(uah.revenue, 1000);
  assert.equal(uah.grossProfit, 350);
  assert.equal(uah.cost, 100);
  assert.equal(uah.conversion, 100);
  assert.equal(usd.cost, 20);
  assert.equal(usd.revenue, 0);
  assert.equal((await omni.report(bob, month)).rows.length, 0);
});
test("invitations bind to an email, can be used once, and keep workspace access separate", async () => {
  const invite = await teams.invite(alice, bob.email, "agent"),
    token = new URL(invite.link).searchParams.get("token")!;
  await assert.rejects(
    () => teams.accept(alice, token),
    bad("INVITE_EMAIL_MISMATCH"),
  );
  const session = await teams.accept(bob, token),
    agent = (await store.identity(session))!;
  assert.equal(agent.role, "agent");
  assert.equal(agent.organizationId, alice.organizationId);
  await assert.rejects(() => teams.accept(bob, token), bad("INVITE_EXPIRED"));
  assert.equal((await teams.workspaces(agent)).length, 2);
  const switched = await teams.switch(agent, bob.organizationId);
  assert.equal((await store.identity(switched))!.role, "owner");
  await assert.rejects(
    () => teams.invite(agent, "someone@example.test", "agent"),
    bad("FORBIDDEN"),
  );
  await teams.member(alice, bob.userId, null);
  assert.equal(await store.identity(session), null);
  await assert.rejects(
    () => teams.switch(bob, alice.organizationId),
    bad("FORBIDDEN"),
  );
});
test("invited users can register while public registration is closed; revoked invitations fail", async () => {
  const invite = await teams.invite(alice, "new-agent@example.test", "agent"),
    token = new URL(invite.link).searchParams.get("token")!;
  const session = await teams.registerInvite(
    token,
    "new-agent@example.test",
    "New Agent",
    "a sufficiently long password",
  );
  assert.equal((await store.identity(session))!.role, "agent");
  const other = await teams.invite(alice, "revoked@example.test", "agent"),
    otherToken = new URL(other.link).searchParams.get("token")!;
  const [r] = await query<{ id: string }>(
    "SELECT id FROM team_invites WHERE email='revoked@example.test'",
  );
  await teams.revoke(alice, r.id);
  await assert.rejects(
    () =>
      teams.registerInvite(
        otherToken,
        "revoked@example.test",
        "Revoked",
        "a sufficiently long password",
      ),
    bad("INVITE_EXPIRED"),
  );
});
test("password recovery encrypts queued links, consumes tokens and revokes existing sessions", async () => {
  await teams.requestReset("absent@example.test");
  await teams.requestReset(alice.email);
  const [job] = await query<{ id: string; payload: { encrypted: string } }>(
    "SELECT * FROM background_jobs WHERE key LIKE 'reset:%' ORDER BY seq DESC LIMIT 1",
  );
  assert.ok(!JSON.stringify(job.payload).includes("/reset?token="));
  const mail = unseal<{ text: string }>(
      job.payload.encrypted,
      "mail:" + job.id,
    ),
    token = new URL(mail.text.split("\n")[0]).searchParams.get("token")!;
  await drain();
  await teams.reset(token, "the new sufficiently long password");
  assert.equal(await store.identity(aliceSession), null);
  await assert.rejects(
    () => teams.reset(token, "another sufficiently long password"),
    bad("RESET_EXPIRED"),
  );
  assert.ok(
    await store.login(alice.email, "the new sufficiently long password"),
  );
});
test("billing webhook rejects invalid signatures, deduplicates events, and older events cannot restore a cancelled plan", async () => {
  process.env.STRIPE_SECRET_KEY = "sk_test_not_real";
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
  process.env.STRIPE_PRICE_STARTER = "price_starter";
  await assert.rejects(
    () => billing.webhook("{}", "forged"),
    bad("INVALID_SIGNATURE"),
  );
  await query(
    "INSERT INTO billing_accounts(organization_id,stripe_customer_id) VALUES($1,'cus_test')",
    [alice.organizationId],
  );
  const event = (id: string, created: number, status: string) =>
    ({
      id,
      created,
      type: "customer.subscription.updated",
      data: {
        object: {
          id: "sub_test",
          customer: "cus_test",
          status,
          items: {
            data: [
              {
                price: { id: "price_starter" },
                current_period_end: 1900000000,
              },
            ],
          },
        },
      },
    }) as unknown as Stripe.Event;
  await billing.applyEvent(event("evt_active", 10, "active"));
  await billing.applyEvent(event("evt_active", 10, "active"));
  assert.equal((await billing.status(alice)).status, "active");
  assert.equal(await aiEntitlement(query, alice.organizationId), 500);
  await billing.applyEvent(event("evt_cancelled", 20, "canceled"));
  await billing.applyEvent(event("evt_old", 15, "active"));
  assert.equal((await billing.status(alice)).status, "canceled");
  process.env.BILLING_ENFORCED = "true";
  assert.equal(await aiEntitlement(query, alice.organizationId), 0);
  process.env.BILLING_ENFORCED = "false";
  assert.equal(await aiEntitlement(query, alice.organizationId), 50);
});
test("Telegram Business messages require the configured account owner and reply permission", async () => {
  const id = connections.get("telegram")!,
    input = connectionSchema.parse({
      provider: "telegram",
      label: "Business",
      accessToken: "123456:abcdefghijklmnopqrstuvwxyz",
      telegramMode: "business",
      businessUserId: "999",
    });
  await omni.connect(alice, input, id, 2);
  await omni.toggle(alice, id, true, 3);
  await deliver("telegram", {
    update_id: 999,
    business_message: {
      business_connection_id: "bc-test",
      date: Math.floor(Date.now() / 1000),
      chat: { id: 888, type: "private" },
      from: { id: 888, first_name: "Customer" },
      text: "Inspection?",
    },
  });
  await drain();
  const [job] = await query<{ last_error: string }>(
    "SELECT last_error FROM background_jobs WHERE kind='incoming' ORDER BY seq DESC LIMIT 1",
  );
  assert.equal(job.last_error, "BUSINESS_CONNECTION_REJECTED");
  assert.ok(
    !(await chats.list(alice)).some((c) => c.visitorName === "Customer"),
  );
});
test("Viber large numeric message tokens retain precision and group Telegram messages are ignored", () => {
  const parsed = parseChannel(
    "viber",
    '{"event":"message","message_token":900000000000000011,"timestamp":1,"sender":{"id":"u","name":"N"},"message":{"type":"text","text":"hi"}}',
    {},
  );
  assert.equal(parsed.incoming[0].externalId, "900000000000000011");
  assert.equal(
    parseChannel(
      "telegram",
      JSON.stringify({
        update_id: 1,
        message: { chat: { id: 1, type: "group" }, text: "hi" },
      }),
      {},
    ).incoming.length,
    0,
  );
});

test("expired worker leases recover incoming events; an interrupted send becomes uncertain without resending", async () => {
  await deliver("viber", event("viber", 81));
  await query(
    "UPDATE background_jobs SET status='running',lease_until=now()-interval '1 second' WHERE kind='incoming' AND status='pending'",
  );
  await drain();
  const id = await find("viber");
  assert.equal(
    (await chats.thread(alice, id)).messages.filter(
      (m) => m.sender === "visitor",
    ).length,
    1,
  );
  await chats.reply(alice, id, randomUUID(), "Interrupted delivery");
  const [d] = await query<{ id: string }>(
    "UPDATE delivery_outbox SET status='sending',lease_until=now()-interval '1 second' WHERE conversation_id=$1 AND status='pending' RETURNING id",
    [id],
  );
  await query(
    "UPDATE background_jobs SET status='running',lease_until=now()-interval '1 second' WHERE key=$1",
    ["delivery:" + d.id],
  );
  const count = sendCalls().length;
  await drain();
  assert.equal(sendCalls().length, count);
  assert.equal(
    (await omni.outcome(alice, id)).deliveries[0].status,
    "uncertain",
  );
});
test("taking over cancels an AI answer that is still queued for messenger delivery", async () => {
  await deliver("viber", event("viber", 82));
  await omni.runOne();
  const id = await find("viber"),
    t = await chats.thread(alice, id);
  assert.equal(t.mode, "ai");
  await chats.action(alice, id, t.version, "takeover");
  const count = sendCalls().length;
  await drain();
  assert.equal(sendCalls().length, count);
  assert.equal(
    (await omni.outcome(alice, id)).deliveries[0].status,
    "cancelled",
  );
});
test("source and assignee filters search persisted history with tenant isolation", async () => {
  const found = await chats.list(alice, {
    channel: "telegram",
    search: "Call tomorrow",
  });
  assert.equal(found.length, 0); // Search covers customer messages, not private next steps.
  const telegram = await chats.list(alice, {
    channel: "telegram",
    search: "unique operator reply",
  });
  assert.equal(telegram.length, 1);
  assert.equal(telegram[0].channel, "telegram");
  assert.equal((await chats.list(bob, { search: "Inspection" })).length, 0);
  assert.equal((await chats.list(alice, { mine: true })).length, 1);
  assert.equal((await chats.list(alice, { page: 100 })).length, 0);
  const id = await find("instagram"),
    o = await omni.outcome(alice, id);
  await assert.rejects(
    () =>
      omni.saveOutcome(alice, id, {
        version: o.version,
        stage: "qualified",
        value: 0,
        grossProfit: null,
        currency: "UAH",
        assignedTo: bob.userId,
        nextStep: "",
      }),
    bad("INVALID_ASSIGNEE"),
  );
});
test("deleting a messenger conversation removes its replay payload, notes and queued jobs", async () => {
  const id = await find("viber"),
    [c] = await query<{ connection_id: string; external_key: string }>(
      "SELECT * FROM conversations WHERE id=$1",
      [id],
    );
  await omni.note(alice, id, "Delete this note");
  await chats.reply(alice, id, randomUUID(), "Delete queued reply");
  await chats.remove(alice, id);
  assert.equal(
    (await query("SELECT * FROM messages WHERE conversation_id=$1", [id]))
      .length,
    0,
  );
  assert.equal(
    (
      await query("SELECT * FROM conversation_notes WHERE conversation_id=$1", [
        id,
      ])
    ).length,
    0,
  );
  assert.equal(
    (
      await query(
        "SELECT * FROM inbound_events WHERE connection_id=$1 AND payload->>'externalKey'=$2",
        [c.connection_id, c.external_key],
      )
    ).length,
    0,
  );
  await drain();
});
test("Stripe SDK checkout is reused, portal uses the mapped customer, and a valid signed webhook updates billing", async () => {
  process.env.STRIPE_SECRET_KEY = "sk_test_fixture";
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_fixture";
  process.env.STRIPE_PRICE_STARTER = "price_starter";
  let checkouts = 0,
    retrievals = 0;
  const requests: Array<{ url: string; body: string }> = [];
  const stripeFetch: typeof fetch = async (input, init) => {
    const url = String(input),
      body = String(init?.body ?? "");
    requests.push({ url, body });
    if (url.endsWith("/checkout/sessions")) {
      checkouts++;
      return Response.json({
        id: "cs_fixture",
        object: "checkout.session",
        url: "https://checkout.stripe.com/c/pay/cs_fixture",
        expires_at: Math.floor(Date.now() / 1000) + 86400,
      });
    }
    if (url.endsWith("/billing_portal/sessions"))
      return Response.json({
        id: "bps_fixture",
        url: "https://billing.stripe.com/p/session/fixture",
      });
    if (url.includes("/subscriptions/sub_test")) {
      retrievals++;
      return Response.json({
        id: "sub_test",
        object: "subscription",
        customer: "cus_test",
        status: "active",
        items: {
          data: [
            { price: { id: "price_starter" }, current_period_end: 1900000000 },
          ],
        },
      });
    }
    throw new Error("Unexpected Stripe request");
  };
  const stripe = new Stripe("sk_test_fixture", {
      httpClient: Stripe.createFetchHttpClient(stripeFetch),
      maxNetworkRetries: 0,
    }),
    service = createBilling(db, stripe);
  const one = await service.checkout(alice, "en"),
    two = await service.checkout(alice, "en");
  assert.equal(one.url, two.url);
  assert.equal(checkouts, 1);
  assert.equal(
    (await service.portal(alice, "en")).url,
    "https://billing.stripe.com/p/session/fixture",
  );
  const params = new URLSearchParams(
    requests.find((r) => r.url.endsWith("/checkout/sessions"))!.body,
  );
  assert.equal(params.get("customer"), "cus_test");
  assert.equal(params.get("line_items[0][price]"), "price_starter");
  assert.equal(params.get("mode"), "subscription");
  const payload = JSON.stringify({
    id: "evt_signed",
    created: 30,
    type: "customer.subscription.updated",
    data: { object: { id: "sub_test" } },
  });
  const signature = stripe.webhooks.generateTestHeaderString({
    payload,
    secret: "whsec_fixture",
  });
  await service.webhook(payload, signature);
  assert.equal(retrievals, 1);
  assert.equal((await service.status(alice)).status, "active");
  await assert.rejects(
    () => service.checkout({ ...alice, role: "agent" }, "en"),
    bad("FORBIDDEN"),
  );
  await assert.rejects(
    () => service.webhook(payload + " ", signature),
    bad("INVALID_SIGNATURE"),
  );
});

test("a shared Meta app routes signed multi-company events by account without accepting unsigned payloads", async () => {
  process.env.META_APP_SECRET = "test-meta-secret";
  process.env.META_VERIFY_TOKEN = "a".repeat(64);
  assert.equal(
    await omni.metaChallenge("subscribe", "a".repeat(64), "challenge"),
    "challenge",
  );
  await assert.rejects(
    () => omni.metaChallenge("subscribe", "wrong", "challenge"),
    bad("INVALID_SIGNATURE"),
  );
  const id = connections.get("instagram")!,
    listed = (await omni.connections(alice)).find((c) => c.id === id)!;
  assert.equal(
    listed.webhookUrl,
    "https://replylocal.example/api/webhooks/meta",
  );
  assert.equal(listed.verifyToken, "a".repeat(64));
  const payload = event("instagram", 91) as { object?: string };
  payload.object = "instagram";
  const raw = JSON.stringify(payload),
    headers = new Headers({
      "x-hub-signature-256":
        "sha256=" +
        createHmac("sha256", "test-meta-secret").update(raw).digest("hex"),
    });
  assert.equal((await omni.ingestMeta(raw, headers)).accepted, 1);
  await assert.rejects(
    () => omni.ingestMeta(raw, new Headers()),
    bad("INVALID_SIGNATURE"),
  );
  await drain();
  assert.ok(
    (await chats.list(alice)).some((c) => c.visitorName === "Instagram 591"),
  );
  assert.ok(
    !(await chats.list(bob)).some((c) => c.visitorName === "Instagram 591"),
  );
  delete process.env.META_APP_SECRET;
  delete process.env.META_VERIFY_TOKEN;
});
test("Viber outgoing numeric message tokens are preserved exactly for delivery receipts", async () => {
  const token = await sendChannel(
    "viber",
    { accessToken: "fixture", appSecret: "", verifyToken: "", hookSecret: "" },
    {},
    { chatId: "user" },
    "Hi",
    async () =>
      new Response('{"status":0,"message_token":5741311803571721087}', {
        headers: { "Content-Type": "application/json" },
      }),
  );
  assert.equal(token, "5741311803571721087");
});

test("message activity does not invalidate an outcome edit, but concurrent outcome edits still conflict", async () => {
  const id = await find("instagram"),
    o = await omni.outcome(alice, id);
  await chats.reply(alice, id, randomUUID(), "Message while editing deal");
  const input = outcomeSchema.parse({
    version: o.version,
    stage: "qualified",
    value: 150,
    grossProfit: null,
    currency: "UAH",
    nextStep: "Follow up",
    assignedTo: null,
  });
  await omni.saveOutcome(alice, id, input);
  await assert.rejects(
    () => omni.saveOutcome(alice, id, input),
    bad("CONFLICT"),
  );
  assert.equal((await omni.outcome(alice, id)).leadStage, "qualified");
  await drain();
});
test("thread display keeps a bounded recent window while JSON export preserves the full stored history", async () => {
  const config = await chats.config(alice);
  await chats.saveConfig(alice, {
    enabled: true,
    autoReply: true,
    welcome: "Start of history",
    dailyLimit: 50,
    version: config.version,
  });
  const s = await chats.start({
    publicId: config.publicId,
    name: "History visitor",
    contact: "",
    locale: "en",
    consent: true,
    attribution: {
      utmSource: "test-campaign",
      referrer: "https://shop.example/prices",
    },
  });
  await query(
    "INSERT INTO messages(id,conversation_id,sender,content) SELECT gen_random_uuid(),$1,'visitor','History item '||n FROM generate_series(1,260) n",
    [s.thread.id],
  );
  assert.equal((await chats.thread(alice, s.thread.id)).messages.length, 250);
  const exported = await chats.export(alice, s.thread.id);
  assert.equal(exported.messages.length, 261);
  assert.ok(exported.messages.some((m) => m.content === "Start of history"));
  assert.equal(
    (await omni.outcome(alice, s.thread.id)).attribution?.utmSource,
    "test-campaign",
  );
  await assert.rejects(() => chats.export(bob, s.thread.id), bad("NOT_FOUND"));
  await chats.remove(alice, s.thread.id);
});

test("long emoji messages are truncated without producing invalid Unicode for PostgreSQL JSON", () => {
  const p = event("viber", 99, "a" + "😀".repeat(2000));
  const parsed = parseChannel("viber", JSON.stringify(p), {});
  assert.equal(Array.from(parsed.incoming[0].text).length, 2000);
  assert.equal(parsed.incoming[0].text.isWellFormed(), true);
});
