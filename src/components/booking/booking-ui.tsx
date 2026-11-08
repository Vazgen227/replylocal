"use client";
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { api, ApiError } from "@/lib/api-client";
import { useRemote } from "@/components/chat/use-remote";
import {
  zonedToUtc,
  localInfo,
  intakeFields,
  type Appointment,
  type Intake,
  type Slot,
} from "@/lib/booking";
import { useWorkspace } from "@/components/workspace-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Field, selectClass } from "@/components/omni/common";

export function BookingError({ code }: { code: string }) {
  const t = useTranslations("booking");
  if (!code) return null;
  return (
    <p
      role="alert"
      className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm"
    >
      {t.has(`errors.${code}`) ? t(`errors.${code}`) : t("errors.default")}{" "}
      <span className="text-xs text-muted-foreground">({code})</span>
    </p>
  );
}
export function useBookingTask() {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await fn();
      return true;
    } catch (e) {
      setError(e instanceof ApiError ? e.code : "SERVER_ERROR");
      return false;
    } finally {
      setBusy(false);
    }
  }
  return { busy, error, run, setError };
}
const intlLocale = { ru: "ru-RU", uk: "uk-UA", en: "en-GB" } as const;
export function useFormatter(timeZone: string) {
  const locale = useLocale() as keyof typeof intlLocale;
  const tag = intlLocale[locale] ?? "ru-RU";
  return {
    day: (iso: string) =>
      new Intl.DateTimeFormat(tag, {
        timeZone,
        weekday: "long",
        day: "numeric",
        month: "long",
      }).format(new Date(iso)),
    time: (iso: string) =>
      new Intl.DateTimeFormat(tag, {
        timeZone,
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(iso)),
    full: (iso: string) =>
      new Intl.DateTimeFormat(tag, {
        timeZone,
        weekday: "short",
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(iso)),
  };
}
const statusVariant: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  requested: "default",
  confirmed: "secondary",
  done: "outline",
  cancelled: "outline",
  no_show: "destructive",
};
export function StatusBadge({ status }: { status: Appointment["status"] }) {
  const t = useTranslations("booking");
  return <Badge variant={statusVariant[status]}>{t(`status.${status}`)}</Badge>;
}

/** Picks a start time: free slots for a day, or an exact time entered by hand. */
export function SlotPicker({
  timeZone,
  duration,
  value,
  onChange,
}: {
  timeZone: string;
  duration: number;
  value: string;
  onChange: (iso: string) => void;
}) {
  const t = useTranslations("booking");
  const [day, setDay] = useState(() =>
    localInfo(value ? new Date(value) : new Date(), timeZone).day,
  );
  const { data, error } = useRemote<{ slots: Slot[] }>(
    `/api/appointments/slots?day=${day}&duration=${duration}`,
  );
  const slots = data?.slots ?? null;
  const selected = value ? localInfo(new Date(value), timeZone) : null;
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t("date")}>
          <Input type="date" value={day} onChange={(e) => e.target.value && setDay(e.target.value)} />
        </Field>
        <Field label={t("exactTime")}>
          <Input
            type="time"
            step={300}
            value={selected && selected.day === day ? selected.time : ""}
            onChange={(e) =>
              e.target.value && onChange(zonedToUtc(day, e.target.value, timeZone).toISOString())
            }
          />
        </Field>
      </div>
      <BookingError code={error} />
      <div>
        <p className="mb-2 text-sm font-medium">{t("freeSlots")}</p>
        {slots === null ? (
          <p className="text-sm text-muted-foreground">{t("loading")}</p>
        ) : slots.length ? (
          <div className="flex flex-wrap gap-2">
            {slots.map((s) => (
              <Button
                key={s.startsAt}
                type="button"
                size="sm"
                variant={value === s.startsAt ? "default" : "outline"}
                aria-pressed={value === s.startsAt}
                onClick={() => onChange(s.startsAt)}
              >
                {s.time}
              </Button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{t("noSlots")}</p>
        )}
      </div>
    </div>
  );
}

export function IntakeFields({
  value,
  onChange,
}: {
  value: Intake;
  onChange: (v: Intake) => void;
}) {
  const t = useTranslations("booking");
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {intakeFields.map((key) =>
        key === "problem" ? (
          <div key={key} className="sm:col-span-2">
            <Field label={t(`intake.${key}`)}>
              <Textarea
                maxLength={1000}
                value={value[key] ?? ""}
                onChange={(e) => onChange({ ...value, [key]: e.target.value })}
              />
            </Field>
          </div>
        ) : (
          <Field key={key} label={t(`intake.${key}`)}>
            <Input
              maxLength={key === "vehicle" ? 120 : key === "preferredTime" ? 120 : 60}
              value={value[key] ?? ""}
              onChange={(e) => onChange({ ...value, [key]: e.target.value })}
            />
          </Field>
        ),
      )}
    </div>
  );
}

export function NewAppointmentDialog({
  open,
  onOpenChange,
  timeZone,
  defaultDuration,
  conversationId = null,
  initial,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  timeZone: string;
  defaultDuration: number;
  conversationId?: string | null;
  initial?: { name?: string; phone?: string; intake?: Intake };
  onCreated: () => void;
}) {
  const t = useTranslations("booking"),
    { data } = useWorkspace(),
    task = useBookingTask();
  const services = data.entries.filter((e) => e.kind === "service");
  const [serviceId, setServiceId] = useState(""),
    [duration, setDuration] = useState(defaultDuration),
    [startsAt, setStartsAt] = useState(""),
    [name, setName] = useState(initial?.name ?? ""),
    [phone, setPhone] = useState(initial?.phone ?? initial?.intake?.phone ?? ""),
    [vehicle, setVehicle] = useState<Intake>(initial?.intake ?? {}),
    [note, setNote] = useState(""),
    [confirmNow, setConfirmNow] = useState(true),
    [force, setForce] = useState(false);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("newAppointment")}</DialogTitle>
          <DialogDescription>{t("newAppointmentHint")}</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void task
              .run(async () => {
                if (!startsAt) throw new ApiError("TIME_REQUIRED", 400);
                await api("/api/appointments", "POST", {
                  conversationId,
                  serviceEntryId: serviceId || null,
                  startsAt,
                  durationMinutes: duration,
                  status: confirmNow ? "confirmed" : "requested",
                  customerName: name.trim(),
                  customerPhone: phone.trim(),
                  vehicle,
                  note: note.trim(),
                  force,
                });
              })
              .then((ok) => {
                if (ok) {
                  onOpenChange(false);
                  onCreated();
                }
              });
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t("service")}>
              <select
                className={selectClass}
                value={serviceId}
                onChange={(e) => {
                  setServiceId(e.target.value);
                  const s = services.find((x) => x.id === e.target.value);
                  if (s?.durationMinutes) setDuration(s.durationMinutes);
                }}
              >
                <option value="">{t("noService")}</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t("duration")}>
              <Input
                type="number"
                min={5}
                max={1440}
                step={5}
                required
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value) || defaultDuration)}
              />
            </Field>
          </div>
          <SlotPicker timeZone={timeZone} duration={duration} value={startsAt} onChange={setStartsAt} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t("customerName")}>
              <Input maxLength={100} value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field label={t("customerPhone")}>
              <Input maxLength={60} value={phone} onChange={(e) => setPhone(e.target.value)} />
            </Field>
          </div>
          <IntakeFields value={vehicle} onChange={setVehicle} />
          <Field label={t("note")}>
            <Textarea maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={confirmNow} onChange={(e) => setConfirmNow(e.target.checked)} />
            {conversationId ? t("confirmAndNotify") : t("confirmNow")}
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={force} onChange={(e) => setForce(e.target.checked)} />
            {t("force")}
          </label>
          <BookingError code={task.error} />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("close")}
            </Button>
            <Button disabled={task.busy || !startsAt}>{task.busy ? t("saving") : t("create")}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

type Mode = null | "reschedule" | "complete";
export function AppointmentCard({
  appointment: a,
  timeZone,
  onChanged,
  showConversationLink = true,
}: {
  appointment: Appointment;
  timeZone: string;
  onChanged: () => void;
  showConversationLink?: boolean;
}) {
  const t = useTranslations("booking"),
    channels = useTranslations("omni"),
    locale = useLocale(),
    task = useBookingTask(),
    f = useFormatter(timeZone),
    { data } = useWorkspace();
  const [mode, setMode] = useState<Mode>(null),
    [startsAt, setStartsAt] = useState(a.startsAt),
    [duration, setDuration] = useState(a.durationMinutes),
    [amount, setAmount] = useState(""),
    [profit, setProfit] = useState(""),
    [force, setForce] = useState(false);
  const notify = !!a.conversationId;
  const act = (body: Record<string, unknown>) =>
    task.run(async () => {
      await api(`/api/appointments/${a.id}`, "PATCH", { version: a.version, ...body });
      setMode(null);
      onChanged();
    });
  const active = a.status === "requested" || a.status === "confirmed";
  const vehicle = [a.vehicle.vehicle, a.vehicle.year, a.vehicle.plate].filter(Boolean).join(" · ");
  return (
    <article className="space-y-3 rounded-xl border bg-background p-4 text-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold">
            {f.time(a.startsAt)}–{f.time(new Date(new Date(a.startsAt).getTime() + a.durationMinutes * 60000).toISOString())}
            {a.serviceTitle && <span className="font-normal"> · {a.serviceTitle}</span>}
          </p>
          <p className="break-words text-muted-foreground">
            {[a.customerName, a.customerPhone].filter(Boolean).join(" · ") || "—"}
          </p>
          {vehicle && <p className="break-words">{vehicle}</p>}
          {a.vehicle.problem && <p className="break-words text-muted-foreground">{a.vehicle.problem}</p>}
          {a.note && <p className="break-words italic text-muted-foreground">{a.note}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {a.source === "ai" && <Badge variant="outline">{t("fromAi")}</Badge>}
          {a.channel && <Badge variant="outline">{channels.has(a.channel) ? channels(a.channel) : a.channel}</Badge>}
          <StatusBadge status={a.status} />
        </div>
      </div>
      <BookingError code={task.error} />
      {mode === null && (
        <div className="flex flex-wrap gap-2">
          {a.status === "requested" && (
            <Button size="sm" disabled={task.busy} onClick={() => void act({ action: "confirm", notify })}>
              {notify ? t("confirmAndNotify") : t("confirm")}
            </Button>
          )}
          {active && (
            <Button size="sm" variant="outline" disabled={task.busy} onClick={() => setMode("reschedule")}>
              {t("reschedule")}
            </Button>
          )}
          {active && (
            <Button size="sm" variant="outline" disabled={task.busy} onClick={() => setMode("complete")}>
              {t("complete")}
            </Button>
          )}
          {a.status === "confirmed" && (
            <Button size="sm" variant="outline" disabled={task.busy} onClick={() => void act({ action: "no_show", notify: false })}>
              {t("noShow")}
            </Button>
          )}
          {active && (
            <Button
              size="sm"
              variant="ghost"
              disabled={task.busy}
              onClick={() => {
                if (window.confirm(t("cancelConfirm"))) void act({ action: "cancel", notify });
              }}
            >
              {t("cancel")}
            </Button>
          )}
          {showConversationLink && a.conversationId && (
            <Button size="sm" variant="link" asChild>
              <a href={`/${locale}/inbox/${a.conversationId}`}>{t("openConversation")}</a>
            </Button>
          )}
        </div>
      )}
      {mode === "reschedule" && (
        <form
          className="space-y-3 border-t pt-3"
          onSubmit={(e) => {
            e.preventDefault();
            void act({ action: "reschedule", startsAt, durationMinutes: duration, notify, force });
          }}
        >
          <Field label={t("duration")}>
            <Input type="number" min={5} max={1440} step={5} value={duration} onChange={(e) => setDuration(Number(e.target.value) || a.durationMinutes)} />
          </Field>
          <SlotPicker timeZone={timeZone} duration={duration} value={startsAt} onChange={setStartsAt} />
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={force} onChange={(e) => setForce(e.target.checked)} />
            {t("force")}
          </label>
          <div className="flex gap-2">
            <Button size="sm" disabled={task.busy}>{t("save")}</Button>
            <Button size="sm" type="button" variant="outline" onClick={() => setMode(null)}>{t("close")}</Button>
          </div>
        </form>
      )}
      {mode === "complete" && (
        <form
          className="space-y-3 border-t pt-3"
          onSubmit={(e) => {
            e.preventDefault();
            void act({ action: "complete", amount: Number(amount), grossProfit: profit === "" ? null : Number(profit) });
          }}
        >
          <p className="text-muted-foreground">{t("completeHint", { currency: data.organization.currency })}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t("amount")}>
              <Input type="number" min={0} step="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} />
            </Field>
            <Field label={t("grossProfit")}>
              <Input type="number" step="0.01" value={profit} onChange={(e) => setProfit(e.target.value)} />
            </Field>
          </div>
          <div className="flex gap-2">
            <Button size="sm" disabled={task.busy}>{t("save")}</Button>
            <Button size="sm" type="button" variant="outline" onClick={() => setMode(null)}>{t("close")}</Button>
          </div>
        </form>
      )}
    </article>
  );
}
