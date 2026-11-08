"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRemote } from "@/components/chat/use-remote";
import { useWorkspace } from "@/components/workspace-provider";
import { api } from "@/lib/api-client";
import type { ChannelReport } from "@/lib/omni-schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Field, OmniError, selectClass, useTask } from "./common";
type Report = {
  month: string;
  rows: ChannelReport[];
  costs: Array<{
    channel: string;
    currency: string;
    amount: number;
    version: number;
  }>;
};
export function ChannelReports() {
  const t = useTranslations("omni"),
    { data: workspace } = useWorkspace();
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7)),
    [channel, setChannel] = useState("website"),
    [currency, setCurrency] = useState("UAH"),
    [amount, setAmount] = useState("0");
  const { data, error, reload } = useRemote<Report>(
      `/api/analytics/channels?month=${month}-01`,
    ),
    task = useTask();
  function exportCsv() {
    if (!data) return;
    const fields = [
      "channel",
      "currency",
      "conversations",
      "qualified",
      "won",
      "lost",
      "conversion",
      "revenue",
      "grossProfit",
      "profitRecorded",
      "cost",
    ] as const;
    const content =
      "\ufeff" +
      [
        fields.join(","),
        ...data.rows.map((row) =>
          fields.map((f) => JSON.stringify(row[f])).join(","),
        ),
      ].join("\r\n");
    const u = URL.createObjectURL(
      new Blob([content], { type: "text/csv;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = u;
    a.download = `replylocal-channels-${month}.csv`;
    a.click();
    URL.revokeObjectURL(u);
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("reports")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="text-sm text-muted-foreground">{t("reportHint")}</p>
        <div className="flex flex-wrap items-end gap-3">
          <Field label={t("month")}>
            <Input
              type="month"
              required
              value={month}
              min="2020-01"
              max="2100-12"
              onChange={(e) => {
                if (e.target.value) setMonth(e.target.value);
              }}
            />
          </Field>
          <Button
            variant="outline"
            onClick={() => void reload().catch(() => {})}
          >
            {t("refresh")}
          </Button>
          <Button
            variant="outline"
            disabled={!data?.rows.length}
            onClick={exportCsv}
          >
            {t("exportCsv")}
          </Button>
        </div>
        <OmniError code={error || task.error} />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead>
              <tr className="border-b">
                {[
                  "provider",
                  "currency",
                  "conversations",
                  "qualified",
                  "won",
                  "conversion",
                  "revenue",
                  "grossProfit",
                  "cost",
                  "afterSpend",
                ].map((k) => (
                  <th className="p-3 font-medium" key={k}>
                    {t(k)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data?.rows.map((r) => (
                <tr key={r.channel + r.currency} className="border-b">
                  <td className="p-3 font-medium">{t(r.channel)}</td>
                  <td className="p-3">{r.currency}</td>
                  <td className="p-3">{r.conversations}</td>
                  <td className="p-3">{r.qualified}</td>
                  <td className="p-3">{r.won}</td>
                  <td className="p-3">{r.conversion.toFixed(1)}%</td>
                  <td className="p-3">{r.revenue.toFixed(2)}</td>
                  <td className="p-3">
                    {r.grossProfit.toFixed(2)}
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t("profitCoverage", {
                        count: r.profitRecorded,
                        won: r.won,
                      })}
                    </p>
                  </td>
                  <td className="p-3">{r.cost.toFixed(2)}</td>
                  <td className="p-3">{(r.grossProfit - r.cost).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data && !data.rows.length && (
          <p className="text-sm text-muted-foreground">{t("noData")}</p>
        )}
        {workspace.user.role !== "agent" && (
          <form
            className="space-y-3 rounded-lg border p-4"
            onSubmit={(e) => {
              e.preventDefault();
              void task.run(async () => {
                const version =
                  data?.costs.find(
                    (c) => c.channel === channel && c.currency === currency,
                  )?.version ?? 0;
                await api("/api/analytics/channels", "POST", {
                  channel,
                  currency,
                  month: month + "-01",
                  amount: Number(amount),
                  version,
                });
                await reload();
              });
            }}
          >
            <p className="text-sm text-muted-foreground">{t("costHint")}</p>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label={t("provider")}>
                <select
                  className={selectClass}
                  value={channel}
                  onChange={(e) => {
                    setChannel(e.target.value);
                    setAmount(
                      String(
                        data?.costs.find(
                          (c) =>
                            c.channel === e.target.value &&
                            c.currency === currency,
                        )?.amount ?? 0,
                      ),
                    );
                  }}
                >
                  {[
                    "website",
                    "telegram",
                    "whatsapp",
                    "viber",
                    "instagram",
                  ].map((v) => (
                    <option key={v} value={v}>
                      {t(v)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={t("currency")}>
                <select
                  className={selectClass}
                  value={currency}
                  onChange={(e) => {
                    setCurrency(e.target.value);
                    setAmount(
                      String(
                        data?.costs.find(
                          (c) =>
                            c.channel === channel &&
                            c.currency === e.target.value,
                        )?.amount ?? 0,
                      ),
                    );
                  }}
                >
                  {["UAH", "USD", "EUR", "PLN"].map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </Field>
              <Field label={t("cost")}>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max="9999999999.99"
                  value={amount}
                  required
                  onChange={(e) => setAmount(e.target.value)}
                />
              </Field>
            </div>
            <Button disabled={task.busy}>
              {t(task.busy ? "saving" : "save")}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
