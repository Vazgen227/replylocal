"use client";
import { useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { BarChart3, CalendarDays, Check, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";
import { AppFrame, ChannelDot } from "./product-window";

type Tab = "inbox" | "bookings" | "report";

function InboxScreen() {
  const t = useTranslations("home");
  const rows = [
    ["viber", t("conv1Name"), t("conv1Text"), t("stAi"), "ai"],
    ["telegram", t("conv2Name"), t("conv2Text"), t("stAi"), "ai"],
    ["website", t("conv3Name"), t("conv3Text"), t("stHuman"), "human"],
    ["telegram", t("conv4Name"), t("conv4Text"), t("stBooked"), "booked"],
  ] as const;
  return (
    <ul className="divide-y text-sm">
      {rows.map(([channel, name, text, label, kind]) => (
        <li key={name} className="flex items-center gap-3 px-4 py-3">
          <ChannelDot channel={channel} />
          <span className="w-20 shrink-0 font-semibold">{name}</span>
          <span className="min-w-0 flex-1 truncate text-muted-foreground">{text}</span>
          <span
            className={cn(
              "shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase",
              kind === "ai" && "bg-primary/15 text-primary",
              kind === "human" && "bg-cta/15 text-cta",
              kind === "booked" && "bg-success/15 text-success",
            )}
          >
            {label}
          </span>
        </li>
      ))}
    </ul>
  );
}
function BookingsScreen() {
  const t = useTranslations("home");
  const rows = [
    [t("bkRow1"), t("bkConfirmed"), false],
    [t("bkRow2"), t("bkPending"), true],
    [t("bkRow3"), t("bkConfirmed"), false],
  ] as const;
  return (
    <div className="space-y-3 p-4 text-sm">
      <div className="flex items-center justify-between">
        <span className="font-bold">{t("bkToday")}</span>
        <span className="font-mono text-[11px] text-muted-foreground">{t("bkBays")}</span>
      </div>
      {rows.map(([row, status, pending]) => (
        <div
          key={row}
          className={cn("flex flex-wrap items-center gap-2 rounded-lg border p-3", pending && "border-cta/50 bg-cta/5")}
        >
          <span className="min-w-0 flex-1 font-medium">{row}</span>
          {pending && (
            <span className="rounded border px-1.5 py-0.5 font-mono text-[10px] uppercase text-muted-foreground">
              {t("bkFromAi")}
            </span>
          )}
          <span
            className={cn(
              "rounded px-1.5 py-0.5 text-[11px] font-semibold",
              pending ? "bg-cta/15 text-cta" : "bg-success/15 text-success",
            )}
          >
            {status}
          </span>
          {pending && (
            <span className="w-full rounded-md bg-primary px-3 py-1.5 text-center text-xs font-bold text-primary-foreground sm:w-auto">
              {t("panelConfirm")}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
function ReportScreen() {
  const t = useTranslations("home");
  const rows = [
    ["Telegram", 64, 21, 31500],
    ["Viber", 48, 15, 22500],
    [t("channelWebsite"), 27, 8, 12000],
  ] as const;
  const max = Math.max(...rows.map((r) => r[3]));
  return (
    <div className="p-4 text-sm">
      <p className="mb-3 font-bold">{t("rpMonth")}</p>
      <table className="w-full text-left">
        <thead className="font-mono text-[11px] uppercase text-muted-foreground">
          <tr>
            <th className="pb-2 font-medium">{t("rpChannel")}</th>
            <th className="pb-2 text-right font-medium">{t("rpConversations")}</th>
            <th className="pb-2 text-right font-medium">{t("rpWon")}</th>
            <th className="pb-2 text-right font-medium">{t("rpRevenue")}</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map(([channel, chats, won, revenue]) => (
            <tr key={channel}>
              <td className="py-2.5">
                <span className="font-semibold">{channel}</span>
                <span className="mt-1.5 block h-1.5 rounded-full bg-muted">
                  <span className="block h-full rounded-full bg-primary" style={{ width: `${(revenue / max) * 100}%` }} />
                </span>
              </td>
              <td className="py-2.5 text-right font-mono tabular-nums">{chats}</td>
              <td className="py-2.5 text-right font-mono tabular-nums">{won}</td>
              <td className="py-2.5 text-right font-mono tabular-nums">{revenue.toLocaleString("uk-UA")} ₴</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-3 text-xs text-muted-foreground">{t("rpNote")}</p>
    </div>
  );
}

export function DemoTabs() {
  const t = useTranslations("home");
  const base = useId();
  const [tab, setTab] = useState<Tab>("inbox");
  const refs = useRef<Record<Tab, HTMLButtonElement | null>>({ inbox: null, bookings: null, report: null });
  const tabs = [
    { id: "inbox", label: t("tabInbox"), Icon: Inbox, points: [t("inboxP1"), t("inboxP2"), t("inboxP3")], Screen: InboxScreen },
    { id: "bookings", label: t("tabBookings"), Icon: CalendarDays, points: [t("bookP1"), t("bookP2"), t("bookP3")], Screen: BookingsScreen },
    { id: "report", label: t("tabReport"), Icon: BarChart3, points: [t("repP1"), t("repP2"), t("repP3")], Screen: ReportScreen },
  ] as const;
  const current = tabs.find((x) => x.id === tab)!;
  function onKey(e: React.KeyboardEvent, index: number) {
    if (!["ArrowRight", "ArrowLeft"].includes(e.key)) return;
    e.preventDefault();
    const next = tabs[(index + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length].id;
    setTab(next);
    refs.current[next]?.focus();
  }
  return (
    <div>
      <div role="tablist" aria-label={t("demoTitle")} className="mx-auto mb-8 flex w-fit max-w-full gap-1 overflow-x-auto rounded-xl border bg-card p-1">
        {tabs.map(({ id, label, Icon }, i) => (
          <button
            key={id}
            ref={(el) => {
              refs.current[id] = el;
            }}
            role="tab"
            id={`${base}-${id}-tab`}
            aria-selected={tab === id}
            aria-controls={`${base}-${id}-panel`}
            tabIndex={tab === id ? 0 : -1}
            onClick={() => setTab(id)}
            onKeyDown={(e) => onKey(e, i)}
            className={cn(
              "flex min-h-11 shrink-0 items-center gap-2 rounded-lg px-4 text-sm font-semibold transition-colors duration-150",
              tab === id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="size-4" aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>
      <div
        role="tabpanel"
        id={`${base}-${current.id}-panel`}
        aria-labelledby={`${base}-${current.id}-tab`}
        className="grid items-center gap-8 lg:grid-cols-[0.8fr_1.2fr]"
      >
        <ul className="space-y-4">
          {current.points.map((p, i) => (
            <li key={p} className="flex gap-4">
              <span className="font-mono text-sm font-bold text-primary">{String(i + 1).padStart(2, "0")}</span>
              <span className="flex-1 text-lg leading-relaxed">{p}</span>
              <Check className="mt-1 size-5 shrink-0 text-success" aria-hidden="true" />
            </li>
          ))}
        </ul>
        <AppFrame url={`app.replylocal · ${current.label}`}>
          <current.Screen />
        </AppFrame>
      </div>
    </div>
  );
}
