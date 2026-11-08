# HTTP API — ReplyLocal 0.4

Private endpoints use HttpOnly `replylocal_session`. The company and role come from the session, never from a caller-supplied organization ID. Mutations require an exact `Origin` match with `APP_URL` and JSON Content-Type (except signed provider webhooks / authenticated jobs). JSON bodies are limited to 64 KiB; webhook raw bodies to 256 KiB. Unknown JSON fields are rejected. Responses are no-store. Validation schemas are in `src/lib/schemas.ts`, `chat-schemas.ts`, `omni-schemas.ts`.

Owner/admin manage business knowledge, settings and channel credentials; an agent can read the company inbox, reply, record outcomes, assign themselves and add internal notes. Owner alone changes admin roles and opens Stripe billing flows. Removed memberships immediately stop authenticating their sessions. Public visitor Bearer tokens are separate from employee sessions.

## Accounts and knowledge

| Method | Route | Input / result |
| --- | --- | --- |
| POST | `/api/auth/register` | `{name,companyName,email,password}`; requires ALLOW_SIGNUP=true; 201 + session |
| POST | `/api/auth/login` | `{email,password}`; session |
| POST | `/api/auth/logout` | Revoke current session |
| POST | `/api/auth/password` | `{currentPassword,newPassword}`; revoke all user sessions |
| POST | `/api/auth/reset/request` | `{email}`; uniform 202 when email service configured; rate limited |
| POST | `/api/auth/reset` | `{token,password}`; consume one-time reset and revoke sessions |
| GET | `/api/workspace` | `{user,organization,team,entries}` |
| PATCH | `/api/settings` | Complete organization settings including version |
| GET / POST | `/api/knowledge` | List / create service, product or rule |
| PATCH / DELETE | `/api/knowledge/:id` | Complete entry + version / `{version}` |
| POST | `/api/leads` | Public contact request with consent and honeypot |

Knowledge price/gross profit/cost values support UAH, USD, EUR and PLN, with at most two decimals; a null knowledge price means unknown. Settings systemPrompt/tone are used by AI. offHoursMessage is a retained settings field; scheduling business hours is not implemented.

## Website and unified inbox

| Method | Route | Input / result |
| --- | --- | --- |
| GET / PATCH | `/api/chat/config` | Private website config and shared AI preferences / `{enabled,autoReply,welcome,dailyLimit,version}` |
| GET | `/api/chat/config?publicId=UUID` | Public enabled config |
| POST | `/api/chat/session` | `{publicId,name,contact,locale,consent:true,attribution?,website?}` → `{token,thread}` |
| GET | `/api/chat/messages?conversationId=UUID` | Visitor Bearer token required |
| POST | `/api/chat/messages` | Visitor Bearer + `{conversationId,clientId:UUID,text}` |
| POST | `/api/chat/handoff` | Visitor Bearer + `{conversationId}` |
| GET | `/api/conversations` | `{threads,hasNext}`; query search (max 200), channel, status=all/waiting/closed, mine=true/false, page=0-based; 25 rows/page |
| GET / PATCH / DELETE | `/api/conversations/:id` | Thread / `{action,version}` / remove conversation and associated saved payloads |
| POST | `/api/conversations/:id/reply` | `{clientId:UUID,text}`; transactionally saves message and queues external delivery |
| GET | `/api/conversations/:id/export` | JSON attachment |
| GET / PATCH | `/api/conversations/:id/outcome` | Source, outcome, attribution, notes and deliveries / `{version,stage,value,grossProfit,currency,nextStep,assignedTo}` |
| POST | `/api/conversations/:id/notes` | `{content}`; private to team, excluded from AI |
| POST | `/api/deliveries/retry` | `{id,confirmPossibleDuplicate:true}`; retry failed or uncertain delivery |
| GET | `/api/analytics` | Counts, current-day AI usage and enabled connections |
| GET | `/api/analytics/channels?month=YYYY-MM-01` | Cohort report and versioned monthly costs |
| POST | `/api/analytics/channels` | `{channel,month,currency,amount,version}`; version=0 creates, existing requires current version |

Conversation actions: takeover/resume/close/reopen. Outcomes: new/qualified/won/lost. Source is immutable. Deal value is counted as revenue only for won outcomes; recorded profit covers only non-null profit values on won deals. Month filters conversation creation time in UTC, not payment date. CSV export is built in the browser from the same report response. Thread responses show a chronological window of the latest 250 messages; JSON export contains the full stored message history. Outcome version is independent of message activity so replies do not invalidate the deal form. Retention and deletion affect historical reports.

## Channels, workers and team

| Method | Route | Input / result |
| --- | --- | --- |
| GET / POST | `/api/channels` | Safe connection details / `{provider,label,accessToken,appSecret?,accountId?,telegramMode?,businessUserId?}` |
| PUT | `/api/channels/:id` | `{credentials:<connection input>,version}`; replace credentials and disable until re-enabled |
| PATCH | `/api/channels/:id` | `{enabled,version}`; verify credentials and install Telegram/Viber webhook when enabling |
| GET / POST | `/api/webhooks/:id` | Meta verify challenge / provider-signed raw body |
| GET / POST | `/api/webhooks/meta` | Shared Meta app challenge / HMAC-verified multi-account event routing |
| GET / POST | `/api/jobs/run` | `Authorization: Bearer CRON_SECRET`; bounded worker pass |
| GET / POST | `/api/jobs` | Admin diagnostics / `{id}` retries a failed job |
| GET / POST | `/api/workspaces` | `{currentId,workspaces}` / `{id}` issues session for a membership |
| GET / POST / PATCH / DELETE | `/api/team` | Team/pending invites/preferences / `{email,role}` / `{enabled}` notifications / `{id}` revoke invite |
| POST | `/api/team/member` | `{id,role:admin/agent/null}`; null removes membership |
| POST | `/api/team/accept` | `{token}` logged in as the invited email |
| POST | `/api/team/register` | `{token,email,name,password}`; create an invited account even if public signup closed |
| GET / POST | `/api/billing` | Actual stored subscription/config state / `{action:checkout/portal,locale}` returns Stripe URL |
| POST | `/api/billing/webhook` | Stripe-signed raw body |

Secrets use AES-256-GCM with connection-specific authenticated data. Webhooks use Telegram secret-token headers or provider HMACs; Meta challenge tokens are separate from HMAC app secrets. Inbound event IDs deduplicate before queueing. Outbox rows are created by a PostgreSQL trigger in the same transaction as outgoing messages. Queue leases and SKIP LOCKED allow multiple workers. Lost/ambiguous send confirmations become uncertain instead of blindly resending. Receipts are scoped to connection account IDs.

External text responses are chunked at 1,000 characters for Instagram and 4,000 for other channels. No arbitrary URL downloads, personal messenger scraping, bulk marketing or message-template bypass. External attachments trigger human review rather than AI guessing their contents.

## Errors

App errors return `{error:CODE}` with 4xx/503 as appropriate; validation may include fields. Unexpected errors return a random incident ID and do not log request bodies or tokens. Typical codes: UNAUTHORIZED, FORBIDDEN, NOT_FOUND, CONFLICT, INVALID_INPUT, RATE_LIMITED, CHANNEL_ALREADY_CONNECTED, INVALID_SIGNATURE, INVALID_CREDENTIALS, ENCRYPTION_NOT_CONFIGURED, EMAIL_NOT_CONFIGURED. Delivery rows retain safe diagnostic codes (REPLY_WINDOW_CLOSED, NETWORK_UNCERTAIN, PROVIDER_HTTP_401, etc.).

On 409 reload data before repeating an edit. Reuse the same clientId when retrying the same message. Never replace a failed delivery with a new logical message solely to hide its status.
