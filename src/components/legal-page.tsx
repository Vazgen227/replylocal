import Link from "next/link";
import { notFound } from "next/navigation";
import { BrandMark } from "@/components/brand";
import {
  LEGAL_UPDATED,
  legalDocument,
  type LegalKind,
  type LegalLocale,
} from "@/lib/legal";

const locales: LegalLocale[] = ["uk", "ru", "en"];

export function isLegalLocale(locale: string): locale is LegalLocale {
  return (locales as string[]).includes(locale);
}

export function legalTitle(kind: LegalKind, locale: string) {
  if (!isLegalLocale(locale)) return "ReplyLocal";
  return `${legalDocument(kind, locale).title} · ReplyLocal`;
}

export function LegalPage({ kind, locale }: { kind: LegalKind; locale: string }) {
  if (!isLegalLocale(locale)) notFound();
  const doc = legalDocument(kind, locale);
  const other: LegalKind = kind === "privacy" ? "terms" : "privacy";
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-4">
          <Link
            href={`/${locale}`}
            className="flex items-center gap-2.5 text-lg font-extrabold"
          >
            <BrandMark />
            ReplyLocal
          </Link>
          <nav className="flex gap-4 text-sm text-muted-foreground">
            {locales.map((l) => (
              <Link
                key={l}
                href={`/${l}/${kind}`}
                aria-current={l === locale ? "page" : undefined}
                className={l === locale ? "font-semibold text-foreground" : "hover:text-foreground"}
              >
                {l.toUpperCase()}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-10">
        {doc.draft && (
          <p
            role="note"
            className="mb-8 rounded-md border border-amber-500/40 bg-amber-500/10 p-4 text-sm"
          >
            {doc.labels.draft}
          </p>
        )}
        <h1 className="text-3xl font-extrabold tracking-tight text-balance">{doc.title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {doc.labels.updated} {LEGAL_UPDATED}
        </p>
        <p className="mt-6 leading-relaxed">{doc.intro}</p>
        <ol className="mt-8 space-y-8">
          {doc.sections.map((section, i) => (
            <li key={section.h}>
              <h2 className="text-lg font-bold">
                {i + 1}. {section.h}
              </h2>
              <div className="mt-3 space-y-3 leading-relaxed text-muted-foreground">
                {section.p.map((text) => (
                  <p key={text}>{text}</p>
                ))}
              </div>
            </li>
          ))}
        </ol>
        <div className="mt-12 flex flex-wrap gap-6 border-t pt-6 text-sm">
          <Link href={`/${locale}/${other}`} className="underline underline-offset-4">
            {doc.labels[other]}
          </Link>
          <Link href={`/${locale}`} className="text-muted-foreground hover:text-foreground">
            {doc.labels.back}
          </Link>
        </div>
      </main>
    </div>
  );
}
