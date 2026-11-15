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
  type CustomerHistory,
  type Followup,
  type Intake,
  phoneKey,
  vehicleLabel,
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
    followup: string;
    followupVehicle: string;
    followupNextKm: string;
    followupEveryKm: string;
  }
> = {
  ru: {
    confirmed: "Ваша запись подтверждена: {when}.",
    rescheduled: "Ваша запись перенесена: {when}.",
    cancelled: "Ваша запись на {when} отменена. Напишите нам, если хотите выбрать другое время.",
    reminder: "Напоминаем о визите завтра: {when}. Если планы изменились, пожалуйста, напишите нам.",
    address: " Адрес: {address}.",
    followup:
      "Здравствуйте{name}! С последнего обслуживания{vehicle} в «{company}» прошло {months} мес. Рекомендуем плановое ТО{km}. Записать вас? Напишите удобный день — подберём свободное время.",
    followupVehicle: " вашего {vehicle}",
    followupNextKm: " — ориентировочно при пробеге {next} км",
    followupEveryKm: " — обычно каждые {km} км",
  },
  uk: {
    confirmed: "Ваш запис підтверджено: {when}.",
    rescheduled: "Ваш запис перенесено: {when}.",
    cancelled: "Ваш запис на {when} скасовано. Напишіть нам, якщо бажаєте обрати інший час.",
    reminder: "Нагадуємо про візит завтра: {when}. Якщо плани змінилися, будь ласка, напишіть нам.",
    address: " Адреса: {address}.",
    followup:
      "Вітаємо{name}! Від останнього обслуговування{vehicle} у «{company}» минуло {months} міс. Радимо планове ТО{km}. Записати вас? Напишіть зручний день — підберемо вільний час.",
    followupVehicle: " вашого {vehicle}",
    followupNextKm: " — орієнтовно при пробігу {next} км",
    followupEveryKm: " — зазвичай кожні {km} км",
  },
  en: {
    confirmed: "Your appointment is confirmed: {when}.",
    rescheduled: "Your appointment has been moved to {when}.",
    cancelled: "Your appointment on {when} is cancelled. Message us to choose another time.",
    reminder: "A reminder about your visit tomorrow: {when}. If your plans changed, please let us know.",
    address: " Address: {address}.",
    followup:
      "Hello{name}! It has been {months} months since the last service{vehicle} at {company}. It is time for routine maintenance{km}. Shall we book you in? Reply with a convenient day and we will find a free time.",
    followupVehicle: " of your {vehicle}",
    followupNextKm: " (around {next} km on the odometer)",
    followupEveryKm: " (usually every {km} km)",
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
const selectAppointment = `a.id,a.conversation_id AS "conversationId",a.service_entry_id AS "serviceEntryId",a.service_title AS "serviceTitle",a.starts_at AS "startsAt",a.duration_minutes AS "durationMinutes",a.status,a.customer_name AS "customerName",a.customer_phone AS "customerPhone",a.vehicle,a.note,a.source,a.version,c.channel,a.created_at AS "createdAt",a.amount::float8 AS amount,(SELECT count(*)::int FROM appointments h WHERE h.organization_id=a.organization_id AND h.id<>a.id AND h.status='done' AND h.starts_at<a.starts_at AND ((a.phone_key IS NOT NULL AND h.phone_key=a.phone_key) OR (a.conversation_id IS NOT NULL AND h.conversation_id=a.conversation_id))) AS visits`;
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
    amount: r.amount === null || r.amount === undefined ? null : Number(r.amount),
    visits: Number(r.visits ?? 0),
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
    await insertMessage(q, conversationId, content);
  }
  async function insertMessage(q: Query, conversationId: string, content: string) {
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
            await set("done", ",amount=$3", [input.amount]);
            const months = input.followUpMonths ?? o.settings.followUpMonths;
            if (months > 0) {
              const followupId = randomUUID();
              const created = await q<{ due_at: Date }>(
                "INSERT INTO service_followups(id,organization_id,appointment_id,conversation_id,due_at,months) VALUES($1,$2,$3,$4,GREATEST($5::timestamptz,now())+$6*interval '1 month',$6) ON CONFLICT(appointment_id) DO NOTHING RETURNING due_at",
                [followupId, actor.organizationId, id, a.conversationId, start, months],
              );
              if (created.length)
                await q(
                  "INSERT INTO background_jobs(id,key,organization_id,kind,payload,run_at) VALUES($1,$2,$3,'followup',$4::jsonb,$5) ON CONFLICT(key) DO NOTHING",
                  [randomUUID(), "followup:" + followupId, actor.organizationId, JSON.stringify({ id: followupId }), created[0].due_at],
                );
            }
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
    /** Earlier visits of the customer, matched by phone and by the chat itself. */
    async history(
      actor: Identity,
      by: { phone?: string; conversationId?: string },
    ): Promise<CustomerHistory> {
      const keys = new Set<string>();
      const key = phoneKey(by.phone);
      if (key) keys.add(key);
      if (by.conversationId) {
        const [c] = await db.query<{ intake: Intake; visitor_contact: string }>(
          "SELECT intake,visitor_contact FROM conversations WHERE id=$1 AND organization_id=$2",
          [by.conversationId, actor.organizationId],
        );
        if (!c) throw new AppError(404, "NOT_FOUND");
        for (const p of [c.intake?.phone, c.visitor_contact]) {
          const k = phoneKey(p);
          if (k) keys.add(k);
        }
        for (const r of await db.query<{ phone_key: string }>(
          "SELECT DISTINCT phone_key FROM appointments WHERE conversation_id=$1 AND organization_id=$2 AND phone_key IS NOT NULL",
          [by.conversationId, actor.organizationId],
        ))
          keys.add(r.phone_key);
      }
      const [org] = await db.query<{ currency: string }>(
        "SELECT currency FROM organizations WHERE id=$1",
        [actor.organizationId],
      );
      const empty: CustomerHistory = {
        visits: 0,
        total: 0,
        currency: org?.currency ?? "UAH",
        lastVisitAt: null,
        vehicles: [],
        appointments: [],
      };
      if (!keys.size && !by.conversationId) return empty;
      const rows = (
        await db.query<Row>(
          `SELECT ${selectAppointment} FROM appointments a LEFT JOIN conversations c ON c.id=a.conversation_id WHERE a.organization_id=$1 AND (a.phone_key=ANY($2::text[]) OR a.conversation_id=$3) ORDER BY a.starts_at DESC LIMIT 50`,
          [actor.organizationId, [...keys], by.conversationId ?? null],
        )
      ).map(toAppointment);
      const done = rows.filter((a) => a.status === "done");
      // "Skoda Octavia 2015" and "Skoda Octavia · 2015" are the same car.
      const seen = new Map<string, string>();
      for (const label of rows.map((a) => vehicleLabel(a.vehicle)).filter(Boolean)) {
        const key = label.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
        if (!seen.has(key)) seen.set(key, label);
      }
      // Keep the fuller label when one only adds a plate to another.
      const vehicles = [...seen.entries()]
        .filter(([key]) => ![...seen.keys()].some((other) => other !== key && other.startsWith(key)))
        .map(([, label]) => label);
      return {
        ...empty,
        visits: done.length,
        total: done.reduce((sum, a) => sum + (a.amount ?? 0), 0),
        lastVisitAt: done[0]?.startsAt ?? null,
        vehicles,
        appointments: rows,
      };
    },
    async followups(actor: Identity): Promise<Followup[]> {
      const rows = await db.query<Row>(
        `SELECT f.id,f.appointment_id AS "appointmentId",f.conversation_id AS "conversationId",f.due_at AS "dueAt",f.months,f.status,f.reason,f.version,a.customer_name AS "customerName",a.customer_phone AS "customerPhone",a.vehicle,a.service_title AS "serviceTitle",a.starts_at AS "visitAt",c.channel FROM service_followups f JOIN appointments a ON a.id=f.appointment_id LEFT JOIN conversations c ON c.id=f.conversation_id WHERE f.organization_id=$1 AND (f.status IN ('pending','call') OR (f.status='sent' AND f.sent_at>now()-interval '30 days')) ORDER BY CASE f.status WHEN 'call' THEN 0 WHEN 'pending' THEN 1 ELSE 2 END,f.due_at LIMIT 200`,
        [actor.organizationId],
      );
      return rows.map((r) => ({
        ...(r as unknown as Followup),
        dueAt: new Date(r.dueAt as string).toISOString(),
        visitAt: new Date(r.visitAt as string).toISOString(),
      }));
    },
    async actFollowup(actor: Identity, id: string, input: { action: "cancel" | "done"; version: number }) {
      const allowed = input.action === "cancel" ? ["pending", "call"] : ["call", "sent"];
      const rows = await db.query(
        "UPDATE service_followups SET status=$3,version=version+1 WHERE id=$1 AND organization_id=$2 AND version=$4 AND status=ANY($5::text[]) RETURNING id",
        [id, actor.organizationId, input.action === "cancel" ? "cancelled" : "done", input.version, allowed],
      );
      if (!rows.length) throw new AppError(409, "CONFLICT");
    },
    /**
     * Background job: "time for the next service". Skipped when the customer has
     * booked again; sent into the chat when the channel allows a message without
     * a recent customer reply (Telegram bot, Viber); otherwise left for a call.
     */
    async runFollowup(payload: { id?: string }): Promise<"sent" | "call" | null> {
      if (!payload.id) return null;
      return db.transaction(async (q) => {
        const [f] = await q<{
          id: string;
          organization_id: string;
          appointment_id: string;
          conversation_id: string | null;
          months: number;
          status: string;
          starts_at: Date;
          phone_key: string | null;
          customer_name: string;
          vehicle: Intake;
          channel: string | null;
          locale: Locale | null;
          telegram_mode: string | null;
          enabled: boolean | null;
          company: string;
        }>(
          `SELECT f.id,f.organization_id,f.appointment_id,f.conversation_id,f.months,f.status,a.starts_at,a.phone_key,a.customer_name,a.vehicle,c.channel,c.locale,cc.settings->>'telegramMode' AS telegram_mode,cc.enabled,o.name AS company FROM service_followups f JOIN appointments a ON a.id=f.appointment_id JOIN organizations o ON o.id=f.organization_id LEFT JOIN conversations c ON c.id=f.conversation_id LEFT JOIN channel_connections cc ON cc.id=c.connection_id WHERE f.id=$1 FOR UPDATE OF f`,
          [payload.id],
        );
        if (!f || f.status !== "pending") return null;
        const [again] = await q(
          `SELECT id FROM appointments WHERE organization_id=$1 AND id<>$2 AND status IN ('requested','confirmed','done') AND starts_at>$3 AND (($4::text IS NOT NULL AND phone_key=$4) OR ($5::uuid IS NOT NULL AND conversation_id=$5)) LIMIT 1`,
          [f.organization_id, f.appointment_id, f.starts_at, f.phone_key, f.conversation_id],
        );
        if (again) {
          await q(
            "UPDATE service_followups SET status='skipped',reason='BOOKED_AGAIN',version=version+1 WHERE id=$1",
            [f.id],
          );
          return null;
        }
        const automatic =
          !!f.conversation_id &&
          f.enabled === true &&
          (f.channel === "viber" || (f.channel === "telegram" && f.telegram_mode !== "business"));
        if (!automatic) {
          await q(
            "UPDATE service_followups SET status='call',reason=$2,version=version+1 WHERE id=$1",
            [f.id, f.conversation_id ? "CHANNEL_WINDOW" : "NO_CHAT"],
          );
          return "call";
        }
        const o = await organization(q, f.organization_id);
        const locale: Locale = f.locale && f.locale in texts ? f.locale : "ru";
        const t = texts[locale];
        const number = new Intl.NumberFormat(intl[locale]);
        const mileage = Number(String(f.vehicle?.mileage ?? "").replace(/\D/g, ""));
        const km = o.settings.followUpKm;
        const kmText =
          km > 0 && mileage > 0 && mileage < 3000000
            ? t.followupNextKm.replace("{next}", number.format(mileage + km))
            : km > 0
              ? t.followupEveryKm.replace("{km}", number.format(km))
              : "";
        const first = f.customer_name.trim().split(/\s+/)[0] ?? "";
        const name = first && !/customer|клиент|клієнт/i.test(f.customer_name) ? ", " + first : "";
        const vehicle = f.vehicle?.vehicle
          ? t.followupVehicle.replace("{vehicle}", f.vehicle.vehicle)
          : "";
        await insertMessage(
          q,
          f.conversation_id!,
          t.followup
            .replace("{name}", name)
            .replace("{vehicle}", vehicle)
            .replace("{company}", f.company)
            .replace("{months}", String(f.months))
            .replace("{km}", kmText),
        );
        await q(
          "UPDATE service_followups SET status='sent',sent_at=now(),version=version+1 WHERE id=$1",
          [f.id],
        );
        return "sent";
      });
    },
    /** Everything a team alert needs to describe one appointment. */
    async describe(id: string) {
      const [row] = await db.query<Row>(
        `SELECT ${selectAppointment},a.organization_id AS "organizationId",o.name AS company,o.timezone AS "timeZone" FROM appointments a JOIN organizations o ON o.id=a.organization_id LEFT JOIN conversations c ON c.id=a.conversation_id WHERE a.id=$1`,
        [id],
      );
      if (!row) return null;
      return {
        appointment: toAppointment(row),
        organizationId: String(row.organizationId),
        company: String(row.company),
        timeZone: String(row.timeZone),
      };
    },
    async describeFollowup(id: string) {
      const [row] = await db.query<{
        organization_id: string;
        conversation_id: string | null;
        months: number;
        customer_name: string;
        customer_phone: string;
        vehicle: Intake;
        service_title: string;
        starts_at: Date;
        company: string;
        timezone: string;
      }>(
        "SELECT f.organization_id,f.conversation_id,f.months,a.customer_name,a.customer_phone,a.vehicle,a.service_title,a.starts_at,o.name AS company,o.timezone FROM service_followups f JOIN appointments a ON a.id=f.appointment_id JOIN organizations o ON o.id=f.organization_id WHERE f.id=$1",
        [id],
      );
      return row ?? null;
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
