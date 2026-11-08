import { test, expect } from "@playwright/test";
const origin = "http://127.0.0.1:3100";
test("car service: template → booking settings → AI preliminary request → confirm → customer notified → visit completed in report", async ({
  page,
  browser,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (e) => {
    if (e.type() === "error") errors.push(e.text());
  });
  page.on("dialog", (d) => void d.accept());
  const req = page.request;
  expect(
    (
      await req.post("/api/auth/register", {
        headers: { Origin: origin },
        data: {
          name: "Garage Owner",
          companyName: "Test Garage",
          email: "garage-owner@example.test",
          password: "garage test password is long",
        },
      })
    ).status(),
  ).toBe(201);

  // 1. One click adds typical car-service services and rules without prices.
  await page.goto("/ru/knowledge");
  await page.getByRole("button", { name: "Типовые услуги СТО", exact: true }).click();
  await expect(page.getByText("Добавлено записей: 17", { exact: true })).toBeVisible();
  await expect(page.getByText("Компьютерная диагностика", { exact: true })).toBeVisible();

  // 2. The owner turns on online booking in settings.
  await page.goto("/ru/settings");
  const booking = page.locator("#booking");
  await booking.getByRole("checkbox", { name: /Включить онлайн-запись/ }).check();
  await booking.getByLabel("Адрес СТО (в подтверждениях)", { exact: true }).fill("Киев, ул. Тестовая 1");
  await booking.getByRole("button", { name: "Сохранить", exact: true }).click();
  await expect(page.getByText("Сохранено", { exact: true }).first()).toBeVisible();
  const saved = await (await req.get("/api/booking/settings")).json();
  expect(saved.settings.enabled).toBe(true);
  expect(saved.settings.address).toBe("Киев, ул. Тестовая 1");

  // 3. A website visitor asks to book; the AI collects car details and creates a request.
  const config = await (await req.get("/api/chat/config")).json();
  await req.patch("/api/chat/config", {
    headers: { Origin: origin },
    data: { enabled: true, autoReply: true, welcome: "Welcome to the garage", dailyLimit: 20, version: config.version },
  });
  const customer = await browser.newContext();
  const visitor = await customer.newPage();
  visitor.on("pageerror", (e) => errors.push(e.message));
  await visitor.goto(`/en/chat/${config.publicId}`);
  await visitor.getByLabel("Your name", { exact: true }).fill("Oleh Driver");
  await visitor.getByRole("checkbox").check();
  await visitor.getByRole("button", { name: "Start chat", exact: true }).click();
  await visitor
    .getByRole("textbox", { name: "Write your question…" })
    .fill("I want to book diagnostics for my Skoda Octavia 2015, check engine is on");
  await visitor.getByRole("button", { name: "Send", exact: true }).click();
  await expect(visitor.getByText(/^Preliminary request for/)).toBeVisible({ timeout: 30000 });

  // 4. The administrator sees the pending request and confirms it.
  await page.goto("/ru/appointments");
  await expect(page.getByText("1 заявка ждёт подтверждения", { exact: true })).toBeVisible();
  await expect(page.getByText("Skoda Octavia · 2015", { exact: true })).toBeVisible();
  await expect(page.getByText("Ждёт подтверждения", { exact: true })).toBeVisible();
  await page.screenshot({ path: "test-results/appointments-desktop.png", fullPage: true });
  await page.getByRole("button", { name: "Подтвердить и сообщить клиенту", exact: true }).click();
  await expect(page.getByText("Подтверждена", { exact: true })).toBeVisible();

  // 5. The customer receives the confirmation in the same chat.
  await expect(visitor.getByText(/^Your appointment is confirmed: .*Address: Киев, ул\. Тестовая 1\.$/)).toBeVisible({
    timeout: 20000,
  });

  // 6. In the conversation the car card is filled by the AI; completing the visit records the sale.
  await page.getByRole("link", { name: "Открыть диалог", exact: true }).click();
  await expect(page.getByText("Запись и автомобиль", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Марка и модель", { exact: true })).toHaveValue("Skoda Octavia");
  await expect(page.getByLabel("Телефон", { exact: true }).last()).toHaveValue("+380501234567");
  await page.getByRole("button", { name: "Выполнено", exact: true }).click();
  await page.getByLabel("Сумма", { exact: true }).fill("1200");
  await page.getByLabel("Прибыль (необязательно)", { exact: true }).fill("500");
  await page.getByRole("button", { name: "Сохранить", exact: true }).first().click();
  await expect(page.getByText("Выполнена", { exact: true })).toBeVisible();
  const id = page.url().split("/").at(-1);
  const outcome = await (await req.get(`/api/conversations/${id}/outcome`)).json();
  expect(outcome.leadStage).toBe("won");
  expect(outcome.dealValue).toBe(1200);
  expect(outcome.grossProfit).toBe(500);
  const month = new Date().toISOString().slice(0, 7) + "-01";
  const report = await (await req.get(`/api/analytics/channels?month=${month}`)).json();
  const website = report.rows.find((r: { channel: string }) => r.channel === "website");
  expect(website.won).toBe(1);
  expect(website.revenue).toBe(1200);

  // 7. Mobile layout has no horizontal scroll.
  await page.setViewportSize({ width: 390, height: 844 });
  for (const path of ["/ru/appointments", `/ru/inbox/${id}`, "/ru/settings"]) {
    await page.goto(path);
    await expect(page.locator("h1").first()).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
  await page.goto("/ru/appointments");
  await page.getByRole("checkbox", { name: "Показывать завершённые и отменённые" }).check();
  await expect(page.getByText("Выполнена", { exact: true })).toBeVisible();
  await page.screenshot({ path: "test-results/appointments-mobile.png", fullPage: true });
  await page.goto(`/ru/inbox/${id}`);
  await expect(page.getByText("Запись и автомобиль", { exact: true })).toBeVisible();
  await page.getByText("Запись и автомобиль", { exact: true }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: "test-results/conversation-booking-mobile.png" });
  for (const locale of ["uk", "en"]) {
    await page.goto(`/${locale}/appointments`);
    await expect(page.locator("h1")).toHaveText(locale === "uk" ? "Записи" : "Appointments");
  }
  await customer.close();
  expect(errors).toEqual([]);
});
