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
