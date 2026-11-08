import { test, expect } from "@playwright/test";
const origin = "http://127.0.0.1:3100";
test("website visitor → grounded AI → operator handoff → reply → export → close, and embedded widget", async ({
  page,
  browser,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (e) => {
    if (e.type() === "error") errors.push(e.text());
  });
  const req = page.request;
  expect(
    (
      await req.post("/api/auth/register", {
        headers: { Origin: origin },
        data: {
          name: "Pilot Owner",
          companyName: "Website Workshop",
          email: "pilot-owner@example.test",
          password: "pilot test password is long",
        },
      })
    ).status(),
  ).toBe(201);
  expect(
    (
      await req.post("/api/knowledge", {
        headers: { Origin: origin },
        data: {
          kind: "service",
          title: "Inspection",
          content: "Visual inspection costs 250 UAH.",
          price: 250,
          currency: "UAH",
          durationMinutes: 30,
          sku: "",
        },
      })
    ).status(),
  ).toBe(201);
  const config = await (await req.get("/api/chat/config")).json();
  expect(
    (
      await req.patch("/api/chat/config", {
        headers: { Origin: origin },
        data: {
          enabled: true,
          autoReply: true,
          welcome: "Welcome to the workshop",
          dailyLimit: 10,
          version: config.version,
        },
      })
    ).status(),
  ).toBe(200);
  await page.goto("/en/integrations");
  await expect(
    page.getByLabel("Direct customer link", { exact: true }),
  ).toHaveValue(`${origin}/en/chat/${config.publicId}`);
  await expect(
    page.getByLabel("Installation code", { exact: true }),
  ).toHaveValue(/widget\.js/);
  const customer = await browser.newContext();
  const visitor = await customer.newPage();
  visitor.on("pageerror", (e) => errors.push(e.message));
  await visitor.goto(`/en/chat/${config.publicId}`);
  await visitor
    .getByLabel("Your name", { exact: true })
    .fill("Website Visitor");
  await visitor.getByRole("checkbox").check();
  await visitor
    .getByRole("button", { name: "Start chat", exact: true })
    .click();
  await expect(
    visitor.getByText("Welcome to the workshop", { exact: true }),
  ).toBeVisible();
  await visitor
    .getByRole("textbox", { name: "Write your question…" })
    .fill("How much does inspection cost?");
  await visitor.getByRole("button", { name: "Send", exact: true }).click();
  await expect(
    visitor.getByText("Inspection costs 250 UAH.", { exact: true }),
  ).toBeVisible({ timeout: 30000 });
  await visitor
    .getByRole("button", { name: "Ask for an operator", exact: true })
    .click();
  await page.goto("/en/inbox");
  await page.getByRole("link").filter({ hasText: "Website Visitor" }).click();
  await expect(
    page.getByText("How much does inspection cost?", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Knowledge sources", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: "Reply to visitor" })
    .fill("A real operator has joined.");
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await expect(
    visitor.getByText("A real operator has joined.", { exact: true }),
  ).toBeVisible({ timeout: 15000 });
  const id = page.url().split("/").at(-1);
  const exported = await req.get(`/api/conversations/${id}/export`);
  expect(exported.status()).toBe(200);
  expect(exported.headers()["content-disposition"]).toContain("attachment");
  expect(
    (await exported.json()).messages.some(
      (m: { content: string }) => m.content === "A real operator has joined.",
    ),
  ).toBe(true);
  await page
    .getByRole("button", { name: "Close conversation", exact: true })
    .click();
  await expect(
    visitor.getByText(
      "This conversation is closed. You can still read its messages.",
      { exact: true },
    ),
  ).toBeVisible({ timeout: 15000 });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/operator-mobile.png",
    fullPage: true,
  });
  await visitor.setViewportSize({ width: 390, height: 844 });
  expect(
    await visitor.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await visitor.screenshot({
    path: "test-results/customer-mobile.png",
    fullPage: true,
  });
  const embed = await customer.newPage();
  await embed.goto(`http://127.0.0.1:54330/embed?business=${config.publicId}`);
  await embed
    .getByRole("button", { name: "Chat with us", exact: true })
    .click();
  const frame = embed.frameLocator("iframe");
  await expect(
    frame.getByRole("heading", { name: "Website Workshop", exact: true }),
  ).toBeVisible();
  await expect(
    frame.getByRole("button", { name: "Start chat", exact: true }),
  ).toBeVisible();
  await embed.screenshot({
    path: "test-results/embedded-widget.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/en/analytics");
  await expect(
    page.getByText("Total conversations", { exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/analytics-desktop.png",
    fullPage: true,
  });
  for (const locale of ["ru", "uk"]) {
    await page.goto(`/${locale}/integrations`);
    await expect(page.locator("textarea").last()).toBeVisible();
  }
  await customer.close();
  expect(errors).toEqual([]);
});
