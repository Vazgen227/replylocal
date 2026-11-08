import type { Provider } from "../lib/omni-schemas";
import { AppError } from "./errors";
export type Credentials = {
  accessToken: string;
  appSecret: string;
  verifyToken: string;
  hookSecret: string;
};
export type Settings = {
  accountId?: string;
  telegramMode?: "bot" | "business";
  businessUserId?: string;
};
export type Incoming = {
  externalId: string;
  externalKey: string;
  name: string;
  contact: string;
  text: string;
  timestamp: number;
  destination: { chatId: string; businessConnectionId?: string };
  attachment: boolean;
};
export type Receipt = { id: string; status: "delivered" | "read" | "failed" };
export class ChannelFailure extends Error {
  constructor(
    public code: string,
    public retryable = false,
    public uncertain = false,
  ) {
    super(code);
  }
}
function version() {
  const v = process.env.META_API_VERSION ?? "v24.0";
  if (!/^v\d+\.0$/.test(v)) throw new AppError(503, "META_VERSION_INVALID");
  return v;
}
function safeId(value: unknown) {
  const s = String(value ?? "");
  if (!s || s.length > 200 || !/^[-\w:+/=.@]+$/.test(s))
    throw new AppError(400, "INVALID_INPUT");
  return s;
}
// Requests are sent only to fixed official provider hosts. No customer-controlled URLs.
export async function providerRequest(
  url: string,
  init: RequestInit,
  fetcher: typeof fetch = fetch,
) {
  let response: Response;
  try {
    response = await fetcher(url, {
      ...init,
      signal: AbortSignal.timeout(12000),
    });
  } catch {
    throw new ChannelFailure("NETWORK_UNCERTAIN", false, true);
  }
  if (response.status === 429) throw new ChannelFailure("RATE_LIMITED", true);
  if (response.status >= 500)
    throw new ChannelFailure("PROVIDER_UNCERTAIN", false, true);
  if (!response.ok)
    throw new ChannelFailure("PROVIDER_HTTP_" + response.status);
  try {
    const raw = await response.text();
    return JSON.parse(
      raw.replace(/("message_token"\s*:\s*)(\d{16,})/g, '$1"$2"'),
    );
  } catch {
    throw new ChannelFailure("INVALID_PROVIDER_RESPONSE", false, true);
  }
}
function json(body: unknown) {
  return JSON.stringify(body);
}
export async function verifyConnection(
  provider: Provider,
  creds: Credentials,
  settings: Settings,
  fetcher: typeof fetch = fetch,
) {
  if (provider === "telegram") {
    const data = await providerRequest(
      `https://api.telegram.org/bot${creds.accessToken}/getMe`,
      {},
      fetcher,
    );
    if (!data.ok || !data.result?.id)
      throw new ChannelFailure("INVALID_CREDENTIALS");
    return {
      id: String(data.result.id),
      name: String(data.result.username ?? data.result.first_name),
    };
  }
  if (provider === "viber") {
    const data = await providerRequest(
      "https://chatapi.viber.com/pa/get_account_info",
      {
        method: "POST",
        headers: {
          "X-Viber-Auth-Token": creds.accessToken,
          "Content-Type": "application/json",
        },
        body: "{}",
      },
      fetcher,
    );
    if (data.status !== 0 || !data.id)
      throw new ChannelFailure("INVALID_CREDENTIALS");
    return { id: String(data.id), name: String(data.name) };
  }
  const id = safeId(settings.accountId);
  const base =
    provider === "whatsapp"
      ? "https://graph.facebook.com"
      : "https://graph.instagram.com";
  const fields =
    provider === "whatsapp"
      ? "id,display_phone_number,verified_name"
      : "user_id,username";
  const target = provider === "instagram" ? "me" : id;
  const data = await providerRequest(
    `${base}/${version()}/${target}?fields=${fields}`,
    { headers: { Authorization: `Bearer ${creds.accessToken}` } },
    fetcher,
  );
  const discovered = String(data.user_id ?? data.id ?? "");
  if (discovered !== id) throw new ChannelFailure("ACCOUNT_MISMATCH");
  return {
    id: discovered,
    name: String(
      data.verified_name ??
        data.display_phone_number ??
        data.username ??
        discovered,
    ),
  };
}
export async function setProviderWebhook(
  provider: Provider,
  creds: Credentials,
  url: string,
  fetcher: typeof fetch = fetch,
) {
  if (provider === "telegram") {
    const data = await providerRequest(
      `https://api.telegram.org/bot${creds.accessToken}/setWebhook`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: json({
          url,
          secret_token: creds.hookSecret,
          allowed_updates: [
            "message",
            "business_message",
            "business_connection",
            "deleted_business_messages",
          ],
        }),
      },
      fetcher,
    );
    if (!data.ok) throw new ChannelFailure("WEBHOOK_REJECTED");
  } else if (provider === "viber") {
    const data = await providerRequest(
      "https://chatapi.viber.com/pa/set_webhook",
      {
        method: "POST",
        headers: {
          "X-Viber-Auth-Token": creds.accessToken,
          "Content-Type": "application/json",
        },
        body: json({
          url,
          event_types: ["delivered", "seen", "failed", "conversation_started"],
          send_name: true,
          send_photo: false,
        }),
      },
      fetcher,
    );
    if (data.status !== 0) throw new ChannelFailure("WEBHOOK_REJECTED");
  }
}
export async function sendChannel(
  provider: Provider,
  creds: Credentials,
  settings: Settings,
  destination: Incoming["destination"],
  text: string,
  fetcher: typeof fetch = fetch,
): Promise<string> {
  const to = safeId(destination.chatId);
  if (provider === "telegram") {
    const data = await providerRequest(
      `https://api.telegram.org/bot${creds.accessToken}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: json({
          chat_id: to,
          text,
          ...(destination.businessConnectionId
            ? { business_connection_id: destination.businessConnectionId }
            : {}),
        }),
      },
      fetcher,
    );
    if (!data.ok)
      throw new ChannelFailure(
        "TELEGRAM_" + String(data.error_code ?? "ERROR"),
        data.error_code === 429,
      );
    return String(data.result.message_id);
  }
  if (provider === "viber") {
    const data = await providerRequest(
      "https://chatapi.viber.com/pa/send_message",
      {
        method: "POST",
        headers: {
          "X-Viber-Auth-Token": creds.accessToken,
          "Content-Type": "application/json",
        },
        body: json({
          receiver: to,
          type: "text",
          text,
          sender: { name: "ReplyLocal" },
        }),
      },
      fetcher,
    );
    if (data.status !== 0) throw new ChannelFailure("VIBER_" + data.status);
    return String(data.message_token);
  }
  const base =
      provider === "whatsapp"
        ? "https://graph.facebook.com"
        : "https://graph.instagram.com",
    id = safeId(settings.accountId);
  const body =
    provider === "whatsapp"
      ? {
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to,
          type: "text",
          text: { body: text, preview_url: false },
        }
      : { recipient: { id: to }, message: { text } };
  const data = await providerRequest(
    `${base}/${version()}/${id}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${creds.accessToken}`,
        "Content-Type": "application/json",
      },
      body: json(body),
    },
    fetcher,
  );
  const messageId = data.messages?.[0]?.id ?? data.message_id;
  if (!messageId) throw new ChannelFailure("MISSING_MESSAGE_ID", false, true);
  return String(messageId);
}
// Provider JSON is untrusted. Normalize only the fields used by the application.
export function parseChannel(
  provider: Provider,
  raw: string,
  settings: Settings,
): { incoming: Incoming[]; receipts: Receipt[] } {
  const data = JSON.parse(
    raw.replace(/("message_token"\s*:\s*)(\d{16,})/g, '$1"$2"'),
  );
  const incoming: Incoming[] = [],
    receipts: Receipt[] = [];
  const push = (v: Incoming) => {
    if (incoming.length >= 50) throw new AppError(413, "TOO_MANY_EVENTS");
    v.externalId = safeId(v.externalId);
    v.destination.chatId = safeId(v.destination.chatId);
    v.name =
      Array.from(String(v.name).toWellFormed()).slice(0, 100).join("") ||
      "Customer";
    v.contact = Array.from(String(v.contact).toWellFormed())
      .slice(0, 150)
      .join("");
    v.text = Array.from(String(v.text).toWellFormed()).slice(0, 2000).join("");
    if (!Number.isFinite(v.timestamp)) v.timestamp = Date.now();
    v.timestamp = Math.min(v.timestamp, Date.now());
    incoming.push(v);
  };
  if (provider === "telegram") {
    const m = data.business_message ?? data.message;
    if (!m || m.from?.is_bot) return { incoming, receipts };
    if (settings.telegramMode === "business" && !m.business_connection_id)
      return { incoming, receipts };
    if (settings.telegramMode !== "business" && m.business_connection_id)
      return { incoming, receipts };
    if (m.chat?.type !== "private") return { incoming, receipts };
    const chatId = String(m.chat.id),
      bc = m.business_connection_id;
    const text =
      m.text ?? m.caption ?? "[Attachment: operator review required]";
    push({
      externalId: String(data.update_id),
      externalKey: (bc ? bc + ":" : "") + chatId,
      name:
        [m.from?.first_name, m.from?.last_name].filter(Boolean).join(" ") ||
        "Telegram customer",
      contact: m.from?.username ? "@" + m.from.username : "",
      text,
      timestamp: Number(m.date) * 1000,
      destination: { chatId, ...(bc ? { businessConnectionId: bc } : {}) },
      attachment: !m.text,
    });
  } else if (provider === "viber") {
    if (["delivered", "seen", "failed"].includes(data.event))
      receipts.push({
        id: String(data.message_token),
        status:
          data.event === "seen"
            ? "read"
            : data.event === "failed"
              ? "failed"
              : "delivered",
      });
    if (data.event === "message") {
      const m = data.message ?? {},
        id = String(data.sender?.id ?? "");
      push({
        externalId: String(data.message_token),
        externalKey: id,
        name: data.sender?.name ?? "Viber customer",
        contact: "",
        text: m.text ?? "[Attachment: operator review required]",
        timestamp: Number(data.timestamp),
        destination: { chatId: id },
        attachment: m.type !== "text",
      });
    }
  } else if (provider === "whatsapp") {
    for (const entry of data.entry ?? [])
      for (const change of entry.changes ?? []) {
        const v = change.value ?? {};
        if (String(v.metadata?.phone_number_id) !== settings.accountId)
          continue;
        for (const st of v.statuses ?? [])
          if (["delivered", "read", "failed"].includes(st.status))
            receipts.push({ id: String(st.id), status: st.status });
        for (const m of v.messages ?? []) {
          const from = String(m.from ?? ""),
            contact = (v.contacts ?? []).find(
              (c: { wa_id: string }) => c.wa_id === from,
            );
          push({
            externalId: String(m.id),
            externalKey: from,
            name: contact?.profile?.name ?? from,
            contact: from,
            text:
              m.text?.body ??
              m.button?.text ??
              m.interactive?.button_reply?.title ??
              "[Attachment: operator review required]",
            timestamp: Number(m.timestamp) * 1000,
            destination: { chatId: from },
            attachment:
              m.type !== "text" &&
              m.type !== "button" &&
              m.type !== "interactive",
          });
        }
      }
  } else {
    for (const entry of data.entry ?? []) {
      if (String(entry.id) !== settings.accountId) continue;
      for (const event of entry.messaging ?? []) {
        if (event.message?.is_echo) continue;
        if (event.read?.mid)
          receipts.push({ id: String(event.read.mid), status: "read" });
        if (!event.message?.mid) continue;
        const from = String(event.sender?.id ?? "");
        if (String(event.recipient?.id) !== settings.accountId) continue;
        push({
          externalId: String(event.message.mid),
          externalKey: from,
          name: "Instagram " + from,
          contact: "",
          text: event.message.text ?? "[Attachment: operator review required]",
          timestamp: Number(event.timestamp),
          destination: { chatId: from },
          attachment: !event.message.text,
        });
      }
    }
  }
  return { incoming, receipts };
}
