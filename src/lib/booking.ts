import { z } from "zod";

// Shared by server and client. Pure functions only: no database or framework imports.
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
export const dayHoursSchema = z
  .object({ open: z.boolean(), from: time, to: time })
  .strict()
  .refine((d) => !d.open || d.from < d.to, { path: ["to"] });
export const bookingSettingsSchema = z
  .object({
    enabled: z.boolean(),
    // Index 0 is Monday, 6 is Sunday.
    hours: z.array(dayHoursSchema).length(7),
    bays: z.number().int().min(1).max(50),
    slotMinutes: z.number().int().min(10).max(240),
    defaultDuration: z.number().int().min(10).max(720),
    horizonDays: z.number().int().min(1).max(60),
    minNoticeMinutes: z.number().int().min(0).max(10080),
    reminders: z.boolean(),
    address: z.string().trim().max(500),
  })
  .strict();
export type BookingSettings = z.infer<typeof bookingSettingsSchema>;
export const defaultBookingSettings: BookingSettings = {
  enabled: false,
  hours: [
    ...Array.from({ length: 5 }, () => ({
      open: true,
      from: "09:00",
      to: "18:00",
    })),
    { open: true, from: "10:00", to: "15:00" },
    { open: false, from: "10:00", to: "15:00" },
  ],
  bays: 2,
  slotMinutes: 30,
  defaultDuration: 60,
  horizonDays: 14,
  minNoticeMinutes: 60,
  reminders: true,
  address: "",
};
export function normalizeBookingSettings(raw: unknown): BookingSettings {
  const merged = {
    ...defaultBookingSettings,
    ...(raw && typeof raw === "object" ? raw : {}),
  };
  const parsed = bookingSettingsSchema.safeParse(merged);
  return parsed.success ? parsed.data : defaultBookingSettings;
}
export const saveBookingSettingsSchema = z
  .object({ settings: bookingSettingsSchema, version: z.number().int().positive() })
  .strict();

const short = (n: number) => z.string().trim().max(n);
export const intakeSchema = z
  .object({
    vehicle: short(120),
    year: short(10),
    plate: short(40),
    vin: short(40),
    mileage: short(40),
    problem: short(1000),
    phone: short(60),
    preferredTime: short(120),
  })
  .partial()
  .strict();
export type Intake = z.infer<typeof intakeSchema>;
export const intakeFields = [
  "vehicle",
  "year",
  "plate",
  "vin",
  "mileage",
  "problem",
  "phone",
  "preferredTime",
] as const;
export function mergeIntake(base: Intake, update: Record<string, unknown>) {
  const next: Intake = { ...base };
  for (const key of intakeFields) {
    const value = update[key];
    if (typeof value !== "string") continue;
    const parsed = intakeSchema.shape[key].safeParse(value);
    if (parsed.success && parsed.data) next[key] = parsed.data;
  }
  return next;
}
export const appointmentStatuses = [
  "requested",
  "confirmed",
  "cancelled",
  "done",
  "no_show",
] as const;
export type AppointmentStatus = (typeof appointmentStatuses)[number];
export type Appointment = {
  id: string;
  conversationId: string | null;
  serviceEntryId: string | null;
  serviceTitle: string;
  startsAt: string;
  durationMinutes: number;
  status: AppointmentStatus;
  customerName: string;
  customerPhone: string;
  vehicle: Intake;
  note: string;
  source: "ai" | "operator";
  version: number;
  channel: string | null;
  createdAt: string;
};
export const createAppointmentSchema = z
  .object({
    conversationId: z.uuid().nullable(),
    serviceEntryId: z.uuid().nullable(),
    startsAt: z.iso.datetime({ offset: true }),
    durationMinutes: z.number().int().min(5).max(1440),
    status: z.enum(["requested", "confirmed"]),
    customerName: short(100),
    customerPhone: short(60),
    vehicle: intakeSchema,
    note: short(1000),
    force: z.boolean(),
  })
  .strict();
export const appointmentActionSchema = z.discriminatedUnion("action", [
  z
    .object({
      action: z.enum(["confirm", "cancel", "no_show"]),
      version: z.number().int().positive(),
      notify: z.boolean(),
      force: z.boolean().optional(),
    })
    .strict(),
  z
    .object({
      action: z.literal("reschedule"),
      version: z.number().int().positive(),
      notify: z.boolean(),
      startsAt: z.iso.datetime({ offset: true }),
      durationMinutes: z.number().int().min(5).max(1440),
      force: z.boolean(),
    })
    .strict(),
  z
    .object({
      action: z.literal("complete"),
      version: z.number().int().positive(),
      amount: z.number().finite().min(0).max(9999999999.99),
      grossProfit: z
        .number()
        .finite()
        .min(-9999999999.99)
        .max(9999999999.99)
        .nullable(),
    })
    .strict(),
]);
export type AppointmentAction = z.infer<typeof appointmentActionSchema>;

// ---- Time zone helpers (no external library; DST-safe via Intl) ----
function parts(date: Date, timeZone: string) {
  const values = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      weekday: "short",
    })
      .formatToParts(date)
      .map((p) => [p.type, p.value]),
  );
  return values as Record<string, string>;
}
function offsetMs(date: Date, timeZone: string) {
  const p = parts(date, timeZone);
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}
/** Converts a wall-clock time ("2026-11-10", "09:30") in a time zone into an instant. */
export function zonedToUtc(day: string, hhmm: string, timeZone: string) {
  const [y, m, d] = day.split("-").map(Number);
  const [h, min] = hhmm.split(":").map(Number);
  const guess = Date.UTC(y, m - 1, d, h, min);
  let result = guess - offsetMs(new Date(guess), timeZone);
  result = guess - offsetMs(new Date(result), timeZone);
  return new Date(result);
}
const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
export function localInfo(date: Date, timeZone: string) {
  const p = parts(date, timeZone);
  return {
    day: `${p.year}-${p.month}-${p.day}`,
    time: `${p.hour}:${p.minute}`,
    weekday: weekdays.indexOf(p.weekday),
  };
}
export function addDays(day: string, n: number) {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}
const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};
const fromMinutes = (n: number) =>
  `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;

export type Busy = { startsAt: Date; durationMinutes: number };
export type Slot = { local: string; day: string; time: string; startsAt: string };
/**
 * Free start times for a job of `duration` minutes. A slot is free when fewer
 * than `bays` active appointments overlap it and it ends before closing time.
 */
export function computeSlots(
  settings: BookingSettings,
  timeZone: string,
  busy: Busy[],
  now: Date,
  options: { fromDay?: string; days?: number; duration?: number } = {},
): Slot[] {
  const duration = options.duration ?? settings.defaultDuration;
  const today = localInfo(now, timeZone).day;
  const first = options.fromDay && options.fromDay > today ? options.fromDay : today;
  const last = addDays(today, settings.horizonDays - 1);
  const earliest = now.getTime() + settings.minNoticeMinutes * 60000;
  const intervals = busy.map((b) => [
    b.startsAt.getTime(),
    b.startsAt.getTime() + b.durationMinutes * 60000,
  ]);
  const slots: Slot[] = [];
  for (let i = 0; i < (options.days ?? settings.horizonDays); i++) {
    const day = addDays(first, i);
    if (day > last) break;
    const weekday = localInfo(zonedToUtc(day, "12:00", timeZone), timeZone).weekday;
    const hours = settings.hours[weekday];
    if (!hours?.open) continue;
    const close = toMinutes(hours.to);
    for (let m = toMinutes(hours.from); m + duration <= close; m += settings.slotMinutes) {
      const time = fromMinutes(m);
      const start = zonedToUtc(day, time, timeZone).getTime();
      if (start < earliest) continue;
      const end = start + duration * 60000;
      const overlapping = intervals.filter(([s, e]) => s < end && start < e).length;
      if (overlapping < settings.bays)
        slots.push({
          local: `${day}T${time}`,
          day,
          time,
          startsAt: new Date(start).toISOString(),
        });
    }
  }
  return slots;
}
/** True when the window [start, start+duration) fits working hours of its local day. */
export function withinHours(
  settings: BookingSettings,
  timeZone: string,
  start: Date,
  duration: number,
) {
  const info = localInfo(start, timeZone);
  const hours = settings.hours[info.weekday];
  if (!hours?.open) return false;
  const m = toMinutes(info.time);
  return m >= toMinutes(hours.from) && m + duration <= toMinutes(hours.to);
}
