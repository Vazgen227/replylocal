"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import { useRemote } from "@/components/chat/use-remote";
import { useWorkspace } from "@/components/workspace-provider";
import type { BookingSettings } from "@/lib/booking";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Field } from "@/components/omni/common";
import { BookingError, useBookingTask } from "./booking-ui";

type Data = { settings: BookingSettings; version: number; timeZone: string };
const days = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
function Form({ initial, reload }: { initial: Data; reload: () => Promise<Data> }) {
  const t = useTranslations("booking"),
    task = useBookingTask(),
    { data: workspace } = useWorkspace();
  const [s, setS] = useState(initial.settings),
    [version, setVersion] = useState(initial.version);
  const writable = workspace.user.role !== "agent";
  const num = (key: keyof BookingSettings) => ({
    type: "number" as const,
    value: s[key] as number,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setS({ ...s, [key]: Number(e.target.value) }),
  });
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void task
          .run(async () => {
            await api("/api/booking/settings", "PATCH", { settings: s, version });
            const next = await reload();
            setS(next.settings);
            setVersion(next.version);
          })
          .then((ok) => ok && toast.success(t("saved")));
      }}
    >
      <fieldset disabled={!writable || task.busy} className="space-y-5">
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" className="mt-1" checked={s.enabled} onChange={(e) => setS({ ...s, enabled: e.target.checked })} />
          <span>
            <span className="font-medium">{t("settings.enabled")}</span>
            <span className="block text-muted-foreground">{t("settings.enabledHint")}</span>
          </span>
        </label>
        <div>
          <p className="mb-2 text-sm font-medium">{t("settings.hours")} ({initial.timeZone})</p>
          <div className="space-y-2">
            {s.hours.map((h, i) => (
              <div key={days[i]} className="flex flex-wrap items-center gap-2 text-sm">
                <label className="flex w-28 items-center gap-2">
                  <input
                    type="checkbox"
                    checked={h.open}
                    onChange={(e) => setS({ ...s, hours: s.hours.map((x, j) => (j === i ? { ...x, open: e.target.checked } : x)) })}
                  />
                  {t(`weekdays.${days[i]}`)}
                </label>
                <Input
                  aria-label={`${t(`weekdays.${days[i]}`)} ${t("settings.from")}`}
                  type="time"
                  className="w-32"
                  disabled={!h.open}
                  value={h.from}
                  onChange={(e) => setS({ ...s, hours: s.hours.map((x, j) => (j === i ? { ...x, from: e.target.value } : x)) })}
                />
                <span>—</span>
                <Input
                  aria-label={`${t(`weekdays.${days[i]}`)} ${t("settings.to")}`}
                  type="time"
                  className="w-32"
                  disabled={!h.open}
                  value={h.to}
                  onChange={(e) => setS({ ...s, hours: s.hours.map((x, j) => (j === i ? { ...x, to: e.target.value } : x)) })}
                />
                {!h.open && <span className="text-muted-foreground">{t("settings.closed")}</span>}
              </div>
            ))}
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label={t("settings.bays")}>
            <Input min={1} max={50} {...num("bays")} />
          </Field>
          <Field label={t("settings.slotMinutes")}>
            <Input min={10} max={240} step={5} {...num("slotMinutes")} />
          </Field>
          <Field label={t("settings.defaultDuration")}>
            <Input min={10} max={720} step={5} {...num("defaultDuration")} />
          </Field>
          <Field label={t("settings.horizonDays")}>
            <Input min={1} max={60} {...num("horizonDays")} />
          </Field>
          <Field label={t("settings.minNoticeMinutes")}>
            <Input min={0} max={10080} step={15} {...num("minNoticeMinutes")} />
          </Field>
        </div>
        <Field label={t("settings.address")}>
          <Input maxLength={500} value={s.address} onChange={(e) => setS({ ...s, address: e.target.value })} />
        </Field>
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" className="mt-1" checked={s.reminders} onChange={(e) => setS({ ...s, reminders: e.target.checked })} />
          <span>
            <span className="font-medium">{t("settings.reminders")}</span>
            <span className="block text-muted-foreground">{t("settings.remindersHint")}</span>
          </span>
        </label>
        <BookingError code={task.error} />
        <Button disabled={task.busy}>{task.busy ? t("saving") : t("save")}</Button>
      </fieldset>
    </form>
  );
}
export function BookingSettingsCard() {
  const t = useTranslations("booking");
  const { data, error, reload } = useRemote<Data>("/api/booking/settings");
  return (
    <Card id="booking">
      <CardHeader>
        <CardTitle>{t("settings.title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <BookingError code={error} />
        {data && <Form key={data.version} initial={data} reload={reload} />}
      </CardContent>
    </Card>
  );
}
