# HTTP API — ReplyLocal 0.2

Все маршруты работают в Next.js Node runtime. Защищённые запросы используют cookie `replylocal_session`; отдельного bearer-токена нет. Ответы API имеют `Cache-Control: no-store`.

Для изменяющих запросов обязателен `Origin`, точно совпадающий с origin из `APP_URL`. Для запросов с телом нужен `Content-Type: application/json`; максимальный размер тела — 65 536 байт. Неизвестные поля отклоняются. `POST /api/auth/logout` не требует тела.

Сервер получает организацию и роль из сессии. Нельзя передать `organizationId` и выбрать чужую компанию. Владелец и администратор изменяют знания и настройки; агент только читает. Управление членством пока отсутствует.

| Метод | Маршрут | Вход / результат |
| --- | --- | --- |
| POST | `/api/auth/register` | `{name, companyName, email, password}` → 201 `{ok:true}` + cookie; нужен `ALLOW_SIGNUP=true` |
| POST | `/api/auth/login` | `{email,password}` → `{ok:true}` + cookie |
| POST | `/api/auth/logout` | Отзыв текущей сессии и удаление cookie |
| POST | `/api/auth/password` | `{currentPassword,newPassword}` → `{ok:true}`, все сессии пользователя отозваны |
| GET | `/api/workspace` | `{user,organization,team,entries}` текущей компании |
| PATCH | `/api/settings` | Полный объект настроек с `version` → `{ok:true}` |
| GET | `/api/knowledge` | `{entries:[...]}` текущей компании |
| POST | `/api/knowledge` | Полный объект знания → 201 `{id}` |
| PATCH | `/api/knowledge/:id` | Полный объект знания + `version` → `{ok:true}` |
| DELETE | `/api/knowledge/:id` | JSON `{version}` → `{ok:true}` |
| POST | `/api/leads` | Данные заявки + `consent:true` → 201 `{ok:true}` |

После изменения заново запросите `/api/workspace`, чтобы получить актуальную версию. При 409 загрузите новые данные и предложите пользователю повторить изменение; автоматически перетирать новую запись нельзя.

## Пример знания

```json
{
  "kind": "service",
  "title": "Осмотр автомобиля",
  "content": "Визуальный осмотр по предварительной записи.",
  "price": 0,
  "currency": "UAH",
  "durationMinutes": 30,
  "sku": ""
}
```

`kind`: `service`, `product`, `rule`. `price`: число не меньше нуля, не более 9 999 999 999.99, до 2 знаков после точки; `null` означает неуказанную цену. `durationMinutes`: 1–10080 или `null`. Валюты: UAH, USD, EUR, PLN. Ответ содержит `id`, `version`, `updatedAt`. PATCH дополнительно требует актуальную положительную целую `version`.

## Пример настроек

```json
{
  "name": "Мастерская",
  "industry": "Автосервис",
  "timezone": "Europe/Kyiv",
  "currency": "UAH",
  "aiSettings": {
    "systemPrompt": "Использовать только подтверждённые факты.",
    "tone": "friendly",
    "offHoursMessage": ""
  },
  "version": 1
}
```

`tone`: friendly, formal, concise, consultative. AI-настройки только сохраняются для будущей интеграции. Они не запускают генерацию ответов.

## Пример заявки

```json
{
  "name": "Иван",
  "email": "owner@example.com",
  "phone": "@contact",
  "businessType": "Автосервис",
  "plan": "start",
  "locale": "ru",
  "consent": true,
  "website": ""
}
```

`plan`: start, pro, enterprise; `locale`: uk, ru, en. Непустой `website` — honeypot: сервер отвечает успешно, но заявку не сохраняет. Заявки не создают оплату и не отправляют уведомления.

## Ошибки

Формат: `{ "error": "CODE" }`. При неверных полях дополнительно `fields`; при неожиданной ошибке — идентификатор `incident` для сопоставления с серверным журналом, без SQL и секретов.

| HTTP | Значение |
| --- | --- |
| 400 | INVALID_INPUT |
| 401 | UNAUTHORIZED / INVALID_CREDENTIALS |
| 403 | FORBIDDEN / ORIGIN_REJECTED / SIGNUP_CLOSED |
| 404 | NOT_FOUND: запись отсутствует или принадлежит другой компании |
| 409 | CONFLICT / ACCOUNT_EXISTS / KNOWLEDGE_LIMIT |
| 413 | BODY_TOO_LARGE |
| 415 | INVALID_CONTENT_TYPE |
| 429 | RATE_LIMITED; Retry-After: 900 |
| 503 | NOT_CONFIGURED |
| 500 | SERVER_ERROR |

Полные ограничения полей — `src/lib/schemas.ts`. Пароль при регистрации/смене: 12–128 символов. Email нормализуется к нижнему регистру.
