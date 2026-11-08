"use client";
import Link from "next/link";
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { ThreadSummary } from "@/lib/chat-schemas";
import { useRemote } from "@/components/chat/use-remote";
import { ChatError } from "@/components/chat/shared";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
export default function Inbox() {
  const o = useTranslations("omni"),
    t = useTranslations("pilot"),
    locale = useLocale();
  const [channel, setChannel] = useState("all"),
    [mine, setMine] = useState(false),
    [search, setSearch] = useState(""),
    [filter, setFilter] = useState("all"),
    [page, setPage] = useState(0);
  const { data, error, reload } = useRemote<{
    threads: ThreadSummary[];
    hasNext: boolean;
  }>(
    `/api/conversations?${new URLSearchParams({ channel, mine: String(mine), search, status: filter, page: String(page) })}`,
    5000,
  );
  const rows = data?.threads ?? [];
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t("inbox")}</h1>
        <p className="mt-2 text-muted-foreground">{t("inboxIntro")}</p>
      </div>
      <div className="flex flex-wrap gap-3">
        <Input
          className="sm:max-w-sm"
          aria-label={t("search")}
          placeholder={t("search")}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
        />
        <select
          aria-label={t("status")}
          className="rounded-lg border bg-background px-3"
          value={filter}
          onChange={(e) => {
            setFilter(e.target.value);
            setPage(0);
          }}
        >
          {["all", "waiting", "closed"].map((f) => (
            <option key={f} value={f}>
              {t(f)}
            </option>
          ))}
        </select>
        <select
          aria-label={o("provider")}
          className="rounded-lg border bg-background px-3"
          value={channel}
          onChange={(e) => {
            setChannel(e.target.value);
            setPage(0);
          }}
        >
          {["all", "website", "telegram", "whatsapp", "viber", "instagram"].map(
            (v) => (
              <option key={v} value={v}>
                {o(v === "all" ? "allChannels" : v)}
              </option>
            ),
          )}
        </select>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={mine}
            onChange={(e) => {
              setMine(e.target.checked);
              setPage(0);
            }}
          />
          {o("mine")}
        </label>
        <Button variant="outline" onClick={() => void reload().catch(() => {})}>
          {t("refresh")}
        </Button>
      </div>
      {error && <ChatError code={error} />}
      <div className="divide-y rounded-xl border bg-background">
        {rows.map((c) => (
          <Link
            key={c.id}
            href={`/${locale}/inbox/${c.id}`}
            className="block space-y-2 p-4 hover:bg-muted/60"
          >
            <div className="flex flex-wrap justify-between gap-2">
              <span className="font-semibold">
                <span>{c.visitorName}</span>{" "}
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  {o(c.channel)} · {o(c.leadStage)}
                </span>
              </span>
              <span className="rounded-full bg-muted px-3 py-1 text-xs">
                {c.status === "closed"
                  ? t("closed")
                  : c.mode === "human"
                    ? t("waiting")
                    : t("ai")}
              </span>
            </div>
            <p className="line-clamp-2 break-words text-sm text-muted-foreground">
              {c.lastMessage}
            </p>
            <time className="text-xs text-muted-foreground">
              {new Date(c.updatedAt).toLocaleString(locale)}
            </time>
          </Link>
        ))}
        {data && !rows.length && (
          <p className="p-6 text-muted-foreground">{t("empty")}</p>
        )}
      </div>
      <div className="flex items-center justify-between gap-3">
        <Button
          variant="outline"
          disabled={page === 0}
          onClick={() => setPage(page - 1)}
        >
          {o("previous")}
        </Button>
        <span className="text-sm text-muted-foreground">{page + 1}</span>
        <Button
          variant="outline"
          disabled={!data?.hasNext}
          onClick={() => setPage(page + 1)}
        >
          {o("next")}
        </Button>
      </div>
    </div>
  );
}
