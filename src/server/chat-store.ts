import { randomUUID } from "node:crypto";
import type { Database, Identity, Query } from "./store";
import { createStore } from "./store";
import { aiEntitlement } from "./entitlements";
import { AppError } from "./errors";
import { newToken, digest } from "./passwords";
import { retrieveKnowledge } from "./retrieval";
import type { AIProvider } from "./ai-provider";
import type {
  ChatConfig,
  Thread,
  ThreadSummary,
  ChatStats,
} from "../lib/chat-schemas";
import type { z } from "zod";
import type { chatConfigSchema, startChatSchema } from "../lib/chat-schemas";
const notes = {
  ru: {
    waiting:
      "Вопрос передан оператору. Ответ появится в этом чате, когда сотрудник подключится. Если вопрос срочный, свяжитесь с компанией напрямую.",
    failed:
      "Не удалось подготовить автоматический ответ. Вопрос сохранён для оператора.",
    welcome: "Здравствуйте! Задайте вопрос о наших услугах или товарах.",
  },
  uk: {
    waiting:
      "Питання передано оператору. Відповідь з’явиться тут, коли працівник підключиться. Якщо питання термінове, зв’яжіться з компанією напряму.",
    failed:
      "Не вдалося підготувати автоматичну відповідь. Питання збережено для оператора.",
    welcome: "Вітаємо! Запитайте про наші послуги або товари.",
  },
  en: {
    waiting:
      "Your question is saved for an operator. Their reply will appear here when a team member joins. For urgent questions, contact the business directly.",
    failed:
      "An automatic reply could not be prepared. Your question is saved for an operator.",
    welcome: "Hello! Ask us about our services or products.",
  },
};
function writer(actor: Identity) {
  if (actor.role === "agent") throw new AppError(403, "FORBIDDEN");
}
export function createChatStore(
  db: Database,
  provider: AIProvider,
  configured: () => boolean,
) {
  const base = createStore(db);
  const columns = `id,channel,assigned_to AS "assignedTo",lead_stage AS "leadStage",visitor_name AS "visitorName",visitor_contact AS "visitorContact",locale,status,mode,version,(processing_id IS NOT NULL AND processing_until>now()) AS busy,updated_at AS "updatedAt"`;
  async function event(q: Query, org: string, id: string, code: string) {
    await q(
      "INSERT INTO chat_events(organization_id,conversation_id,code) VALUES($1,$2,$3)",
      [org, id, code],
    );
  }
  async function messages(q: Query, id: string) {
    return q(
      'SELECT * FROM (SELECT id,sender,content,sources,created_at AS "createdAt" FROM messages WHERE conversation_id=$1 ORDER BY created_at DESC,id DESC LIMIT 250) recent ORDER BY "createdAt",id',
      [id],
    );
  }
  async function snapshot(
    id: string,
    org?: string,
    token?: string,
  ): Promise<Thread> {
    const [row] = await db.query(
      `SELECT ${columns},(processing_id IS NOT NULL AND processing_until<=now()) AS stalled FROM conversations WHERE id=$1 AND ${org ? "organization_id=$2" : "token_hash=$2 AND expires_at>now()"}`,
      [id, org ?? digest(token ?? "")],
    );
    if (!row) throw new AppError(404, "NOT_FOUND");
    if (row.stalled) {
      await db.transaction(async (q) => {
        const [expired] = await q<{
          organization_id: string;
          locale: "ru" | "uk" | "en";
        }>(
          "UPDATE conversations SET mode='human',processing_id=NULL,processing_until=NULL,version=version+1,updated_at=now() WHERE id=$1 AND processing_id IS NOT NULL AND processing_until<=now() RETURNING organization_id,locale",
          [id],
        );
        if (expired) {
          await q(
            "INSERT INTO messages(id,conversation_id,sender,content) VALUES($1,$2,'system',$3)",
            [randomUUID(), id, notes[expired.locale].failed],
          );
          await event(q, expired.organization_id, id, "ai.interrupted");
        }
      });
      return snapshot(id, org, token);
    }
    Reflect.deleteProperty(row, "stalled");
    return {
      ...row,
      messages: await messages(db.query, id),
    } as unknown as Thread;
  }
  async function ensure(actor: Identity) {
    await db.query(
      "INSERT INTO chat_configs(organization_id,public_id) VALUES($1,$2) ON CONFLICT(organization_id) DO NOTHING",
      [actor.organizationId, randomUUID()],
    );
  }
  async function publicConfig(publicId: string) {
    const [row] = await db.query(
      `SELECT c.public_id AS "publicId",c.welcome,c.auto_reply AS "autoReply",o.name AS "companyName" FROM chat_configs c JOIN organizations o ON o.id=c.organization_id WHERE c.public_id=$1 AND c.enabled=true`,
      [publicId],
    );
    if (!row) throw new AppError(404, "CHAT_DISABLED");
    return row;
  }
  return {
    async config(actor: Identity): Promise<ChatConfig> {
      await ensure(actor);
      const [row] = await db.query(
        `SELECT c.public_id AS "publicId",c.enabled,c.auto_reply AS "autoReply",c.welcome,c.daily_limit AS "dailyLimit",c.version,o.name AS "companyName" FROM chat_configs c JOIN organizations o ON o.id=c.organization_id WHERE c.organization_id=$1`,
        [actor.organizationId],
      );
      return {
        ...row,
        appUrl: process.env.APP_URL ?? "",
        aiConfigured: configured(),
      } as ChatConfig;
    },
    async saveConfig(actor: Identity, input: z.infer<typeof chatConfigSchema>) {
      writer(actor);
      await ensure(actor);
      const rows = await db.query(
        "UPDATE chat_configs SET enabled=$1,auto_reply=$2,welcome=$3,daily_limit=$4,version=version+1 WHERE organization_id=$5 AND version=$6 RETURNING public_id",
        [
          input.enabled,
          input.autoReply,
          input.welcome,
          input.dailyLimit,
          actor.organizationId,
          input.version,
        ],
      );
      if (!rows.length) throw new AppError(409, "CONFLICT");
    },
    publicConfig,
    async start(input: z.infer<typeof startChatSchema>) {
      if (input.website) throw new AppError(400, "INVALID_INPUT");
      const token = newToken(),
        id = randomUUID();
      await db.transaction(async (q) => {
        const [row] = await q<{
          organization_id: string;
          auto_reply: boolean;
          welcome: string;
        }>(
          "SELECT organization_id,auto_reply,welcome FROM chat_configs WHERE public_id=$1 AND enabled=true",
          [input.publicId],
        );
        if (!row) throw new AppError(404, "CHAT_DISABLED");
        // Bound anonymous session creation per company, shared by all application instances.
        const [rate] = await q<{ hits: number }>(
          `INSERT INTO rate_limits(key,hits,expires_at) VALUES($1,1,now()+interval '1 hour') ON CONFLICT(key) DO UPDATE SET hits=CASE WHEN rate_limits.expires_at<=now() THEN 1 ELSE rate_limits.hits+1 END,expires_at=CASE WHEN rate_limits.expires_at<=now() THEN excluded.expires_at ELSE rate_limits.expires_at END RETURNING hits`,
          [digest("chat-start:" + row.organization_id)],
        );
        if (rate.hits > 100) throw new AppError(429, "RATE_LIMITED");
        await q(
          "INSERT INTO conversations(id,organization_id,token_hash,visitor_name,visitor_contact,locale,mode,attribution) VALUES($1,$2,$3,$4,$5,$6,$7,$8::jsonb)",
          [
            id,
            row.organization_id,
            digest(token),
            input.name,
            input.contact,
            input.locale,
            row.auto_reply ? "ai" : "human",
            JSON.stringify(input.attribution ?? {}),
          ],
        );
        await q(
          "INSERT INTO messages(id,conversation_id,sender,content) VALUES($1,$2,'system',$3)",
          [randomUUID(), id, row.welcome || notes[input.locale].welcome],
        );
        await event(q, row.organization_id, id, "conversation.created");
      });
      return { token, thread: await snapshot(id, undefined, token) };
    },
    async visitorThread(id: string, token: string) {
      return snapshot(id, undefined, token);
    },
    async post(
      id: string,
      token: string,
      clientId: string,
      text: string,
      trustedOrganization?: string,
      forceHuman = false,
    ) {
      const job = randomUUID();
      const request = await db.transaction(async (q) => {
        const [conv] = await q<{
          organization_id: string;
          locale: "ru" | "uk" | "en";
          mode: string;
          status: string;
          busy: boolean;
        }>(
          `SELECT organization_id,locale,mode,status,(processing_id IS NOT NULL AND processing_until>now()) AS busy FROM conversations WHERE id=$1 AND ${trustedOrganization ? "organization_id=$2 AND channel<>'website'" : "token_hash=$2 AND expires_at>now()"} FOR UPDATE`,
          [id, trustedOrganization ?? digest(token)],
        );
        if (!conv) throw new AppError(404, "NOT_FOUND");
        if (
          (
            await q(
              "SELECT id FROM messages WHERE conversation_id=$1 AND client_id=$2",
              [id, clientId],
            )
          ).length
        )
          return null;
        if (conv.status === "closed") throw new AppError(409, "CHAT_CLOSED");
        if (conv.busy) throw new AppError(409, "CHAT_BUSY");
        const [config] = await q<{
          enabled: boolean;
          auto_reply: boolean;
          daily_limit: number;
        }>(
          "SELECT enabled,auto_reply,daily_limit FROM chat_configs WHERE organization_id=$1",
          [conv.organization_id],
        );
        if (!config || (!trustedOrganization && !config.enabled))
          throw new AppError(404, "CHAT_DISABLED");
        const [count] = await q<{ count: number }>(
          "SELECT count(*)::int AS count FROM messages WHERE conversation_id=$1",
          [id],
        );
        if (!trustedOrganization && count.count >= 200)
          throw new AppError(409, "CHAT_LIMIT");
        await q(
          "INSERT INTO messages(id,conversation_id,client_id,sender,content) VALUES($1,$2,$3,'visitor',$4)",
          [randomUUID(), id, clientId, text],
        );
        let useAI = conv.mode === "ai" && config.auto_reply && !forceHuman;
        let reason = "operator.requested";
        if (/оператор|человек|людин|менеджер|operator|human|person/i.test(text))
          useAI = false;
        if (useAI && !configured()) {
          useAI = false;
          reason = "ai.not_configured";
        }
        const entitlement = await aiEntitlement(q, conv.organization_id);
        if (useAI && entitlement === 0) {
          useAI = false;
          reason = "ai.subscription_required";
        }
        if (useAI) {
          await q("SELECT pg_advisory_xact_lock(723491863)");
          const [global] = await q<{ count: number }>(
            "SELECT COALESCE(sum(attempts),0)::int AS count FROM ai_usage WHERE day=(now() AT TIME ZONE 'UTC')::date",
          );
          const cap = Number(process.env.AI_GLOBAL_DAILY_LIMIT) || 1000;
          const attempts =
            global.count >= cap
              ? []
              : await q(
                  `INSERT INTO ai_usage(organization_id,attempts) VALUES($1,1) ON CONFLICT(organization_id,day) DO UPDATE SET attempts=ai_usage.attempts+1 WHERE ai_usage.attempts<$2 RETURNING attempts`,
                  [
                    conv.organization_id,
                    Math.min(config.daily_limit, entitlement),
                  ],
                );
          if (!attempts.length) {
            useAI = false;
            reason = "ai.daily_limit";
          }
        }
        await q(
          `UPDATE conversations SET updated_at=now(),version=version+1,mode=$2,processing_id=$3,processing_until=CASE WHEN $3::uuid IS NULL THEN NULL ELSE now()+interval '45 seconds' END WHERE id=$1`,
          [id, useAI ? "ai" : "human", useAI ? job : null],
        );
        if (!useAI) {
          if (conv.mode === "ai") {
            await q(
              "INSERT INTO messages(id,conversation_id,sender,content) VALUES($1,$2,'system',$3)",
              [randomUUID(), id, notes[conv.locale].waiting],
            );
            await event(q, conv.organization_id, id, reason);
          }
          return null;
        }
        return conv;
      });
      if (!request) return snapshot(id, trustedOrganization, token);
      let answer: string,
        sources: Array<{ id: string; title: string }> = [],
        handoff = false,
        inputTokens = 0,
        outputTokens = 0,
        code = "ai.replied";
      try {
        const actor: Identity = {
          userId: "",
          organizationId: request.organization_id,
          role: "owner",
          name: "",
          email: "",
        };
        const workspace = await base.workspace(actor);
        const thread = await snapshot(id, trustedOrganization, token);
        const entries = retrieveKnowledge(
          workspace.entries,
          thread.messages
            .filter((m) => m.sender === "visitor")
            .slice(-3)
            .map((m) => m.content)
            .join("\n"),
        );
        if (!entries.length) {
          answer = notes[request.locale].waiting;
          handoff = true;
          code = "ai.no_knowledge";
        } else {
          const result = await provider({
            companyName: workspace.organization.name,
            instructions: workspace.organization.aiSettings.systemPrompt,
            tone: workspace.organization.aiSettings.tone,
            locale: request.locale,
            entries,
            history: thread.messages.filter((m) => m.sender !== "system"),
          });
          const allowed = new Set(entries.map((e) => e.id));
          if (
            result.sourceIds.some((id) => !allowed.has(id)) ||
            (!result.handoff && !result.sourceIds.length)
          )
            throw new Error("AI_UNGROUNDED");
          answer = result.answer;
          handoff = result.handoff;
          inputTokens = result.inputTokens;
          outputTokens = result.outputTokens;
          sources = entries
            .filter((e) => result.sourceIds.includes(e.id))
            .map((e) => ({ id: e.id, title: e.title }));
          if (handoff) code = "ai.handoff";
        }
      } catch (error) {
        const diagnostic =
          error instanceof Error && /^AI_[A-Z0-9_]+$/.test(error.message)
            ? error.message
            : "INVALID_OR_UNAVAILABLE_OUTPUT";
        console.error("[chat-ai]", request.organization_id, diagnostic);
        answer = notes[request.locale].failed;
        handoff = true;
        code = "ai.failed";
      }
      await db.transaction(async (q) => {
        // An operator may take over while generation is in flight. Discard the stale answer.
        const changed = await q(
          "UPDATE conversations SET mode=$2,processing_id=NULL,processing_until=NULL,updated_at=now(),version=version+1 WHERE id=$1 AND processing_id=$3 AND mode='ai' AND status='open' RETURNING id",
          [id, handoff ? "human" : "ai", job],
        );
        await q(
          "UPDATE ai_usage SET input_tokens=input_tokens+$2,output_tokens=output_tokens+$3 WHERE organization_id=$1 AND day=(now() AT TIME ZONE 'UTC')::date",
          [request.organization_id, inputTokens, outputTokens],
        );
        if (!changed.length) return;
        await q(
          "INSERT INTO messages(id,conversation_id,sender,content,sources) VALUES($1,$2,$3,$4,$5::jsonb)",
          [
            randomUUID(),
            id,
            code === "ai.failed" || code === "ai.no_knowledge"
              ? "system"
              : "assistant",
            answer,
            JSON.stringify(sources),
          ],
        );
        await event(q, request.organization_id, id, code);
      });
      return snapshot(id, trustedOrganization, token);
    },
    async handoff(id: string, token: string) {
      await db.transaction(async (q) => {
        const [conv] = await q<{
          organization_id: string;
          locale: "ru" | "uk" | "en";
        }>(
          "UPDATE conversations SET mode='human',processing_id=NULL,processing_until=NULL,version=version+1,updated_at=now() WHERE id=$1 AND token_hash=$2 AND expires_at>now() AND status='open' RETURNING organization_id,locale",
          [id, digest(token)],
        );
        if (!conv) throw new AppError(404, "NOT_FOUND");
        await q(
          "INSERT INTO messages(id,conversation_id,sender,content) VALUES($1,$2,'system',$3)",
          [randomUUID(), id, notes[conv.locale].waiting],
        );
        await event(q, conv.organization_id, id, "visitor.handoff");
      });
      return snapshot(id, undefined, token);
    },
    async list(
      actor: Identity,
      filter: {
        search?: string;
        channel?: string;
        status?: string;
        mine?: boolean;
        page?: number;
        limit?: number;
      } = {},
    ): Promise<ThreadSummary[]> {
      return (await db.query(
        `SELECT ${columns},COALESCE((SELECT content FROM messages m WHERE m.conversation_id=c.id ORDER BY created_at DESC,id DESC LIMIT 1),'') AS "lastMessage" FROM conversations c WHERE organization_id=$1
      AND ($2='' OR visitor_name ILIKE $2 OR visitor_contact ILIKE $2 OR EXISTS(SELECT 1 FROM messages m WHERE m.conversation_id=c.id AND m.content ILIKE $2))
      AND ($3='all' OR channel=$3) AND ($4='all' OR ($4='waiting' AND mode='human' AND status='open') OR ($4='closed' AND status='closed'))
      AND ($5::uuid IS NULL OR assigned_to=$5) ORDER BY updated_at DESC,id LIMIT $6 OFFSET $7`,
        [
          actor.organizationId,
          filter.search ? "%" + filter.search + "%" : "",
          filter.channel ?? "all",
          filter.status ?? "all",
          filter.mine ? actor.userId : null,
          filter.limit ?? 100,
          (filter.page ?? 0) * 25,
        ],
      )) as unknown as ThreadSummary[];
    },
    async thread(actor: Identity, id: string) {
      return snapshot(id, actor.organizationId);
    },
    async action(
      actor: Identity,
      id: string,
      version: number,
      action: "takeover" | "resume" | "close" | "reopen",
    ) {
      await db.transaction(async (q) => {
        const rows = await q(
          `UPDATE conversations SET mode=$4,status=$5,processing_id=NULL,processing_until=NULL,version=version+1,updated_at=now() WHERE id=$1 AND organization_id=$2 AND version=$3 RETURNING id`,
          [
            id,
            actor.organizationId,
            version,
            action === "resume" ? "ai" : "human",
            action === "close" ? "closed" : "open",
          ],
        );
        if (!rows.length) {
          const own = await q(
            "SELECT id FROM conversations WHERE id=$1 AND organization_id=$2",
            [id, actor.organizationId],
          );
          throw new AppError(
            own.length ? 409 : 404,
            own.length ? "CONFLICT" : "NOT_FOUND",
          );
        }
        await event(q, actor.organizationId, id, "operator." + action);
      });
      return snapshot(id, actor.organizationId);
    },
    async reply(actor: Identity, id: string, clientId: string, text: string) {
      await db.transaction(async (q) => {
        const [conv] = await q<{ status: string }>(
          "SELECT status FROM conversations WHERE id=$1 AND organization_id=$2 FOR UPDATE",
          [id, actor.organizationId],
        );
        if (!conv) throw new AppError(404, "NOT_FOUND");
        if (
          (
            await q(
              "SELECT id FROM messages WHERE conversation_id=$1 AND client_id=$2",
              [id, clientId],
            )
          ).length
        )
          return;
        if (conv.status === "closed") throw new AppError(409, "CHAT_CLOSED");
        const [count] = await q<{ count: number }>(
          "SELECT count(*)::int AS count FROM messages WHERE conversation_id=$1",
          [id],
        );
        if (count.count >= 240) throw new AppError(409, "CHAT_LIMIT");
        await q(
          "INSERT INTO messages(id,conversation_id,client_id,sender,content) VALUES($1,$2,$3,'operator',$4)",
          [randomUUID(), id, clientId, text],
        );
        await q(
          "UPDATE conversations SET mode='human',processing_id=NULL,processing_until=NULL,version=version+1,updated_at=now() WHERE id=$1",
          [id],
        );
        await event(q, actor.organizationId, id, "operator.replied");
      });
      return snapshot(id, actor.organizationId);
    },
    async export(actor: Identity, id: string) {
      const thread = await snapshot(id, actor.organizationId);
      const history = await db.query(
        'SELECT id,sender,content,sources,created_at AS "createdAt" FROM messages WHERE conversation_id=$1 ORDER BY created_at,id',
        [id],
      );
      return { ...thread, messages: history };
    },
    async remove(actor: Identity, id: string) {
      writer(actor);
      await db.transaction(async (q) => {
        const [c] = await q<{
          connection_id: string | null;
          external_key: string | null;
        }>(
          "SELECT connection_id,external_key FROM conversations WHERE id=$1 AND organization_id=$2 FOR UPDATE",
          [id, actor.organizationId],
        );
        if (!c) throw new AppError(404, "NOT_FOUND");
        await q(
          "DELETE FROM background_jobs WHERE organization_id=$1 AND ((kind='notification' AND payload->>'id'=$2) OR (kind='delivery' AND payload->>'id' IN (SELECT id::text FROM delivery_outbox WHERE conversation_id=$2::uuid)) OR (kind='incoming' AND payload->>'id'=$3 AND payload->'event'->>'externalKey'=$4))",
          [actor.organizationId, id, c.connection_id, c.external_key],
        );
        if (c.connection_id)
          await q(
            "DELETE FROM inbound_events WHERE connection_id=$1 AND payload->>'externalKey'=$2",
            [c.connection_id, c.external_key],
          );
        await q(
          "DELETE FROM conversations WHERE id=$1 AND organization_id=$2",
          [id, actor.organizationId],
        );
      });
    },
    async stats(actor: Identity): Promise<ChatStats> {
      await ensure(actor);
      const [row] = await db.query(
        `SELECT count(*)::int AS total,count(*) FILTER(WHERE status='open')::int AS open,count(*) FILTER(WHERE status='open' AND mode='human')::int AS waiting,count(*) FILTER(WHERE status='closed')::int AS closed FROM conversations WHERE organization_id=$1`,
        [actor.organizationId],
      );
      const [counts] = await db.query(
        `SELECT count(*)::int AS messages,count(*) FILTER(WHERE m.sender='assistant')::int AS "aiReplies" FROM messages m JOIN conversations c ON c.id=m.conversation_id WHERE c.organization_id=$1`,
        [actor.organizationId],
      );
      const [usage] = await db.query(
        'SELECT attempts AS "attemptsToday",input_tokens AS "inputTokens",output_tokens AS "outputTokens" FROM ai_usage WHERE organization_id=$1 AND day=(now() AT TIME ZONE \'UTC\')::date',
        [actor.organizationId],
      );
      const [config] = await db.query(
        'SELECT daily_limit AS "dailyLimit",enabled AS "channelEnabled" FROM chat_configs WHERE organization_id=$1',
        [actor.organizationId],
      );
      const [connections] = await db.query<{ count: number }>(
        "SELECT count(*)::int AS count FROM channel_connections WHERE organization_id=$1 AND enabled=true",
        [actor.organizationId],
      );
      config.enabledConnections =
        connections.count + (config.channelEnabled ? 1 : 0);
      config.dailyLimit = Math.min(
        Number(config.dailyLimit),
        await aiEntitlement(db.query, actor.organizationId),
      );
      return {
        ...row,
        ...counts,
        attemptsToday: 0,
        inputTokens: 0,
        outputTokens: 0,
        ...usage,
        ...config,
      } as ChatStats;
    },
  };
}
