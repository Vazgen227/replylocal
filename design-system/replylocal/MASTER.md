# ReplyLocal — design system (master)

Built with the ui-ux-pro-max skill (`--design-system`, pattern "Trust & Authority + Conversion",
style "Flat Design", dials variance 5 / motion 3 / density 4) and adjusted for a RU/UK/EN
product for car service stations. Page files in `pages/` override this file.

## Principles
- Trust first: the product writes to real customers, so the UI shows control (the team confirms
  every booking, the AI cites sources, nothing is invented). No invented stats, logos or reviews.
- Flat: clean borders, soft shadow only for floating elements (popovers, mock windows).
- Blue is the product colour. Orange (`cta`) is reserved for the main marketing call to action.
- One family, one icon set: Manrope Variable (self-hosted, full Cyrillic incl. Ukrainian) and
  lucide-react SVG icons. No emoji as icons, no brand logos.

## Tokens (`src/app/globals.css`)
| Role | Light | Dark | Contrast |
|------|-------|------|----------|
| background / foreground | #F8FAFC / #0F172A | #0A0F1C / #E2E8F0 | 17.1 / 15.5 |
| card | #FFFFFF | #111827 | |
| primary / on-primary | #1D4ED8 / #FFFFFF | #60A5FA / #0A0F1C | 6.7 / 7.5 |
| cta / on-cta | #C2410C / #FFFFFF | #FB923C / #0A0F1C | 5.2 / 8.5 |
| muted-foreground | #475569 | #94A3B8 | 7.2 / 6.9 |
| secondary (tint) | #EFF6FF / #1E3A8A | #172554 / #DBEAFE | 9.5 / 12.0 |
| success | #15803D | #4ADE80 | 5.0 |
| border / input | #E2E8F0 / #CBD5E1 | slate 18% / 28% | |
Radius 0.75rem. Never hard-code hex in components; use the semantic classes
(`bg-primary`, `text-muted-foreground`, `bg-cta`, `text-success`).

## Typography
Manrope Variable. Hero 40–64px/800/leading-[1.05]; H2 30–40px/800; H3 18–20px/700;
body 16–18px/1.6; labels 12–14px/600. Headings use `text-wrap: balance`, letter-spacing -0.02em.

## Components
- Button heights: sm 36, default 40, lg 48 (touch targets ≥ 44 on landing CTAs via lg).
- Primary marketing CTA: `<Button variant="cta" size="lg">`. Product actions: default (blue).
- Cards: `rounded-2xl border bg-card`, hover only changes border/colour, 150–200ms.
- Focus: visible ring (`ring-ring/50`); never remove outlines.

## Landing structure
Header (sticky) → Hero (offer + product mock) → Channels strip → Problems → How it works (4 steps)
→ Features grid → Control & safety → Calculator → Pricing → FAQ → Final CTA → Footer.

## Motion
Subtle only: colour/border transitions 150–200ms, no scroll-jacking, `prefers-reduced-motion` disables
animation globally.

## Pre-delivery checklist
- [ ] Contrast ≥ 4.5:1 in light and dark
- [ ] No horizontal scroll at 375 / 768 / 1024 / 1440
- [ ] Keyboard: visible focus, logical order, accordion via `<details>`
- [ ] All copy in RU/UK/EN, no invented numbers or testimonials
