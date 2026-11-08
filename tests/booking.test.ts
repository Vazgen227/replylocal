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
import { createBookingStore } from "../src/server/booking-store";
import type { AIContext, AIResult } from "../src/server/ai-provider";
import {
  addDays,
  computeSlots,
  defaultBookingSettings,
  localInfo,
  normalizeBookingSettings,
  zonedToUtc,
  type BookingSettings,
} from "../src/lib/booking";
import { retrieveKnowledge } from "../src/server/retrieval";
import { serviceStationTemplate } from "../src/lib/templates/service-station";
import type { KnowledgeEntry } from "../src/lib/schemas";

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
  bookings = createBookingStore(db);
let alice: Identity, bob: Identity;
let generate: (c: AIContext) => Promise<AIResult>;
let lastContext: AIContext | undefined;
const chats = createChatStore(
  db,
  async (c) => {
    lastContext = c;
    return generate(c);
  },
  () => true,
);
const bad = (code: string) => (e: unknown) =>
  (e as { code: string }).code === code;
const TZ = "Europe/Kyiv";
const everyDay: BookingSettings = {
  ...defaultBookingSettings,
  enabled: true,
  hours: Array.from({ length: 7 }, () => ({ open: true, from: "08:00", to: "20:00" })),
  bays: 1,
  address: "Kyiv, Test street 1",
};
/** A local day three days from now, so reminders (24h before) can be scheduled. */
const futureDay = () => addDays(localInfo(new Date(), TZ).day, 3);
async function enable(actor: Identity, settings: BookingSettings = everyDay) {
  const current = await bookings.settings(actor);
  await bookings.saveSettings(actor, settings, current.version);
}
async function websiteConversation(actor: Identity) {
  const c = await chats.config(actor);
  if (!c.enabled)
    await chats.saveConfig(actor, {
      enabled: true,
      autoReply: true,
      welcome: "Welcome",
      dailyLimit: 50,
      version: c.version,
    });
  const cfg = await chats.config(actor);
  return chats.start({
    publicId: cfg.publicId,
    name: "Ivan",
    contact: "+380000000000",
    locale: "ru",
    consent: true,
  });
}
async function messagesOf(id: string) {
  return query<{ sender: string; content: string }>(
    "SELECT sender,content FROM messages WHERE conversation_id=$1 ORDER BY created_at,id",
    [id],
  );
}

before(async () => {
  for (const file of [
    "001_initial.sql",
    "002_chat.sql",
    "003_omnichannel.sql",
    "004_service_station.sql",
  ])
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
  }
});
after(async () => {
  await pg.close();
});

// ---------- pure slot calculation ----------
test("zonedToUtc handles Kyiv winter and summer offsets", () => {
  assert.equal(zonedToUtc("2026-01-15", "10:00", TZ).toISOString(), "2026-01-15T08:00:00.000Z");
  assert.equal(zonedToUtc("2026-07-15", "10:00", TZ).toISOString(), "2026-07-15T07:00:00.000Z");
  assert.deepEqual(localInfo(new Date("2026-11-09T08:30:00Z"), TZ), {
    day: "2026-11-09",
    time: "10:30",
    weekday: 0,
  });
});
test("slots follow working hours, closed days, notice and bay capacity", () => {
  const settings: BookingSettings = {
    ...defaultBookingSettings,
    enabled: true,
    bays: 2,
    slotMinutes: 60,
    defaultDuration: 60,
    minNoticeMinutes: 60,
  };
  // Saturday 2026-11-14 08:00 local: Saturday is 10-15, Sunday closed, Monday 9-18.
  const now = zonedToUtc("2026-11-14", "08:00", TZ);
  const busy = [
    { startsAt: zonedToUtc("2026-11-16", "09:00", TZ), durationMinutes: 120 },
    { startsAt: zonedToUtc("2026-11-16", "10:00", TZ), durationMinutes: 60 },
  ];
  const slots = computeSlots(settings, TZ, busy, now, { days: 3 });
  const sat = slots.filter((s) => s.day === "2026-11-14").map((s) => s.time);
  assert.deepEqual(sat, ["10:00", "11:00", "12:00", "13:00", "14:00"]);
  assert.equal(slots.some((s) => s.day === "2026-11-15"), false, "Sunday is closed");
  const mon = slots.filter((s) => s.day === "2026-11-16").map((s) => s.time);
  assert.equal(mon.includes("09:00"), true, "one of two bays still free at 09:00");
  assert.equal(mon.includes("10:00"), false, "both bays busy at 10:00");
  assert.equal(mon.at(-1), "17:00", "the job must end before closing");
  // Minimum notice: at 09:30 on Monday the 10:00 slot is too soon.
  const later = computeSlots(settings, TZ, [], zonedToUtc("2026-11-16", "09:30", TZ), { days: 1 });
  assert.equal(later[0].time, "11:00");
});
test("invalid stored settings fall back to safe defaults", () => {
  assert.deepEqual(normalizeBookingSettings({ bays: -3 }), defaultBookingSettings);
  assert.equal(normalizeBookingSettings({ bays: 4 }).bays, 4);
});

// ---------- retrieval ----------
test("retrieval understands word endings and car-service synonyms", () => {
  const entries = serviceStationTemplate("ru").map(
    (e, i) =>
      ({
        ...e,
        id: String(i),
        price: null,
        currency: "UAH",
        sku: "",
        version: 1,
        updatedAt: "",
      }) as KnowledgeEntry,
  );
  const titles = (q: string) =>
    retrieveKnowledge(entries, q)
      .filter((e) => e.kind !== "rule")
      .map((e) => e.title);
  assert.equal(titles("Сколько стоит замена масла?")[0], "Замена масла и фильтров (ТО)");
  assert.ok(titles("нужно переобуть резину").includes("Шиномонтаж"));
  assert.ok(titles("горит чек, что с мотором")[0].includes("диагностика"));
  assert.ok(titles("скрипят колодки").includes("Ремонт тормозной системы"));
});

// ---------- store flows ----------
test("booking settings are role-scoped and versioned", async () => {
  const s = await bookings.settings(alice);
  assert.equal(s.settings.enabled, false);
  assert.equal(s.timeZone, TZ);
  await assert.rejects(
    bookings.saveSettings({ ...alice, role: "agent" }, everyDay, s.version),
    bad("FORBIDDEN"),
  );
  await bookings.saveSettings(alice, everyDay, s.version);
  await assert.rejects(bookings.saveSettings(alice, everyDay, s.version), bad("CONFLICT"));
  assert.equal((await bookings.settings(alice)).settings.bays, 1);
});
test("confirming a booking qualifies the lead, messages the customer and schedules a reminder", async () => {
  await enable(alice);
  const chat = await websiteConversation(alice);
  const startsAt = zonedToUtc(futureDay(), "10:00", TZ).toISOString();
  const { id } = await bookings.create(alice, {
    conversationId: chat.thread.id,
    serviceEntryId: null,
    startsAt,
    durationMinutes: 60,
    status: "requested",
    customerName: "Ivan",
    customerPhone: "+380000000000",
    vehicle: { vehicle: "Skoda Octavia", year: "2015" },
    note: "",
    force: false,
  });
  // Capacity: one bay, the same hour is taken now.
  await assert.rejects(
    bookings.create(alice, {
      conversationId: null,
      serviceEntryId: null,
      startsAt,
      durationMinutes: 30,
      status: "confirmed",
      customerName: "Other",
      customerPhone: "",
      vehicle: {},
      note: "",
      force: false,
    }),
    bad("SLOT_TAKEN"),
  );
  await assert.rejects(
    bookings.create(alice, {
      conversationId: null,
      serviceEntryId: null,
      startsAt: zonedToUtc(futureDay(), "21:00", TZ).toISOString(),
      durationMinutes: 30,
      status: "confirmed",
      customerName: "Late",
      customerPhone: "",
      vehicle: {},
      note: "",
      force: false,
    }),
    bad("OUTSIDE_HOURS"),
  );
  const [a] = await bookings.list(alice, new Date(Date.now()), new Date(Date.now() + 10 * 86400000));
  assert.equal(a.id, id);
  assert.equal(a.status, "requested");
  await bookings.act(alice, id, { action: "confirm", version: a.version, notify: true });
  await assert.rejects(
    bookings.act(alice, id, { action: "confirm", version: a.version, notify: true }),
    bad("CONFLICT"),
  );
  const [c] = await query<{ lead_stage: string }>("SELECT lead_stage FROM conversations WHERE id=$1", [chat.thread.id]);
  assert.equal(c.lead_stage, "qualified");
  const last = (await messagesOf(chat.thread.id)).at(-1)!;
  assert.equal(last.sender, "operator");
  assert.match(last.content, /Ваша запись подтверждена/);
  assert.match(last.content, /Test street 1/);
  const jobs = await query<{ run_at: Date; payload: { id: string } }>(
    "SELECT run_at,payload FROM background_jobs WHERE kind='reminder'",
  );
  assert.equal(jobs.length, 1);
  assert.equal(jobs[0].payload.id, id);
  assert.equal(new Date(jobs[0].run_at).getTime(), new Date(startsAt).getTime() - 86400000);
});
test("the reminder is sent only for a still-confirmed visit at the original time", async () => {
  const [job] = await query<{ payload: { id: string; startsAt: string } }>(
    "SELECT payload FROM background_jobs WHERE kind='reminder'",
  );
  const chat = (await query<{ conversation_id: string }>(
    "SELECT conversation_id FROM appointments WHERE id=$1",
    [job.payload.id],
  ))[0].conversation_id;
  const before = (await messagesOf(chat)).length;
  await bookings.remind({ ...job.payload, startsAt: new Date(0).toISOString() });
  assert.equal((await messagesOf(chat)).length, before, "a stale reminder after rescheduling is ignored");
  await bookings.remind(job.payload);
  const last = (await messagesOf(chat)).at(-1)!;
  assert.match(last.content, /Напоминаем о визите завтра/);
});
test("completing a visit records the sale for the channel report; other companies cannot touch it", async () => {
  const [a] = await bookings.list(alice, new Date(), new Date(Date.now() + 10 * 86400000));
  await assert.rejects(
    bookings.act(bob, a.id, { action: "cancel", version: a.version, notify: false }),
    bad("NOT_FOUND"),
  );
  assert.deepEqual(await bookings.list(bob, new Date(), new Date(Date.now() + 10 * 86400000)), []);
  await bookings.act(alice, a.id, { action: "complete", version: a.version, amount: 1500, grossProfit: 600 });
  const [c] = await query<{ lead_stage: string; deal_value: string; gross_profit: string; outcome_at: Date | null }>(
    "SELECT lead_stage,deal_value,gross_profit,outcome_at FROM conversations WHERE id=$1",
    [a.conversationId],
  );
  assert.equal(c.lead_stage, "won");
  assert.equal(Number(c.deal_value), 1500);
  assert.equal(Number(c.gross_profit), 600);
  assert.ok(c.outcome_at);
  const [done] = await bookings.list(alice, new Date(), new Date(Date.now() + 10 * 86400000));
  assert.equal(done.status, "done");
  // A finished visit frees nothing retroactively but cannot be completed twice.
  await assert.rejects(
    bookings.act(alice, a.id, { action: "complete", version: done.version, amount: 1, grossProfit: null }),
    bad("INVALID_STATE"),
  );
});
test("a cancelled visit gets no reminder and the customer is told", async () => {
  const chat = await websiteConversation(alice);
  const startsAt = zonedToUtc(futureDay(), "14:00", TZ).toISOString();
  const { id } = await bookings.create(alice, {
    conversationId: chat.thread.id,
    serviceEntryId: null,
    startsAt,
    durationMinutes: 60,
    status: "confirmed",
    customerName: "Petro",
    customerPhone: "",
    vehicle: {},
    note: "",
    force: false,
  });
  const [job] = await query<{ payload: { id: string; startsAt: string } }>(
    "SELECT payload FROM background_jobs WHERE kind='reminder' AND payload->>'id'=$1",
    [id],
  );
  const [a] = (await bookings.list(alice, new Date(), new Date(Date.now() + 10 * 86400000))).filter((x) => x.id === id);
  await bookings.act(alice, id, { action: "cancel", version: a.version, notify: true });
  assert.match((await messagesOf(chat.thread.id)).at(-1)!.content, /отменена/);
  const count = (await messagesOf(chat.thread.id)).length;
  await bookings.remind(job.payload);
  assert.equal((await messagesOf(chat.thread.id)).length, count);
});

// ---------- assistant integration ----------
test("the assistant collects car details and turns an agreed slot into a preliminary request", async () => {
  await bookings.applyTemplate(alice, "ru");
  const chat = await websiteConversation(alice);
  const target = `${futureDay()}T16:00`;
  generate = async (c) => {
    assert.ok(c.booking, "booking context is supplied when enabled");
    assert.ok(c.booking!.slots.includes(target));
    const diag = c.entries.find((e) => e.title === "Компьютерная диагностика")!;
    return {
      answer: "Предварительно записал вас, администратор подтвердит время.",
      handoff: false,
      sourceIds: [diag.id],
      intake: { vehicle: "VW Passat B7", year: "2012", plate: null, vin: null, mileage: null, problem: "Горит check engine", phone: "+380671112233", preferredTime: "завтра после 16" },
      bookingRequest: { slot: target, serviceId: diag.id },
      inputTokens: 10,
      outputTokens: 10,
    };
  };
  const thread = await chats.post(chat.thread.id, chat.token, randomUUID(), "Горит чек на Passat B7 2012, нужна диагностика в 16:00, тел +380671112233");
  assert.equal(thread.mode, "ai", "the assistant keeps the conversation");
  const info = await bookings.forConversation(alice, chat.thread.id);
  assert.equal(info.intake.vehicle, "VW Passat B7");
  assert.equal(info.intake.phone, "+380671112233");
  assert.equal(info.appointments.length, 1);
  const a = info.appointments[0];
  assert.equal(a.status, "requested");
  assert.equal(a.source, "ai");
  assert.equal(a.serviceTitle, "Компьютерная диагностика");
  assert.equal(a.durationMinutes, 45, "service duration from the knowledge entry");
  assert.equal(a.startsAt, zonedToUtc(futureDay(), "16:00", TZ).toISOString());
  const notify = await query("SELECT id FROM background_jobs WHERE kind='notification' AND payload->>'booking'=$1", [a.id]);
  assert.equal(notify.length, 1, "the team is notified to confirm");
  // A second agreed time moves the same preliminary request instead of duplicating it.
  const moved = `${futureDay()}T17:00`;
  generate = async () => ({
    answer: "Перенёс заявку на 17:00, администратор подтвердит.",
    handoff: false,
    sourceIds: [],
    intake: null,
    bookingRequest: { slot: moved, serviceId: null },
    inputTokens: 1,
    outputTokens: 1,
  });
  await chats.post(chat.thread.id, chat.token, randomUUID(), "А можно в 17:00?");
  const again = await bookings.forConversation(alice, chat.thread.id);
  assert.equal(again.appointments.length, 1);
  assert.equal(again.appointments[0].startsAt, zonedToUtc(futureDay(), "17:00", TZ).toISOString());
  assert.equal(again.intake.vehicle, "VW Passat B7", "earlier details are kept");
});
test("a slot that is not offered is rejected as ungrounded and handed to a person", async () => {
  const chat = await websiteConversation(alice);
  generate = async () => ({
    answer: "Записал на 03:00.",
    handoff: false,
    sourceIds: [],
    intake: null,
    bookingRequest: { slot: `${futureDay()}T03:00`, serviceId: null },
    inputTokens: 1,
    outputTokens: 1,
  });
  const thread = await chats.post(chat.thread.id, chat.token, randomUUID(), "Запишите ночью");
  assert.equal(thread.mode, "human");
  assert.equal((await bookings.forConversation(alice, chat.thread.id)).appointments.length, 0);
});
test("without booking enabled the assistant gets no slots and structured fields are ignored", async () => {
  await enable(bob, { ...everyDay, enabled: false });
  await store.saveEntry(bob, {
    kind: "service",
    title: "Diagnostics",
    content: "Diagnostics 500 UAH",
    price: 500,
    currency: "UAH",
    durationMinutes: 30,
    sku: "",
  });
  const chat = await websiteConversation(bob);
  generate = async (c) => ({
    answer: "Diagnostics costs 500 UAH.",
    handoff: false,
    sourceIds: [c.entries[0].id],
    intake: { vehicle: "Ignored" },
    bookingRequest: null,
    inputTokens: 1,
    outputTokens: 1,
  });
  await chats.post(chat.thread.id, chat.token, randomUUID(), "diagnostics price?");
  assert.equal(lastContext?.booking, undefined);
  const info = await bookings.forConversation(bob, chat.thread.id);
  assert.deepEqual(info.intake, {});
});
test("the car-service template adds entries once and skips existing titles", async () => {
  const before = (await store.entries(bob)).length;
  const first = await bookings.applyTemplate(bob, "uk");
  assert.equal(first.added, serviceStationTemplate("uk").length);
  const second = await bookings.applyTemplate(bob, "uk");
  assert.equal(second.added, 0);
  assert.equal((await store.entries(bob)).length, before + first.added);
  assert.ok((await store.entries(bob)).every((e) => e.title !== "Шиномонтаж" || e.price === null));
  await assert.rejects(bookings.applyTemplate({ ...bob, role: "agent" }, "uk"), bad("FORBIDDEN"));
});
