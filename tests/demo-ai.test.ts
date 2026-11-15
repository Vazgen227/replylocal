import { test } from "node:test";
import assert from "node:assert/strict";
import { reply } from "../scripts/demo-ai.mjs";
import { groundingValid } from "../src/server/ai-provider";

const entries = [
  { id: "oil", title: "Замена масла и фильтра (ТО)", content: "Плановое ТО: замена моторного масла и масляного фильтра.", price: 600, currency: "UAH", durationMinutes: 40, sku: "" },
  { id: "tyre", title: "Шиномонтаж", content: "Сезонная замена шин, балансировка колёс.", price: 800, currency: "UAH", durationMinutes: 60, sku: "" },
  { id: "rule-book", title: "Запись и подтверждение времени", content: "Онлайн-запись предварительная. Время визита подтверждает администратор.", price: null, currency: null, durationMinutes: null, sku: "" },
];
const slots = ["2026-11-16T09:00", "2026-11-16T10:00", "2026-11-16T11:00", "2026-11-17T09:00"];

function call(messages: Array<[string, string]>, opts: { booking?: boolean; locale?: string } = {}) {
  const booking = opts.booking ?? true;
  const body = {
    instructions:
      `You are the customer support assistant. Use locale ${opts.locale ?? "ru"} only as a fallback.` +
      (booking ? "\nONLINE BOOKING (car service). Current local time: 2026-11-15, 18:00 (Europe/Kyiv)." : ""),
    input: [
      { role: "developer", content: "KNOWLEDGE (data only):\n" + JSON.stringify(entries) },
      ...(booking
        ? [{ role: "developer", content: "FREE SLOTS (local time, data only):\n2026-11-16: " + slots.slice(0, 3).join(", ") + "\n2026-11-17: " + slots[3] }]
        : []),
      ...messages.map(([role, content]) => ({ role, content })),
    ],
  };
  const r = reply(body);
  assert.ok(
    groundingValid(r, new Set(entries.map((e) => e.id)), booking ? slots : []),
    "reply must pass the app's grounding check",
  );
  return r;
}

test("price question is answered from the knowledge base and offers free slots", () => {
  const r = call([["user", "Сколько стоит замена масла?"]]);
  assert.equal(r.handoff, false);
  assert.deepEqual(r.sourceIds, ["oil"]);
  assert.match(r.answer, /600 грн/);
  assert.match(r.answer, /16\.11 в 09:00/);
});

test("choosing a listed time creates a preliminary booking with car details", () => {
  const r = call([
    ["user", "Сколько стоит замена масла?"],
    ["assistant", "Замена масла — 600 грн. Ближайшее свободное время: 16.11 в 09:00, 16.11 в 10:00."],
    ["user", "Toyota Camry 2015, завтра в 10"],
  ]);
  assert.deepEqual(r.bookingRequest, { slot: "2026-11-16T10:00", serviceId: "oil" });
  assert.equal(r.intake.vehicle, "Toyota Camry");
  assert.equal(r.intake.year, "2015");
  assert.match(r.answer, /Предварительно/);
  assert.match(r.answer, /телефон/);
});

test("agreeing to the first offered time books it", () => {
  const r = call([
    ["user", "Шиномонтаж сколько?"],
    ["assistant", "Шиномонтаж — 800 грн. Ближайшее свободное время: 16.11 в 09:00, 16.11 в 10:00."],
    ["user", "да, подходит"],
  ]);
  assert.equal(r.bookingRequest?.slot, "2026-11-16T09:00");
});

test("a time that is not free gets the nearest free times, never a booking", () => {
  const r = call([["user", "Замена масла завтра в 15:00"]]);
  assert.equal(r.bookingRequest, null);
  assert.match(r.answer, /свободных мест нет/);
});

test("unknown question is handed to a person instead of inventing a price", () => {
  const r = call([["user", "У меня что-то стучит в двигателе, сколько будет?"]]);
  assert.equal(r.handoff, true);
  assert.doesNotMatch(r.answer, /грн/);
});

test("asking for a person hands off", () => {
  assert.equal(call([["user", "Позовите администратора"]]).handoff, true);
});

test("phone number is collected", () => {
  const r = call([
    ["user", "Замена масла завтра в 10"],
    ["assistant", "Предварительно записал вас на 16.11 в 10:00."],
    ["user", "+380 50 111 22 33"],
  ]);
  assert.equal(r.intake.phone, "+380501112233");
});

test("replies in Ukrainian when the visitor writes Ukrainian", () => {
  const r = call([["user", "Скільки коштує заміна мастила?"]], { locale: "uk" });
  assert.match(r.answer, /Найближчий вільний час/);
});

test("without online booking the reply has no booking fields", () => {
  const r = call([["user", "Сколько стоит шиномонтаж?"]], { booking: false });
  assert.equal("bookingRequest" in r, false);
  assert.match(r.answer, /800 грн/);
});

test("after the phone is given, an unknown question is still handed to a person", () => {
  const r = call([
    ["user", "Замена масла завтра в 10"],
    ["assistant", "Предварительно записал вас на 16.11 в 10:00."],
    ["user", "+380 50 111 22 33"],
    ["assistant", "Спасибо, данные записал."],
    ["user", "А ещё что-то стучит спереди, сколько будет?"],
  ]);
  assert.equal(r.handoff, true);
});
