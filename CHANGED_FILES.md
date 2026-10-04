# Файлы относительно исходного project.zip

Исходная структура сравнивается без зависимостей, сборок, локальных секретов и служебных артефактов. `CHANGED_FILES.md` и `SHA256SUMS.txt` созданы при упаковке.

## Добавлены

- `.env.example`
- `.nvmrc`
- `API.md`
- `CHANGELOG.md`
- `TESTING.md`
- `db/001_initial.sql`
- `playwright.config.ts`
- `scripts/env.mjs`
- `scripts/export-leads.mjs`
- `scripts/maintenance.mjs`
- `scripts/migrate.mjs`
- `scripts/run-e2e.mjs`
- `src/app/[locale]/demo/page.tsx`
- `src/app/api/auth/login/route.ts`
- `src/app/api/auth/logout/route.ts`
- `src/app/api/auth/password/route.ts`
- `src/app/api/auth/register/route.ts`
- `src/app/api/knowledge/[id]/route.ts`
- `src/app/api/knowledge/route.ts`
- `src/app/api/leads/route.ts`
- `src/app/api/settings/route.ts`
- `src/app/api/workspace/route.ts`
- `src/components/workspace-provider.tsx`
- `src/lib/api-client.ts`
- `src/lib/schemas.ts`
- `src/proxy.ts`
- `src/server/database.ts`
- `src/server/errors.ts`
- `src/server/http.ts`
- `src/server/passwords.ts`
- `src/server/store.ts`
- `tests/e2e/api.spec.ts`
- `tests/e2e/workspace.spec.ts`
- `tests/store.test.ts`

## Изменены

- `.gitignore`
- `README.md`
- `next.config.ts`
- `package-lock.json`
- `package.json`
- `postcss.config.mjs`
- `src/app/[locale]/(app)/analytics/page.tsx`
- `src/app/[locale]/(app)/dashboard/page.tsx`
- `src/app/[locale]/(app)/inbox/[conversationId]/page.tsx`
- `src/app/[locale]/(app)/inbox/page.tsx`
- `src/app/[locale]/(app)/integrations/page.tsx`
- `src/app/[locale]/(app)/knowledge/page.tsx`
- `src/app/[locale]/(app)/layout.tsx`
- `src/app/[locale]/(app)/settings/page.tsx`
- `src/app/[locale]/(auth)/login/page.tsx`
- `src/app/[locale]/(auth)/register/page.tsx`
- `src/app/[locale]/page.tsx`
- `src/app/globals.css`
- `src/app/layout.tsx`
- `src/components/inbox/ai-suggestion.tsx`
- `src/components/inbox/conversation-list.tsx`
- `src/components/inbox/inbox-shell.tsx`
- `src/components/layout/header.tsx`
- `src/components/layout/sidebar.tsx`
- `src/lib/adapters/channel-adapters.ts`
- `src/lib/adapters/marketplace-adapters.ts`
- `src/lib/adapters/registry.ts`
- `src/lib/ai/orchestrator.ts`
- `src/messages/en.json`
- `src/messages/ru.json`
- `src/messages/uk.json`

## Удалены — учесть при копировании поверх старого проекта

- `src/middleware.ts`

