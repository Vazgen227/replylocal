import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { createStore, type Database, type Query, type Identity } from "../src/server/store";
import { createChatStore } from "../src/server/chat-store";
import { createOmniStore } from "../src/server/omni-store";
import { createBookingStore } from "../src/server/booking-store";
import { alertWebhookSecret } from "../src/server/telegram-alerts";
import { parseChannel } from "../src/server/channels";
import { unseal } from "../src/server/crypto-secrets";
import type { Credentials } from "../src/server/channels";
import type { AIContext, AIResult } from "../src/server/ai-provider";
import { connectionSchema } from "../src/lib/omni-schemas";
import {
  addDays,
  defaultBookingSettings,
  localInfo,
  phoneKey,
  zonedToUtc,
  type BookingSettings,
} from "../src/lib/booking";

const pg = new PGlite();
const query: Query = async (sql, params) => (await pg.query(sql, params)).rows as never;
const db: Database = {
  query,
  transaction: (work) =>
    pg.transaction((tx) => work(async (sql, params) => (await tx.query(sql, params)).rows as never)),
};
const store = createStore(db),
  bookings = createBookingStore(db);
const ALERT_TOKEN = "777000:alertbot-abcdefghijklmnopqrstuvwxyz0123";
const CLIENT_TOKEN = "123456:clientbot-abcdefghijklmnopqrstuvwxyz";
const calls: Array<{ url: string; body: Record<string, unknown> }> = [];
let serial = 0;
const fetcher: typeof fetch = async (input, init) => {
  const url = String(input);
  const body = typeof init?.body === "string" ? JSON.parse(init.body) : {};
  calls.push({ url, body });
  if (url.includes("/file/bot")) return new Response(new Uint8Array([1, 2, 3, 4]), { headers: { "content-type": "audio/ogg" } });
  if (url.includes("getFile")) return Response.json({ ok: true, result: { file_path: "voice/file_7.oga" } });
  if (url.includes("getMe"))
    return Response.json({
      ok: true,
      result: url.includes(ALERT_TOKEN) ? { id: 777000, username: "replylocal_alerts_bot" } : { id: 100, username: "client_bot" },
    });
  if (url.includes("get_account_info")) return Response.json({ status: 0, id: "company-viber", name: "Company" });
  if (url.includes("set_webhook")) return Response.json({ status: 0 });
  if (url.includes("send_message")) return Response.json({ status: 0, message_token: String(++serial) });
  if (url.includes("sendMessage")) return Response.json({ ok: true, result: { message_id: ++serial } });
  return Response.json({ ok: true, result: true });
};
let generate: (c: AIContext) => Promise<AIResult> = async () => ({
  answer: "Здравствуйте!",
  handoff: true,
  sourceIds: [],
  inputTokens: 1,
  outputTokens: 1,
});
const chats = createChatStore(db, (c) => generate(c), () => true);
let transcript: () => Promise<string> = async () => "Нужна замена масла на Ланос, завтра утром";
const transcribed: number[] = [];
const omni = createOmniStore(db, chats, fetcher, async (audio) => {
  transcribed.push(audio.data.byteLength);
  return transcript();
});
let alice: Identity, bob: Identity;
let telegramId = "",
  viberId = "";
const TZ = "Europe/Kyiv";
const everyDay: BookingSettings = {
  ...defaultBookingSettings,
  enabled: true,
  hours: Array.from({ length: 7 }, () => ({ open: true, from: "08:00", to: "20:00" })),
  bays: 2,
  address: "Kyiv, Test street 1",
};
const futureDay = (n = 3) => addDays(localInfo(new Date(), TZ).day, n);
const bad = (code: string) => (e: unknown) => (e as { code: string }).code === code;
const alertHeaders = () => new Headers({ "x-telegram-bot-api-secret-token": alertWebhookSecret() });
const alertCalls = (method: string) => calls.filter((c) => c.url.includes(ALERT_TOKEN) && c.url.endsWith(method));
async function drain() {
  for (let i = 0; i < 100; i++) if (!(await omni.runOne())) return;
  throw new Error("worker did not drain");
}
async function messagesOf(id: string) {
  return query<{ sender: string; content: string }>(
    "SELECT sender,content FROM messages WHERE conversation_id=$1 ORDER BY created_at,id",
    [id],
  );
}
async function deliverTelegram(update: unknown) {
  const [r] = await query<{ credentials: string; organization_id: string }>("SELECT * FROM channel_connections WHERE id=$1", [telegramId]);
  const creds = unseal<Credentials>(r.credentials, telegramId + ":" + r.organization_id);
  await omni.ingest(telegramId, JSON.stringify(update), new Headers({ "x-telegram-bot-api-secret-token": creds.hookSecret }));
  await drain();
}
async function websiteChat(actor: Identity, name = "Ivan", contact = "+380 50 111 22 33") {
  const c = await chats.config(actor);
  if (!c.enabled)
    await chats.saveConfig(actor, { enabled: true, autoReply: true, welcome: "Hi", dailyLimit: 50, version: c.version });
  const cfg = await chats.config(actor);
  return chats.start({ publicId: cfg.publicId, name, contact, locale: "ru", consent: true });
}

before(async () => {
  process.env.APP_URL = "https://replylocal.example";
  process.env.CHANNEL_ENCRYPTION_KEY = Buffer.alloc(32, 9).toString("base64");
  process.env.TELEGRAM_ALERT_BOT_TOKEN = ALERT_TOKEN;
  delete process.env.RESEND_API_KEY;
  delete process.env.EMAIL_FROM;
  process.env.BILLING_ENFORCED = "false";
  for (const file of ["001_initial.sql", "002_chat.sql", "003_omnichannel.sql", "004_service_station.sql", "005_retention.sql"])
    await pg.exec(await readFile(new URL("../db/" + file, import.meta.url), "utf8"));
  for (const name of ["Alice", "Bob"]) {
    const token = await store.register({
      name,
      companyName: name + " Garage",
      email: name.toLowerCase() + "@example.test",
      password: "a sufficiently long password",
    });
    const actor = (await store.identity(token))!;
    if (name === "Alice") alice = actor;
    else bob = actor;
    const current = await bookings.settings(actor);
    await bookings.saveSettings(actor, everyDay, current.version);
  }
  for (const provider of ["telegram", "viber"] as const) {
    const { id } = await omni.connect(
      alice,
      connectionSchema.parse({
        provider,
        label: provider,
        accessToken: provider === "telegram" ? CLIENT_TOKEN : "viber-token-abcdefghijklmnopqrstuvwxyz",
      }),
    );
    await omni.toggle(alice, id, true, 1);
    if (provider === "telegram") telegramId = id;
    else viberId = id;
  }
});
after(async () => {
  await pg.close();
});

// ---------- Telegram alerts ----------
test("the alert bot links a private chat with a one-time code and rejects forged webhooks", async () => {
  assert.deepEqual(
    { ...(await omni.alerts.status(alice)), linkedAt: null },
    { configured: true, linked: false, linkedAt: null },
  );
  const { url } = await omni.alerts.link(alice, "ru");
  assert.match(url, /^https:\/\/t\.me\/replylocal_alerts_bot\?start=[a-f0-9]{48}$/);
  const hook = alertCalls("setWebhook").at(-1)!;
  assert.equal(hook.body.url, "https://replylocal.example/api/telegram/alerts");
  assert.equal(hook.body.secret_token, alertWebhookSecret());
  const code = new URL(url).searchParams.get("start")!;
  const start = (chat: number) =>
    JSON.stringify({ update_id: 2, message: { message_id: 1, chat: { id: chat, type: "private" }, from: { id: chat }, text: "/start " + code } });
  await assert.rejects(() => omni.alerts.handle(start(9001), new Headers({ "x-telegram-bot-api-secret-token": "forged" })), bad("INVALID_SIGNATURE"));
  assert.equal((await omni.alerts.status(alice)).linked, false);
  await omni.alerts.handle(start(9001), alertHeaders());
  assert.equal((await omni.alerts.status(alice)).linked, true);
  assert.match(String(alertCalls("sendMessage").at(-1)!.body.text), /Alice Garage/);
  // The code works once: a second chat cannot take over the link.
  await omni.alerts.handle(start(9002), alertHeaders());
  const [row] = await query<{ chat_id: string }>("SELECT chat_id FROM telegram_links WHERE user_id=$1", [alice.userId]);
  assert.equal(row.chat_id, "9001");
  assert.match(String(alertCalls("sendMessage").at(-1)!.body.text), /устарела/);
  await omni.alerts.test(alice);
  await assert.rejects(() => omni.alerts.test(bob), bad("TELEGRAM_NOT_LINKED"));
});

test("an AI booking request reaches Telegram with buttons; one tap confirms it and tells the customer", async () => {
  const chat = await websiteChat(alice);
  const slot = `${futureDay()}T10:00`;
  generate = async (c) => ({
    answer: "Предварительно записал вас, администратор подтвердит.",
    handoff: false,
    sourceIds: [],
    intake: { vehicle: "Skoda Octavia", year: "2015", plate: null, vin: null, mileage: "152000", problem: "Стук спереди", phone: "+380501112233", preferredTime: null },
    bookingRequest: c.booking?.slots.includes(slot) ? { slot, serviceId: null } : null,
    inputTokens: 1,
    outputTokens: 1,
  });
  await chats.post(chat.thread.id, chat.token, randomUUID(), "Стучит спереди, запишите на 10:00");
  const before = alertCalls("sendMessage").length;
  await drain(); // No email provider is configured: Telegram alone must be enough.
  const [job] = await query<{ status: string }>("SELECT status FROM background_jobs WHERE kind='notification' AND payload ? 'booking'");
  assert.equal(job.status, "done");
  const alert = alertCalls("sendMessage").slice(before).find((c) => c.body.chat_id === "9001")!;
  assert.ok(alert, "the owner got a Telegram alert");
  assert.match(String(alert.body.text), /Новая заявка/);
  assert.match(String(alert.body.text), /Skoda Octavia/);
  assert.match(String(alert.body.text), /Стук спереди/);
  const keyboard = (alert.body.reply_markup as { inline_keyboard: Array<Array<{ callback_data?: string; url?: string }>> }).inline_keyboard;
  const confirm = keyboard[0][0].callback_data!;
  assert.match(confirm, /^c:[0-9a-f-]{36}:1$/);
  assert.equal(keyboard[1][0].url, "https://replylocal.example/ru/appointments");
  const id = confirm.split(":")[1];
  const press = (data: string, from = 9001) =>
    omni.alerts.handle(
      JSON.stringify({
        update_id: 3,
        callback_query: { id: "cb" + data, data, from: { id: from }, message: { message_id: 55, chat: { id: from, type: "private" }, text: alert.body.text } },
      }),
      alertHeaders(),
    );
  // A stranger's chat cannot confirm.
  await press(confirm, 4242);
  assert.equal((await bookings.forConversation(alice, chat.thread.id)).appointments[0].status, "requested");
  await press(confirm);
  const info = await bookings.forConversation(alice, chat.thread.id);
  assert.equal(info.appointments[0].id, id);
  assert.equal(info.appointments[0].status, "confirmed");
  assert.match((await messagesOf(chat.thread.id)).at(-1)!.content, /подтверждена/);
  const edited = alertCalls("editMessageText").at(-1)!;
  assert.match(String(edited.body.text), /Подтверждено: Alice/);
  // A stale button (old version) does not change anything and explains why.
  await press(confirm);
  assert.match(String(alertCalls("answerCallbackQuery").at(-1)!.body.text), /изменили|обработана/);
});

test("declining from Telegram takes two taps", async () => {
  const startsAt = zonedToUtc(futureDay(4), "12:00", TZ).toISOString();
  const chat = await websiteChat(alice, "Oleg", "+380671234567");
  const { id } = await bookings.create(alice, {
    conversationId: chat.thread.id,
    serviceEntryId: null,
    startsAt,
    durationMinutes: 60,
    status: "requested",
    customerName: "Oleg",
    customerPhone: "+380671234567",
    vehicle: {},
    note: "",
    force: false,
  });
  const press = (data: string) =>
    omni.alerts.handle(
      JSON.stringify({ update_id: 4, callback_query: { id: "d" + data, data, from: { id: 9001 }, message: { message_id: 56, chat: { id: 9001, type: "private" }, text: "alert" } } }),
      alertHeaders(),
    );
  await press(`x:${id}:1`);
  const ask = alertCalls("editMessageText").at(-1)!;
  assert.equal((ask.body.reply_markup as { inline_keyboard: Array<Array<{ callback_data: string }>> }).inline_keyboard[0][0].callback_data, `X:${id}:1`);
  const [still] = await query<{ status: string }>("SELECT status FROM appointments WHERE id=$1", [id]);
  assert.equal(still.status, "requested");
  await press(`X:${id}:1`);
  const [done] = await query<{ status: string }>("SELECT status FROM appointments WHERE id=$1", [id]);
  assert.equal(done.status, "cancelled");
  assert.match((await messagesOf(chat.thread.id)).at(-1)!.content, /отменена/);
});

test("a handoff alert quotes the customer's last message", async () => {
  const chat = await websiteChat(alice, "Marta", "");
  generate = async () => ({ answer: "Передаю мастеру.", handoff: true, sourceIds: [], inputTokens: 1, outputTokens: 1 });
  await chats.post(chat.thread.id, chat.token, randomUUID(), "Можно поговорить с мастером?");
  const before = alertCalls("sendMessage").length;
  await drain();
  const alert = alertCalls("sendMessage").slice(before).at(-1)!;
  assert.match(String(alert.body.text), /нужен ответ/);
  assert.match(String(alert.body.text), /поговорить с мастером/);
});

// ---------- Customer history ----------
test("customer history matches the same phone in any format and sums finished visits", async () => {
  assert.equal(phoneKey("+380 (50) 999-88-77"), phoneKey("0509998877"));
  assert.equal(phoneKey("12-34"), null);
  const day = futureDay(5);
  const make = async (time: string, phone: string, vehicle: string) =>
    (
      await bookings.create(alice, {
        conversationId: null,
        serviceEntryId: null,
        startsAt: zonedToUtc(day, time, TZ).toISOString(),
        durationMinutes: 30,
        status: "confirmed",
        customerName: "Andriy",
        customerPhone: phone,
        vehicle: { vehicle },
        note: "",
        force: false,
      })
    ).id;
  const first = await make("09:00", "+380 50 999 88 77", "Daewoo Lanos");
  const second = await make("11:00", "050-999-88-77", "Daewoo Lanos");
  for (const [id, amount] of [[first, 1200], [second, 800]] as const) {
    const [a] = await query<{ version: number }>("SELECT version FROM appointments WHERE id=$1", [id]);
    await bookings.act(alice, id, { action: "complete", version: a.version, amount, grossProfit: null, followUpMonths: 0 });
  }
  const history = await bookings.history(alice, { phone: "0509998877" });
  assert.equal(history.visits, 2);
  assert.equal(history.total, 2000);
  assert.deepEqual(history.vehicles, ["Daewoo Lanos"]);
  const third = await make("15:00", "+380509998877", "Daewoo Lanos");
  const [listed] = (await bookings.list(alice, new Date(), new Date(Date.now() + 30 * 86400000))).filter((a) => a.id === third);
  assert.equal(listed.visits, 2, "the appointment card shows a returning customer");
  // Another company never sees these visits.
  assert.equal((await bookings.history(bob, { phone: "0509998877" })).appointments.length, 0);
  assert.equal(
    (await query("SELECT id FROM service_followups WHERE appointment_id=ANY($1::uuid[])", [[first, second]])).length,
    0,
    "followUpMonths=0 turns the follow-up off",
  );
});

// ---------- Next-service follow-ups ----------
async function telegramCustomer(n: number, name: string) {
  await deliverTelegram({
    update_id: 1000 + n,
    message: { message_id: n, date: Math.floor(Date.now() / 1000), chat: { id: 7000 + n, type: "private" }, from: { id: 7000 + n, first_name: name }, text: "Привет" },
  });
  const [c] = await query<{ id: string }>("SELECT id FROM conversations WHERE external_key=$1", [String(7000 + n)]);
  return c.id;
}
async function finishVisit(conversationId: string | null, phone: string, months?: number) {
  const { id } = await bookings.create(alice, {
    conversationId,
    serviceEntryId: null,
    startsAt: zonedToUtc(futureDay(6), "09:00", TZ).toISOString(),
    durationMinutes: 30,
    status: "confirmed",
    customerName: "Сергей Петренко",
    customerPhone: phone,
    vehicle: { vehicle: "Toyota Camry", mileage: "152 000" },
    note: "",
    force: true,
  });
  const [a] = await query<{ version: number }>("SELECT version FROM appointments WHERE id=$1", [id]);
  await bookings.act(alice, id, { action: "complete", version: a.version, amount: 3500, grossProfit: null, ...(months !== undefined ? { followUpMonths: months } : {}) });
  const [f] = await query<{ id: string; due_at: Date; status: string }>("SELECT id,due_at,status FROM service_followups WHERE appointment_id=$1", [id]);
  return { appointment: id, followup: f };
}
async function makeDue(followupId: string) {
  await query("UPDATE background_jobs SET run_at=now() WHERE key=$1", ["followup:" + followupId]);
  await drain();
  const [f] = await query<{ status: string; reason: string | null }>("SELECT status,reason FROM service_followups WHERE id=$1", [followupId]);
  return f;
}
test("a finished visit schedules the next-service message, sent into the customer's Telegram chat", async () => {
  const conversation = await telegramCustomer(1, "Сергей");
  await drain();
  const { followup } = await finishVisit(conversation, "+380631110000");
  await drain(); // deliver the booking confirmation first
  assert.equal(followup.status, "pending");
  const months = (new Date(followup.due_at).getTime() - Date.now()) / (30.4 * 86400000);
  assert.ok(months > 5.9 && months < 6.5, "default interval comes from settings (6 months)");
  const [job] = await query<{ run_at: Date }>("SELECT run_at FROM background_jobs WHERE key=$1", ["followup:" + followup.id]);
  assert.equal(new Date(job.run_at).getTime(), new Date(followup.due_at).getTime());
  const before = calls.filter((c) => c.url.includes(CLIENT_TOKEN) && c.url.endsWith("sendMessage")).length;
  assert.equal((await makeDue(followup.id)).status, "sent");
  const text = (await messagesOf(conversation)).at(-1)!.content;
  assert.match(text, /Сергей/);
  assert.match(text, /Toyota Camry/);
  assert.match(text, /162\s000 км/, "next service mileage = 152 000 + 10 000");
  const sent = calls.filter((c) => c.url.includes(CLIENT_TOKEN) && c.url.endsWith("sendMessage")).slice(before);
  assert.equal(sent.length, 1, "delivered to the customer's Telegram");
});
test("without a chat the follow-up becomes a call task and the team is alerted", async () => {
  const { followup } = await finishVisit(null, "+380931230000", 12);
  const before = alertCalls("sendMessage").length;
  const f = await makeDue(followup.id);
  assert.deepEqual(f, { status: "call", reason: "NO_CHAT" });
  assert.match(String(alertCalls("sendMessage").slice(before).at(-1)!.body.text), /позвоните/);
  const list = await bookings.followups(alice);
  const item = list.find((x) => x.id === followup.id)!;
  assert.equal(item.status, "call");
  assert.equal(item.months, 12);
  await bookings.actFollowup(alice, item.id, { action: "done", version: item.version });
  await assert.rejects(() => bookings.actFollowup(bob, item.id, { action: "cancel", version: item.version + 1 }), bad("CONFLICT"));
});
test("a customer who booked again does not get the follow-up", async () => {
  const { followup } = await finishVisit(null, "+380441112200", 6);
  await bookings.create(alice, {
    conversationId: null,
    serviceEntryId: null,
    startsAt: zonedToUtc(futureDay(8), "10:00", TZ).toISOString(),
    durationMinutes: 30,
    status: "requested",
    customerName: "Сергей",
    customerPhone: "0441112200",
    vehicle: {},
    note: "",
    force: true,
  });
  assert.deepEqual(await makeDue(followup.id), { status: "skipped", reason: "BOOKED_AGAIN" });
});

// ---------- Voice messages ----------
test("Telegram voice notes are parsed as media, never downloaded inside the webhook", () => {
  const { incoming } = parseChannel(
    "telegram",
    JSON.stringify({
      update_id: 5,
      message: { message_id: 5, date: 1, chat: { id: 1, type: "private" }, from: { id: 1 }, voice: { file_id: "AwACAgIAAxkB-voice_1", duration: 7, file_size: 12000 } },
    }),
    { telegramMode: "bot" },
  );
  assert.equal(incoming[0].attachment, true);
  assert.deepEqual(incoming[0].media, { kind: "voice", id: "AwACAgIAAxkB-voice_1", duration: 7, size: 12000 });
  const wa = parseChannel(
    "whatsapp",
    JSON.stringify({ entry: [{ changes: [{ value: { metadata: { phone_number_id: "1001" }, messages: [{ id: "wa-v", from: "380", timestamp: "1", type: "audio", audio: { id: "998877" } }] } }] }] }),
    { accountId: "1001" },
  );
  assert.equal(wa.incoming[0].media?.id, "998877");
});
test("a voice note is transcribed and answered like text; a failure goes to a person", async () => {
  const heard: string[] = [];
  generate = async (c) => {
    heard.push(c.history.at(-1)?.content ?? "");
    return { answer: "Когда удобно приехать?", handoff: false, sourceIds: [], intake: null, bookingRequest: null, inputTokens: 1, outputTokens: 1 };
  };
  const voice = (n: number, duration = 9) => ({
    update_id: 2000 + n,
    message: { message_id: n, date: Math.floor(Date.now() / 1000), chat: { id: 8000 + n, type: "private" }, from: { id: 8000 + n, first_name: "Voice" }, voice: { file_id: "voice-file-" + n, duration, file_size: 4 } },
  });
  await deliverTelegram(voice(1));
  const [c] = await query<{ id: string; mode: string }>("SELECT id,mode FROM conversations WHERE external_key='8001'");
  const thread = await messagesOf(c.id);
  const said = thread.find((m) => m.sender === "visitor")!.content;
  assert.equal(said, "🎤 Нужна замена масла на Ланос, завтра утром");
  assert.equal(heard.at(-1), said, "the assistant reads the transcript like a text message");
  const asked = heard.length;
  assert.ok(calls.some((x) => x.url === `https://api.telegram.org/file/bot${CLIENT_TOKEN}/voice/file_7.oga`));
  // Too long: not sent to the transcriber at all.
  const count = transcribed.length;
  await deliverTelegram(voice(2, 900));
  assert.equal(transcribed.length, count);
  const [long] = await query<{ id: string; mode: string }>("SELECT id,mode FROM conversations WHERE external_key='8002'");
  assert.equal(long.mode, "human");
  assert.match((await messagesOf(long.id)).find((m) => m.sender === "visitor")!.content, /Voice message/);
  // Transcriber error: the message still arrives and a person takes it.
  transcript = async () => {
    throw new Error("down");
  };
  await deliverTelegram(voice(3));
  const [failed] = await query<{ mode: string }>("SELECT mode FROM conversations WHERE external_key='8003'");
  assert.equal(failed.mode, "human");
  assert.equal(heard.length, asked, "untranscribed voice is never sent to the assistant");
  void viberId;
});
