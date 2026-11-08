"use client";

import { useState } from "react";
import { BrandMark } from "@/components/brand";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { ArrowRight, Lock, Mail, User, Building } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api-client";

export default function RegisterPage() {
  const locale = useLocale();
  const router = useRouter();
  const t = useTranslations("auth");
  const b = useTranslations("backend");
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [bizName, setBizName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isLoading) return;
    setIsLoading(true);
    setError("");
    try {
      await api("/api/auth/register", "POST", {
        name,
        companyName: bizName,
        email,
        password,
      });
      toast.success(t("registerSuccess"));
      router.replace(`/${locale}/dashboard`);
      router.refresh();
    } catch (error) {
      setError(error instanceof ApiError ? error.code : "SERVER_ERROR");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md">
      <Card className="w-full border bg-card shadow-[0_24px_60px_-32px_rgb(15_23_42/0.35)]">
        <CardHeader className="text-center pb-4">
          <BrandMark className="mx-auto mb-3 size-12 rounded-2xl" />
          <CardTitle className="text-2xl font-extrabold">{t("register")}</CardTitle>
          <CardDescription className="text-sm">
            {t("registerSubtitle")} {b("passwordHint")}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          {error && (
            <p role="alert" className="px-4 pb-3 text-sm text-destructive">
              {b.has(error) ? b(error) : b("SERVER_ERROR")}
            </p>
          )}
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="name" className="text-sm">
                {t("yourName")}
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="name"
                  required
                  placeholder={t("namePlaceholder")}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-11 pl-9 text-sm"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="biz" className="text-sm">
                {t("bizName")}
              </Label>
              <div className="relative">
                <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="biz"
                  required
                  placeholder={t("bizPlaceholder")}
                  value={bizName}
                  onChange={(e) => setBizName(e.target.value)}
                  className="h-11 pl-9 text-sm"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="email" className="text-sm">
                {t("email")}
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  maxLength={254}
                  required
                  placeholder="alex@myshop.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 pl-9 text-sm"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="password" className="text-sm">
                {t("password")}
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  maxLength={128}
                  minLength={12}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 pl-9 text-sm"
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3 pt-2">
            <Button
              type="submit"
              className="h-11 w-full gap-2"
              disabled={isLoading}
            >
              <span>{isLoading ? t("registering") : t("register")}</span>
              <ArrowRight className="h-4 w-4" />
            </Button>

            <div className="text-center text-xs text-muted-foreground">
              <Link href={`/${locale}/login`} className="hover:underline">
                {t("alreadyHaveAccount")}
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
