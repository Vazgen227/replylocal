# ReplyLocal 0.5 (unreleased) — car service booking

- Online booking for car service stations (Settings → Online booking): working hours per weekday, number of bays, slot step, default duration, booking horizon, minimum notice and the address used in confirmations. Off by default.
- The assistant collects car details (make/model, year, plate, VIN, mileage, problem, phone, preferred time) into the conversation and may offer only free slots computed from hours and bays. An agreed slot becomes a preliminary request; it is never presented as confirmed. Slots not offered are rejected as ungrounded and handed to a person.
- New Appointments page and an "Appointment and car" card in each conversation: confirm, reschedule, cancel, no-show and complete. Confirmation, rescheduling and cancellation messages go to the customer's original channel through the existing outbox.
- Confirming qualifies the lead; completing a visit with an amount marks it won with value and profit, so the channel report fills without a separate form.
- Reminder 24 hours before a confirmed visit (new `reminder` job kind). WhatsApp, Instagram and Telegram Business still enforce their 24-hour reply window.
- One-click car-service knowledge template (13 services, 4 rules, no prices) in RU/UK/EN.
- Knowledge retrieval understands Russian/Ukrainian word endings and common car-service synonyms.
- Migration `db/004_service_station.sql`: run `npm run db:migrate` before deploying.

# ReplyLocal 0.4 — 25/26 October 2026

- Replaced unused channel scaffolding with official Telegram bot/Business, WhatsApp Cloud API, Viber bot and Instagram Login messaging transports.
- Added signed webhooks, account-scoped routing, a shared Meta callback, inbound deduplication and encrypted per-connection credentials.
- Added durable PostgreSQL jobs and a transactional outgoing outbox; bounded workers, recovery leases, delivery receipts, reply-window enforcement, explicit retries for ambiguous sends and cancellation of queued AI on human takeover.
- Added source/assignee inbox filters, persisted-history search and pagination, deal outcomes, manual sale/profit figures, monthly channel spend, currency-separated reports and CSV.
- Added team invitations, invite-only registration, membership/role management, workspace switching, email handoff notifications and one-time password recovery.
- Added Stripe SDK Checkout, Customer Portal, signature-verified subscription webhooks, event deduplication, checkout reuse and server-controlled AI plan allowances.
- Added UTM/page attribution to website chat, mobile/localized UI panels and operational diagnostics.
- Preserved website chat, source-backed AI retrieval, operator handoff, existing users/knowledge/sessions and demo mode. Added migration 003 without editing 001/002.
- Updated setup, account requirements, API reference and acceptance guide. Removed unused legacy adapter placeholders.

External credentials, platform permissions/app review, email/domain verification, worker hosting and live acceptance belong to deployment. Text-only messaging, manual channel token onboarding and the other limits are stated in START_HERE_RU.md.

# ReplyLocal 0.3

Introduced website widget/direct chat, PostgreSQL conversation persistence, OpenAI Responses, operator handoff/replies, limits, sources, exports, deletion and initial browser/server coverage.
