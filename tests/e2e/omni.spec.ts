import { test, expect } from "@playwright/test";
import { createHmac } from "node:crypto";
const origin = "http://127.0.0.1:3100",
  fixture = "http://127.0.0.1:54330";
test("connect messengers → signed webhooks → unified inbox → operator reply → sale report → invited teammate", async ({
  page,
  browser,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (e) => {
    if (e.type() === "error") errors.push(e.text());
  });
  const req = page.request,
    headers = { Origin: origin };
  expect(
    (
      await req.post("/api/auth/register", {
        headers,
        data: {
          name: "Omni Owner",
          companyName: "Omni Workshop",
          email: "omni-owner@example.test",
          password: "a very long owner password",
        },
      })
    ).status(),
  ).toBe(201);
  expect(
    (
      await req.post("/api/knowledge", {
        headers,
        data: {
          kind: "service",
          title: "Inspection",
          content: "Inspection costs 250 UAH.",
          price: 250,
          currency: "UAH",
          durationMinutes: 30,
          sku: "",
        },
      })
    ).status(),
  ).toBe(201);
  await page.goto("/en/integrations");
  await page
    .getByLabel("Connection name", { exact: true })
    .fill("Telegram team");
  await page
    .getByLabel("Access token", { exact: true })
    .fill("123456:abcdefghijklmnopqrstuvwxyz");
  await page
    .getByRole("button", { name: "Verify and save", exact: true })
    .click();
  await expect(
    page.getByText("Telegram team · Telegram", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Enable channel", exact: true })
    .click();
  await expect(page.getByText(/123456 · Channel enabled/)).toBeVisible();
  for (const [provider, accountId] of [
    ["whatsapp", "1001"],
    ["instagram", "2002"],
    ["viber", ""],
  ]) {
    const response = await req.post("/api/channels", {
      headers,
      data: {
        provider,
        label: provider + " team",
        accessToken: "fixture-long-token",
        appSecret: "fixture-meta-secret",
        accountId,
      },
    });
    expect(response.status()).toBe(201);
    const { id } = await response.json();
    expect(
      (
        await req.patch(`/api/channels/${id}`, {
          headers,
          data: { enabled: true, version: 1 },
        })
      ).status(),
    ).toBe(200);
    const now = Date.now();
    const event =
      provider === "whatsapp"
        ? {
            entry: [
              {
                changes: [
                  {
                    value: {
                      metadata: { phone_number_id: "1001" },
                      contacts: [
                        {
                          wa_id: "444",
                          profile: { name: "WhatsApp Browser Customer" },
                        },
                      ],
                      messages: [
                        {
                          id: "wa-browser",
                          from: "444",
                          timestamp: String(Math.floor(now / 1000)),
                          type: "text",
                          text: { body: "How much does inspection cost?" },
                        },
                      ],
                    },
                  },
                ],
              },
            ],
          }
        : provider === "instagram"
          ? {
              entry: [
                {
                  id: "2002",
                  messaging: [
                    {
                      sender: { id: "555" },
                      recipient: { id: "2002" },
                      timestamp: now,
                      message: {
                        mid: "ig-browser",
                        text: "How much does inspection cost?",
                      },
                    },
                  ],
                },
              ],
            }
          : {
              event: "message",
              timestamp: now,
              message_token: "viber-browser",
              sender: { id: "vv-user", name: "Viber Browser Customer" },
              message: { type: "text", text: "How much does inspection cost?" },
            };
    const raw = JSON.stringify(event);
    const signature = createHmac(
      "sha256",
      provider === "viber" ? "fixture-long-token" : "fixture-meta-secret",
    )
      .update(raw)
      .digest("hex");
    expect(
      (
        await req.post(`/api/webhooks/${id}`, {
          headers: {
            "Content-Type": "application/json",
            [provider === "viber"
              ? "X-Viber-Content-Signature"
              : "X-Hub-Signature-256"]:
              (provider === "viber" ? "" : "sha256=") + signature,
          },
          data: raw,
        })
      ).status(),
    ).toBe(200);
  }
  expect((await req.get(fixture + "/test/push-telegram")).status()).toBe(200);
  await page.goto("/en/inbox");
  await expect(
    page.getByText("Telegram Browser Customer", { exact: true }),
  ).toBeVisible({ timeout: 30000 });
  await expect(
    page.getByText("WhatsApp Browser Customer", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Viber Browser Customer", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Instagram 555", { exact: true })).toBeVisible();
  await page.getByLabel("Channel", { exact: true }).selectOption("telegram");
  await expect(
    page.getByText("WhatsApp Browser Customer", { exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("link")
    .filter({ hasText: "Telegram Browser Customer" })
    .click();
  await expect(
    page.getByText("Inspection costs 250 UAH.", { exact: true }).first(),
  ).toBeVisible({ timeout: 15000 });
  await page.getByRole("button", { name: "Take over", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Reply to visitor" })
    .fill("Your appointment request is saved.");
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await expect(
    page.getByText("Accepted by provider", { exact: true }).first(),
  ).toBeVisible({ timeout: 15000 });
  await expect
    .poll(async () =>
      JSON.stringify(await (await req.get(fixture + "/test/sends")).json()),
    )
    .toContain("Your appointment request is saved.");
  await page.getByLabel("Stage", { exact: true }).selectOption("won");
  await page.getByLabel("Sale value", { exact: true }).fill("1000");
  await page
    .getByLabel("Profit before channel costs", { exact: true })
    .fill("350");
  await page
    .getByLabel("Assignee", { exact: true })
    .selectOption({ label: "Omni Owner" });
  await page
    .getByLabel("Next step", { exact: true })
    .fill("Confirm tomorrow morning");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Saved" }),
  ).toBeVisible();
  await page
    .getByLabel("Internal notes", { exact: true })
    .fill("Private business note");
  await page.getByRole("button", { name: "Add note", exact: true }).click();
  await expect(
    page.getByText("Private business note", { exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/omni-conversation-desktop.png",
    fullPage: true,
  });
  await page.goto("/en/analytics");
  await expect(
    page.getByRole("cell", { name: "1000.00", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Channel", { exact: true }).selectOption("telegram");
  await page.getByLabel("Channel spend", { exact: true }).fill("100");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(
    page.getByRole("cell", { name: "250.00", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/omni-analytics-desktop.png",
    fullPage: true,
  });
  await page.goto("/en/settings");
  const parallelReads = await Promise.all(
    Array.from({ length: 20 }, () => req.get("/api/team")),
  );
  expect(parallelReads.map((r) => r.status())).toEqual(Array(20).fill(200));
  await page
    .getByLabel("Email", { exact: true })
    .fill("omni-teammate@example.test");
  await page
    .getByRole("button", { name: "Invite teammate", exact: true })
    .click();
  const link = page.getByLabel("Invitation link (48 hours)", { exact: true });
  await expect(link).toHaveValue(/\/ru\/join\?token=/);
  const invitedUrl = await link.inputValue();
  await expect(page.getByText(/Email was not sent/)).toBeVisible();
  const other = await browser.newContext();
  const teammate = await other.newPage();
  await teammate.goto(invitedUrl.replace("/ru/", "/en/"));
  await teammate
    .getByLabel("Email", { exact: true })
    .fill("omni-teammate@example.test");
  await teammate.getByLabel("Your name", { exact: true }).fill("Team Operator");
  await teammate
    .getByLabel("Password (12+ characters)", { exact: true })
    .fill("a long teammate password");
  await teammate
    .getByRole("button", { name: "Create account and join", exact: true })
    .click();
  await expect(teammate).toHaveURL(/\/en\/inbox$/);
  await expect(
    teammate.getByText("Telegram Browser Customer", { exact: true }),
  ).toBeVisible();
  await teammate.goto("/en/integrations");
  await expect(
    teammate.getByRole("button", { name: "Verify and save", exact: true }),
  ).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/en/inbox");
  await expect(
    page.getByText("Telegram Browser Customer", { exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/omni-inbox-mobile.png",
    fullPage: true,
  });
  for (const locale of ["ru", "uk"]) {
    await page.goto(`/${locale}/integrations`);
    await expect(page.locator("html")).toHaveAttribute("lang", locale);
    await expect(
      page.getByText("Telegram team · Telegram", { exact: true }),
    ).toBeVisible();
  }
  await other.close();
  expect(errors).toEqual([]);
});
