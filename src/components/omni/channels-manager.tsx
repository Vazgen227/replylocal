"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRemote } from "@/components/chat/use-remote";
import { useWorkspace } from "@/components/workspace-provider";
import { api } from "@/lib/api-client";
import { providers, type Provider, type Connection } from "@/lib/omni-schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Field, OmniError, selectClass, useTask } from "./common";
const blank = {
  provider: "telegram" as Provider,
  label: "",
  accessToken: "",
  appSecret: "",
  accountId: "",
  telegramMode: "bot",
  businessUserId: "",
};
export function ChannelsManager() {
  const t = useTranslations("omni"),
    { data: workspace } = useWorkspace(),
    task = useTask();
  const { data, error, reload } = useRemote<{ connections: Connection[] }>(
    "/api/channels",
    15000,
  );
  const [form, setForm] = useState(blank),
    [editing, setEditing] = useState<Connection | null>(null);
  const writable = workspace.user.role !== "agent";
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await task.run(async () => {
      await api(
        editing ? `/api/channels/${editing.id}` : "/api/channels",
        editing ? "PUT" : "POST",
        editing ? { credentials: form, version: editing.version } : form,
      );
      setForm(blank);
      setEditing(null);
      await reload();
    });
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("channels")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <p className="text-sm text-muted-foreground">{t("channelsIntro")}</p>
        <OmniError code={error || task.error} />
        <div className="space-y-4">
          {data?.connections.map((c) => (
            <article key={c.id} className="space-y-3 rounded-xl border p-4">
              <div className="flex flex-wrap justify-between gap-2">
                <div>
                  <h3 className="font-semibold">
                    {c.label} · {t(c.provider)}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {c.accountId} · {t(c.enabled ? "enabled" : "disabled")}
                  </p>
                </div>
                {writable && (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={task.busy}
                      onClick={() =>
                        void task.run(async () => {
                          await api(`/api/channels/${c.id}`, "PATCH", {
                            enabled: !c.enabled,
                            version: c.version,
                          });
                          await reload();
                        })
                      }
                    >
                      {t(c.enabled ? "disable" : "enable")}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditing(c);
                        setForm({
                          ...blank,
                          provider: c.provider,
                          label: c.label,
                          accountId: c.accountId ?? "",
                          telegramMode: c.settings.telegramMode ?? "bot",
                          businessUserId: c.settings.businessUserId ?? "",
                        });
                      }}
                    >
                      {t("replace")}
                    </Button>
                  </div>
                )}
              </div>
              {writable && (
                <>
                  <Field label={t("webhook")}>
                    <Input readOnly value={c.webhookUrl} />
                  </Field>
                  {["whatsapp", "instagram"].includes(c.provider) && (
                    <Field label={t("verifyToken")}>
                      <Input readOnly value={c.verifyToken ?? ""} />
                    </Field>
                  )}
                </>
              )}
              <p className="text-xs text-muted-foreground">
                {t("lastEvent")}:{" "}
                {c.lastWebhookAt
                  ? new Date(c.lastWebhookAt).toLocaleString()
                  : t("awaitEvent")}
              </p>
              {c.lastError && <OmniError code={c.lastError} />}
            </article>
          ))}
          {data && !data.connections.length && (
            <p className="text-sm text-muted-foreground">
              {t("noConnections")}
            </p>
          )}
        </div>
        {writable && (
          <form onSubmit={submit} className="space-y-4 rounded-xl border p-4">
            <fieldset
              disabled={task.busy}
              className="grid gap-4 sm:grid-cols-2"
            >
              <Field label={t("provider")}>
                <select
                  className={selectClass}
                  value={form.provider}
                  disabled={!!editing}
                  onChange={(e) =>
                    setForm({ ...blank, provider: e.target.value as Provider })
                  }
                >
                  {providers.map((p) => (
                    <option key={p} value={p}>
                      {t(p)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={t("label")}>
                <Input
                  required
                  minLength={2}
                  maxLength={80}
                  value={form.label}
                  onChange={(e) => setForm({ ...form, label: e.target.value })}
                />
              </Field>
              <div className="sm:col-span-2">
                <Field label={t("token")}>
                  <Input
                    type="password"
                    autoComplete="off"
                    required
                    minLength={10}
                    maxLength={4000}
                    value={form.accessToken}
                    onChange={(e) =>
                      setForm({ ...form, accessToken: e.target.value.trim() })
                    }
                  />
                </Field>
              </div>
              {["whatsapp", "instagram"].includes(form.provider) && (
                <>
                  <Field label={t("accountId")}>
                    <Input
                      required
                      pattern="[0-9]+"
                      value={form.accountId}
                      onChange={(e) =>
                        setForm({ ...form, accountId: e.target.value })
                      }
                    />
                  </Field>
                  <Field label={t("appSecret")}>
                    <Input
                      type="password"
                      autoComplete="off"
                      value={form.appSecret}
                      onChange={(e) =>
                        setForm({ ...form, appSecret: e.target.value.trim() })
                      }
                    />
                  </Field>
                </>
              )}
              {form.provider === "telegram" && (
                <>
                  <Field label={t("botMode")}>
                    <select
                      className={selectClass}
                      value={form.telegramMode}
                      onChange={(e) =>
                        setForm({ ...form, telegramMode: e.target.value })
                      }
                    >
                      <option value="bot">{t("bot")}</option>
                      <option value="business">{t("business")}</option>
                    </select>
                  </Field>
                  {form.telegramMode === "business" && (
                    <Field label={t("businessUserId")}>
                      <Input
                        required
                        pattern="[0-9]+"
                        value={form.businessUserId}
                        onChange={(e) =>
                          setForm({ ...form, businessUserId: e.target.value })
                        }
                      />
                    </Field>
                  )}
                </>
              )}
            </fieldset>
            <div className="flex flex-wrap gap-2">
              <Button disabled={task.busy}>
                {t(task.busy ? "saving" : "connect")}
              </Button>
              {editing && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setEditing(null);
                    setForm(blank);
                  }}
                >
                  {t("cancel")}
                </Button>
              )}
            </div>
          </form>
        )}
        <p className="text-sm text-muted-foreground">{t("providerSetup")}</p>
        <p className="text-xs text-muted-foreground">{t("channelLimits")}</p>
      </CardContent>
    </Card>
  );
}
export function QueueHealth() {
  const { data } = useWorkspace();
  return data.user.role === "agent" ? null : <QueueHealthBody />;
}
function QueueHealthBody() {
  const t = useTranslations("omni"),
    { data: workspace } = useWorkspace();
  const { data, error, reload } = useRemote<{
    jobs: Array<{ kind: string; status: string; count: number }>;
    failures: Array<{ id: string; kind: string; lastError: string }>;
  }>("/api/jobs", 15000);
  const task = useTask();
  if (workspace.user.role === "agent") return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("queue")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{t("queueHint")}</p>
        <Button variant="outline" onClick={() => void reload().catch(() => {})}>
          {t("refresh")}
        </Button>
        <OmniError code={error || task.error} />
        <div className="flex flex-wrap gap-2">
          {data?.jobs.map((j) => (
            <span
              key={j.kind + j.status}
              className="rounded bg-muted px-3 py-2 text-xs"
            >
              {t(j.kind === "email" ? "emailJob" : j.kind)} · {t(j.status)}:{" "}
              {j.count}
            </span>
          ))}
        </div>
        {data?.failures.map((f) => (
          <div
            className="flex flex-wrap items-center justify-between gap-2 border-t pt-3"
            key={f.id}
          >
            <OmniError code={f.lastError} />
            <Button
              variant="outline"
              size="sm"
              disabled={task.busy}
              onClick={() =>
                void task.run(async () => {
                  await api("/api/jobs", "POST", { id: f.id });
                  await reload();
                })
              }
            >
              {t("retry")}
            </Button>
          </div>
        ))}
        {data && !data.failures.length && (
          <p className="text-sm text-muted-foreground">{t("noFailures")}</p>
        )}
      </CardContent>
    </Card>
  );
}
