"use client";
import { useTranslations, useLocale } from "next-intl";
import type { ChatMessage } from "@/lib/chat-schemas";
export function ChatError({ code }: { code: string }) {
  const t = useTranslations("pilot");
  return (
    <p
      role="alert"
      className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
    >
      {t.has(code) ? t(code) : t("error")}
    </p>
  );
}
export function Bubbles({
  messages,
  visitor = false,
}: {
  messages: ChatMessage[];
  visitor?: boolean;
}) {
  const t = useTranslations("pilot"),
    locale = useLocale();
  return (
    <div
      className="space-y-4"
      aria-live="polite"
      aria-relevant="additions text"
    >
      {messages.map((m) => (
        <article
          key={m.id}
          className={`max-w-[92%] rounded-2xl p-3 text-sm ${m.sender === "system" ? "mx-auto bg-muted text-muted-foreground" : (visitor ? m.sender === "visitor" : m.sender !== "visitor") ? "ml-auto bg-primary text-primary-foreground" : "bg-muted"}`}
        >
          <div className="mb-1 flex flex-wrap items-center gap-2 text-[11px] opacity-70">
            <span>
              {t(
                m.sender === "operator"
                  ? "you"
                  : m.sender === "assistant"
                    ? "assistant"
                    : m.sender === "visitor"
                      ? "visitor"
                      : "system",
              )}
            </span>
            <time>
              {new Date(m.createdAt).toLocaleTimeString(locale, {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </time>
          </div>
          <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
            {m.content}
          </p>
          {!visitor && m.sources?.length > 0 && (
            <details className="mt-2 text-xs">
              <summary className="cursor-pointer">{t("sources")}</summary>
              <ul>
                {m.sources.map((s) => (
                  <li key={s.id}>{s.title}</li>
                ))}
              </ul>
            </details>
          )}
        </article>
      ))}
    </div>
  );
}
