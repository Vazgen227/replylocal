import { randomUUID } from "node:crypto";
import type { z } from "zod";
import type { Database, Identity, Query } from "./store";
import { AppError } from "./errors";
import {
  computeSlots,
  mergeIntake,
  normalizeBookingSettings,
  withinHours,
  zonedToUtc,
  type Appointment,
  type AppointmentAction,
  type BookingSettings,
  type Intake,
  type createAppointmentSchema,
} from "../lib/booking";
import { serviceStationTemplate } from "../lib/templates/service-station";

type Locale = "ru" | "uk" | "en";
const intl: Record<Locale, string> = { ru: "ru-RU", uk: "uk-UA", en: "en-GB" };
const texts: Record<
  Locale,
  {
    confirmed: string;
    rescheduled: string;
    cancelled: string;
    reminder: string;
    address: string;
  }
> = {
  ru: {
    confirmed: "Ваша запись подтверждена: {when}.",
    rescheduled: "Ваша запись перенесена: {when}.",
    cancelled: "Ваша запись на {when} отменена. Напишите нам, если хотите выбрать другое время.",
    reminder: "Напоминаем о визите завтра: {when}. Если планы изменились, пожалуйста, напишите нам.",
    address: " Адрес: {address}.",
  },
  uk: {
    confirmed: "Ваш запис підтверджено: {when}.",
    rescheduled: "Ваш запис перенесено: {when}.",
    cancelled: "Ваш запис на {when} скасовано. Напишіть нам, якщо бажаєте обрати інший час.",
    reminder: "Нагадуємо про візит завтра: {when}. Якщо плани змінилися, будь ласка, напишіть нам.",
    address: " Адреса: {address}.",
  },
  en: {
    confirmed: "Your appointment is confirmed: {when}.",
    rescheduled: "Your appointment has been moved to {when}.",
    cancelled: "Your appointment on {when} is cancelled. Message us to choose another time.",
    reminder: "A reminder about your visit tomorrow: {when}. If your plans changed, please let us know.",
    address: " Address: {address}.",
  },
};
export function formatWhen(date: Date, locale: Locale, timeZone: string) {
  return new Intl.DateTimeFormat(intl[locale], {
    timeZone,
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
const selectAppointment = `a.id,a.conversation_id AS "conversationId",a.service_entry_id AS "serviceEntryId",a.service_title AS "serviceTitle",a.starts_at AS "startsAt",a.duration_minutes AS "durationMinutes",a.status,a.customer_name AS "customerName",a.customer_phone AS "customerPhone",a.vehicle,a.note,a.source,a.version,c.channel,a.created_at AS "createdAt"`;
const ACTIVE = "('requested','confirmed')";
function writer(actor: Identity) {
  if (actor.role === "agent") throw new AppError(403, "FORBIDDEN");
}
type Row = Record<string, unknown>;
function toAppointment(r: Row): Appointment {
  return {
    ...(r as unknown as Appointment),
    startsAt: new Date(r.startsAt as string).toISOString(),
    createdAt: new Date(r.createdAt as string).toISOString(),
  };
}

export function createBookingStore(db: Database) {
  async function organization(q: Query, org: string, lock = false) {
    const [row] = await q<{
      booking_settings: unknown;
      booking_version: number;
      timezone: string;
      currency: string;
    }>(
      `SELECT booking_settings,booking_version,timezone,currency FROM organizations WHERE id=$1${lock ? " FOR UPDATE" : ""}`,
      [org],
    );
    if (!row) throw new AppError(404, "NOT_FOUND");
    return {
      settings: normalizeBookingSettings(row.booking_settings),
      version: row.booking_version,
      timeZone: row.timezone,
      currency: row.currency,
    };
  }
  async function busy(q: Query, org: string, from: Date, to: Date, except?: string) {
    const rows = await q<{ starts_at: Date; duration_minutes: number }>(
      `SELECT starts_at,duration_minutes FROM appointments WHERE organization_id=$1 AND status IN ${ACTIVE} AND starts_at<$3 AND starts_at+duration_minutes*interval '1 minute'>$2 AND ($4::uuid IS NULL OR id<>$4)`,
      [org, from, to, except ?? null],
    );
    return rows.map((r) => ({
      startsAt: new Date(r.starts_at),
      durationMinutes: r.duration_minutes,
    }));
  }
  /** Serialized by the organization row lock held by the caller's transaction. */
  async function assertCapacity(
    q: Query,
    org: string,
    settings: BookingSettings,
    timeZone: string,
    start: Date,
    duration: number,
    except?: string,
  ) {
    if (!withinHours(settings, timeZone, start, duration))
      throw new AppError(409, "OUTSIDE_HOURS");
    const end = new Date(start.getTime() + duration * 60000);
    const overlapping = await busy(q, org, start, end, except);
    if (overlapping.length >= settings.bays) throw new AppError(409, "SLOT_TAKEN");
  }
  async function message(
    q: Query,
    conversationId: string | null,
    kind: "confirmed" | "rescheduled" | "cancelled" | "reminder",
    start: Date,
    timeZone: string,
    address: string,
  ) {
    if (!conversationId) return;
    const [c] = await q<{ locale: Locale; status: string }>(
      "SELECT locale,status FROM conversations WHERE id=$1",
      [conversationId],
    );
    if (!c) return;
    const t = texts[c.locale] ?? texts.ru;
    const content =
      t[kind].replace("{when}", formatWhen(start, c.locale, timeZone)) +
      (address && kind !== "cancelled" ? t.address.replace("{address}", address) : "");
    // The existing message trigger queues delivery to the original channel.
    await q(
      "INSERT INTO messages(id,conversation_id,sender,content) VALUES($1,$2,'operator',$3)",
      [randomUUID(), conversationId, content],
    );
    await q(
      "UPDATE conversations SET updated_at=now(),version=version+1 WHERE id=$1",
      [conversationId],
    );
  }
  async function scheduleReminder(
    q: Query,
    org: string,
    id: string,
    start: Date,
    settings: BookingSettings,
  ) {
    if (!settings.reminders) return;
    const at = new Date(start.getTime() - 24 * 3600 * 1000);
    if (at.getTime() < Date.now() + 15 * 60000) return;
    await q(
      "INSERT INTO background_jobs(id,key,organization_id,kind,payload,run_at) VALUES($1,$2,$3,'reminder',$4::jsonb,$5) ON CONFLICT(key) DO NOTHING",
      [
        randomUUID(),
        `reminder:${id}:${start.getTime()}`,
        org,
        JSON.stringify({ id, startsAt: start.toISOString() }),
        at,
      ],
    );
  }
  async function stage(q: Query, conversationId: string | null, sql: string, params: unknown[] = []) {
    if (!conversationId) return;
    await q(
      `UPDATE conversations SET ${sql},version=version+1,outcome_version=outcome_version+1 WHERE id=$1`,
      [conversationId, ...params],
    );
  }
  async function own(q: Query, actor: Identity, id: string) {
    const [row] = await q<Row>(
      `SELECT ${selectAppointment} FROM appointments a LEFT JOIN conversations c ON c.id=a.conversation_id WHERE a.id=$1 AND a.organization_id=$2 FOR UPDATE OF a`,
      [id, actor.organizationId],
    );
    if (!row) throw new AppError(404, "NOT_FOUND");
    return toAppointment(row);
  }
  async function serviceTitle(q: Query, org: string, entryId: string | null) {
    if (!entryId) return { title: "", duration: null as number | null };
    const [e] = await q<{ title: string; duration_minutes: number | null }>(
      "SELECT title,duration_minutes FROM knowledge_entries WHERE id=$1 AND organization_id=$2",
      [entryId, org],
    );
    if (!e) throw new AppError(400, "INVALID_SERVICE");
    return { title: e.title, duration: e.duration_minutes };
  }

  return {
    async settings(actor: Identity) {
      const o = await organization(db.query, actor.organizationId);
      return { settings: o.settings, version: o.version, timeZone: o.timeZone };
    },
    async saveSettings(actor: Identity, settings: BookingSettings, version: number) {
      writer(actor);
      const rows = await db.query(
        "UPDATE organizations SET booking_settings=$2::jsonb,booking_version=booking_version+1 WHERE id=$1 AND booking_version=$3 RETURNING booking_version",
        [actor.organizationId, JSON.stringify(settings), version],
      );
      if (!rows.length) throw new AppError(409, "CONFLICT");
    },
    async slots(actor: Identity, day: string | undefined, duration: number | undefined) {
      const o = await organization(db.query, actor.organizationId);
      const now = new Date();
      const horizonEnd = new Date(now.getTime() + (o.settings.horizonDays + 2) * 86400000);
      return {
        timeZone: o.timeZone,
        slots: computeSlots(
          o.settings,
          o.timeZone,
          await busy(db.query, actor.organizationId, now, horizonEnd),
          now,
          { fromDay: day, days: day ? 1 : 7, duration },
        ),
      };
    },
    async list(actor: Identity, from: Date, to: Date): Promise<Appointment[]> {
      const rows = await db.query<Row>(
        `SELECT ${selectAppointment} FROM appointments a LEFT JOIN conversations c ON c.id=a.conversation_id WHERE a.organization_id=$1 AND a.starts_at>=$2 AND a.starts_at<$3 ORDER BY a.starts_at,a.created_at LIMIT 500`,
        [actor.organizationId, from, to],
      );
      return rows.map(toAppointment);
    },
    async forConversation(actor: Identity, conversationId: string) {
      const [c] = await db.query<{ intake: Intake; visitor_name: string; visitor_contact: string }>(
        "SELECT intake,visitor_name,visitor_contact FROM conversations WHERE id=$1 AND organization_id=$2",
        [conversationId, actor.organizationId],
      );
      if (!c) throw new AppError(404, "NOT_FOUND");
      const o = await organization(db.query, actor.organizationId);
      const rows = await db.query<Row>(
        `SELECT ${selectAppointment} FROM appointments a LEFT JOIN conversations c ON c.id=a.conversation_id WHERE a.conversation_id=$1 AND a.organization_id=$2 ORDER BY a.starts_at DESC LIMIT 20`,
        [conversationId, actor.organizationId],
      );
      return {
        enabled: o.settings.enabled,
        timeZone: o.timeZone,
        defaultDuration: o.settings.defaultDuration,
        intake: c.intake ?? {},
        customerName: c.visitor_name,
        customerContact: c.visitor_contact,
        appointments: rows.map(toAppointment),
      };
    },
    async saveIntake(actor: Identity, conversationId: string, intake: Intake) {
      const rows = await db.query(
        "UPDATE conversations SET intake=$3::jsonb,version=version+1 WHERE id=$1 AND organization_id=$2 RETURNING id",
        [conversationId, actor.organizationId, JSON.stringify(mergeIntake({}, intake))],
      );
      if (!rows.length) throw new AppError(404, "NOT_FOUND");
    },
    async create(actor: Identity, input: z.infer<typeof createAppointmentSchema>) {
      return db.transaction(async (q) => {
        const o = await organization(q, actor.organizationId, true);
        if (input.conversationId) {
          const [c] = await q(
            "SELECT id FROM conversations WHERE id=$1 AND organization_id=$2",
            [input.conversationId, actor.organizationId],
          );
          if (!c) throw new AppError(404, "NOT_FOUND");
        }
        const service = await serviceTitle(q, actor.organizationId, input.serviceEntryId);
        const start = new Date(input.startsAt);
        if (start.getTime() < Date.now() - 3600000) throw new AppError(400, "IN_PAST");
        if (!input.force)
          await assertCapacity(q, actor.organizationId, o.settings, o.timeZone, start, input.durationMinutes);
        const id = randomUUID();
        await q(
          `INSERT INTO appointments(id,organization_id,conversation_id,service_entry_id,service_title,starts_at,duration_minutes,status,customer_name,customer_phone,vehicle,note,source,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12,'operator',$13)`,
          [
            id,
            actor.organizationId,
            input.conversationId,
            input.serviceEntryId,
            service.title,
            start,
            input.durationMinutes,
            input.status,
            input.customerName,
            input.customerPhone,
            JSON.stringify(mergeIntake({}, input.vehicle)),
            input.note,
            actor.userId,
          ],
        );
        if (input.status === "confirmed") {
          await stage(q, input.conversationId, "lead_stage=CASE WHEN lead_stage='new' THEN 'qualified' ELSE lead_stage END");
          await message(q, input.conversationId, "confirmed", start, o.timeZone, o.settings.address);
          await scheduleReminder(q, actor.organizationId, id, start, o.settings);
        }
        return { id };
      });
    },
    async act(actor: Identity, id: string, input: AppointmentAction) {
      await db.transaction(async (q) => {
        const o = await organization(q, actor.organizationId, true);
        const a = await own(q, actor, id);
        if (a.version !== input.version) throw new AppError(409, "CONFLICT");
        const start = new Date(a.startsAt);
        const set = async (status: string, extra = "", params: unknown[] = []) =>
          q(
            `UPDATE appointments SET status=$2${extra},version=version+1,updated_at=now() WHERE id=$1`,
            [id, status, ...params],
          );
        switch (input.action) {
          case "confirm": {
            if (a.status !== "requested") throw new AppError(409, "INVALID_STATE");
            if (!input.force)
              await assertCapacity(q, actor.organizationId, o.settings, o.timeZone, start, a.durationMinutes, id);
            await set("confirmed");
            await stage(q, a.conversationId, "lead_stage=CASE WHEN lead_stage='new' THEN 'qualified' ELSE lead_stage END");
            if (input.notify)
              await message(q, a.conversationId, "confirmed", start, o.timeZone, o.settings.address);
            await scheduleReminder(q, actor.organizationId, id, start, o.settings);
            break;
          }
          case "reschedule": {
            if (!["requested", "confirmed"].includes(a.status))
              throw new AppError(409, "INVALID_STATE");
            const next = new Date(input.startsAt);
            if (next.getTime() < Date.now() - 3600000) throw new AppError(400, "IN_PAST");
            if (!input.force)
              await assertCapacity(q, actor.organizationId, o.settings, o.timeZone, next, input.durationMinutes, id);
            await set(a.status, ",starts_at=$3,duration_minutes=$4", [next, input.durationMinutes]);
            if (a.status === "confirmed") {
              if (input.notify)
                await message(q, a.conversationId, "rescheduled", next, o.timeZone, o.settings.address);
              await scheduleReminder(q, actor.organizationId, id, next, o.settings);
            }
            break;
          }
          case "cancel": {
            if (!["requested", "confirmed"].includes(a.status))
              throw new AppError(409, "INVALID_STATE");
            await set("cancelled");
            if (input.notify)
              await message(q, a.conversationId, "cancelled", start, o.timeZone, "");
            break;
          }
          case "no_show": {
            if (a.status !== "confirmed") throw new AppError(409, "INVALID_STATE");
            await set("no_show");
            await stage(q, a.conversationId, "lead_stage=CASE WHEN lead_stage='won' THEN lead_stage ELSE 'lost' END,outcome_at=COALESCE(outcome_at,now())");
            break;
          }
          case "complete": {
            if (!["confirmed", "requested"].includes(a.status))
              throw new AppError(409, "INVALID_STATE");
            await set("done");
            // A finished visit is the sale: the channel report fills itself.
            await stage(
              q,
              a.conversationId,
              "lead_stage='won',deal_value=$2,gross_profit=$3,outcome_at=CASE WHEN lead_stage<>'won' OR outcome_at IS NULL THEN now() ELSE outcome_at END",
              [input.amount, input.grossProfit],
            );
            break;
          }
        }
      });
    },
    /** Context for the assistant: free slots in the company's local time. */
    async aiContext(org: string) {
      const o = await organization(db.query, org);
      if (!o.settings.enabled) return null;
      const now = new Date();
      const days = Math.min(7, o.settings.horizonDays);
      const slots = computeSlots(
        o.settings,
        o.timeZone,
        await busy(db.query, org, now, new Date(now.getTime() + (days + 2) * 86400000)),
        now,
        { days },
      );
      const local = new Intl.DateTimeFormat("en-CA", {
        timeZone: o.timeZone,
        dateStyle: "short",
        timeStyle: "short",
        hourCycle: "h23",
      }).format(now);
      return {
        now: local,
        timeZone: o.timeZone,
        address: o.settings.address,
        slots: slots.map((s) => s.local),
      };
    },
    /**
     * Applies the assistant's structured output inside the caller's transaction.
     * Intake is merged field by field; a booking request becomes a preliminary
     * appointment only if the slot is still free. Returns the created id, if any.
     */
    async applyAssistant(
      q: Query,
      org: string,
      conversationId: string,
      intake: Record<string, unknown> | null | undefined,
      request: { slot: string; serviceId: string | null } | null | undefined,
    ) {
      const [c] = await q<{ intake: Intake; visitor_name: string; visitor_contact: string }>(
        "SELECT intake,visitor_name,visitor_contact FROM conversations WHERE id=$1 AND organization_id=$2",
        [conversationId, org],
      );
      if (!c) return { created: null as string | null, rejected: false };
      const merged = intake ? mergeIntake(c.intake ?? {}, intake) : (c.intake ?? {});
      if (intake)
        await q("UPDATE conversations SET intake=$2::jsonb WHERE id=$1", [
          conversationId,
          JSON.stringify(merged),
        ]);
      if (!request || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(request.slot))
        return { created: null, rejected: false };
      const o = await organization(q, org, true);
      if (!o.settings.enabled) return { created: null, rejected: true };
      const [day, time] = request.slot.split("T");
      const start = zonedToUtc(day, time, o.timeZone);
      if (start.getTime() < Date.now() + o.settings.minNoticeMinutes * 60000)
        return { created: null, rejected: true };
      let service = { title: "", duration: null as number | null },
        serviceId: string | null = null;
      if (request.serviceId) {
        try {
          service = await serviceTitle(q, org, request.serviceId);
          serviceId = request.serviceId;
        } catch {
          /* An unknown id from the model is ignored, never trusted. */
        }
      }
      const duration = service.duration ?? o.settings.defaultDuration;
      try {
        await assertCapacity(q, org, o.settings, o.timeZone, start, duration);
      } catch {
        return { created: null, rejected: true };
      }
      const [existing] = await q<{ id: string }>(
        `SELECT id FROM appointments WHERE conversation_id=$1 AND status='requested' AND starts_at>now() ORDER BY created_at DESC LIMIT 1 FOR UPDATE`,
        [conversationId],
      );
      if (existing) {
        await q(
          "UPDATE appointments SET starts_at=$2,duration_minutes=$3,service_entry_id=$4,service_title=$5,vehicle=$6::jsonb,customer_phone=COALESCE(NULLIF($7,''),customer_phone),version=version+1,updated_at=now() WHERE id=$1",
          [existing.id, start, duration, serviceId, service.title, JSON.stringify(merged), merged.phone ?? ""],
        );
        return { created: existing.id, rejected: false };
      }
      const id = randomUUID();
      await q(
        `INSERT INTO appointments(id,organization_id,conversation_id,service_entry_id,service_title,starts_at,duration_minutes,status,customer_name,customer_phone,vehicle,source) VALUES($1,$2,$3,$4,$5,$6,$7,'requested',$8,$9,$10::jsonb,'ai')`,
        [
          id,
          org,
          conversationId,
          serviceId,
          service.title,
          start,
          duration,
          c.visitor_name,
          merged.phone || c.visitor_contact || "",
          JSON.stringify(merged),
        ],
      );
      return { created: id, rejected: false };
    },
    /** Background job: send the reminder if the visit is still confirmed at that time. */
    async remind(payload: { id?: string; startsAt?: string }) {
      if (!payload.id) return;
      await db.transaction(async (q) => {
        const [a] = await q<{
          organization_id: string;
          conversation_id: string | null;
          status: string;
          starts_at: Date;
        }>(
          "SELECT organization_id,conversation_id,status,starts_at FROM appointments WHERE id=$1 FOR UPDATE",
          [payload.id],
        );
        if (
          !a ||
          a.status !== "confirmed" ||
          new Date(a.starts_at).toISOString() !== payload.startsAt ||
          new Date(a.starts_at).getTime() < Date.now()
        )
          return;
        const o = await organization(q, a.organization_id);
        if (!o.settings.reminders) return;
        await message(q, a.conversation_id, "reminder", new Date(a.starts_at), o.timeZone, o.settings.address);
      });
    },
    async applyTemplate(actor: Identity, locale: Locale) {
      writer(actor);
      return db.transaction(async (q) => {
        const o = await organization(q, actor.organizationId, true);
        const existing = new Set(
          (
            await q<{ title: string }>(
              "SELECT lower(title) AS title FROM knowledge_entries WHERE organization_id=$1",
              [actor.organizationId],
            )
          ).map((r) => r.title),
        );
        const [count] = await q<{ count: number }>(
          "SELECT count(*)::int AS count FROM knowledge_entries WHERE organization_id=$1",
          [actor.organizationId],
        );
        let added = 0;
        for (const entry of serviceStationTemplate(locale)) {
          if (existing.has(entry.title.toLowerCase())) continue;
          if (count.count + added >= 1000) throw new AppError(409, "KNOWLEDGE_LIMIT");
          await q(
            "INSERT INTO knowledge_entries(id,organization_id,kind,title,content,price,currency,duration_minutes,sku) VALUES($1,$2,$3,$4,$5,NULL,$6,$7,'')",
            [
              randomUUID(),
              actor.organizationId,
              entry.kind,
              entry.title,
              entry.content,
              ["UAH", "USD", "EUR", "PLN"].includes(o.currency) ? o.currency : "UAH",
              entry.durationMinutes,
            ],
          );
          added++;
        }
        await q(
          "INSERT INTO audit_events(organization_id,actor_id,action,entity_id) VALUES($1,$2,'knowledge.template',NULL)",
          [actor.organizationId, actor.userId],
        );
        return { added };
      });
    },
  };
}
