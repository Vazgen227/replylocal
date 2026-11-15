"use client";
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { History, Search } from "lucide-react";
import { api } from "@/lib/api-client";
import { useRemote } from "@/components/chat/use-remote";
import type { CustomerHistory } from "@/lib/booking";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookingError, StatusBadge, useBookingTask, useFormatter } from "./booking-ui";

const intlLocale = { ru: "ru-RU", uk: "uk-UA", en: "en-GB" } as const;
function useMoney(currency: string) {
  const locale = useLocale() as keyof typeof intlLocale;
  return (n: number) =>
    new Intl.NumberFormat(intlLocale[locale] ?? "ru-RU", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(n);
}

/** Summary and visit list. `exclude` hides appointments already shown nearby. */
export function HistoryView({
  history,
  timeZone,
  exclude = [],
}: {
  history: CustomerHistory;
  timeZone: string;
  exclude?: string[];
}) {
  const t = useTranslations("booking"),
    f = useFormatter(timeZone),
    money = useMoney(history.currency);
  const visits = history.appointments.filter((a) => !exclude.includes(a.id));
  if (!history.visits && !visits.length)
    return <p className="text-sm text-muted-foreground">{t("history.none")}</p>;
  return (
    <div className="space-y-3 text-sm">
      {history.visits > 0 && (
        <div className="rounded-lg border border-success/30 bg-success/5 p-3">
          <p className="font-semibold">
            {t("history.summary", { visits: history.visits, total: money(history.total) })}
          </p>
          {history.lastVisitAt && (
            <p className="text-muted-foreground">{t("history.lastVisit", { when: f.day(history.lastVisitAt) })}</p>
          )}
        </div>
      )}
      {history.vehicles.length > 0 && (
        <p>
          <span className="text-muted-foreground">{t("history.vehicles")}: </span>
          {history.vehicles.join("; ")}
        </p>
      )}
      {visits.length > 0 && (
        <ul className="divide-y rounded-lg border">
          {visits.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2">
              <span className="font-mono text-xs tabular-nums">{f.full(a.startsAt)}</span>
              <span className="order-first min-w-0 basis-full break-words sm:order-none sm:basis-auto sm:flex-1 sm:truncate">
                {a.serviceTitle || a.vehicle.problem || "—"}
              </span>
              {a.amount !== null && <span className="font-mono tabular-nums">{money(a.amount)}</span>}
              <StatusBadge status={a.status} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** History block in the conversation side panel. */
export function ConversationHistory({
  id,
  timeZone,
  exclude,
}: {
  id: string;
  timeZone: string;
  exclude: string[];
}) {
  const t = useTranslations("booking");
  const { data, error } = useRemote<CustomerHistory>(`/api/customers/history?conversation=${id}`, 30000);
  return (
    <section className="space-y-3 border-t pt-4">
      <h3 className="flex items-center gap-2 font-semibold">
        <History className="size-4 text-primary" aria-hidden="true" />
        {t("history.title")}
      </h3>
      <BookingError code={error} />
      {data && <HistoryView history={data} timeZone={timeZone} exclude={exclude} />}
    </section>
  );
}

/** Phone lookup on the appointments page: is this a returning customer? */
export function PhoneLookup({ timeZone }: { timeZone: string }) {
  const t = useTranslations("booking"),
    task = useBookingTask();
  const [phone, setPhone] = useState(""),
    [result, setResult] = useState<CustomerHistory | null>(null);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Search className="size-4 text-primary" aria-hidden="true" />
          {t("history.searchTitle")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void task.run(async () => {
              setResult(await api<CustomerHistory>(`/api/customers/history?phone=${encodeURIComponent(phone.trim())}`));
            });
          }}
        >
          <label className="min-w-0 flex-1 space-y-1.5 text-sm font-medium">
            {t("history.searchLabel")}
            <Input
              type="tel"
              inputMode="tel"
              autoComplete="off"
              maxLength={60}
              required
              placeholder="+380 50 111 22 33"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                setResult(null);
              }}
            />
          </label>
          <Button disabled={task.busy || phone.replace(/\D/g, "").length < 9}>{t("history.search")}</Button>
        </form>
        <BookingError code={task.error} />
        {result &&
          (result.appointments.length ? (
            <HistoryView history={result} timeZone={timeZone} />
          ) : (
            <p role="status" className="text-sm text-muted-foreground">
              {t("history.notFound")}
            </p>
          ))}
      </CardContent>
    </Card>
  );
}
