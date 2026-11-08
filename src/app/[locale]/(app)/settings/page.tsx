"use client";
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useWorkspace } from "@/components/workspace-provider";
import { api, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TeamManager, BillingPanel } from "@/components/omni/team-manager";
import { BookingSettingsCard } from "@/components/booking/booking-settings";
export default function Settings() {
  const { data, reload } = useWorkspace();
  const t = useTranslations("backend"),
    locale = useLocale(),
    router = useRouter();
  const [form, setForm] = useState(data.organization),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [currentPassword, setCurrentPassword] = useState(""),
    [newPassword, setNewPassword] = useState(""),
    [passwordBusy, setPasswordBusy] = useState(false),
    [passwordError, setPasswordError] = useState("");
  const writable = data.user.role !== "agent";
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await api("/api/settings", "PATCH", form);
      setForm((await reload()).organization);
      toast.success(t("saved"));
    } catch (error) {
      setError(error instanceof ApiError ? error.code : "SERVER_ERROR");
    } finally {
      setBusy(false);
    }
  }
  async function changePassword(event: React.FormEvent) {
    event.preventDefault();
    if (passwordBusy) return;
    setPasswordBusy(true);
    setPasswordError("");
    try {
      await api("/api/auth/password", "POST", { currentPassword, newPassword });
      toast.success(t("passwordChanged"));
      router.replace(`/${locale}/login`);
      router.refresh();
    } catch (error) {
      setPasswordError(error instanceof ApiError ? error.code : "SERVER_ERROR");
    } finally {
      setPasswordBusy(false);
    }
  }
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">{t("companySettings")}</h1>
      <form onSubmit={save} className="space-y-6">
        <fieldset disabled={!writable || busy} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("profile")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="company-name">{t("companyName")}</Label>
                <Input
                  id="company-name"
                  required
                  minLength={2}
                  maxLength={160}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="industry">{t("industry")}</Label>
                <Input
                  id="industry"
                  maxLength={200}
                  value={form.industry}
                  onChange={(e) =>
                    setForm({ ...form, industry: e.target.value })
                  }
                />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="timezone">{t("timezone")}</Label>
                  <Input
                    id="timezone"
                    required
                    maxLength={80}
                    placeholder="Europe/Kyiv"
                    value={form.timezone}
                    onChange={(e) =>
                      setForm({ ...form, timezone: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="currency">{t("currency")}</Label>
                  <select
                    id="currency"
                    className="w-full h-8 border rounded-lg px-2 bg-background"
                    value={form.currency}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        currency: e.target.value as typeof form.currency,
                      })
                    }
                  >
                    {["UAH", "USD", "EUR", "PLN"].map((x) => (
                      <option key={x}>{x}</option>
                    ))}
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{t("aiSettings")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">{t("aiPending")}</p>
              <div className="space-y-1.5">
                <Label htmlFor="prompt">{t("prompt")}</Label>
                <Textarea
                  id="prompt"
                  rows={5}
                  maxLength={6000}
                  value={form.aiSettings.systemPrompt}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      aiSettings: {
                        ...form.aiSettings,
                        systemPrompt: e.target.value,
                      },
                    })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tone">{t("tone")}</Label>
                <select
                  id="tone"
                  className="w-full h-8 border rounded-lg px-2 bg-background"
                  value={form.aiSettings.tone}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      aiSettings: {
                        ...form.aiSettings,
                        tone: e.target.value as typeof form.aiSettings.tone,
                      },
                    })
                  }
                >
                  {["friendly", "formal", "concise", "consultative"].map(
                    (x) => (
                      <option key={x} value={x}>
                        {t(x)}
                      </option>
                    ),
                  )}
                </select>
              </div>
            </CardContent>
          </Card>
        </fieldset>
        {error && (
          <p role="alert" className="text-destructive text-sm">
            {t.has(error) ? t(error) : t("SERVER_ERROR")}
          </p>
        )}
        <Button type="submit" disabled={!writable || busy}>
          {busy ? t("saving") : t("save")}
        </Button>
      </form>
      <BookingSettingsCard />
      <TeamManager />
      <Card>
        <CardHeader>
          <CardTitle>{t("passwordChange")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={changePassword} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="current-password">{t("currentPassword")}</Label>
              <Input
                id="current-password"
                type="password"
                autoComplete="current-password"
                maxLength={128}
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-password">{t("newPassword")}</Label>
              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                minLength={12}
                maxLength={128}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                {t("passwordHint")}
              </p>
            </div>
            {passwordError && (
              <p role="alert" className="text-sm text-destructive">
                {t.has(passwordError) ? t(passwordError) : t("SERVER_ERROR")}
              </p>
            )}
            <Button disabled={passwordBusy} type="submit">
              {t("passwordChange")}
            </Button>
          </form>
        </CardContent>
      </Card>
      <BillingPanel />
    </div>
  );
}
