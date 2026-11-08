"use client";
import {
  ChannelsManager,
  QueueHealth,
} from "@/components/omni/channels-manager";
import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { toast } from "sonner";
import { useWorkspace } from "@/components/workspace-provider";
import { useRemote } from "@/components/chat/use-remote";
import { ChatError } from "@/components/chat/shared";
import { api, ApiError } from "@/lib/api-client";
import type { ChatConfig } from "@/lib/chat-schemas";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
function SetupForm({
  initial,
  reload,
}: {
  initial: ChatConfig;
  reload: () => Promise<ChatConfig>;
}) {
  const o = useTranslations("omni");
  const t = useTranslations("pilot"),
    locale = useLocale();
  const { data } = useWorkspace();
  const [form, setForm] = useState(initial),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const writable = data.user.role !== "agent";
  const chatUrl = `${initial.appUrl.replace(/\/$/, "")}/${locale}/chat/${initial.publicId}`;
  const snippet = `<script src="${initial.appUrl.replace(/\/$/, "")}/widget.js" data-business="${initial.publicId}" data-locale="${locale}" defer></script>`;
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("/api/chat/config", "PATCH", {
        enabled: form.enabled,
        autoReply: form.autoReply,
        welcome: form.welcome,
        dailyLimit: form.dailyLimit,
        version: form.version,
      });
      setForm(await reload());
      toast.success(t("saved"));
    } catch (e) {
      setError(e instanceof ApiError ? e.code : "SERVER_ERROR");
    } finally {
      setBusy(false);
    }
  }
  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(t("copied"));
    } catch {
      toast.error(t("error"));
    }
  }
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("connection")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={save} className="space-y-5">
            <fieldset disabled={!writable || busy} className="space-y-5">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={form.enabled}
                  onChange={(e) =>
                    setForm({ ...form, enabled: e.target.checked })
                  }
                />
                {t("enabled")}
              </label>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={form.autoReply}
                  onChange={(e) =>
                    setForm({ ...form, autoReply: e.target.checked })
                  }
                />
                {t("autoReply")}
              </label>
              <p
                role="status"
                className={`rounded-lg p-3 text-sm ${initial.aiConfigured ? "bg-emerald-50 text-emerald-900" : "bg-amber-50 text-amber-900"}`}
              >
                {initial.aiConfigured ? t("configured") : t("notConfigured")}
              </p>
              <div className="space-y-2">
                <Label htmlFor="chat-welcome">{t("welcome")}</Label>
                <Textarea
                  id="chat-welcome"
                  maxLength={500}
                  value={form.welcome}
                  onChange={(e) =>
                    setForm({ ...form, welcome: e.target.value })
                  }
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {o("AI_PILOT_CAP")}
              </p>
              <div className="space-y-2">
                <Label htmlFor="daily-limit">{t("dailyLimit")}</Label>
                <Input
                  id="daily-limit"
                  type="number"
                  min={1}
                  max={1000}
                  required
                  value={form.dailyLimit}
                  onChange={(e) =>
                    setForm({ ...form, dailyLimit: Number(e.target.value) })
                  }
                />
              </div>
            </fieldset>
            {error && <ChatError code={error} />}
            <Button disabled={!writable || busy}>
              {busy ? t("saving") : t("save")}
            </Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{t("link")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input aria-label={t("link")} readOnly value={chatUrl} />
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={() => copy(chatUrl)}>
              {t("copy")}
            </Button>
            <Button asChild>
              <a href={chatUrl} target="_blank" rel="noreferrer">
                {t("preview")}
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{t("snippet")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">{t("install")}</p>
          <Textarea
            aria-label={t("snippet")}
            readOnly
            rows={4}
            value={snippet}
            className="font-mono text-xs"
          />
          <Button variant="outline" onClick={() => copy(snippet)}>
            {t("copy")}
          </Button>
          <p className="text-xs text-muted-foreground">{t("manualNotice")}</p>
        </CardContent>
      </Card>
      <p className="text-xs text-muted-foreground">{t("retention")}</p>
    </div>
  );
}
export default function Integrations() {
  const t = useTranslations("pilot");
  const { data, error, reload } = useRemote<ChatConfig>("/api/chat/config");
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t("setup")}</h1>
        <p className="mt-2 text-muted-foreground">{t("setupIntro")}</p>
      </div>
      {error && <ChatError code={error} />}
      <Button variant="outline" onClick={() => void reload().catch(() => {})}>
        {t("refresh")}
      </Button>
      {data && <SetupForm initial={data} reload={reload} />}
      <ChannelsManager />
      <QueueHealth />
    </div>
  );
}
