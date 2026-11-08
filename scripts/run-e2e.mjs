// Test-only PostgreSQL-compatible server. Never use this unauthenticated server in production.
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { rm } from "node:fs/promises";
const db = await PGlite.create();
const server = new PGLiteSocketServer({
  db,
  host: "127.0.0.1",
  port: 54329,
  maxConnections: 10,
});
await server.start();
// Local deterministic Responses fixture: no real API credentials or billable calls.
const providerSends = [];
const telegramHooks = new Map();
const fixture = createServer(async (req, res) => {
  if (req.url?.startsWith("/embed")) {
    const publicId = new URL(
      req.url,
      "http://127.0.0.1:54330",
    ).searchParams.get("business");
    res.setHeader("Content-Type", "text/html");
    res.end(
      '<!doctype html><html><body><h1>Customer website</h1><script src="http://127.0.0.1:3100/widget.js" data-business="' +
        publicId +
        '" data-locale="en" defer></script></body></html>',
    );
    return;
  }
  if (req.url?.startsWith("/test/sends")) {
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(providerSends));
    return;
  }
  if (req.url?.startsWith("/test/push-telegram")) {
    const hook = [...telegramHooks.values()][0];
    if (!hook) {
      res.statusCode = 409;
      res.end("{}");
      return;
    }
    const update = {
      update_id: 101,
      message: {
        message_id: 101,
        date: Math.floor(Date.now() / 1000),
        chat: { id: 333, type: "private" },
        from: { id: 333, first_name: "Telegram Browser Customer" },
        text: "How much does inspection cost?",
      },
    };
    const response = await fetch(hook.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Telegram-Bot-Api-Secret-Token": hook.secret_token,
      },
      body: JSON.stringify(update),
    });
    res.statusCode = response.status;
    res.setHeader("Content-Type", "application/json");
    res.end(await response.text());
    return;
  }
  if (req.url?.startsWith("/provider")) {
    const target = new URL(req.url, "http://127.0.0.1:54330").searchParams.get(
      "target",
    );
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = chunks.length
      ? JSON.parse(Buffer.concat(chunks).toString())
      : {};
    let data = {};
    if (target.includes("getMe"))
      data = { ok: true, result: { id: 123456, username: "browser_test_bot" } };
    else if (target.includes("setWebhook")) {
      telegramHooks.set(target, body);
      data = { ok: true, result: true };
    } else if (target.includes("sendMessage")) {
      providerSends.push({ target, body });
      data = { ok: true, result: { message_id: providerSends.length } };
    } else if (target.includes("get_account_info"))
      data = { status: 0, id: "browser-viber", name: "Browser Viber" };
    else if (target.includes("set_webhook")) data = { status: 0 };
    else if (target.includes("fields="))
      data = target.includes("instagram")
        ? { id: "2002", username: "browser_ig" }
        : { id: "1001", display_phone_number: "123" };
    else {
      providerSends.push({ target, body });
      data = {
        messages: [{ id: "message-" + providerSends.length }],
        message_id: "message-" + providerSends.length,
        status: 0,
        message_token: String(providerSends.length),
      };
    }
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(data));
    return;
  }
  // Browsers also ask this origin for /favicon.ico; only POSTs are AI calls.
  if (req.method !== "POST") {
    res.statusCode = 404;
    res.end();
    return;
  }
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const input = JSON.parse(Buffer.concat(chunks).toString());
  const entries = JSON.parse(
    input.input[0].content.split("\n").slice(1).join("\n"),
  );
  // Booking mode: the slot list follows the knowledge message. A visitor asking
  // to book gets the first free slot as a preliminary request with car details.
  const slotMessage = input.input.find(
    (m) => m.role === "developer" && m.content.startsWith("FREE SLOTS"),
  );
  const lastVisitor = [...input.input].reverse().find((m) => m.role === "user");
  const firstSlot = slotMessage?.content.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/)?.[0];
  const reply =
    slotMessage && firstSlot && /book|запис/i.test(lastVisitor?.content ?? "")
      ? {
          answer: `Preliminary request for ${firstSlot.replace("T", " ")}. The administrator will confirm.`,
          handoff: false,
          sourceIds: [entries[0].id],
          intake: {
            vehicle: "Skoda Octavia",
            year: "2015",
            plate: null,
            vin: null,
            mileage: null,
            problem: "Check engine light",
            phone: "+380501234567",
            preferredTime: null,
          },
          bookingRequest: { slot: firstSlot, serviceId: null },
        }
      : {
          answer: "Inspection costs 250 UAH.",
          handoff: false,
          sourceIds: [entries[0].id],
          ...(slotMessage ? { intake: null, bookingRequest: null } : {}),
        };
  res.setHeader("Content-Type", "application/json");
  res.end(
    JSON.stringify({
      status: "completed",
      output: [
        {
          content: [
            {
              type: "output_text",
              text: JSON.stringify(reply),
            },
          ],
        },
      ],
      usage: { input_tokens: 120, output_tokens: 20 },
    }),
  );
});
await new Promise((resolve) => fixture.listen(54330, "127.0.0.1", resolve));
const env = {
  ...process.env,
  NODE_ENV: "development",
  DATABASE_URL: "postgresql://postgres:postgres@127.0.0.1:54329/postgres",
  APP_URL: "http://127.0.0.1:3100",
  ALLOW_SIGNUP: "true",
  CHANNEL_ENCRYPTION_KEY: Buffer.alloc(32, 5).toString("base64"),
  CRON_SECRET: "test-cron-secret",
  REPLYLOCAL_TEST_PROVIDER_URL: "http://127.0.0.1:54330/provider",
  NEXT_TELEMETRY_DISABLED: "1",
  OPENAI_API_KEY: "test-only-not-real",
  OPENAI_MODEL: "test-model",
  REPLYLOCAL_TEST_AI_URL: "http://127.0.0.1:54330/responses",
};
function run(args) {
  return new Promise((resolve, reject) => {
    const p = spawn(process.execPath, args, { env, stdio: "inherit" });
    p.on("error", reject);
    p.on("exit", (code) =>
      code === 0 ? resolve() : reject(new Error(`Command exited ${code}`)),
    );
  });
}
let app;
try {
  await run(["scripts/migrate.mjs"]);
  await run(["scripts/migrate.mjs"]);
  await rm(new URL("../.next/dev", import.meta.url), {
    recursive: true,
    force: true,
  });
  app = spawn(
    process.execPath,
    [
      "node_modules/next/dist/bin/next",
      "dev",
      "--hostname",
      "127.0.0.1",
      "--port",
      "3100",
    ],
    { env, stdio: "inherit" },
  );
  let ready = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      const response = await fetch(`${env.APP_URL}/en/login`);
      if (response.ok) {
        ready = true;
        break;
      }
    } catch {}
    if (app.exitCode !== null)
      throw new Error("Next.js stopped before readiness");
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  if (!ready) throw new Error("Next.js did not become ready");
  // Compile private API modules before browser assertions; production builds have no dev compile delay.
  for (const path of [
    "/api/workspace",
    "/api/channels",
    "/api/jobs",
    "/api/billing",
    "/api/conversations/00000000-0000-4000-8000-000000000000",
    "/api/conversations/00000000-0000-4000-8000-000000000000/outcome",
    "/api/conversations/00000000-0000-4000-8000-000000000000/booking",
    "/api/booking/settings",
    "/api/appointments/slots",
  ])
    await fetch(env.APP_URL + path);
  await run([
    "node_modules/@playwright/test/cli.js",
    "test",
    ...process.argv.slice(2),
  ]);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  if (app) {
    app.kill("SIGTERM");
    await new Promise((resolve) => {
      if (app.exitCode !== null) return resolve();
      app.once("exit", resolve);
      setTimeout(() => {
        app.kill("SIGKILL");
        resolve();
      }, 5000).unref();
    });
  }
  await new Promise((resolve) => fixture.close(resolve));
  await server.stop();
  await db.close();
}
