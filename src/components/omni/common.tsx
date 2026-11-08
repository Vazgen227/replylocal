"use client";
import {
  useState,
  useId,
  isValidElement,
  cloneElement,
  type ReactElement,
} from "react";
import { useTranslations } from "next-intl";
import { ApiError } from "@/lib/api-client";
export function OmniError({ code }: { code: string }) {
  const t = useTranslations("omni");
  if (!code) return null;
  return (
    <p
      role="alert"
      className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm"
    >
      {t.has(code) ? t(code) : t("error")}{" "}
      <span className="text-xs text-muted-foreground">({code})</span>
    </p>
  );
}
export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  const generated = useId();
  const control = isValidElement<{ id?: string }>(children) ? children : null;
  const id = control?.props.id ?? generated;
  return (
    <div className="flex min-w-0 flex-col gap-2 text-sm font-medium">
      <label htmlFor={id}>{label}</label>
      {control
        ? cloneElement(control as ReactElement<{ id?: string }>, { id })
        : children}
    </div>
  );
}
export const selectClass =
  "min-h-10 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm";
export function useTask() {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(e instanceof ApiError ? e.code : "SERVER_ERROR");
    } finally {
      setBusy(false);
    }
  }
  return { busy, error, run };
}
