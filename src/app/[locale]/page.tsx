"use client";

import { useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  Fingerprint,
  KeyRound,
  Menu,
  Network,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { api, ApiError } from "@/lib/api-client";
import { BrandLink, BrandMark } from "@/components/brand";
import { ProductWindow } from "@/components/landing/product-window";
import { DemoTabs } from "@/components/landing/demo-tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Plan = "start" | "pro" | "enterprise";
const container = "mx-auto w-full max-w-6xl px-4 sm:px-6";

function SectionHeading({ title, subtitle, id }: { title: string; subtitle?: string; id?: string }) {
  return (
    <div className="mx-auto mb-12 max-w-2xl text-center">
      <h2 id={id} className="text-3xl font-extrabold sm:text-4xl">
        {title}
      </h2>
      {subtitle && <p className="mt-4 text-lg text-muted-foreground">{subtitle}</p>}
    </div>
  );
}
function LanguageSwitch() {
  const locale = useLocale();
  return (
    <div className="flex items-center rounded-lg border bg-card p-0.5 text-xs font-semibold" aria-label="Language">
      {(["uk", "ru", "en"] as const).map((l) => (
        <Link
          key={l}
          href={`/${l}`}
          lang={l}
          aria-current={locale === l ? "true" : undefined}
          className={`rounded-md px-2.5 py-1.5 transition-colors ${
            locale === l ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {l.toUpperCase()}
        </Link>
      ))}
    </div>
  );
}

export default function LandingPage() {
  const locale = useLocale();
  const t = useTranslations("landing");
  const h = useTranslations("home");
  const tCommon = useTranslations("common");
  const b = useTranslations("backend");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState("");
  const [inquiries, setInquiries] = useState(200);
  const [avgCheck, setAvgCheck] = useState(1500);
  const [conversionRate, setConversionRate] = useState(25);
  const estimatedLostLeads = Math.round(inquiries * (conversionRate / 100) * 0.35);
  const estimatedMonthlyRecovered = Math.round(estimatedLostLeads * avgCheck);
  const roiMultiplier = Math.round((estimatedMonthlyRecovered / (49 * 40)) * 10) / 10;

  const [isBetaModalOpen, setIsBetaModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan>("start");
  const [leadName, setLeadName] = useState("");
  const [leadEmail, setLeadEmail] = useState("");
  const [leadPhone, setLeadPhone] = useState("");
  const [leadBizType, setLeadBizType] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);

  function openRequest(plan: Plan) {
    setSelectedPlan(plan);
    setSubmitError("");
    setIsSubmitted(false);
    setIsBetaModalOpen(true);
  }
  async function submitRequest(e: React.FormEvent) {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setSubmitError("");
    try {
      await api("/api/leads", "POST", {
        name: leadName,
        email: leadEmail,
        phone: leadPhone,
        businessType: leadBizType,
        plan: selectedPlan,
        locale,
        consent,
        website,
      });
      setIsSubmitted(true);
    } catch (error) {
      setSubmitError(error instanceof ApiError ? error.code : "SERVER_ERROR");
    } finally {
      setIsSubmitting(false);
    }
  }

  const nav = [
    ["how", h("nav.how")],
    ["features", h("nav.features")],
    ["calculator", h("nav.calculator")],
    ["pricing", h("nav.pricing")],
    ["faq", h("nav.faq")],
  ] as const;
  const facts = [
    [h("fact1v"), h("fact1l")],
    [h("fact2v"), h("fact2l")],
    [h("fact3v"), h("fact3l")],
    [h("fact4v"), h("fact4l")],
  ] as const;
  const compare = [1, 2, 3, 4, 5].map((n) => [h(`r${n}`), h(`r${n}a`), h(`r${n}b`)] as const);
  const tech = [
    [Network, h("t1k"), h("t1v")],
    [Fingerprint, h("t2k"), h("t2v")],
    [KeyRound, h("t3k"), h("t3v")],
    [RefreshCw, h("t4k"), h("t4v")],
    [Sparkles, h("t5k"), h("t5v")],
    [ShieldCheck, h("t6k"), h("t6v")],
  ] as const;
  const launch = [
    [h("s1t"), h("s1d")],
    [h("s2t"), h("s2d")],
    [h("s3t"), h("s3d")],
    [h("s4t"), h("s4d")],
  ] as const;
  const plans: Array<{
    plan: Plan;
    name: string;
    price: string;
    period?: string;
    desc: string;
    features: string[];
    cta: string;
    featured?: boolean;
  }> = [
    {
      plan: "start",
      name: t("planStart"),
      price: h("planStartPrice"),
      period: h("planStartPeriod"),
      desc: h("planStartDesc"),
      features: [h("planStartF1"), h("planStartF2"), h("planStartF3"), h("planStartF4")],
      cta: h("planStartCta"),
      featured: true,
    },
    {
      plan: "pro",
      name: t("planPro"),
      price: h("planProPrice"),
      desc: h("planProDesc"),
      features: [h("planProF1"), h("planProF2"), h("planProF3"), h("planProF4")],
      cta: h("planProCta"),
    },
    {
      plan: "enterprise",
      name: t("planEnterprise"),
      price: h("planEntPrice"),
      desc: h("planEntDesc"),
      features: [h("planEntF1"), h("planEntF2"), h("planEntF3"), h("planEntF4")],
      cta: h("planEntCta"),
    },
  ];
  const faq = [1, 2, 3, 4, 5, 6].map((n) => [h(`q${n}`), h(`a${n}`)] as const);
  const sliders = [
    {
      id: "calc-inquiries",
      label: t("calcInquiriesLabel"),
      value: inquiries,
      set: setInquiries,
      min: 20,
      max: 2000,
      step: 10,
      shown: t("calcInquiriesCount", { count: inquiries }),
    },
    {
      id: "calc-check",
      label: t("calcAvgCheckLabel"),
      value: avgCheck,
      set: setAvgCheck,
      min: 200,
      max: 20000,
      step: 100,
      shown: `${avgCheck.toLocaleString(locale)} ${tCommon("currency")}`,
    },
    {
      id: "calc-conversion",
      label: t("calcCurrentConversionLabel"),
      value: conversionRate,
      set: setConversionRate,
      min: 5,
      max: 60,
      step: 1,
      shown: `${conversionRate}%`,
    },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground selection:bg-primary/20">
      <a
        href="#main"
        className="sr-only z-[60] rounded-lg bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        {h("skip")}
      </a>
      <div className="dark">
        <header className="sticky top-0 z-50 border-b border-white/10 bg-[#060b18]/90 text-foreground backdrop-blur-md">
          <div className={`${container} flex h-16 items-center justify-between gap-3`}>
            <BrandLink href={`/${locale}`} />
            <nav className="hidden items-center gap-1 text-sm font-semibold text-muted-foreground lg:flex" aria-label={h("nav.menu")}>
              {nav.map(([id, label]) => (
                <a key={id} href={`#${id}`} className="rounded-lg px-3 py-2 transition-colors hover:bg-muted hover:text-foreground">
                  {label}
                </a>
              ))}
            </nav>
            <div className="flex items-center gap-2">
              <div className="hidden sm:block">
                <LanguageSwitch />
              </div>
              <Button asChild variant="ghost" className="hidden md:inline-flex">
                <Link href={`/${locale}/login`}>{h("footerLogin")}</Link>
              </Button>
              <Button variant="cta" className="hidden sm:inline-flex" onClick={() => openRequest("start")}>
                {t("ctaPrimary")}
              </Button>
              <details className="group relative lg:hidden">
                <summary className="flex size-10 list-none items-center justify-center rounded-lg border bg-card [&::-webkit-details-marker]:hidden">
                  <Menu className="size-5" aria-hidden="true" />
                  <span className="sr-only">{h("nav.menu")}</span>
                </summary>
                <div className="absolute right-0 mt-2 w-64 space-y-1 rounded-xl border bg-popover p-2 shadow-xl">
                  {nav.map(([id, label]) => (
                    <a key={id} href={`#${id}`} className="block rounded-lg px-3 py-2.5 text-sm font-semibold hover:bg-muted">
                      {label}
                    </a>
                  ))}
                  <Link href={`/${locale}/login`} className="block rounded-lg px-3 py-2.5 text-sm font-semibold hover:bg-muted">
                    {h("footerLogin")}
                  </Link>
                  <div className="px-3 py-2 sm:hidden">
                    <LanguageSwitch />
                  </div>
                </div>
              </details>
            </div>
          </div>
        </header>

        {/* Hero: dark technical stage with the real product UI */}
        <section className="relative overflow-hidden bg-[#060b18] text-foreground" aria-labelledby="hero-title">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgb(148_163_184/0.07)_1px,transparent_1px),linear-gradient(to_bottom,rgb(148_163_184/0.07)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_at_50%_0%,black_40%,transparent_75%)]"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-[-12rem] h-[34rem] w-[64rem] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(37_99_235/0.35),transparent)]"
          />
          <div className={`${container} relative pt-14 pb-10 text-center sm:pt-20`}>
            <p className="mx-auto inline-flex max-w-full items-center gap-2 rounded-md border border-white/15 bg-white/5 px-3 py-1.5 font-mono text-[11px] font-medium uppercase tracking-wider text-muted-foreground sm:text-xs">
              <span className="size-1.5 shrink-0 rounded-full bg-success" aria-hidden="true" />
              <span className="truncate">{h("eyebrowTech")}</span>
            </p>
            <h1 id="hero-title" className="mx-auto mt-6 max-w-5xl text-4xl font-extrabold leading-[1.06] text-white sm:text-5xl lg:text-[3.6rem]">
              {h("h1a")} <span className="text-primary">{h("h1b")}</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">{h("sub")}</p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Button variant="cta" size="lg" onClick={() => openRequest("start")}>
                {t("ctaPrimary")}
                <ArrowRight aria-hidden="true" />
              </Button>
              <Button asChild variant="outline" size="lg">
                <a href="#features">{h("ctaDemo")}</a>
              </Button>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">{h("noCard")}</p>
          </div>
          <div className={`${container} relative max-w-[76rem] pb-16 sm:pb-24`}>
            <ProductWindow />
          </div>
        </section>
      </div>

      <main id="main">
        {/* Facts: only what the product does today */}
        <section aria-label={h("techEyebrow")} className="border-b bg-card">
          <dl className={`${container} grid grid-cols-2 divide-x divide-y lg:grid-cols-4 lg:divide-y-0`}>
            {facts.map(([value, label]) => (
              <div key={label} className="px-4 py-7 first:border-l-0 sm:px-6">
                <dt className="font-mono text-2xl font-bold text-primary sm:text-3xl">{value}</dt>
                <dd className="mt-1 text-sm text-muted-foreground">{label}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* Interactive product demo */}
        <section id="features" className="scroll-mt-20 py-20 sm:py-24" aria-labelledby="demo-title">
          <div className={container}>
            <SectionHeading id="demo-title" title={h("demoTitle")} subtitle={h("demoSubtitle")} />
            <DemoTabs />
          </div>
        </section>

        {/* Today vs with ReplyLocal */}
        <section className="border-y bg-card py-20 sm:py-24" aria-labelledby="compare-title">
          <div className={`${container} max-w-5xl`}>
            <SectionHeading id="compare-title" title={h("compareTitle")} subtitle={h("compareSubtitle")} />
            <ul className="space-y-3 md:hidden">
              {compare.map(([topic, now, next]) => (
                <li key={topic} className="rounded-xl border bg-background p-4">
                  <p className="font-bold">{topic}</p>
                  <p className="mt-2 flex gap-2 text-sm text-muted-foreground">
                    <X className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />
                    <span><span className="sr-only">{h("colNow")}: </span>{now}</span>
                  </p>
                  <p className="mt-1.5 flex gap-2 text-sm font-medium">
                    <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
                    <span><span className="sr-only">{h("colWith")}: </span>{next}</span>
                  </p>
                </li>
              ))}
            </ul>
            <div className="hidden overflow-hidden rounded-xl border md:block">
              <table className="w-full text-left text-sm sm:text-base">
                <thead className="bg-muted/60 font-mono text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th scope="col" className="px-5 py-3 font-semibold">
                      <span className="sr-only">{h("compareTitle")}</span>
                    </th>
                    <th scope="col" className="px-4 py-3 font-semibold sm:px-5">{h("colNow")}</th>
                    <th scope="col" className="px-4 py-3 font-semibold text-primary sm:px-5">{h("colWith")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {compare.map(([topic, now, next]) => (
                    <tr key={topic} className="align-top">
                      <th scope="row" className="w-1/3 px-5 py-4 font-bold">{topic}</th>
                      <td className="px-4 py-4 text-muted-foreground sm:px-5">
                        <span className="flex gap-2">
                          <X className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />
                          {now}
                        </span>
                      </td>
                      <td className="bg-secondary/40 px-4 py-4 font-medium sm:px-5">
                        <span className="flex gap-2">
                          <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
                          {next}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Under the hood */}
        <div className="dark">
          <section className="bg-[#060b18] py-20 text-foreground sm:py-24" aria-labelledby="tech-title">
            <div className={container}>
              <div className="mx-auto mb-12 max-w-3xl text-center">
                <p className="font-mono text-xs font-semibold uppercase tracking-widest text-primary">{h("techEyebrow")}</p>
                <h2 id="tech-title" className="mt-3 text-3xl font-extrabold text-white sm:text-4xl">
                  {h("techTitle")}
                </h2>
                <p className="mt-4 text-lg text-muted-foreground">{h("techSubtitle")}</p>
              </div>
              <dl className="grid gap-px overflow-hidden rounded-xl border bg-border sm:grid-cols-2 lg:grid-cols-3">
                {tech.map(([Icon, key, value]) => (
                  <div key={key} className="bg-[#0b1324] p-6">
                    <dt className="flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-wider text-primary">
                      <Icon className="size-4" aria-hidden="true" />
                      {key}
                    </dt>
                    <dd className="mt-3 leading-relaxed text-foreground/90">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </section>
        </div>

        {/* Launch steps */}
        <section id="how" className="scroll-mt-20 py-20 sm:py-24" aria-labelledby="how-title">
          <div className={container}>
            <SectionHeading id="how-title" title={h("howTitle")} />
            <ol className="grid gap-px overflow-hidden rounded-xl border bg-border md:grid-cols-2 lg:grid-cols-4">
              {launch.map(([title, text], i) => (
                <li key={title} className="bg-card p-6">
                  <span className="font-mono text-sm font-bold text-primary">{String(i + 1).padStart(2, "0")}</span>
                  <h3 className="mt-3 text-lg font-bold">{title}</h3>
                  <p className="mt-2 leading-relaxed text-muted-foreground">{text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Calculator */}
        <section id="calculator" className="scroll-mt-20 border-y bg-card py-20 sm:py-24" aria-labelledby="calc-title">
          <div className={`${container} max-w-5xl`}>
            <SectionHeading id="calc-title" title={t("calculatorTitle")} subtitle={t("calculatorSubtitle")} />
            <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
              <div className="space-y-7 rounded-xl border bg-background p-6 sm:p-8">
                {sliders.map((s) => (
                  <div key={s.id}>
                    <div className="mb-3 flex items-baseline justify-between gap-3">
                      <Label htmlFor={s.id} className="text-sm font-semibold">
                        {s.label}
                      </Label>
                      <span className="shrink-0 font-bold tabular-nums text-primary">{s.shown}</span>
                    </div>
                    <input
                      id={s.id}
                      type="range"
                      min={s.min}
                      max={s.max}
                      step={s.step}
                      value={s.value}
                      onChange={(e) => s.set(Number(e.target.value))}
                      className="h-2 w-full accent-primary"
                    />
                  </div>
                ))}
                <p className="rounded-xl bg-muted p-4 text-sm text-muted-foreground">{t("calcFact")}</p>
              </div>
              <div className="flex flex-col justify-between rounded-xl bg-foreground p-6 text-background sm:p-8">
                <div>
                  <p className="text-sm font-semibold opacity-75">{t("calcRecoveredLabel")}</p>
                  <p className="mt-3 text-4xl font-extrabold tabular-nums sm:text-5xl" aria-live="polite">
                    +{estimatedMonthlyRecovered.toLocaleString(locale)} {tCommon("currency")}
                    <span className="text-base font-semibold opacity-70">{t("calcMonthSuffix")}</span>
                  </p>
                  <dl className="mt-8 space-y-3 text-sm">
                    <div className="flex justify-between gap-4 border-b border-background/15 pb-3">
                      <dt className="opacity-75">{t("calcRetainedLeadsLabel")}</dt>
                      <dd className="font-bold">{t("calcRetainedLeadsValue", { count: estimatedLostLeads })}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="opacity-75">{t("calcRoiProLabel")}</dt>
                      <dd className="font-bold tabular-nums">{roiMultiplier}x</dd>
                    </div>
                  </dl>
                </div>
                <Button variant="cta" size="lg" className="mt-8 w-full" onClick={() => openRequest("start")}>
                  {t("calcCtaButton")}
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="scroll-mt-20 py-20 sm:py-24" aria-labelledby="pricing-title">
          <div className={container}>
            <SectionHeading id="pricing-title" title={h("pricingTitle")} subtitle={h("pricingSubtitle")} />
            <div className="grid items-stretch gap-6 lg:grid-cols-3">
              {plans.map((p) => (
                <article
                  key={p.plan}
                  className={`relative flex flex-col rounded-xl border bg-card p-7 ${
                    p.featured ? "border-2 border-cta lg:-my-3 lg:py-10" : ""
                  }`}
                >
                  {p.featured && (
                    <span className="absolute -top-3.5 left-7 rounded-full bg-cta px-3 py-1 text-xs font-bold text-cta-foreground">
                      {h("planProBadge")}
                    </span>
                  )}
                  <h3 className="text-xl font-extrabold">{p.name}</h3>
                  <p className="mt-2 text-muted-foreground">{p.desc}</p>
                  <p className="mt-6 flex items-baseline gap-2">
                    <span className="text-4xl font-extrabold">{p.price}</span>
                    {p.period && <span className="text-sm font-semibold text-muted-foreground">{p.period}</span>}
                  </p>
                  <ul className="mt-6 flex-1 space-y-3">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5">
                        <Check className="mt-0.5 size-5 shrink-0 text-success" aria-hidden="true" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Button
                    variant={p.featured ? "cta" : "outline"}
                    size="lg"
                    className="mt-8 w-full"
                    onClick={() => openRequest(p.plan)}
                  >
                    {p.cta}
                  </Button>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="scroll-mt-20 border-t bg-card py-20 sm:py-24" aria-labelledby="faq-title">
          <div className={`${container} max-w-3xl`}>
            <SectionHeading id="faq-title" title={h("faqTitle")} />
            <div className="space-y-3">
              {faq.map(([q, a]) => (
                <details key={q} className="group rounded-xl border bg-background px-5 open:pb-5">
                  <summary className="flex list-none items-center justify-between gap-4 py-5 text-left font-bold [&::-webkit-details-marker]:hidden">
                    {q}
                    <ChevronDown
                      className="size-5 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180"
                      aria-hidden="true"
                    />
                  </summary>
                  <p className="leading-relaxed text-muted-foreground">{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-20 sm:py-24" aria-labelledby="final-title">
          <div className={container}>
            <div className="rounded-xl border bg-card px-6 py-12 text-center sm:px-12">
              <h2 id="final-title" className="text-3xl font-extrabold sm:text-4xl">
                {h("finalTitle")}
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">{h("finalSubtitle")}</p>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <Button variant="cta" size="lg" onClick={() => openRequest("start")}>
                  {t("ctaPrimary")}
                  <ArrowRight aria-hidden="true" />
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link href={`/${locale}/demo`}>{t("ctaSecondary")}</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="mt-auto border-t bg-card">
        <div className={`${container} grid gap-8 py-12 sm:grid-cols-[2fr_1fr_1fr]`}>
          <div>
            <div className="flex items-center gap-2.5 text-lg font-extrabold">
              <BrandMark />
              ReplyLocal
            </div>
            <p className="mt-3 max-w-xs text-sm text-muted-foreground">{h("footerTagline")}</p>
          </div>
          <nav aria-label={h("footerProduct")}>
            <p className="mb-3 text-sm font-bold">{h("footerProduct")}</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {nav.map(([id, label]) => (
                <li key={id}>
                  <a href={`#${id}`} className="hover:text-foreground">
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <nav aria-label={h("footerAccount")}>
            <p className="mb-3 text-sm font-bold">{h("footerAccount")}</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href={`/${locale}/login`} className="hover:text-foreground">
                  {h("footerLogin")}
                </Link>
              </li>
              <li>
                <Link href={`/${locale}/register`} className="hover:text-foreground">
                  {h("footerRegister")}
                </Link>
              </li>
              <li>
                <Link href={`/${locale}/demo`} className="hover:text-foreground">
                  {t("ctaSecondary")}
                </Link>
              </li>
            </ul>
          </nav>
        </div>
        <div className="border-t">
          <p className={`${container} py-5 text-xs text-muted-foreground`}>{h("footerRights")}</p>
        </div>
      </footer>

      <Dialog open={isBetaModalOpen} onOpenChange={(value) => !isSubmitting && setIsBetaModalOpen(value)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-extrabold">{t("modalTitle")}</DialogTitle>
            <DialogDescription>{t("modalSubtitle")}</DialogDescription>
          </DialogHeader>
          {!isSubmitted ? (
            <form onSubmit={submitRequest} className="space-y-4 pt-2">
              <p className="rounded-lg bg-secondary p-3 text-sm font-semibold text-secondary-foreground">
                {t("selectedPlanBadge", {
                  plan: t({ start: "planStart", pro: "planPro", enterprise: "planEnterprise" }[selectedPlan]),
                })}
              </p>
              <div className="space-y-1.5">
                <Label htmlFor="leadName">{t("formName")}</Label>
                <Input
                  id="leadName"
                  minLength={2}
                  maxLength={100}
                  required
                  autoComplete="name"
                  placeholder={t("modalNamePlaceholder")}
                  value={leadName}
                  onChange={(e) => setLeadName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="leadEmail">{t("formEmail")}</Label>
                <Input
                  id="leadEmail"
                  maxLength={254}
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="name@service.ua"
                  value={leadEmail}
                  onChange={(e) => setLeadEmail(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="leadPhone">{t("formPhone")}</Label>
                <Input
                  id="leadPhone"
                  minLength={3}
                  maxLength={100}
                  required
                  autoComplete="tel"
                  placeholder="+380… / @username"
                  value={leadPhone}
                  onChange={(e) => setLeadPhone(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="leadBizType">{t("formBusinessType")}</Label>
                <Input
                  id="leadBizType"
                  maxLength={200}
                  placeholder={t("modalBizPlaceholder")}
                  value={leadBizType}
                  onChange={(e) => setLeadBizType(e.target.value)}
                />
              </div>
              <div className="hidden" aria-hidden="true">
                <label htmlFor="lead-website">Website</label>
                <input id="lead-website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
              </div>
              <label className="flex items-start gap-2.5 text-sm">
                <input
                  type="checkbox"
                  required
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="mt-0.5 size-4 accent-primary"
                />
                {b("leadConsent")}
              </label>
              {submitError && (
                <p role="alert" className="text-sm text-destructive">
                  {b.has(submitError) ? b(submitError) : b("SERVER_ERROR")}
                </p>
              )}
              <Button disabled={isSubmitting} type="submit" variant="cta" size="lg" className="w-full">
                {isSubmitting ? b("submitting") : t("formSubmit")}
              </Button>
            </form>
          ) : (
            <div className="space-y-4 py-6 text-center">
              <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-success/10 text-success">
                <CheckCircle2 className="size-8" aria-hidden="true" />
              </span>
              <h3 className="text-lg font-bold">{t("modalSuccessTitle")}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{t("modalSuccessDesc")}</p>
              <Button className="w-full" variant="outline" onClick={() => setIsBetaModalOpen(false)}>
                {tCommon("close")}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
