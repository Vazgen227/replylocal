"use client";
import { OutcomePanel } from "@/components/omni/outcome-panel";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { Thread } from "@/lib/chat-schemas";
import { useRemote } from "./use-remote";
import { Bubbles, ChatError } from "./shared";
import { api, ApiError } from "@/lib/api-client";
import { useWorkspace } from "@/components/workspace-provider";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
export function OperatorThread({ id }: { id: string }) {
  const o = useTranslations("omni");
  const t = useTranslations("pilot"),
    locale = useLocale();
  const router = useRouter();
  const workspace = useWorkspace();
  const { data, error, reload, setData } = useRemote<Thread>(
    `/api/conversations/${id}`,
    5000,
  );
  const [text, setText] = useState(""),
    [busy, setBusy] = useState(false),
    [actionError, setActionError] = useState("");
  const pending = useRef<{ text: string; id: string } | null>(null),
    bottom = useRef<HTMLDivElement>(null);
  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "nearest" });
  }, [data?.messages.length]);
  async function action(value: string) {
    if (!data) return;
    setBusy(true);
    setActionError("");
    try {
      setData(
        await api<Thread>(`/api/conversations/${id}`, "PATCH", {
          action: value,
          version: data.version,
        }),
      );
    } catch (e) {
      setActionError(e instanceof ApiError ? e.code : "SERVER_ERROR");
      await reload().catch(() => {});
    } finally {
      setBusy(false);
    }
  }
  async function reply(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || busy) return;
    setBusy(true);
    setActionError("");
    const value = text.trim();
    if (pending.current?.text !== value)
      pending.current = { text: value, id: crypto.randomUUID() };
    try {
      setData(
        await api<Thread>(`/api/conversations/${id}/reply`, "POST", {
          text: value,
          clientId: pending.current.id,
        }),
      );
      setText("");
      pending.current = null;
    } catch (e) {
      setActionError(e instanceof ApiError ? e.code : "SERVER_ERROR");
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    if (!window.confirm(t("deleteConfirm"))) return;
    setBusy(true);
    try {
      await api(`/api/conversations/${id}`, "DELETE");
      router.push(`/${locale}/inbox`);
    } catch (e) {
      setActionError(e instanceof ApiError ? e.code : "SERVER_ERROR");
      setBusy(false);
    }
  }
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4">
      <Link className="text-sm underline" href={`/${locale}/inbox`}>
        {t("back")}
      </Link>
      {error && <ChatError code={error} />}
      <Button
        variant="outline"
        className="self-start"
        onClick={() => void reload().catch(() => {})}
      >
        {t("refresh")}
      </Button>
      {data && (
        <>
          <header className="space-y-3 rounded-xl border bg-background p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="text-xl font-bold break-all">
                  {data.visitorName}
                </h1>
                <p className="text-sm text-muted-foreground break-all">
                  {o(data.channel)} · {data.visitorContact}
                </p>
              </div>
              <span className="rounded-full bg-muted px-3 py-1 text-xs">
                {data.status === "closed"
                  ? t("closed")
                  : data.mode === "human"
                    ? t("human")
                    : t("ai")}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {data.status === "open" ? (
                <>
                  <Button
                    size="sm"
                    disabled={busy}
                    onClick={() =>
                      action(data.mode === "ai" ? "takeover" : "resume")
                    }
                  >
                    {data.mode === "ai" ? t("takeover") : t("resume")}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() => action("close")}
                  >
                    {t("close")}
                  </Button>
                </>
              ) : (
                <Button
                  size="sm"
                  disabled={busy}
                  onClick={() => action("reopen")}
                >
                  {t("reopen")}
                </Button>
              )}
              <Button asChild size="sm" variant="outline">
                <a href={`/api/conversations/${id}/export`}>{t("export")}</a>
              </Button>
              {workspace.data.user.role !== "agent" && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={remove}
                >
                  {t("delete")}
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{t("aiControl")}</p>
          </header>
          <section className="max-h-[55dvh] min-h-40 overflow-y-auto rounded-xl border bg-background p-4">
            <Bubbles messages={data.messages} />
            <div ref={bottom} />
          </section>
          {actionError && <ChatError code={actionError} />}
          <p className="text-xs text-muted-foreground">{t("manualNotice")}</p>
          {data.status === "open" && (
            <form onSubmit={reply} className="space-y-3">
              <Textarea
                rows={3}
                aria-label={t("reply")}
                placeholder={t("reply")}
                maxLength={4000}
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
              <Button disabled={busy || !text.trim()}>
                {busy ? t("sending") : t("send")}
              </Button>
            </form>
          )}
          <OutcomePanel
            id={id}
            onChanged={() => void reload().catch(() => {})}
          />
        </>
      )}
    </div>
  );
}
