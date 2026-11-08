# Repeating verification

See `VERIFICATION.md` for the completed run and its limits.

```sh
npm ci
npm run lint
npm run typecheck
npm test
npx playwright install chromium
npm run test:e2e
npm run build
npm audit
```

Tests create isolated PGlite databases; end-to-end uses the PostgreSQL wire protocol on 127.0.0.1:54329, an HTTP fixture on 54330 and Next on 3100. These ports must be free. The runner overrides DATABASE_URL and keys and does not use your production database. It removes only generated .next/dev within this test checkout. Do not run it alongside your own dev server in the same checkout.

The provider test transport honors only a loopback URL in development; production builds always use the fixed official provider hosts. Unit tests inject fetch explicitly. The Stripe SDK contract test uses a mock HTTP transport and real SDK signature verification. No billable OpenAI/Meta/Viber/Stripe calls are performed.

`npm run test:e2e -- omni.spec.ts` runs the messenger/team/report browser scenario alone. `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` and JSON-array `PLAYWRIGHT_CHROMIUM_ARGS` support an existing Chromium installation. The verification environment used a separately installed Chromium because the Playwright browser CDN was unavailable there; this helper binary is not included in the archive.

PGlite tests SQL/transactions but does not substitute for load/concurrency/TLS testing against your deployed PostgreSQL. Use ACCEPTANCE_RU.md on your Vercel domain, real channel accounts and email/Stripe test mode before a client launch.
