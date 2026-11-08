"use client";
import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useWorkspace } from "@/components/workspace-provider";
import { useRemote } from "@/components/chat/use-remote";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Field, OmniError, selectClass, useTask } from "./common";
type Team = {
  members: Array<{ id: string; name: string; email: string; role: string }>;
  invites: Array<{ id: string; email: string; role: string }>;
  notifications: boolean;
  emailConfigured: boolean;
};
export function TeamManager() {
  const t = useTranslations("omni"),
    workspace = useWorkspace(),
    task = useTask(),
    { data, error, reload } = useRemote<Team>("/api/team");
  const [email, setEmail] = useState(""),
    [role, setRole] = useState("agent"),
    [invite, setInvite] = useState<{
      link: string;
      emailQueued: boolean;
    } | null>(null);
  const writable = workspace.data.user.role !== "agent",
    owner = workspace.data.user.role === "owner";
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("team")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <OmniError code={error || task.error} />
        {data?.members.map((m) => (
          <div
            className="flex flex-wrap items-center justify-between gap-3 border-b pb-3"
            key={m.id}
          >
            <div className="min-w-0">
              <p className="font-medium">{m.name}</p>
              <p className="break-all text-sm text-muted-foreground">
                {m.email}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {writable &&
              m.role !== "owner" &&
              m.id !== workspace.data.user.id &&
              (owner || m.role === "agent") ? (
                <>
                  <select
                    className={selectClass + " max-w-44"}
                    aria-label={`${t("role")}: ${m.name}`}
                    disabled={task.busy}
                    value={m.role}
                    onChange={(e) =>
                      void task.run(async () => {
                        await api("/api/team/member", "POST", {
                          id: m.id,
                          role: e.target.value,
                        });
                        await reload();
                        await workspace.reload();
                      })
                    }
                  >
                    <option value="agent">{t("agent")}</option>
                    {owner && <option value="admin">{t("admin")}</option>}
                  </select>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={task.busy}
                    onClick={() => {
                      if (window.confirm(t("removeConfirm")))
                        void task.run(async () => {
                          await api("/api/team/member", "POST", {
                            id: m.id,
                            role: null,
                          });
                          await reload();
                          await workspace.reload();
                        });
                    }}
                  >
                    {t("remove")}
                  </Button>
                </>
              ) : (
                <span className="text-sm text-muted-foreground">
                  {t(m.role)}
                </span>
              )}
            </div>
          </div>
        ))}
        {writable && (
          <>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void task.run(async () => {
                  setInvite(await api("/api/team", "POST", { email, role }));
                  setEmail("");
                  await reload();
                });
              }}
              className="space-y-3"
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label={t("email")}>
                  <Input
                    type="email"
                    required
                    maxLength={254}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </Field>
                <Field label={t("role")}>
                  <select
                    className={selectClass}
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                  >
                    <option value="agent">{t("agent")}</option>
                    {owner && <option value="admin">{t("admin")}</option>}
                  </select>
                </Field>
              </div>
              <Button disabled={task.busy}>{t("invite")}</Button>
            </form>
            {invite && (
              <div className="space-y-2 rounded-lg bg-muted p-3">
                <Field label={t("inviteLink")}>
                  <Input readOnly value={invite.link} />
                </Field>
                <p className="text-sm">
                  {t(invite.emailQueued ? "emailQueued" : "emailNotSent")}
                </p>
              </div>
            )}
            {data?.invites.map((i) => (
              <div
                key={i.id}
                className="flex flex-wrap items-center justify-between gap-3 text-sm"
              >
                <span className="break-all">
                  {i.email} · {t(i.role)}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={task.busy}
                  onClick={() =>
                    void task.run(async () => {
                      await api("/api/team", "DELETE", { id: i.id });
                      await reload();
                    })
                  }
                >
                  {t("revoke")}
                </Button>
              </div>
            ))}
            <label className="flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                disabled={task.busy}
                checked={data?.notifications ?? true}
                onChange={(e) =>
                  void task.run(async () => {
                    await api("/api/team", "PATCH", {
                      enabled: e.target.checked,
                    });
                    await reload();
                  })
                }
              />
              {t("notifications")}
            </label>
            <p className="text-xs text-muted-foreground">
              {t("notificationHint")}
            </p>
            {data && !data.emailConfigured && (
              <p className="text-sm text-amber-700 dark:text-amber-300">
                {t("EMAIL_NOT_CONFIGURED")}
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
export function BillingPanel() {
  const t = useTranslations("omni"),
    locale = useLocale(),
    { data: workspace } = useWorkspace(),
    task = useTask();
  const { data, error } = useRemote<{
    configured: boolean;
    plan: string;
    status: string;
    periodEnd: string | null;
  }>("/api/billing", 15000);
  async function go(action: string) {
    await task.run(async () => {
      const r = await api<{ url: string }>("/api/billing", "POST", {
        action,
        locale,
      });
      window.location.assign(r.url);
    });
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("billing")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <OmniError code={error || task.error} />
        {data && (
          <>
            <p className="text-sm">
              {t("subscriptionStatus")}:{" "}
              <strong>
                {t.has(data.status) ? t(data.status) : data.status}
              </strong>{" "}
              · {data.plan}
            </p>
            <p className="text-sm text-muted-foreground">
              {t(data.configured ? "billingHint" : "manualBilling")}
            </p>
            {data.periodEnd && (
              <time className="text-sm">
                {new Date(data.periodEnd).toLocaleDateString(locale)}
              </time>
            )}
            {data.configured && workspace.user.role === "owner" && (
              <div className="flex flex-wrap gap-3">
                {["manual", "canceled", "incomplete_expired"].includes(
                  data.status,
                ) && (
                  <Button
                    disabled={task.busy}
                    onClick={() => void go("checkout")}
                  >
                    {t("checkout")}
                  </Button>
                )}
                <Button
                  disabled={task.busy}
                  variant="outline"
                  onClick={() => void go("portal")}
                >
                  {t("portal")}
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
export function WorkspaceSwitcher() {
  const t = useTranslations("omni"),
    task = useTask();
  const { data } = useRemote<{
    currentId: string;
    workspaces: Array<{ id: string; name: string }>;
  }>("/api/workspaces");
  if (!data || data.workspaces.length < 2) return null;
  return (
    <label className="flex min-w-0 items-center gap-2 text-xs">
      {t("workspaces")}
      <select
        aria-label={t("workspaces")}
        className="max-w-48 rounded border bg-background p-1"
        value={data.currentId}
        disabled={task.busy}
        onChange={(e) =>
          void task.run(async () => {
            await api("/api/workspaces", "POST", { id: e.target.value });
            window.location.reload();
          })
        }
      >
        {data.workspaces.map((w) => (
          <option key={w.id} value={w.id}>
            {w.name}
          </option>
        ))}
      </select>
      <OmniError code={task.error} />
    </label>
  );
}
