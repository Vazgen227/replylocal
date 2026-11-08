"use client";
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { api } from "@/lib/api-client";
import { useRemote } from "@/components/chat/use-remote";
import type { Appointment, Intake } from "@/lib/booking";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  AppointmentCard,
  BookingError,
  IntakeFields,
  NewAppointmentDialog,
  useBookingTask,
  useFormatter,
} from "./booking-ui";

type Data = {
  enabled: boolean;
  timeZone: string;
  defaultDuration: number;
  intake: Intake;
  customerName: string;
  customerContact: string;
  appointments: Appointment[];
};
function IntakeForm({ id, data, reload }: { id: string; data: Data; reload: () => Promise<Data> }) {
  const t = useTranslations("booking"),
    task = useBookingTask();
  const [form, setForm] = useState<Intake>(data.intake),
    [dirty, setDirty] = useState(false),
    [saved, setSaved] = useState(false);
  // Keep showing what the assistant collects until the operator starts editing.
  if (!dirty && JSON.stringify(form) !== JSON.stringify(data.intake)) setForm(data.intake);
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        void task
          .run(async () => {
            await api(`/api/conversations/${id}/booking`, "PATCH", { intake: form });
            await reload();
          })
          .then((ok) => {
            if (ok) {
              setDirty(false);
              setSaved(true);
            }
          });
      }}
    >
      <IntakeFields
        value={form}
        onChange={(v) => {
          setDirty(true);
          setSaved(false);
          setForm(v);
        }}
      />
      <BookingError code={task.error} />
      <div className="flex items-center gap-3">
        <Button size="sm" variant="outline" disabled={task.busy || !dirty}>
          {task.busy ? t("saving") : t("saveCar")}
        </Button>
        {saved && <span role="status" className="text-sm">{t("saved")}</span>}
      </div>
    </form>
  );
}
export function ConversationBooking({ id, onChanged }: { id: string; onChanged: () => void }) {
  const t = useTranslations("booking"),
    locale = useLocale();
  const { data, error, reload } = useRemote<Data>(`/api/conversations/${id}/booking`, 5000);
  const [creating, setCreating] = useState(false);
  const f = useFormatter(data?.timeZone ?? "Europe/Kyiv");
  if (!data) return error ? <BookingError code={error} /> : null;
  if (!data.enabled && !data.appointments.length)
    return (
      <p className="text-xs text-muted-foreground">
        {t("disabledHint")}{" "}
        <a className="underline" href={`/${locale}/settings#booking`}>
          {t("openSettings")}
        </a>
      </p>
    );
  const refresh = () => {
    void reload().catch(() => {});
    onChanged();
  };
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("appointmentAndCar")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-semibold">{t("appointment")}</h3>
            <Button size="sm" onClick={() => setCreating(true)}>
              {t("newAppointment")}
            </Button>
          </div>
          {data.appointments.length ? (
            data.appointments.map((a) => (
              <div key={a.id} className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground first-letter:uppercase">{f.day(a.startsAt)}</p>
                <AppointmentCard appointment={a} timeZone={data.timeZone} onChanged={refresh} showConversationLink={false} />
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">{t("noAppointmentYet")}</p>
          )}
        </section>
        <section className="space-y-3 border-t pt-4">
          <h3 className="font-semibold">{t("car")}</h3>
          <p className="text-xs text-muted-foreground">{t("carHint")}</p>
          <IntakeForm id={id} data={data} reload={reload} />
        </section>
        {creating && (
          <NewAppointmentDialog
            open={creating}
            onOpenChange={setCreating}
            timeZone={data.timeZone}
            defaultDuration={data.defaultDuration}
            conversationId={id}
            initial={{ name: data.customerName, phone: data.intake.phone ?? data.customerContact, intake: data.intake }}
            onCreated={refresh}
          />
        )}
      </CardContent>
    </Card>
  );
}
