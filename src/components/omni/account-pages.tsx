"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Field, OmniError, useTask } from "./common";
export function JoinAccount({ token }: { token: string }) {
  const t = useTranslations("omni"),
    locale = useLocale(),
    task = useTask();
  const [email, setEmail] = useState(""),
    [name, setName] = useState(""),
    [password, setPassword] = useState("");
  const router = useRouter();
  function success() {
    router.replace(`/${locale}/inbox`);
    router.refresh();
  }
  return (
    <main className="mx-auto max-w-xl p-5 py-12">
      <Card>
        <CardHeader>
          <CardTitle>{t("join")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <p className="text-sm text-muted-foreground">{t("joinHint")}</p>
          <OmniError code={task.error} />
          <div className="flex flex-wrap gap-3">
            <Button
              disabled={task.busy}
              onClick={() =>
                void task.run(async () => {
                  await api("/api/team/accept", "POST", { token });
                  success();
                })
              }
            >
              {t("join")}
            </Button>
            <Button asChild variant="outline">
              <Link
                href={`/${locale}/login?next=${encodeURIComponent("/" + locale + "/join?token=" + token)}`}
              >
                {t("login")}
              </Link>
            </Button>
          </div>
          <form
            className="space-y-4 border-t pt-4"
            onSubmit={(e) => {
              e.preventDefault();
              void task.run(async () => {
                await api("/api/team/register", "POST", {
                  token,
                  email,
                  name,
                  password,
                });
                success();
              });
            }}
          >
            <Field label={t("email")}>
              <Input
                type="email"
                required
                autoComplete="email"
                maxLength={254}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
            <Field label={t("name")}>
              <Input
                required
                autoComplete="name"
                minLength={2}
                maxLength={100}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </Field>
            <Field label={t("password")}>
              <Input
                type="password"
                required
                autoComplete="new-password"
                minLength={12}
                maxLength={128}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Field>
            <Button disabled={task.busy}>{t("register")}</Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
export function ResetAccount({ token }: { token: string }) {
  const t = useTranslations("omni"),
    locale = useLocale(),
    task = useTask();
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [done, setDone] = useState(false);
  return (
    <main className="mx-auto max-w-md p-5 py-12">
      <Card>
        <CardHeader>
          <CardTitle>{t("reset")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <OmniError code={task.error} />
          {done ? (
            <p role="status">{t(token ? "resetDone" : "resetSent")}</p>
          ) : (
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                void task.run(async () => {
                  await api(
                    token ? "/api/auth/reset" : "/api/auth/reset/request",
                    "POST",
                    token ? { token, password } : { email },
                  );
                  setDone(true);
                });
              }}
            >
              {token ? (
                <Field label={t("password")}>
                  <Input
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={12}
                    maxLength={128}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </Field>
              ) : (
                <Field label={t("email")}>
                  <Input
                    type="email"
                    autoComplete="email"
                    required
                    maxLength={254}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </Field>
              )}
              <Button disabled={task.busy}>
                {t(token ? "reset" : "requestReset")}
              </Button>
            </form>
          )}
          <Link className="text-sm underline" href={`/${locale}/login`}>
            {t("login")}
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
