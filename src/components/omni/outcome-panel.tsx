"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { useWorkspace } from "@/components/workspace-provider";
import { useRemote } from "@/components/chat/use-remote";
import { api } from "@/lib/api-client";
import type { Outcome } from "@/lib/omni-schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Field, OmniError, selectClass, useTask } from "./common";
function OutcomeForm({
  id,
  initial,
  reload,
  onChanged,
}: {
  id: string;
  initial: Outcome;
  reload: () => Promise<Outcome>;
  onChanged: () => void;
}) {
  const t = useTranslations("omni"),
    { data } = useWorkspace(),
    task = useTask();
  const [form, setForm] = useState(initial),
    [profit, setProfit] = useState(
      initial.grossProfit === null ? "" : String(initial.grossProfit),
    ),
    [saved, setSaved] = useState(false),
    [dirty, setDirty] = useState(false);
  if (initial.version !== form.version && !dirty) {
    setForm(initial);
    setProfit(initial.grossProfit === null ? "" : String(initial.grossProfit));
  }
  function update(v: Partial<Outcome>) {
    setDirty(true);
    setSaved(false);
    setForm({ ...form, ...v });
  }
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        void task.run(async () => {
          await api(`/api/conversations/${id}/outcome`, "PATCH", {
            version: form.version,
            stage: form.leadStage,
            value: form.dealValue,
            grossProfit: profit === "" ? null : Number(profit),
            currency: form.dealCurrency,
            nextStep: form.nextStep,
            assignedTo: form.assignedTo,
          });
          setForm(await reload());
          setDirty(false);
          setSaved(true);
          onChanged();
        });
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("stage")}>
          <select
            className={selectClass}
            value={form.leadStage}
            onChange={(e) => {
              setSaved(false);
              update({
                leadStage: e.target.value as Outcome["leadStage"],
              });
            }}
          >
            {["new", "qualified", "won", "lost"].map((v) => (
              <option value={v} key={v}>
                {t(v)}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t("assignee")}>
          <select
            className={selectClass}
            value={form.assignedTo ?? ""}
            onChange={(e) => update({ assignedTo: e.target.value || null })}
          >
            <option value="" disabled={data.user.role === "agent"}>
              {t("unassigned")}
            </option>
            {data.team.map((m) => (
              <option
                value={m.id}
                key={m.id}
                disabled={
                  data.user.role === "agent" &&
                  m.id !== data.user.id &&
                  m.id !== initial.assignedTo
                }
              >
                {m.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t("value")}>
          <Input
            type="number"
            min="0"
            max="9999999999.99"
            step="0.01"
            required
            value={form.dealValue}
            onChange={(e) => update({ dealValue: Number(e.target.value) })}
          />
        </Field>
        <Field label={t("currency")}>
          <select
            className={selectClass}
            value={form.dealCurrency}
            onChange={(e) =>
              update({
                dealCurrency: e.target.value as Outcome["dealCurrency"],
              })
            }
          >
            {["UAH", "USD", "EUR", "PLN"].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </Field>
      </div>
      <Field label={t("grossProfit")}>
        <Input
          type="number"
          step="0.01"
          max="9999999999.99"
          min="-9999999999.99"
          value={profit}
          onChange={(e) => {
            setDirty(true);
            setProfit(e.target.value);
          }}
        />
      </Field>
      <p className="text-xs text-muted-foreground">{t("profitHint")}</p>
      <Field label={t("nextStep")}>
        <Textarea
          value={form.nextStep}
          maxLength={1000}
          onChange={(e) => update({ nextStep: e.target.value })}
        />
      </Field>
      <OmniError code={task.error} />
      <div className="flex gap-3">
        <Button disabled={task.busy}>{t(task.busy ? "saving" : "save")}</Button>
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            void task.run(async () => {
              const v = await reload();
              setForm(v);
              setDirty(false);
              setProfit(v.grossProfit === null ? "" : String(v.grossProfit));
            })
          }
        >
          {t("refresh")}
        </Button>
      </div>
      {saved && (
        <p role="status" className="text-sm">
          {t("saved")}
        </p>
      )}
    </form>
  );
}
export function OutcomePanel({
  id,
  onChanged,
}: {
  id: string;
  onChanged: () => void;
}) {
  const t = useTranslations("omni"),
    { data, error, reload } = useRemote<Outcome>(
      `/api/conversations/${id}/outcome`,
      5000,
    ),
    task = useTask();
  const [note, setNote] = useState("");
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {t("outcome")}
          {data && (
            <span className="ml-3 text-sm font-normal text-muted-foreground">
              {t(data.channel)}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <OmniError code={error || task.error} />
        {data && (
          <>
            {data.attribution &&
              Object.values(data.attribution).some(Boolean) && (
                <p className="break-all rounded bg-muted p-3 text-xs">
                  {Object.entries(data.attribution)
                    .filter(([, v]) => v)
                    .map(([k, v]) => `${k}: ${v}`)
                    .join(" · ")}
                </p>
              )}
            <OutcomeForm
              id={id}
              initial={data}
              reload={reload}
              onChanged={onChanged}
            />
            <div className="space-y-3 border-t pt-4">
              <h3 className="font-semibold">{t("notes")}</h3>
              <p className="text-xs text-muted-foreground">{t("noteHint")}</p>
              <form
                className="space-y-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  void task.run(async () => {
                    await api(`/api/conversations/${id}/notes`, "POST", {
                      content: note.trim(),
                    });
                    setNote("");
                    await reload();
                  });
                }}
              >
                <Textarea
                  aria-label={t("notes")}
                  required
                  maxLength={2000}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
                <Button disabled={task.busy || !note.trim()} variant="outline">
                  {t("addNote")}
                </Button>
              </form>
              {data.notes.map((n) => (
                <article key={n.id} className="rounded-lg bg-muted p-3 text-sm">
                  <p className="whitespace-pre-wrap break-words">{n.content}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {n.name} · {new Date(n.createdAt).toLocaleString()}
                  </p>
                </article>
              ))}
            </div>
            {data.channel !== "website" && (
              <div className="space-y-3 border-t pt-4">
                <h3 className="font-semibold">{t("delivery")}</h3>
                {data.deliveries.map((d) => (
                  <article
                    key={d.id}
                    className="space-y-2 rounded-lg border p-3 text-sm"
                  >
                    <p className="line-clamp-2 break-words">{d.content}</p>
                    <p className="font-medium">{t(d.status)}</p>
                    {d.lastError && <OmniError code={d.lastError} />}
                    {["failed", "uncertain"].includes(d.status) && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={task.busy}
                        onClick={() => {
                          if (window.confirm(t("retryConfirm")))
                            void task.run(async () => {
                              await api("/api/deliveries/retry", "POST", {
                                id: d.id,
                                confirmPossibleDuplicate: true,
                              });
                              await reload();
                            });
                        }}
                      >
                        {t("retry")}
                      </Button>
                    )}
                  </article>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
