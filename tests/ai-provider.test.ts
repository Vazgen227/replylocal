import { test } from "node:test";
import assert from "node:assert/strict";
import { openAIProvider, type AIContext } from "../src/server/ai-provider";
const context: AIContext = {
  companyName: "Test Business",
  instructions: "Be helpful",
  tone: "friendly",
  locale: "en",
  entries: [
    {
      id: "source-1",
      kind: "rule",
      title: "Return policy",
      content: "Returns within 14 days",
      price: null,
      currency: "UAH",
      durationMinutes: null,
      sku: "",
      version: 1,
      updatedAt: "",
    },
  ],
  history: [{ sender: "visitor", content: "Returns?" }],
};
test("Responses API contract, no remote storage, bounded output, strict result and citations", async () => {
  const original = globalThis.fetch,
    key = process.env.OPENAI_API_KEY,
    model = process.env.OPENAI_MODEL;
  process.env.OPENAI_API_KEY = "test-key-not-real";
  process.env.OPENAI_MODEL = "test-model";
  try {
    globalThis.fetch = async (url, init) => {
      assert.equal(url, "https://api.openai.com/v1/responses");
      const body = JSON.parse(String(init?.body));
      assert.equal(body.store, false);
      assert.equal(body.max_output_tokens, 1000);
      assert.equal(body.text.format.strict, true);
      assert.equal(body.text.format.type, "json_schema");
      assert.equal(body.model, "test-model");
      assert.match(body.instructions, /Do not invent/);
      return Response.json({
        status: "completed",
        output: [
          {
            content: [
              {
                type: "output_text",
                text: JSON.stringify({
                  answer: "Within 14 days.",
                  handoff: false,
                  sourceIds: ["source-1"],
                }),
              },
            ],
          },
        ],
        usage: { input_tokens: 10, output_tokens: 5 },
      });
    };
    const result = await openAIProvider(context);
    assert.equal(result.answer, "Within 14 days.");
    assert.equal(result.inputTokens, 10);
    globalThis.fetch = async () =>
      Response.json({
        status: "completed",
        output: [
          {
            content: [
              {
                type: "output_text",
                text: JSON.stringify({
                  answer: "Invented answer",
                  handoff: false,
                  sourceIds: ["foreign-id"],
                }),
              },
            ],
          },
        ],
      });
    await assert.rejects(openAIProvider(context), /AI_UNGROUNDED/);
    globalThis.fetch = async () =>
      Response.json({ error: "private details" }, { status: 429 });
    await assert.rejects(openAIProvider(context), /AI_HTTP_429/);
  } finally {
    globalThis.fetch = original;
    if (key === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = key;
    if (model === undefined) delete process.env.OPENAI_MODEL;
    else process.env.OPENAI_MODEL = model;
  }
});
test("booking mode sends free slots and a strict schema for car details; only listed slots are accepted", async () => {
  const original = globalThis.fetch,
    key = process.env.OPENAI_API_KEY,
    model = process.env.OPENAI_MODEL;
  process.env.OPENAI_API_KEY = "test-key-not-real";
  process.env.OPENAI_MODEL = "test-model";
  let reply: Record<string, unknown> = {};
  const booking = {
    now: "2026-11-10, 09:00",
    timeZone: "Europe/Kyiv",
    address: "Test street 1",
    slots: ["2026-11-11T10:00", "2026-11-11T11:00"],
  };
  try {
    globalThis.fetch = async (_url, init) => {
      const body = JSON.parse(String(init?.body));
      const schema = body.text.format.schema;
      assert.deepEqual(schema.required, ["answer", "handoff", "sourceIds", "intake", "bookingRequest"]);
      assert.equal(schema.properties.intake.anyOf[0].additionalProperties, false);
      assert.match(body.instructions, /Never say the booking is confirmed/);
      assert.match(body.input[1].content, /2026-11-11: 2026-11-11T10:00, 2026-11-11T11:00/);
      return Response.json({
        status: "completed",
        output: [{ content: [{ type: "output_text", text: JSON.stringify(reply) }] }],
        usage: { input_tokens: 1, output_tokens: 1 },
      });
    };
    const base = { answer: "Preliminary request for 10:00.", handoff: false, sourceIds: [] };
    const intake = { vehicle: "Golf", year: null, plate: null, vin: null, mileage: null, problem: null, phone: null, preferredTime: null };
    reply = { ...base, intake, bookingRequest: { slot: "2026-11-11T10:00", serviceId: null } };
    const ok = await openAIProvider({ ...context, booking });
    assert.equal(ok.bookingRequest?.slot, "2026-11-11T10:00");
    assert.equal(ok.intake?.vehicle, "Golf");
    reply = { ...base, intake, bookingRequest: { slot: "2026-11-11T03:00", serviceId: null } };
    await assert.rejects(openAIProvider({ ...context, booking }), /AI_UNGROUNDED/);
    reply = { ...base, intake: null, bookingRequest: null };
    await assert.rejects(openAIProvider({ ...context, booking }), /AI_UNGROUNDED/, "no source and no booking");
  } finally {
    globalThis.fetch = original;
    process.env.OPENAI_API_KEY = key;
    process.env.OPENAI_MODEL = model;
  }
});
