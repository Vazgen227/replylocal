"use client";
import { useLocale, useTranslations } from "next-intl";
import { Repeat } from "lucide-react";
import { api } from "@/lib/api-client";
import { useRemote } from "@/components/chat/use-remote";
import { vehicleLabel, type Followup } from "@/lib/booking";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookingError, useBookingTask, useFormatter } from "./booking-ui";

function Row({ item, timeZone, onChanged }: { item: Followup; timeZone: string; onChanged: () => void }) {
  const t = useTranslations("booking"),
    locale = useLocale(),
    task = useBookingTask(),
    f = useFormatter(timeZone);
  const act = (action: "cancel" | "done") =>
    task.run(async () => {
      await api(`/api/followups/${item.id}`, "PATCH", { action, version: item.version });
      onChanged();
    });
  const car = vehicleLabel(item.vehicle);
  return (
    <li className={cn("space-y-2 p-4 text-sm", item.status === "call" && "bg-cta/5")}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold">{[item.customerName, item.customerPhone].filter(Boolean).join(" · ") || "—"}</p>
          {car && <p>{car}</p>}
          <p className="text-muted-foreground">
            {t("followUp.visit", { when: f.day(item.visitAt) })}
            {item.serviceTitle && ` · ${item.serviceTitle}`}
          </p>
          <p className="font-mono text-xs text-muted-foreground">{t("followUp.due", { when: f.day(item.dueAt) })}</p>
        </div>
        <Badge variant={item.status === "call" ? "default" : "outline"}>{t(`followUp.status.${item.status}`)}</Badge>
      </div>
      <BookingError code={task.error} />
      <div className="flex flex-wrap gap-2">
        {(item.status === "call" || item.status === "sent") && (
          <Button size="sm" variant={item.status === "call" ? "default" : "outline"} disabled={task.busy} onClick={() => void act("done")}>
            {t("followUp.markDone")}
          </Button>
        )}
        {(item.status === "pending" || item.status === "call") && (
          <Button size="sm" variant="ghost" disabled={task.busy} onClick={() => void act("cancel")}>
            {t("followUp.cancel")}
          </Button>
        )}
        {item.conversationId && (
          <Button size="sm" variant="link" asChild>
            <a href={`/${locale}/inbox/${item.conversationId}`}>{t("openConversation")}</a>
          </Button>
        )}
      </div>
    </li>
  );
}

export function FollowupsCard({ timeZone }: { timeZone: string }) {
  const t = useTranslations("booking");
  const { data, error, reload } = useRemote<Followup[]>("/api/followups", 60000);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Repeat className="size-4 text-primary" aria-hidden="true" />
          {t("followUp.title")}
        </CardTitle>
        <p className="text-sm text-muted-foreground">{t("followUp.intro")}</p>
      </CardHeader>
      <CardContent>
        <BookingError code={error} />
        {data &&
          (data.length ? (
            <ul className="divide-y rounded-lg border">
              {data.map((item) => (
                <Row key={item.id + item.version} item={item} timeZone={timeZone} onChanged={() => void reload().catch(() => {})} />
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">{t("followUp.empty")}</p>
          ))}
      </CardContent>
    </Card>
  );
}
