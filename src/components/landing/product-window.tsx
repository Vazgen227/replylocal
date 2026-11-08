"use client";
import { useTranslations } from "next-intl";
import {
  BarChart3,
  BookOpen,
  CalendarCheck,
  CalendarDays,
  Car,
  Globe,
  Inbox,
  LayoutDashboard,
  MessageCircle,
  Send,
  Settings,
  Sparkles,
} from "lucide-react";
import { BrandMark } from "@/components/brand";
import { cn } from "@/lib/utils";

/** Browser-style frame used for every product screen on the landing page. */
export function AppFrame({
  url,
  children,
  className,
}: {
  url: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border bg-card text-card-foreground shadow-[0_40px_120px_-40px_rgb(37_99_235/0.45)]",
        className,
      )}
    >
      <div className="flex items-center gap-3 border-b bg-muted/60 px-4 py-2.5">
        <div className="flex gap-1.5" aria-hidden="true">
          <span className="size-2.5 rounded-full bg-muted-foreground/40" />
          <span className="size-2.5 rounded-full bg-muted-foreground/40" />
          <span className="size-2.5 rounded-full bg-muted-foreground/40" />
        </div>
        <span className="mx-auto truncate rounded-md border bg-background px-3 py-1 font-mono text-[11px] text-muted-foreground">
          {url}
        </span>
      </div>
      {children}
    </div>
  );
}
export function ChannelDot({ channel }: { channel: "telegram" | "viber" | "website" }) {
  const Icon = channel === "telegram" ? Send : channel === "viber" ? MessageCircle : Globe;
  return (
    <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-secondary text-primary">
      <Icon className="size-3.5" aria-hidden="true" />
    </span>
  );
}
function Status({ kind, label }: { kind: "ai" | "human" | "booked"; label: string }) {
  return (
    <span
      className={cn(
        "rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase",
        kind === "ai" && "bg-primary/15 text-primary",
        kind === "human" && "bg-cta/15 text-cta",
        kind === "booked" && "bg-success/15 text-success",
      )}
    >
      {label}
    </span>
  );
}

export function ProductWindow() {
  const t = useTranslations("home");
  const conversations = [
    { name: t("conv1Name"), text: t("conv1Text"), channel: "viber", status: "ai", time: "10:42", active: true },
    { name: t("conv2Name"), text: t("conv2Text"), channel: "telegram", status: "ai", time: "10:31" },
    { name: t("conv3Name"), text: t("conv3Text"), channel: "website", status: "human", time: "09:58" },
    { name: t("conv4Name"), text: t("conv4Text"), channel: "telegram", status: "booked", time: "09:12" },
  ] as const;
  const statusLabel = { ai: t("stAi"), human: t("stHuman"), booked: t("stBooked") };
  const car = [
    [t("carModel"), "Skoda Octavia"],
    [t("carYear"), "2015"],
    [t("carProblem"), t("carProblemValue")],
    [t("carPhone"), "+380 50 111 22 33"],
  ];
  return (
    <AppFrame url={t("winUrl")}>
      <div className="grid text-left text-[13px] md:grid-cols-[52px_220px_1fr] xl:grid-cols-[52px_240px_1fr_280px]">
        {/* Sidebar */}
        <div className="hidden flex-col items-center gap-2 border-r bg-sidebar py-3 md:flex" aria-hidden="true">
          <BrandMark className="size-8 rounded-lg" />
          {[LayoutDashboard, Inbox, CalendarDays, BookOpen, BarChart3, Settings].map((Icon, i) => (
            <span
              key={i}
              className={cn(
                "flex size-9 items-center justify-center rounded-lg text-muted-foreground",
                i === 1 && "bg-sidebar-accent text-primary",
              )}
            >
              <Icon className="size-4" />
            </span>
          ))}
        </div>
        {/* Conversation list */}
        <div className="hidden border-r md:block">
          <div className="flex items-center justify-between border-b px-3 py-2.5">
            <span className="font-bold">{t("winInbox")}</span>
            <span className="rounded border px-1.5 py-0.5 text-[11px] text-muted-foreground">{t("winFilterAll")}</span>
          </div>
          <ul>
            {conversations.map((c) => (
              <li
                key={c.name}
                className={cn("flex gap-2.5 border-b px-3 py-2.5", "active" in c && c.active && "bg-secondary/60")}
              >
                <ChannelDot channel={c.channel} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-semibold">{c.name}</span>
                    <span className="font-mono text-[10px] text-muted-foreground">{c.time}</span>
                  </div>
                  <p className="truncate text-muted-foreground">{c.text}</p>
                  <div className="mt-1">
                    <Status kind={c.status} label={statusLabel[c.status]} />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
        {/* Thread */}
        <div className="flex min-w-0 flex-col">
          <div className="flex items-center gap-2.5 border-b px-4 py-2.5">
            <ChannelDot channel="viber" />
            <span className="font-bold">{t("conv1Name")} · Viber</span>
            <span className="ml-auto">
              <Status kind="ai" label={statusLabel.ai} />
            </span>
          </div>
          <div className="space-y-2.5 p-4">
            <p className="max-w-[85%] rounded-lg bg-muted px-3 py-2">{t("msgCustomer1")}</p>
            <div className="ml-auto max-w-[88%] rounded-lg border border-primary/30 bg-primary/10 px-3 py-2">
              <p className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold text-primary">
                <Sparkles className="size-3" aria-hidden="true" /> {t("stAi")}
              </p>
              <p>{t("msgAi1")}</p>
              <p className="mt-1.5 border-t border-primary/20 pt-1.5 font-mono text-[10px] text-muted-foreground">
                {t("msgSources")}
              </p>
            </div>
            <p className="max-w-[80%] rounded-lg bg-muted px-3 py-2">{t("msgCustomer2")}</p>
            <div className="ml-auto max-w-[88%] rounded-lg border border-primary/30 bg-primary/10 px-3 py-2">
              <p className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold text-primary">
                <Sparkles className="size-3" aria-hidden="true" /> {t("stAi")}
              </p>
              <p>{t("msgAi2")}</p>
            </div>
          </div>
        </div>
        {/* Booking and car panel */}
        <div className="border-t p-4 xl:border-t-0 xl:border-l md:col-span-3 xl:col-span-1">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
            <div className="rounded-lg border p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 font-bold">
                  <CalendarCheck className="size-4 text-primary" aria-hidden="true" /> {t("panelBooking")}
                </span>
                <span className="rounded bg-cta/15 px-1.5 py-0.5 text-[10px] font-semibold text-cta">{t("panelPending")}</span>
              </div>
              <p className="font-mono text-xs">{t("panelWhen")}</p>
              <p className="text-muted-foreground">{t("panelService")}</p>
              <span className="mt-3 block rounded-md bg-primary px-3 py-2 text-center text-xs font-bold text-primary-foreground">
                {t("panelConfirm")}
              </span>
            </div>
            <div className="rounded-lg border p-3">
              <p className="mb-2 flex items-center gap-1.5 font-bold">
                <Car className="size-4 text-primary" aria-hidden="true" /> {t("panelCar")}
              </p>
              <dl className="space-y-1.5">
                {car.map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">{k}</dt>
                    <dd className="truncate text-right font-medium">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </div>
      </div>
    </AppFrame>
  );
}
