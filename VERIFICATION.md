# Verification — ReplyLocal 0.4

Completed 25–26 October 2026 in an isolated Linux workspace. Node 24.19, Next.js 16.4.3, PostgreSQL-compatible PGlite 0.5.8, Chromium 153. No production credentials or billable external calls were used.

| Gate | Result |
| --- | --- |
| `npm run lint` | Passed, no lint errors or warnings |
| `npm run typecheck` | Passed |
| `npm test` | **60 passed, 0 failed, 0 skipped** |
| `npm run test:e2e` | **5 passed, 0 failed** in the final complete run |
| `npm run build` | Production build passed; all new private/public routes included |
| `npm audit` | **0 known vulnerabilities**, including development dependencies, at verification time |
| Migrations from empty database | 001, 002, 003 applied successfully |
| Repeated migration runner | Completed without reapplying existing migrations |
| 0.2 → 0.3 / 0.3 → 0.4 upgrades | Existing users, sessions, knowledge and website conversation access preserved |
| 001 compared with supplied original ZIP | Byte-for-byte unchanged |
| 002 compared with delivered 0.3 | Byte-for-byte unchanged |
| Browser console | Final website and omnichannel scenarios completed without unexpected console/page errors |
| Visual review | Reviewed desktop reports/outcome form, mobile operator/inbox, original website workflow and embedded widget screenshots |

## Server/contract coverage

- Atomic registration, password hashing, hashed session tokens, login/logout, session expiry/revocation, company isolation and role enforcement.
- Knowledge/settings CRUD, optimistic edits, null/zero prices, schema validation, origin/body limits, rate limits and lead requests.
- Website consent/tokens, correct tenant knowledge retrieval, OpenAI Responses request/strict output/citation contract, AI budget accounting and handoff on failure or missing facts.
- Duplicate client IDs/webhooks, stale in-flight AI cancellation, closed/reopened conversations and interrupted generation recovery.
- AES-GCM credential encryption and authenticated context; safe connection responses; Telegram, Viber and Meta signatures/challenge; account-scoped routing and shared Meta callbacks; ignoring echoes and unsupported group messages.
- Real application SQL triggers create outgoing chunks and queue tasks in the same transaction as messages. Tests cover Instagram splitting, provider receipts, ambiguous failures without automatic duplicate sends, explicit retry, HTTP 429 backoff, expired reply windows, worker lease recovery and queued AI cancellation on takeover.
- Telegram Business owner/reply-permission checks; Viber large numeric IDs without precision loss; Unicode truncation without invalid surrogate pairs.
- Team invite email binding, one-time use, revocation, invited registration, workspace switching, removed-member session revocation and forbidden agent actions.
- Encrypted reset-email jobs, consumed reset tokens, password reset and session invalidation.
- Source-separated outcomes/costs, separate currencies, conversion/profit coverage, stale cost edits, independent outcome versions, private notes and deletion of saved replay payloads.
- Bounded on-screen message history and full stored JSON history export, including tenant authorization.
- Official Stripe SDK exercised with a mocked HTTP transport: Checkout parameters/reuse, mapped-customer Portal, real signature verification, retrieval of current subscription data, event deduplication/order protection and plan AI allowances.

## Browser scenarios

1. Malformed/cross-origin/unauthorized HTTP requests and private API behavior.
2. Public visitor token, consent and origin rules; private operator access.
3. Website widget/direct chat → fixture AI reply with sources → operator handoff/reply → export/close → mobile layout and external-origin embed → localized integrations.
4. Messenger connection form → all four signed provider payloads → real database/worker → common inbox and source filter → outbound operator text observed by the provider fixture → recorded sale/profit → monthly channel spend/report → invite-only teammate registration and agent restrictions → mobile inbox/RU/UK. Also included 20 parallel team read requests; all succeeded in the final run.
5. Registration/login, company isolation, knowledge/settings CRUD, conflicts, password revocation, public landing request and language switching.

The test harness replaces only external transport endpoints and database connection settings. It does not replace the application routes, authorization, normalization, SQL transactions, outbox, queue or UI workflow with static data.

During development, one intermediate PGlite browser run returned a transient 500 on a team read. It did not recur in the explicit parallel-read check, separate scenario rerun or final complete run. A root cause was not established; SQLSTATE/routine diagnostics were added without logging SQL parameters or secrets. PGlite’s documented single-backend connection multiplexer differs from external PostgreSQL, so this result is not a production concurrency/load certification.

## What this run does not establish

- Live delivery, permissions, token lifetime, account approval, quotas or billing against your Telegram/Meta/Viber business accounts. Provider fixtures validate protocol/application behavior, not possession of those accounts.
- Real OpenAI output quality, your model availability/balance or production conversation quality. The AI fixture is deterministic.
- A live Stripe payment, merchant eligibility, your Resend domain/inbox deliverability, your Vercel deployment or Neon connection/TLS/pooling behavior.
- Sustained load, failover/backups on external PostgreSQL, all mobile browsers/keyboards or site-specific third-party iframe/storage policies.
- A comprehensive independent security audit. Dependency advisories and functional tests have a defined scope.

Use `ACCEPTANCE_RU.md` on the actual deployment and each enabled business account before a client launch. File completeness, a passing build and fixture tests are separate from account activation and live acceptance.
