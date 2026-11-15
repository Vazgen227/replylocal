"use client";
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { BellRing, CheckCircle2, Send } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import { useRemote } from "@/components/chat/use-remote";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookingError, useBookingTask } from "./booking-ui";

type Status = { configured: boolean; linked: boolean; linkedAt: string | null };

/** Per-user link between the workspace and a private Telegram chat with the alert bot. */
export function TelegramAlertsCard() {
  const t = useTranslations("booking.telegram"),
    locale = useLocale(),
    task = useBookingTask();
  const [waiting, setWaiting] = useState(false);
  // Poll faster while the user is in Telegram pressing Start.
  const { data, error, reload } = useRemote<Status>("/api/telegram/link", waiting ? 3000 : 0);
  if (waiting && data?.linked) setWaiting(false);
  return (
    <Card id="telegram">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BellRing className="size-5 text-primary" aria-hidden="true" />
          {t("title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <p className="text-muted-foreground">{t("intro")}</p>
        <BookingError code={error || task.error} />
        {data && !data.configured && (
          <p className="rounded-lg border border-cta/40 bg-cta/5 p-3">{t("notConfigured")}</p>
        )}
        {data?.configured && data.linked && (
          <div className="space-y-3">
            <p role="status" className="flex items-center gap-2 font-medium text-success">
              <CheckCircle2 className="size-4" aria-hidden="true" />
              {t("linked")}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                disabled={task.busy}
                onClick={() =>
                  void task
                    .run(() => api("/api/telegram/test", "POST", {}).then(() => undefined))
                    .then((ok) => ok && toast.success(t("testSent")))
                }
              >
                <Send className="size-4" aria-hidden="true" />
                {t("test")}
              </Button>
              <Button
                variant="ghost"
                disabled={task.busy}
                onClick={() =>
                  void task.run(async () => {
                    await api("/api/telegram/link", "DELETE");
                    await reload();
                  })
                }
              >
                {t("disconnect")}
              </Button>
            </div>
          </div>
        )}
        {data?.configured && !data.linked && (
          <div className="space-y-3">
            <Button
              variant="cta"
              disabled={task.busy}
              onClick={() => {
                // Open the tab synchronously so pop-up blockers allow it.
                const tab = window.open("about:blank", "_blank");
                void task
                  .run(async () => {
                    const { url } = await api<{ url: string }>("/api/telegram/link", "POST", { locale });
                    if (tab) tab.location.href = url;
                    else window.location.href = url;
                    setWaiting(true);
                  })
                  .then((ok) => !ok && tab?.close());
              }}
            >
              <Send className="size-4" aria-hidden="true" />
              {t("connect")}
            </Button>
            <p className="text-muted-foreground">{waiting ? t("waiting") : t("connectHint")}</p>
          </div>
        )}
        <p className="text-xs text-muted-foreground">{t("personal")}</p>
      </CardContent>
    </Card>
  );
}
