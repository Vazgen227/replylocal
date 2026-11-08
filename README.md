# ReplyLocal 0.4

Unified customer support for small businesses: website widget, Telegram/Bot Business, WhatsApp Cloud API, Viber Bot API and Instagram Login messaging. Next.js App Router, PostgreSQL, OpenAI Responses, transactional outbox, team roles/invites and channel outcome reporting. Optional Stripe Checkout/Portal and Resend email.

Start with **START_HERE_RU.md**, then **CHANNELS_RU.md** and **ACCEPTANCE_RU.md**. **VERIFICATION.md** separates automated fixture verification from live-account acceptance. External accounts, app approvals and a scheduled worker are required for a production launch.

```sh
npm ci
npm run db:migrate
npm run lint
npm run typecheck
npm test
npm run build
```

Fill server environment values from `.env.example`. Do not commit secrets. Run `npm run worker` on an always-on host or schedule authenticated `/api/jobs/run` calls. Website and private workspace routes are localized in RU/UK/EN.

`npm run test:e2e` uses an isolated PGlite socket server, local provider fixtures and Playwright Chromium. It does not connect to your production DB or external APIs. Install the browser with `npx playwright install chromium` on a normal development/test machine.

Limits: text-only messaging; attachments are flagged for human review in the original channel. No marketplace APIs, calendar inventory, message templates, historical import, cross-channel identity merge or self-service Meta OAuth onboarding. Real live account testing remains necessary.
