"use client";
import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useRemote } from "@/components/chat/use-remote";
import { addDays, localInfo, zonedToUtc, type Appointment, type BookingSettings } from "@/lib/booking";
import { Button } from "@/components/ui/button";
import {
  AppointmentCard,
  BookingError,
  NewAppointmentDialog,
  useFormatter,
} from "@/components/booking/booking-ui";

type Settings = { settings: BookingSettings; version: number; timeZone: string };
function Week({ config }: { config: Settings }) {
  const t = useTranslations("booking"),
    locale = useLocale();
  const tz = config.timeZone;
  const today = localInfo(new Date(), tz).day;
  const [start, setStart] = useState(today),
    [creating, setCreating] = useState(false),
    [showClosed, setShowClosed] = useState(false);
  const from = zonedToUtc(start, "00:00", tz).toISOString(),
    to = zonedToUtc(addDays(start, 7), "00:00", tz).toISOString();
  const { data, error, reload } = useRemote<{ appointments: Appointment[] }>(
    `/api/appointments?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
    15000,
  );
  const f = useFormatter(tz);
  const byDay = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    for (let i = 0; i < 7; i++) map.set(addDays(start, i), []);
    for (const a of data?.appointments ?? []) {
      if (!showClosed && ["cancelled", "done", "no_show"].includes(a.status)) continue;
      map.get(localInfo(new Date(a.startsAt), tz).day)?.push(a);
    }
    return [...map.entries()];
  }, [data, start, tz, showClosed]);
  const pending = (data?.appointments ?? []).filter((a) => a.status === "requested").length;
  const refresh = () => void reload().catch(() => {});
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="icon" aria-label={t("prevWeek")} onClick={() => setStart(addDays(start, -7))}>
          <ChevronLeft className="size-4" />
        </Button>
        <Button variant="outline" onClick={() => setStart(today)}>
          {t("today")}
        </Button>
        <Button variant="outline" size="icon" aria-label={t("nextWeek")} onClick={() => setStart(addDays(start, 7))}>
          <ChevronRight className="size-4" />
        </Button>
        <label className="ml-auto flex items-center gap-2 text-sm">
          <input type="checkbox" checked={showClosed} onChange={(e) => setShowClosed(e.target.checked)} />
          {t("showClosed")}
        </label>
        <Button onClick={() => setCreating(true)}>
          <Plus className="size-4" />
          {t("newAppointment")}
        </Button>
      </div>
      {pending > 0 && (
        <p role="status" className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm font-medium">
          {t("pending", { count: pending })}
        </p>
      )}
      {!config.settings.enabled && (
        <p className="rounded-lg border p-3 text-sm text-muted-foreground">
          {t("disabledHint")}{" "}
          <a className="underline" href={`/${locale}/settings#booking`}>
            {t("openSettings")}
          </a>
        </p>
      )}
      <BookingError code={error} />
      {!data && !error && <p role="status">{t("loading")}</p>}
      {data &&
        byDay.map(([day, items]) => (
          <section key={day} className="space-y-2">
            <h2 className="text-sm font-semibold first-letter:uppercase">
              {f.day(zonedToUtc(day, "12:00", tz).toISOString())}
              {day === today && <span className="ml-2 text-primary">· {t("today")}</span>}
            </h2>
            {items.length ? (
              items.map((a) => <AppointmentCard key={a.id + a.version} appointment={a} timeZone={tz} onChanged={refresh} />)
            ) : (
              <p className="text-sm text-muted-foreground">{t("emptyDay")}</p>
            )}
          </section>
        ))}
      {creating && (
        <NewAppointmentDialog
          open={creating}
          onOpenChange={setCreating}
          timeZone={tz}
          defaultDuration={config.settings.defaultDuration}
          onCreated={refresh}
        />
      )}
    </div>
  );
}
export default function Appointments() {
  const t = useTranslations("booking");
  const { data, error } = useRemote<Settings>("/api/booking/settings");
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">{t("intro")}</p>
      </div>
      <BookingError code={error} />
      {data && <Week config={data} />}
    </div>
  );
}
