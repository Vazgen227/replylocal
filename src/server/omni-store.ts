import { randomUUID } from "node:crypto";
import type { z } from "zod";
import type { Database, Identity, Query } from "./store";
import { createStore } from "./store";
import type { createChatStore } from "./chat-store";
import { AppError } from "./errors";
import { digest, newToken } from "./passwords";
import { seal, unseal, equalSecret, validHmac } from "./crypto-secrets";
import { createBookingStore } from "./booking-store";
import {
  ChannelFailure,
  parseChannel,
  providerRequest,
  sendChannel,
  setProviderWebhook,
  verifyConnection,
  type Credentials,
  type Incoming,
  type Settings,
} from "./channels";
import type {
  Provider,
  Connection,
  Outcome,
  ChannelReport,
  connectionSchema,
  outcomeSchema,
  costSchema,
} from "../lib/omni-schemas";

type Row = {
  id: string;
  organization_id: string;
  provider: Provider;
  label: string;
  account_id: string | null;
  credentials: string;
  settings: Settings;
  enabled: boolean;
  version: number;
  verified_at: string | null;
  last_webhook_at: string | null;
  last_error: string | null;
};
type Job = {
  id: string;
  organization_id: string;
  kind: string;
  payload: {
    id?: string;
    event?: Incoming;
    to?: string;
    subject?: string;
    text?: string;
    booking?: string;
    startsAt?: string;
  };
  attempts: number;
  lock_token: string;
};
function admin(a: Identity) {
  if (a.role === "agent") throw new AppError(403, "FORBIDDEN");
}
const aad = (r: Pick<Row, "id" | "organization_id">) =>
  r.id + ":" + r.organization_id;
function appURL() {
  const url = new URL(process.env.APP_URL ?? "http://localhost");
  if (url.protocol !== "https:" && process.env.NODE_ENV === "production")
    throw new AppError(503, "HTTPS_REQUIRED");
  return url.origin;
}
export function emailConfigured() {
  return !!(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}
export async function sendEmail(
  to: string[],
  subject: string,
  text: string,
  key: string,
  fetcher: typeof fetch = fetch,
) {
  if (!emailConfigured()) throw new ChannelFailure("EMAIL_NOT_CONFIGURED");
  await providerRequest(
    "https://api.resend.com/emails",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
        "User-Agent": "ReplyLocal/0.4",
        "Idempotency-Key": key,
      },
      body: JSON.stringify({ from: process.env.EMAIL_FROM, to, subject, text }),
    },
    fetcher,
  );
}
export function createOmniStore(
  db: Database,
  chats: ReturnType<typeof createChatStore>,
  fetcher: typeof fetch = fetch,
) {
  const base = createStore(db);
  const bookings = createBookingStore(db);
  async function connection(id: string, org?: string) {
    const [r] = await db.query<Row>(
      "SELECT * FROM channel_connections WHERE id=$1" +
        (org ? " AND organization_id=$2" : ""),
      org ? [id, org] : [id],
    );
    if (!r) throw new AppError(404, "NOT_FOUND");
    return r;
  }
  const credentials = (r: Row) => unseal<Credentials>(r.credentials, aad(r));
  async function enqueue(
    q: Query,
    key: string,
    org: string,
    kind: string,
    payload: unknown,
  ) {
    await q(
      "INSERT INTO background_jobs(id,key,organization_id,kind,payload) VALUES($1,$2,$3,$4,$5::jsonb) ON CONFLICT(key) DO NOTHING",
      [randomUUID(), key, org, kind, JSON.stringify(payload)],
    );
  }
  async function own(q: Query, actor: Identity, id: string) {
    const [c] = await q(
      "SELECT * FROM conversations WHERE id=$1 AND organization_id=$2 FOR UPDATE",
      [id, actor.organizationId],
    );
    if (!c) throw new AppError(404, "NOT_FOUND");
    return c;
  }
  async function incoming(r: Row, event: Incoming, eventId: string) {
    const creds = credentials(r);
    if (r.provider === "telegram" && r.settings.telegramMode === "business") {
      const bc = event.destination.businessConnectionId;
      if (!bc) throw new ChannelFailure("BUSINESS_CONNECTION_MISSING");
      const data = await providerRequest(
        `https://api.telegram.org/bot${creds.accessToken}/getBusinessConnection?business_connection_id=${encodeURIComponent(bc)}`,
        {},
        fetcher,
      );
      if (
        !data.ok ||
        String(data.result?.user?.id) !== r.settings.businessUserId ||
        !data.result.is_enabled ||
        !(data.result.rights?.can_reply ?? data.result.can_reply)
      )
        throw new ChannelFailure("BUSINESS_CONNECTION_REJECTED");
    }
    const id = await db.transaction(async (q) => {
      await q("SELECT id FROM channel_connections WHERE id=$1 FOR UPDATE", [
        r.id,
      ]);
      const [known] = await q<{ id: string }>(
        "SELECT id FROM conversations WHERE connection_id=$1 AND external_key=$2",
        [r.id, event.externalKey],
      );
      if (known) {
        await q(
          "UPDATE conversations SET status='open',version=version+1,updated_at=now(),last_inbound_at=GREATEST(last_inbound_at,$2),destination=$3::jsonb WHERE id=$1",
          [
            known.id,
            new Date(event.timestamp),
            JSON.stringify(event.destination),
          ],
        );
        return known.id;
      }
      const id = randomUUID();
      await q(
        "INSERT INTO chat_configs(organization_id,public_id) VALUES($1,$2) ON CONFLICT(organization_id) DO NOTHING",
        [r.organization_id, randomUUID()],
      );
      const [org] = await q<{ currency: string }>(
        "SELECT currency FROM organizations WHERE id=$1",
        [r.organization_id],
      );
      await q(
        "INSERT INTO conversations(id,organization_id,token_hash,visitor_name,visitor_contact,locale,channel,connection_id,external_key,destination,last_inbound_at,deal_currency) VALUES($1,$2,$3,$4,$5,'ru',$6,$7,$8,$9::jsonb,$10,$11)",
        [
          id,
          r.organization_id,
          digest(newToken()),
          event.name,
          event.contact,
          r.provider,
          r.id,
          event.externalKey,
          JSON.stringify(event.destination),
          new Date(event.timestamp),
          ["UAH", "USD", "EUR", "PLN"].includes(org.currency)
            ? org.currency
            : "UAH",
        ],
      );
      return id;
    });
    await chats.post(
      id,
      "",
      eventId,
      event.text || "[Attachment]",
      r.organization_id,
      event.attachment,
    );
  }
  async function delivery(id: string) {
    const [row] = await db.query<{
      id: string;
      status: string;
      content: string;
      conversation_id: string;
      connection_id: string;
      destination: Incoming["destination"];
      last_inbound_at: Date;
      mode: string;
      sender: string;
    }>(
      `SELECT d.*,c.connection_id,c.destination,c.last_inbound_at,c.mode,m.sender FROM delivery_outbox d JOIN conversations c ON c.id=d.conversation_id JOIN messages m ON m.id=d.message_id WHERE d.id=$1`,
      [id],
    );
    if (
      !row ||
      [
        "sent",
        "delivered",
        "read",
        "cancelled",
        "uncertain",
        "failed",
      ].includes(row.status)
    )
      return;
    if (row.status === "sending") {
      await db.query(
        "UPDATE delivery_outbox SET status='uncertain',last_error='INTERRUPTED_SEND',lease_until=NULL WHERE id=$1",
        [id],
      );
      return;
    }
    const r = await connection(row.connection_id);
    if (!r.enabled) throw new ChannelFailure("CHANNEL_DISABLED", true);
    if (row.sender === "assistant" && row.mode === "human") {
      await db.query(
        "UPDATE delivery_outbox SET status='cancelled',last_error='OPERATOR_TAKEOVER' WHERE id=$1",
        [id],
      );
      return;
    }
    const earlier = await db.query(
      "SELECT id FROM delivery_outbox WHERE conversation_id=$1 AND seq<(SELECT seq FROM delivery_outbox WHERE id=$2) AND status IN ('pending','sending','uncertain') LIMIT 1",
      [row.conversation_id, id],
    );
    if (earlier.length)
      throw new ChannelFailure("WAITING_FOR_EARLIER_MESSAGE", true);
    if (
      (["whatsapp", "instagram"].includes(r.provider) ||
        (r.provider === "telegram" &&
          r.settings.telegramMode === "business")) &&
      Date.now() - new Date(row.last_inbound_at).getTime() > 24 * 3600 * 1000
    ) {
      await db.query(
        "UPDATE delivery_outbox SET status='failed',last_error='REPLY_WINDOW_CLOSED' WHERE id=$1",
        [id],
      );
      return;
    }
    const changed = await db.query(
      "UPDATE delivery_outbox SET status='sending',lease_until=now()+interval '90 seconds',updated_at=now() WHERE id=$1 AND status='pending' RETURNING id",
      [id],
    );
    if (!changed.length) return;
    try {
      const messageId = await sendChannel(
        r.provider,
        credentials(r),
        r.settings,
        row.destination,
        row.content,
        fetcher,
      );
      await db.query(
        "UPDATE delivery_outbox SET status='sent',provider_message_id=$2,lease_until=NULL,last_error=NULL,updated_at=now() WHERE id=$1",
        [id, messageId],
      );
    } catch (e) {
      const err =
        e instanceof ChannelFailure
          ? e
          : new ChannelFailure("SEND_FAILED", false, true);
      await db.query(
        "UPDATE delivery_outbox SET status=$2,last_error=$3,lease_until=NULL,updated_at=now() WHERE id=$1",
        [
          id,
          err.uncertain ? "uncertain" : err.retryable ? "pending" : "failed",
          err.code,
        ],
      );
      if (err.retryable) throw err;
    }
  }
  async function notify(job: Job) {
    const [c] = await db.query<{
      organization_id: string;
      assigned_to: string | null;
      mode: string;
      status: string;
      channel: string;
      visitor_name: string;
      name: string;
    }>(
      `SELECT c.*,o.name FROM conversations c JOIN organizations o ON o.id=c.organization_id WHERE c.id=$1`,
      [job.payload.id],
    );
    if (
      !c ||
      (c.mode !== "human" && !job.payload.booking) ||
      c.status !== "open"
    )
      return;
    const [prefs] = await db.query(
      "SELECT enabled FROM notification_preferences WHERE organization_id=$1",
      [c.organization_id],
    );
    if (prefs?.enabled === false) return;
    const recipients = await db.query<{ email: string }>(
      `SELECT u.email FROM memberships m JOIN users u ON u.id=m.user_id WHERE m.organization_id=$1 AND (CASE WHEN $2::uuid IS NOT NULL THEN m.user_id=$2 ELSE m.role IN ('owner','admin') END)`,
      [c.organization_id, c.assigned_to],
    );
    if (recipients.length)
      await sendEmail(
        recipients.map((v) => v.email),
        job.payload.booking
          ? `${c.name}: новая заявка на запись / new booking request`
          : `${c.name}: требуется ответ / reply needed`,
        `${c.visitor_name} · ${c.channel}\n${appURL()}/ru/inbox/${job.payload.id}\nОткройте кабинет, чтобы прочитать обращение и ответить.`,
        job.id,
        fetcher,
      );
  }
  return {
    async connections(actor: Identity): Promise<Connection[]> {
      const rows = await db.query<Row>(
        "SELECT * FROM channel_connections WHERE organization_id=$1 ORDER BY created_at",
        [actor.organizationId],
      );
      return rows.map((r) => ({
        id: r.id,
        provider: r.provider,
        label: r.label,
        accountId: r.account_id,
        enabled: r.enabled,
        verifiedAt: r.verified_at as string | null,
        lastWebhookAt: r.last_webhook_at as string | null,
        lastError: r.last_error as string | null,
        version: r.version,
        settings: r.settings,
        webhookUrl:
          appURL() +
          "/api/webhooks/" +
          (["whatsapp", "instagram"].includes(r.provider) &&
          process.env.META_VERIFY_TOKEN &&
          process.env.META_APP_SECRET &&
          equalSecret(credentials(r).appSecret, process.env.META_APP_SECRET)
            ? "meta"
            : r.id),
        ...(actor.role !== "agent"
          ? {
              verifyToken:
                ["whatsapp", "instagram"].includes(r.provider) &&
                process.env.META_VERIFY_TOKEN &&
                process.env.META_APP_SECRET &&
                equalSecret(
                  credentials(r).appSecret,
                  process.env.META_APP_SECRET,
                )
                  ? process.env.META_VERIFY_TOKEN
                  : credentials(r).verifyToken,
            }
          : {}),
      }));
    },
    async connect(
      actor: Identity,
      input: z.infer<typeof connectionSchema>,
      existingId?: string,
      version?: number,
    ) {
      admin(actor);
      const id = existingId ?? randomUUID();
      if (existingId) {
        const old = await connection(id, actor.organizationId);
        if (old.version !== version || old.provider !== input.provider)
          throw new AppError(409, "CONFLICT");
      }
      const creds: Credentials = {
        accessToken: input.accessToken,
        appSecret: input.appSecret || process.env.META_APP_SECRET || "",
        verifyToken: newToken(),
        hookSecret: newToken(),
      };
      if (
        ["whatsapp", "instagram"].includes(input.provider) &&
        !creds.appSecret
      )
        throw new AppError(503, "META_APP_NOT_CONFIGURED");
      const settings: Settings = {
        accountId: input.accountId,
        telegramMode: input.telegramMode,
        businessUserId: input.businessUserId,
      };
      // Fail before writing a token if encryption is misconfigured.
      const encrypted = seal(creds, id + ":" + actor.organizationId);
      let verified;
      try {
        verified = await verifyConnection(
          input.provider,
          creds,
          settings,
          fetcher,
        );
      } catch (e) {
        throw new AppError(
          422,
          e instanceof ChannelFailure ? e.code : "PROVIDER_UNAVAILABLE",
        );
      }
      settings.accountId = verified.id;
      try {
        if (existingId) {
          const changed = await db.query(
            "UPDATE channel_connections SET label=$1,account_id=$2,credentials=$3,settings=$4::jsonb,enabled=false,verified_at=now(),last_error=NULL,version=version+1 WHERE id=$5 AND organization_id=$6 AND version=$7 RETURNING id",
            [
              input.label,
              verified.id,
              encrypted,
              JSON.stringify(settings),
              id,
              actor.organizationId,
              version,
            ],
          );
          if (!changed.length) throw new AppError(409, "CONFLICT");
        } else
          await db.query(
            "INSERT INTO channel_connections(id,organization_id,provider,label,account_id,credentials,settings,verified_at) VALUES($1,$2,$3,$4,$5,$6,$7::jsonb,now())",
            [
              id,
              actor.organizationId,
              input.provider,
              input.label,
              verified.id,
              encrypted,
              JSON.stringify(settings),
            ],
          );
      } catch (e) {
        if ((e as { code: string }).code === "23505")
          throw new AppError(409, "CHANNEL_ALREADY_CONNECTED");
        throw e;
      }
      return { id };
    },
    async toggle(
      actor: Identity,
      id: string,
      enabled: boolean,
      version: number,
    ) {
      admin(actor);
      const r = await connection(id, actor.organizationId);
      if (r.version !== version) throw new AppError(409, "CONFLICT");
      if (enabled) {
        try {
          await verifyConnection(
            r.provider,
            credentials(r),
            r.settings,
            fetcher,
          );
          await setProviderWebhook(
            r.provider,
            credentials(r),
            appURL() + "/api/webhooks/" + id,
            fetcher,
          );
        } catch (e) {
          throw new AppError(
            422,
            e instanceof ChannelFailure ? e.code : "PROVIDER_UNAVAILABLE",
          );
        }
      }
      const rows = await db.query(
        "UPDATE channel_connections SET enabled=$1,version=version+1,last_error=NULL WHERE id=$2 AND organization_id=$3 AND version=$4 RETURNING id",
        [enabled, id, actor.organizationId, version],
      );
      if (!rows.length) throw new AppError(409, "CONFLICT");
    },
    async metaChallenge(
      mode: string | null,
      token: string | null,
      challenge: string | null,
    ) {
      const expected = process.env.META_VERIFY_TOKEN;
      if (
        !expected ||
        expected.length < 32 ||
        mode !== "subscribe" ||
        !token ||
        !equalSecret(expected, token)
      )
        throw new AppError(403, "INVALID_SIGNATURE");
      return challenge ?? "";
    },
    async ingestMeta(raw: string, headers: Headers) {
      const secret = process.env.META_APP_SECRET;
      if (
        !secret ||
        !validHmac(
          raw,
          secret,
          (headers.get("x-hub-signature-256") ?? "").replace(/^sha256=/, ""),
        )
      )
        throw new AppError(403, "INVALID_SIGNATURE");
      let data;
      try {
        data = JSON.parse(raw);
      } catch {
        throw new AppError(400, "INVALID_INPUT");
      }
      const wa: string[] = [],
        ig: string[] = [];
      for (const entry of data.entry ?? []) {
        if (ig.length + wa.length >= 50)
          throw new AppError(413, "TOO_MANY_EVENTS");
        if (data.object === "instagram") ig.push(String(entry.id));
        else
          for (const change of entry.changes ?? []) {
            if (wa.length >= 50) throw new AppError(413, "TOO_MANY_EVENTS");
            const id = change.value?.metadata?.phone_number_id;
            if (id) wa.push(String(id));
          }
      }
      const rows = await db.query<Row>(
        "SELECT * FROM channel_connections WHERE (provider='whatsapp' AND account_id=ANY($1::text[])) OR (provider='instagram' AND account_id=ANY($2::text[]))",
        [wa, ig],
      );
      let accepted = 0;
      for (const row of rows) {
        if (!equalSecret(credentials(row).appSecret, secret)) continue;
        accepted += (await this.ingest(row.id, raw, headers)).accepted;
      }
      return { accepted };
    },
    async challenge(
      id: string,
      mode: string | null,
      token: string | null,
      challenge: string | null,
    ) {
      const r = await connection(id);
      if (
        !["instagram", "whatsapp"].includes(r.provider) ||
        mode !== "subscribe" ||
        !token ||
        !equalSecret(credentials(r).verifyToken, token)
      )
        throw new AppError(403, "INVALID_SIGNATURE");
      return challenge ?? "";
    },
    async ingest(id: string, raw: string, headers: Headers) {
      const r = await connection(id),
        creds = credentials(r);
      const valid =
        r.provider === "telegram"
          ? equalSecret(
              creds.hookSecret,
              headers.get("x-telegram-bot-api-secret-token") ?? "",
            )
          : validHmac(
              raw,
              r.provider === "viber" ? creds.accessToken : creds.appSecret,
              (
                headers.get(
                  r.provider === "viber"
                    ? "x-viber-content-signature"
                    : "x-hub-signature-256",
                ) ?? ""
              ).replace(/^sha256=/, ""),
            );
      if (!valid) throw new AppError(403, "INVALID_SIGNATURE");
      let events;
      try {
        events = parseChannel(r.provider, raw, r.settings);
      } catch {
        throw new AppError(400, "INVALID_INPUT");
      }
      if (!r.enabled) return { accepted: 0 };
      await base.rateLimit("webhook:" + r.id, 5000, 86400);
      await db.transaction(async (q) => {
        await q(
          "UPDATE channel_connections SET last_webhook_at=now(),last_error=NULL WHERE id=$1",
          [id],
        );
        for (const receipt of events.receipts) {
          await q(
            `UPDATE delivery_outbox SET status=$3,updated_at=now() WHERE provider_message_id=$1 AND conversation_id IN (SELECT id FROM conversations WHERE connection_id=$2) AND (status='sent' OR (status='delivered' AND $3='read'))`,
            [receipt.id, id, receipt.status],
          );
        }
        for (const event of events.incoming) {
          const eventId = randomUUID();
          const rows = await q(
            "INSERT INTO inbound_events(id,connection_id,external_id,payload) VALUES($1,$2,$3,$4::jsonb) ON CONFLICT(connection_id,external_id) DO NOTHING RETURNING id",
            [eventId, id, event.externalId, JSON.stringify(event)],
          );
          if (rows.length)
            await enqueue(
              q,
              "incoming:" + eventId,
              r.organization_id,
              "incoming",
              { id: r.id, event, eventId },
            );
        }
      });
      return { accepted: events.incoming.length };
    },
    async runOne() {
      const token = randomUUID();
      const job = await db.transaction(async (q) => {
        const [j] = await q<Job>(
          "SELECT * FROM background_jobs WHERE (status='pending' AND run_at<=now()) OR (status='running' AND lease_until<now()) ORDER BY seq FOR UPDATE SKIP LOCKED LIMIT 1",
        );
        if (!j) return null;
        await q(
          "UPDATE background_jobs SET status='running',attempts=attempts+1,lock_token=$2,lease_until=now()+interval '90 seconds',updated_at=now() WHERE id=$1",
          [j.id, token],
        );
        return { ...j, attempts: j.attempts + 1, lock_token: token };
      });
      if (!job) return false;
      try {
        if (job.kind === "incoming") {
          const r = await connection(job.payload.id!);
          if (!r.enabled) throw new ChannelFailure("CHANNEL_DISABLED", true);
          await incoming(
            r,
            job.payload.event!,
            String((job.payload as unknown as { eventId: string }).eventId),
          );
        } else if (job.kind === "delivery") await delivery(job.payload.id!);
        else if (job.kind === "notification") await notify(job);
        else if (job.kind === "reminder") await bookings.remind(job.payload);
        else if (job.kind === "email") {
          const mail = unseal<{ to: string; subject: string; text: string }>(
            (job.payload as unknown as { encrypted: string }).encrypted,
            "mail:" + job.id,
          );
          await sendEmail([mail.to], mail.subject, mail.text, job.id, fetcher);
        }
        await db.query(
          "UPDATE background_jobs SET status='done',lease_until=NULL,last_error=NULL,payload=CASE WHEN kind='email' THEN '{}'::jsonb ELSE payload END,updated_at=now() WHERE id=$1 AND lock_token=$2",
          [job.id, token],
        );
      } catch (e) {
        const code =
          e instanceof ChannelFailure
            ? e.code
            : e instanceof AppError
              ? e.code
              : "JOB_FAILED";
        const retry =
          (e instanceof ChannelFailure && e.retryable) ||
          ["CHAT_BUSY", "SERVER_ERROR"].includes(code);
        const again = retry && job.attempts < 8;
        await db.query(
          "UPDATE background_jobs SET status=$3,run_at=now()+$4*interval '1 second',lease_until=NULL,last_error=$5,updated_at=now() WHERE id=$1 AND lock_token=$2",
          [
            job.id,
            token,
            again ? "pending" : "failed",
            Math.min(300, 5 * 2 ** job.attempts),
            code,
          ],
        );
        if (job.payload.id && job.kind === "incoming")
          await db.query(
            "UPDATE channel_connections SET last_error=$2 WHERE id=$1",
            [job.payload.id, code],
          );
      }
      return true;
    },
    async retryDelivery(actor: Identity, id: string) {
      await db.transaction(async (q) => {
        const [r] = await q<{ status: string }>(
          `SELECT d.status FROM delivery_outbox d JOIN conversations c ON c.id=d.conversation_id WHERE d.id=$1 AND c.organization_id=$2 FOR UPDATE OF d`,
          [id, actor.organizationId],
        );
        if (!r) throw new AppError(404, "NOT_FOUND");
        if (!["failed", "uncertain"].includes(r.status))
          throw new AppError(409, "CONFLICT");
        await q(
          "UPDATE delivery_outbox SET status='pending',last_error=NULL WHERE id=$1",
          [id],
        );
        await q(
          "UPDATE background_jobs SET status='pending',run_at=now(),attempts=0,lease_until=NULL WHERE key=$1",
          ["delivery:" + id],
        );
      });
    },
    async outcome(actor: Identity, id: string): Promise<Outcome> {
      const [c] = await db.query(
        `SELECT channel,lead_stage AS "leadStage",deal_value::float8 AS "dealValue",gross_profit::float8 AS "grossProfit",deal_currency AS "dealCurrency",next_step AS "nextStep",assigned_to AS "assignedTo",outcome_version AS version,attribution FROM conversations WHERE id=$1 AND organization_id=$2`,
        [id, actor.organizationId],
      );
      if (!c) throw new AppError(404, "NOT_FOUND");
      const notes = await db.query(
        `SELECT n.id,n.content,COALESCE(u.name,'—') AS name,n.created_at AS "createdAt" FROM conversation_notes n LEFT JOIN users u ON u.id=n.actor_id WHERE n.conversation_id=$1 ORDER BY n.created_at DESC LIMIT 100`,
        [id],
      );
      const deliveries = await db.query(
        'SELECT id,status,last_error AS "lastError",content FROM delivery_outbox WHERE conversation_id=$1 ORDER BY seq DESC LIMIT 50',
        [id],
      );
      return { ...c, notes, deliveries } as unknown as Outcome;
    },
    async saveOutcome(
      actor: Identity,
      id: string,
      v: z.infer<typeof outcomeSchema>,
    ) {
      await db.transaction(async (q) => {
        const c = await own(q, actor, id);
        if (c.outcome_version !== v.version)
          throw new AppError(409, "CONFLICT");
        if (
          actor.role === "agent" &&
          v.assignedTo !== actor.userId &&
          v.assignedTo !== c.assigned_to
        )
          throw new AppError(403, "FORBIDDEN");
        if (
          v.assignedTo &&
          !(
            await q(
              "SELECT user_id FROM memberships WHERE user_id=$1 AND organization_id=$2",
              [v.assignedTo, actor.organizationId],
            )
          ).length
        )
          throw new AppError(400, "INVALID_ASSIGNEE");
        await q(
          "UPDATE conversations SET lead_stage=$2,deal_value=$3,gross_profit=$4,deal_currency=$5,next_step=$6,assigned_to=$7,version=version+1,outcome_version=outcome_version+1,outcome_at=CASE WHEN $2 IN ('won','lost') AND (lead_stage<>$2 OR outcome_at IS NULL) THEN now() ELSE outcome_at END WHERE id=$1",
          [
            id,
            v.stage,
            v.value,
            v.grossProfit,
            v.currency,
            v.nextStep,
            v.assignedTo,
          ],
        );
      });
    },
    async note(actor: Identity, id: string, content: string) {
      await db.transaction(async (q) => {
        await own(q, actor, id);
        const [n] = await q<{ count: number }>(
          "SELECT count(*)::int AS count FROM conversation_notes WHERE conversation_id=$1",
          [id],
        );
        if (n.count >= 100) throw new AppError(409, "NOTES_LIMIT");
        await q(
          "INSERT INTO conversation_notes(id,conversation_id,actor_id,content) VALUES($1,$2,$3,$4)",
          [randomUUID(), id, actor.userId, content],
        );
      });
    },
    async report(actor: Identity, month: string) {
      const rows = await db.query(
        `SELECT channel,deal_currency AS currency,count(*)::int AS conversations,count(*) FILTER(WHERE lead_stage IN ('qualified','won'))::int AS qualified,count(*) FILTER(WHERE lead_stage='won')::int AS won,count(*) FILTER(WHERE lead_stage='lost')::int AS lost,COALESCE(sum(deal_value) FILTER(WHERE lead_stage='won'),0)::float8 AS revenue,COALESCE(sum(gross_profit) FILTER(WHERE lead_stage='won'),0)::float8 AS "grossProfit",count(gross_profit) FILTER(WHERE lead_stage='won')::int AS "profitRecorded" FROM conversations WHERE organization_id=$1 AND created_at>=$2::date AND created_at<$2::date+interval '1 month' GROUP BY channel,deal_currency`,
        [actor.organizationId, month],
      );
      const costs = await db.query<{
        channel: string;
        currency: string;
        amount: number;
        version: number;
      }>(
        "SELECT channel,currency,amount::float8 AS amount,version FROM channel_costs WHERE organization_id=$1 AND month=$2::date",
        [actor.organizationId, month],
      );
      const map = new Map(
        rows.map((r) => [
          r.channel + ":" + r.currency,
          {
            ...r,
            cost: 0,
            conversion: Number(r.conversations)
              ? (Number(r.won) / Number(r.conversations)) * 100
              : 0,
          },
        ]),
      );
      for (const cost of costs) {
        const key = cost.channel + ":" + cost.currency;
        const row = map.get(key) ?? {
          channel: cost.channel,
          currency: cost.currency,
          conversations: 0,
          qualified: 0,
          won: 0,
          lost: 0,
          revenue: 0,
          grossProfit: 0,
          profitRecorded: 0,
          cost: 0,
          conversion: 0,
        };
        row.cost = cost.amount;
        map.set(key, row);
      }
      return {
        month,
        rows: [...map.values()] as unknown as ChannelReport[],
        costs,
      };
    },
    async cost(actor: Identity, v: z.infer<typeof costSchema>) {
      admin(actor);
      const rows = await db.query(
        `INSERT INTO channel_costs(organization_id,channel,month,currency,amount) SELECT $1,$2,$3::date,$4,$5 WHERE $6=0 ON CONFLICT(organization_id,channel,month,currency) DO NOTHING RETURNING version`,
        [
          actor.organizationId,
          v.channel,
          v.month,
          v.currency,
          v.amount,
          v.version,
        ],
      );
      if (!rows.length) {
        const changed = await db.query(
          "UPDATE channel_costs SET amount=$5,version=version+1 WHERE organization_id=$1 AND channel=$2 AND month=$3::date AND currency=$4 AND version=$6 RETURNING version",
          [
            actor.organizationId,
            v.channel,
            v.month,
            v.currency,
            v.amount,
            v.version,
          ],
        );
        if (!changed.length) throw new AppError(409, "CONFLICT");
      }
    },
    async health(actor: Identity) {
      admin(actor);
      const jobs = await db.query(
        `SELECT kind,status,count(*)::int AS count FROM background_jobs WHERE organization_id=$1 AND status IN ('pending','running','failed') GROUP BY kind,status`,
        [actor.organizationId],
      );
      const failures = await db.query(
        `SELECT id,kind,last_error AS "lastError",updated_at AS "updatedAt" FROM background_jobs WHERE organization_id=$1 AND status='failed' ORDER BY updated_at DESC LIMIT 20`,
        [actor.organizationId],
      );
      return { jobs, failures, emailConfigured: emailConfigured() };
    },
    async retryJob(actor: Identity, id: string) {
      admin(actor);
      const rows = await db.query(
        "UPDATE background_jobs SET status='pending',run_at=now(),attempts=0,lease_until=NULL WHERE id=$1 AND organization_id=$2 AND status='failed' RETURNING id",
        [id, actor.organizationId],
      );
      if (!rows.length) throw new AppError(404, "NOT_FOUND");
    },
  };
}
