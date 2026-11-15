import { createHash } from "node:crypto";
import type { Database, Identity } from "./store";
import type { createBookingStore } from "./booking-store";
import { AppError } from "./errors";
import { digest, newToken } from "./passwords";
import { equalSecret } from "./crypto-secrets";
import { ChannelFailure, providerRequest } from "./channels";
import { vehicleLabel, type Appointment } from "../lib/booking";

/**
 * One platform-wide Telegram bot (TELEGRAM_ALERT_BOT_TOKEN) sends alerts to team
 * members who linked their private chat. Buttons act on bookings with the same
 * permission checks as the web cabinet.
 */
type Locale = "ru" | "uk" | "en";
type Button = { text: string; callback_data?: string; url?: string };
type Markup = { inline_keyboard: Button[][] };
const intl: Record<Locale, string> = { ru: "ru-RU", uk: "uk-UA", en: "en-GB" };
const L = {
  ru: {
    newBooking: "🆕 Новая заявка на запись",
    handoff: "💬 Клиенту нужен ответ сотрудника",
    followup: "📞 Пора напомнить о ТО — позвоните клиенту",
    repeat: "🔁 Постоянный клиент: визитов {n}",
    confirm: "✅ Подтвердить",
    decline: "❌ Отклонить",
    reallyDecline: "Да, отклонить",
    back: "↩️ Назад",
    open: "Открыть в кабинете",
    confirmed: "✅ Подтверждено: {name}. Клиент получил сообщение.",
    declined: "❌ Отклонено: {name}. Клиент получил сообщение.",
    lastVisit: "последний визит {when}",
    linked: "Готово! Уведомления для «{company}» будут приходить сюда.",
    badCode: "Ссылка устарела. Откройте «Настройки → Уведомления в Telegram» и подключите заново.",
    hello: "Это бот уведомлений ReplyLocal. Подключите его в кабинете: «Настройки → Уведомления в Telegram».",
    stopped: "Уведомления отключены.",
    test: "🔔 Тестовое уведомление ReplyLocal. Всё работает.",
    errors: {
      CONFLICT: "Запись уже изменили в кабинете. Откройте её там.",
      INVALID_STATE: "Запись уже обработана.",
      SLOT_TAKEN: "Это время уже занято. Перенесите запись в кабинете.",
      OUTSIDE_HOURS: "Время вне рабочих часов. Перенесите запись в кабинете.",
      FORBIDDEN: "Недостаточно прав.",
      NOT_FOUND: "Запись не найдена.",
      default: "Не получилось. Попробуйте в кабинете.",
    },
  },
  uk: {
    newBooking: "🆕 Нова заявка на запис",
    handoff: "💬 Клієнту потрібна відповідь співробітника",
    followup: "📞 Час нагадати про ТО — зателефонуйте клієнту",
    repeat: "🔁 Постійний клієнт: візитів {n}",
    confirm: "✅ Підтвердити",
    decline: "❌ Відхилити",
    reallyDecline: "Так, відхилити",
    back: "↩️ Назад",
    open: "Відкрити в кабінеті",
    confirmed: "✅ Підтверджено: {name}. Клієнт отримав повідомлення.",
    declined: "❌ Відхилено: {name}. Клієнт отримав повідомлення.",
    lastVisit: "останній візит {when}",
    linked: "Готово! Сповіщення для «{company}» надходитимуть сюди.",
    badCode: "Посилання застаріло. Відкрийте «Налаштування → Сповіщення в Telegram» і підключіть знову.",
    hello: "Це бот сповіщень ReplyLocal. Підключіть його в кабінеті: «Налаштування → Сповіщення в Telegram».",
    stopped: "Сповіщення вимкнено.",
    test: "🔔 Тестове сповіщення ReplyLocal. Усе працює.",
    errors: {
      CONFLICT: "Запис уже змінили в кабінеті. Відкрийте його там.",
      INVALID_STATE: "Запис уже оброблено.",
      SLOT_TAKEN: "Цей час уже зайнятий. Перенесіть запис у кабінеті.",
      OUTSIDE_HOURS: "Час поза робочими годинами. Перенесіть запис у кабінеті.",
      FORBIDDEN: "Недостатньо прав.",
      NOT_FOUND: "Запис не знайдено.",
      default: "Не вдалося. Спробуйте в кабінеті.",
    },
  },
  en: {
    newBooking: "🆕 New booking request",
    handoff: "💬 A customer needs a reply from the team",
    followup: "📞 Time for a service reminder — call the customer",
    repeat: "🔁 Returning customer: {n} visits",
    confirm: "✅ Confirm",
    decline: "❌ Decline",
    reallyDecline: "Yes, decline",
    back: "↩️ Back",
    open: "Open in workspace",
    confirmed: "✅ Confirmed by {name}. The customer was notified.",
    declined: "❌ Declined by {name}. The customer was notified.",
    lastVisit: "last visit {when}",
    linked: "Done! Alerts for “{company}” will arrive here.",
    badCode: "This link has expired. Open Settings → Telegram alerts and connect again.",
    hello: "This is the ReplyLocal alert bot. Connect it in the workspace: Settings → Telegram alerts.",
    stopped: "Alerts are turned off.",
    test: "🔔 ReplyLocal test alert. Everything works.",
    errors: {
      CONFLICT: "The booking was changed in the workspace. Open it there.",
      INVALID_STATE: "The booking was already handled.",
      SLOT_TAKEN: "This time is already taken. Reschedule in the workspace.",
      OUTSIDE_HOURS: "Outside working hours. Reschedule in the workspace.",
      FORBIDDEN: "Not allowed.",
      NOT_FOUND: "Booking not found.",
      default: "That did not work. Try in the workspace.",
    },
  },
} as const;
const asLocale = (v: unknown): Locale => (v === "uk" || v === "en" ? v : "ru");
const token = () => process.env.TELEGRAM_ALERT_BOT_TOKEN ?? "";
export function alertsConfigured() {
  return /^\d+:[\w-]{30,}$/.test(token());
}
/** Telegram allows A-Z, a-z, 0-9, _ and - in secret_token. Derived, never stored. */
export function alertWebhookSecret() {
  return createHash("sha256").update("replylocal-alerts:" + token()).digest("hex");
}
function appOrigin() {
  try {
    return new URL(process.env.APP_URL ?? "").origin;
  } catch {
    return "";
  }
}
/** Telegram rejects URL buttons that point to localhost or plain HTTP. */
function openButton(locale: Locale, path: string): Button[] {
  const origin = appOrigin();
  return origin.startsWith("https://")
    ? [{ text: L[locale].open, url: `${origin}/${locale}${path}` }]
    : [];
}
function clip(value: string, n: number) {
  const chars = Array.from(value.replace(/\s+/g, " ").trim());
  return chars.length > n ? chars.slice(0, n - 1).join("") + "…" : chars.join("");
}
function when(iso: string | Date, locale: Locale, timeZone: string) {
  return new Intl.DateTimeFormat(intl[locale], {
    timeZone,
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}
const channelName: Record<string, string> = {
  website: "Web",
  telegram: "Telegram",
  viber: "Viber",
  whatsapp: "WhatsApp",
  instagram: "Instagram",
};
export function bookingAlertText(
  a: Appointment,
  company: string,
  timeZone: string,
  locale: Locale,
  history: { visits: number; lastVisitAt: string | null } | null,
) {
  const t = L[locale];
  const car = vehicleLabel(a.vehicle, ", ");
  const lines = [
    `${t.newBooking} — ${company}`,
    `👤 ${clip(a.customerName || "—", 80)}${a.channel ? " · " + (channelName[a.channel] ?? a.channel) : ""}`,
    car && `🚗 ${clip(car, 120)}`,
    a.serviceTitle && `🔧 ${clip(a.serviceTitle, 120)}`,
    a.vehicle.problem && `💬 ${clip(a.vehicle.problem, 300)}`,
    `🕙 ${when(a.startsAt, locale, timeZone)}`,
    a.customerPhone && `📞 ${clip(a.customerPhone, 40)}`,
    history && history.visits > 0
      ? t.repeat.replace("{n}", String(history.visits)) +
        (history.lastVisitAt
          ? ", " + t.lastVisit.replace("{when}", new Intl.DateTimeFormat(intl[locale], { timeZone, day: "numeric", month: "long", year: "numeric" }).format(new Date(history.lastVisitAt)))
          : "")
      : "",
  ];
  return lines.filter(Boolean).join("\n");
}
function bookingButtons(a: Appointment, locale: Locale): Markup {
  const t = L[locale];
  const rows: Button[][] = [];
  if (a.status === "requested")
    rows.push([
      { text: t.confirm, callback_data: `c:${a.id}:${a.version}` },
      { text: t.decline, callback_data: `x:${a.id}:${a.version}` },
    ]);
  const open = openButton(locale, `/appointments`);
  if (open.length) rows.push(open);
  return { inline_keyboard: rows };
}

export function createAlertStore(
  db: Database,
  bookings: ReturnType<typeof createBookingStore>,
  fetcher: typeof fetch = fetch,
) {
  async function bot(method: string, body: unknown) {
    if (!alertsConfigured()) throw new ChannelFailure("ALERTS_NOT_CONFIGURED");
    const data = await providerRequest(
      `https://api.telegram.org/bot${token()}/${method}`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) },
      fetcher,
    );
    if (!data.ok) throw new ChannelFailure("TELEGRAM_" + String(data.error_code ?? "ERROR"));
    return data.result;
  }
  async function say(chatId: string, text: string, markup?: Markup) {
    return bot("sendMessage", {
      chat_id: chatId,
      text,
      link_preview_options: { is_disabled: true },
      ...(markup && markup.inline_keyboard.length ? { reply_markup: markup } : {}),
    });
  }
  /** Linked chats of the people who should hear about a conversation. */
  async function chats(org: string, assignedTo: string | null) {
    return db.query<{ chat_id: string; locale: Locale }>(
      `SELECT t.chat_id,t.locale FROM telegram_links t JOIN memberships m ON m.user_id=t.user_id AND m.organization_id=t.organization_id WHERE t.organization_id=$1 AND t.chat_id IS NOT NULL AND (CASE WHEN $2::uuid IS NOT NULL THEN t.user_id=$2 ELSE m.role IN ('owner','admin') END)`,
      [org, assignedTo],
    );
  }
  async function fanOut(rows: Array<{ chat_id: string; locale: Locale }>, build: (l: Locale) => [string, Markup]) {
    let sent = 0;
    for (const r of rows) {
      try {
        const [text, markup] = build(asLocale(r.locale));
        await say(r.chat_id, text, markup);
        sent++;
      } catch (e) {
        // A blocked bot or a deleted chat must not stop alerts to other people.
        if (e instanceof ChannelFailure && e.code === "TELEGRAM_403")
          await db.query("UPDATE telegram_links SET chat_id=NULL,linked_at=NULL WHERE chat_id=$1", [r.chat_id]);
      }
    }
    return sent;
  }
  async function actor(chatId: string, org: string): Promise<Identity | null> {
    const [row] = await db.query<{ user_id: string; role: Identity["role"]; name: string; email: string }>(
      `SELECT t.user_id,m.role,u.name,u.email FROM telegram_links t JOIN memberships m ON m.user_id=t.user_id AND m.organization_id=t.organization_id JOIN users u ON u.id=t.user_id WHERE t.chat_id=$1 AND t.organization_id=$2`,
      [chatId, org],
    );
    return row ? { userId: row.user_id, organizationId: org, role: row.role, name: row.name, email: row.email } : null;
  }
  async function callback(cb: {
    id: string;
    data?: string;
    from?: { id?: number };
    message?: { message_id?: number; chat?: { id?: number; type?: string }; text?: string };
  }) {
    const chatId = String(cb.message?.chat?.id ?? "");
    const answer = (text?: string) =>
      bot("answerCallbackQuery", { callback_query_id: cb.id, ...(text ? { text, show_alert: true } : {}) }).catch(() => {});
    const match = /^([cxXb]):([0-9a-f-]{36}):(\d{1,9})$/.exec(cb.data ?? "");
    if (!match || !chatId || cb.message?.chat?.type !== "private" || String(cb.from?.id) !== chatId)
      return answer();
    const [, op, id, version] = match;
    const info = await bookings.describe(id);
    if (!info) return answer(L.ru.errors.NOT_FOUND);
    const who = await actor(chatId, info.organizationId);
    const [link] = await db.query<{ locale: Locale }>(
      "SELECT locale FROM telegram_links WHERE chat_id=$1 AND organization_id=$2",
      [chatId, info.organizationId],
    );
    const locale = asLocale(link?.locale);
    const t = L[locale];
    if (!who) return answer(t.errors.FORBIDDEN);
    const edit = (text: string, markup: Markup) =>
      bot("editMessageText", {
        chat_id: chatId,
        message_id: cb.message?.message_id,
        text,
        link_preview_options: { is_disabled: true },
        reply_markup: markup,
      }).catch(() => {});
    const base = bookingAlertText(info.appointment, info.company, info.timeZone, locale, null);
    if (op === "x" || op === "b") {
      // Declining sends a message to the customer, so it takes a second tap.
      await answer();
      return edit(
        cb.message?.text ?? base,
        op === "x"
          ? {
              inline_keyboard: [
                [
                  { text: t.reallyDecline, callback_data: `X:${id}:${version}` },
                  { text: t.back, callback_data: `b:${id}:${version}` },
                ],
              ],
            }
          : bookingButtons(info.appointment, locale),
      );
    }
    try {
      await bookings.act(who, id, {
        action: op === "c" ? "confirm" : "cancel",
        version: Number(version),
        notify: true,
      });
    } catch (e) {
      const code = e instanceof AppError ? e.code : "default";
      return answer((t.errors as Record<string, string>)[code] ?? t.errors.default);
    }
    await answer();
    await edit(
      (cb.message?.text ?? base) + "\n\n" + (op === "c" ? t.confirmed : t.declined).replace("{name}", who.name),
      { inline_keyboard: [openButton(locale, "/appointments")].filter((r) => r.length) },
    );
  }

  return {
    async status(actor: Identity) {
      const [row] = await db.query<{ chat_id: string | null; linked_at: string | null }>(
        "SELECT chat_id,linked_at FROM telegram_links WHERE user_id=$1 AND organization_id=$2",
        [actor.userId, actor.organizationId],
      );
      return { configured: alertsConfigured(), linked: !!row?.chat_id, linkedAt: row?.linked_at ?? null };
    },
    /** One-time deep link t.me/<bot>?start=<code>; also (re)registers the webhook. */
    async link(actor: Identity, locale: Locale) {
      if (!alertsConfigured()) throw new AppError(503, "ALERTS_NOT_CONFIGURED");
      const origin = appOrigin();
      let username: string;
      try {
        const me = await bot("getMe", {});
        username = String(me.username ?? "");
        if (origin.startsWith("https://"))
          await bot("setWebhook", {
            url: origin + "/api/telegram/alerts",
            secret_token: alertWebhookSecret(),
            allowed_updates: ["message", "callback_query"],
          });
      } catch {
        throw new AppError(502, "PROVIDER_UNAVAILABLE");
      }
      if (!/^\w{5,64}$/.test(username)) throw new AppError(502, "PROVIDER_UNAVAILABLE");
      const code = newToken().slice(0, 48);
      await db.query(
        `INSERT INTO telegram_links(user_id,organization_id,code_hash,code_expires_at,locale) VALUES($1,$2,$3,now()+interval '15 minutes',$4)
         ON CONFLICT(user_id,organization_id) DO UPDATE SET code_hash=excluded.code_hash,code_expires_at=excluded.code_expires_at,locale=excluded.locale`,
        [actor.userId, actor.organizationId, digest(code), locale],
      );
      return { url: `https://t.me/${username}?start=${code}` };
    },
    async unlink(actor: Identity) {
      await db.query("DELETE FROM telegram_links WHERE user_id=$1 AND organization_id=$2", [
        actor.userId,
        actor.organizationId,
      ]);
    },
    async test(actor: Identity) {
      const [row] = await db.query<{ chat_id: string | null; locale: Locale }>(
        "SELECT chat_id,locale FROM telegram_links WHERE user_id=$1 AND organization_id=$2",
        [actor.userId, actor.organizationId],
      );
      if (!row?.chat_id) throw new AppError(409, "TELEGRAM_NOT_LINKED");
      try {
        await say(row.chat_id, L[asLocale(row.locale)].test);
      } catch {
        throw new AppError(502, "PROVIDER_UNAVAILABLE");
      }
    },
    /** Webhook from Telegram for the alert bot. */
    async handle(raw: string, headers: Headers) {
      if (!alertsConfigured() || !equalSecret(alertWebhookSecret(), headers.get("x-telegram-bot-api-secret-token") ?? ""))
        throw new AppError(403, "INVALID_SIGNATURE");
      let update;
      try {
        update = JSON.parse(raw);
      } catch {
        throw new AppError(400, "INVALID_INPUT");
      }
      if (update.callback_query) return void (await callback(update.callback_query));
      const m = update.message;
      if (!m || m.chat?.type !== "private" || m.from?.is_bot || typeof m.text !== "string") return;
      const chatId = String(m.chat.id);
      const text: string = m.text.trim();
      const start = /^\/start(?:\s+([a-f0-9]{48}))?$/.exec(text);
      if (start?.[1]) {
        const [row] = await db.query<{ locale: Locale; company: string }>(
          `UPDATE telegram_links t SET chat_id=$2,linked_at=now(),code_hash=NULL,code_expires_at=NULL FROM organizations o WHERE o.id=t.organization_id AND t.code_hash=$1 AND t.code_expires_at>now() RETURNING t.locale,o.name AS company`,
          [digest(start[1]), chatId],
        );
        const lang = asLocale(row?.locale ?? (m.from?.language_code === "uk" ? "uk" : m.from?.language_code === "en" ? "en" : "ru"));
        await say(chatId, row ? L[lang].linked.replace("{company}", row.company) : L[lang].badCode).catch(() => {});
        return;
      }
      if (text === "/stop") {
        await db.query("UPDATE telegram_links SET chat_id=NULL,linked_at=NULL WHERE chat_id=$1", [chatId]);
        await say(chatId, L.ru.stopped).catch(() => {});
        return;
      }
      await say(chatId, L.ru.hello).catch(() => {});
    },
    /** Alert about a new booking request. Returns the number of chats reached. */
    async booking(appointmentId: string, assignedTo: string | null) {
      if (!alertsConfigured()) return 0;
      const info = await bookings.describe(appointmentId);
      if (!info) return 0;
      const rows = await chats(info.organizationId, assignedTo);
      if (!rows.length) return 0;
      const history = await bookings.history(
        { userId: "", organizationId: info.organizationId, role: "owner", name: "", email: "" },
        { phone: info.appointment.customerPhone, conversationId: info.appointment.conversationId ?? undefined },
      );
      return fanOut(rows, (l) => [
        bookingAlertText(info.appointment, info.company, info.timeZone, l, history),
        bookingButtons(info.appointment, l),
      ]);
    },
    /** Alert that a conversation waits for a person. */
    async handoff(conversationId: string) {
      if (!alertsConfigured()) return 0;
      const [c] = await db.query<{
        organization_id: string;
        assigned_to: string | null;
        visitor_name: string;
        channel: string;
        company: string;
        last: string | null;
      }>(
        `SELECT c.organization_id,c.assigned_to,c.visitor_name,c.channel,o.name AS company,(SELECT content FROM messages WHERE conversation_id=c.id AND sender='visitor' ORDER BY created_at DESC LIMIT 1) AS last FROM conversations c JOIN organizations o ON o.id=c.organization_id WHERE c.id=$1`,
        [conversationId],
      );
      if (!c) return 0;
      const rows = await chats(c.organization_id, c.assigned_to);
      return fanOut(rows, (l) => [
        [
          `${L[l].handoff} — ${c.company}`,
          `👤 ${clip(c.visitor_name || "—", 80)} · ${channelName[c.channel] ?? c.channel}`,
          c.last ? `«${clip(c.last, 400)}»` : "",
        ]
          .filter(Boolean)
          .join("\n"),
        { inline_keyboard: [openButton(l, `/inbox/${conversationId}`)].filter((r) => r.length) },
      ]);
    },
    /** Alert that a next-service reminder needs a phone call. */
    async followup(followupId: string) {
      if (!alertsConfigured()) return 0;
      const f = await bookings.describeFollowup(followupId);
      if (!f) return 0;
      const rows = await chats(f.organization_id, null);
      return fanOut(rows, (l) => [
        [
          `${L[l].followup} — ${f.company}`,
          `👤 ${clip(f.customer_name || "—", 80)}`,
          f.customer_phone && `📞 ${clip(f.customer_phone, 40)}`,
          f.vehicle?.vehicle && `🚗 ${clip(vehicleLabel(f.vehicle, ", "), 120)}`,
          `🔧 ${clip(f.service_title || "—", 120)} · ${new Intl.DateTimeFormat(intl[l], { timeZone: f.timezone, day: "numeric", month: "long", year: "numeric" }).format(new Date(f.starts_at))}`,
        ]
          .filter(Boolean)
          .join("\n"),
        { inline_keyboard: [openButton(l, "/appointments")].filter((r) => r.length) },
      ]);
    },
  };
}
