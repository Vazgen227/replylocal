"use client";
import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { Thread } from "@/lib/chat-schemas";
import { ApiError } from "@/lib/api-client";
import { Bubbles, ChatError } from "./shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
type Session = { token: string; thread: Thread };
async function visitorRequest<T>(
  path: string,
  method = "GET",
  body?: unknown,
  token?: string,
): Promise<T> {
  const response = await fetch(path, {
    method,
    cache: "no-store",
    credentials: "omit",
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(40000),
  });
  const result = await response.json();
  if (!response.ok)
    throw new ApiError(result.error ?? "SERVER_ERROR", response.status);
  return result;
}
export function CustomerChat({
  publicId,
  companyName,
}: {
  publicId: string;
  companyName: string;
}) {
  const t = useTranslations("pilot"),
    locale = useLocale();
  const [session, setSession] = useState<Session | null>(null),
    [ready, setReady] = useState(false),
    [name, setName] = useState(""),
    [contact, setContact] = useState(""),
    [consent, setConsent] = useState(false),
    [website, setWebsite] = useState(""),
    [text, setText] = useState(""),
    [pending, setPending] = useState(false),
    [error, setError] = useState("");
  const requestId = useRef<{ text: string; id: string } | null>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const storageKey = "replylocal:" + publicId;
  useEffect(() => {
    let active = true;
    Promise.resolve().then(async () => {
      try {
        const raw = sessionStorage.getItem(storageKey);
        if (raw) {
          const saved = JSON.parse(raw);
          if (typeof saved.token === "string" && typeof saved.id === "string") {
            const thread = await visitorRequest<Thread>(
              `/api/chat/messages?conversationId=${encodeURIComponent(saved.id)}`,
              "GET",
              undefined,
              saved.token,
            );
            if (active) setSession({ token: saved.token, thread });
          }
        }
      } catch {
        try {
          sessionStorage.removeItem(storageKey);
        } catch {}
      } finally {
        if (active) setReady(true);
      }
    });
    return () => {
      active = false;
    };
  }, [storageKey]);
  const token = session?.token,
    id = session?.thread.id;
  useEffect(() => {
    if (!token || !id) return;
    let active = true,
      inFlight = false;
    const timer = setInterval(async () => {
      if (inFlight) return;
      inFlight = true;
      try {
        const thread = await visitorRequest<Thread>(
          `/api/chat/messages?conversationId=${id}`,
          "GET",
          undefined,
          token,
        );
        if (active) setSession({ token, thread });
      } catch (e) {
        if (active) setError(e instanceof ApiError ? e.code : "NETWORK_ERROR");
      } finally {
        inFlight = false;
      }
    }, 5000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [token, id]);
  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [session?.thread.messages.length]);
  function failure(e: unknown) {
    setError(e instanceof ApiError ? e.code : "NETWORK_ERROR");
  }
  async function start(e: React.FormEvent) {
    e.preventDefault();
    if (pending) return;
    setPending(true);
    setError("");
    try {
      const value = await visitorRequest<Session>("/api/chat/session", "POST", {
        publicId,
        name,
        contact,
        locale,
        consent,
        attribution: (() => {
          const p = new URLSearchParams(window.location.search);
          return {
            utmSource: (p.get("utm_source") ?? "").slice(0, 120),
            utmMedium: (p.get("utm_medium") ?? "").slice(0, 120),
            utmCampaign: (p.get("utm_campaign") ?? "").slice(0, 120),
            referrer: (p.get("referrer") ?? "").slice(0, 500),
          };
        })(),
        website,
      });
      setSession(value);
      try {
        sessionStorage.setItem(
          storageKey,
          JSON.stringify({ id: value.thread.id, token: value.token }),
        );
      } catch {}
    } catch (e) {
      failure(e);
    } finally {
      setPending(false);
    }
  }
  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!session || pending || !text.trim()) return;
    setPending(true);
    setError("");
    const value = text.trim();
    if (requestId.current?.text !== value)
      requestId.current = { text: value, id: crypto.randomUUID() };
    try {
      const thread = await visitorRequest<Thread>(
        "/api/chat/messages",
        "POST",
        {
          conversationId: session.thread.id,
          clientId: requestId.current.id,
          text: value,
        },
        session.token,
      );
      setSession({ ...session, thread });
      setText("");
      requestId.current = null;
    } catch (e) {
      failure(e);
    } finally {
      setPending(false);
    }
  }
  async function handoff() {
    if (!session || pending) return;
    setPending(true);
    setError("");
    try {
      const thread = await visitorRequest<Thread>(
        "/api/chat/handoff",
        "POST",
        { conversationId: session.thread.id },
        session.token,
      );
      setSession({ ...session, thread });
    } catch (e) {
      failure(e);
    } finally {
      setPending(false);
    }
  }
  function restart() {
    if (!window.confirm(t("newChatConfirm"))) return;
    try {
      sessionStorage.removeItem(storageKey);
    } catch {}
    setSession(null);
    setError("");
    requestId.current = null;
  }
  return (
    <main className="mx-auto flex h-dvh max-w-2xl flex-col bg-background text-foreground">
      <header className="border-b px-4 py-4">
        <div className="flex items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary text-xs font-bold text-primary-foreground">
            RL
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold">{companyName}</h1>
            <p className="text-[11px] text-muted-foreground">
              Powered by ReplyLocal
            </p>
          </div>
        </div>
      </header>
      {!ready ? (
        <p className="m-auto text-sm">…</p>
      ) : !session ? (
        <form onSubmit={start} className="flex-1 space-y-4 overflow-y-auto p-5">
          <p className="text-sm text-muted-foreground">{t("privacy")}</p>
          <div className="space-y-2">
            <Label htmlFor="visitor-name">{t("name")}</Label>
            <Input
              id="visitor-name"
              autoComplete="name"
              required
              minLength={2}
              maxLength={100}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="visitor-contact">{t("contact")}</Label>
            <Input
              id="visitor-contact"
              maxLength={150}
              value={contact}
              onChange={(e) => setContact(e.target.value)}
            />
          </div>
          <input
            tabIndex={-1}
            aria-hidden="true"
            autoComplete="off"
            className="hidden"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
          />
          <label className="flex items-start gap-3 text-xs leading-relaxed">
            <input
              type="checkbox"
              required
              className="mt-1 shrink-0"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
            />
            {t("consent")}
          </label>
          {error && <ChatError code={error} />}
          <Button type="submit" disabled={pending}>
            {t("start")}
          </Button>
        </form>
      ) : (
        <>
          <section className="min-h-0 flex-1 overflow-y-auto p-4">
            <Bubbles messages={session.thread.messages} visitor />
            <div ref={bottom} />
          </section>
          <footer className="space-y-3 border-t p-3">
            {error && <ChatError code={error} />}
            <p role="status" className="text-xs text-muted-foreground">
              {pending || session.thread.busy
                ? t("busy")
                : session.thread.status === "closed"
                  ? t("closedNotice")
                  : session.thread.mode === "human"
                    ? t("humanNotice")
                    : t("privacy")}
            </p>
            {session.thread.status !== "closed" && (
              <form onSubmit={send} className="flex items-end gap-2">
                <Textarea
                  aria-label={t("placeholder")}
                  placeholder={t("placeholder")}
                  maxLength={2000}
                  rows={2}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  disabled={pending}
                />
                <Button
                  type="submit"
                  disabled={pending || session.thread.busy || !text.trim()}
                >
                  {t("send")}
                </Button>
              </form>
            )}
            <div className="flex flex-wrap justify-between gap-2">
              {session.thread.status === "open" &&
                session.thread.mode === "ai" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handoff}
                    disabled={pending}
                  >
                    {t("operator")}
                  </Button>
                )}
              <button className="text-xs underline" onClick={restart}>
                {t("newChat")}
              </button>
            </div>
          </footer>
        </>
      )}
    </main>
  );
}
