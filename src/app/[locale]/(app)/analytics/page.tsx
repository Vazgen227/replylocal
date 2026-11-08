"use client";
import { ChannelReports } from "@/components/omni/reports";
import { useTranslations } from "next-intl";
import type { ChatStats } from "@/lib/chat-schemas";
import { useRemote } from "@/components/chat/use-remote";
import { ChatError } from "@/components/chat/shared";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
export default function Analytics() {
  const t = useTranslations("pilot");
  const { data, error, reload } = useRemote<ChatStats>("/api/analytics", 15000);
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t("analytics")}</h1>
        <p className="mt-2 text-muted-foreground">{t("analyticsIntro")}</p>
      </div>
      <Button variant="outline" onClick={() => void reload().catch(() => {})}>
        {t("refresh")}
      </Button>
      {error && <ChatError code={error} />}
      <ChannelReports />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data &&
          Object.entries({
            total: data.total,
            openCount: data.open,
            waitingCount: data.waiting,
            closedCount: data.closed,
            messageCount: data.messages,
            aiReplies: data.aiReplies,
            attempts: `${data.attemptsToday} / ${data.dailyLimit}`,
            tokens: `${data.inputTokens} / ${data.outputTokens}`,
          }).map(([key, value]) => (
            <Card key={key}>
              <CardHeader>
                <CardTitle className="text-sm">{t(key)}</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">
                {value}
              </CardContent>
            </Card>
          ))}
      </div>
    </div>
  );
}
