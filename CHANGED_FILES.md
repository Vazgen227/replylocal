# What changed in 0.4

Full project source is included. Keep your existing Git history and environment secrets; do not copy dependency/build output from an old checkout.

- New database migration: `db/003_omnichannel.sql`. Existing `001` and `002` are preserved byte-for-byte.
- New server modules: channels, crypto-secrets, omni-store/http, provider-fetch, team-store, billing, entitlements.
- New private/public APIs: channels and webhooks (including shared Meta), jobs, deliveries, outcomes/notes, channel analytics, team, workspaces, recovery and Stripe.
- New UI: `src/components/omni/*`, join and reset pages. Updated inbox/thread, integrations, reports, settings, workspace header, dashboard and translations.
- Updated website schemas/store and widget attribution; runtime maintenance, queue worker and test harness.
- New tests: `tests/omni.test.ts`, `tests/e2e/omni.spec.ts`, upgrade coverage. Existing scenarios retained.
- New/updated guides: START_HERE_RU, CHANNELS_RU, ACCEPTANCE_RU, API, VERIFICATION, TESTING, README and CHANGELOG.
- Removed the unused `src/lib/adapters` placeholder directory; production messaging is implemented in `src/server/channels.ts` and `omni-store.ts`.
- Stripe SDK added; exact resolved dependencies are recorded in package-lock.json.

Your previous `src/middleware.ts` must not coexist with `src/proxy.ts`. The archive uses proxy.ts. `.env.local`, `.git`, node_modules, .next, screenshots and test outputs are not part of the deliverable.
