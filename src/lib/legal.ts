// Privacy policy and terms of service for ReplyLocal in uk/ru/en.
// Operator details come from server env (LEGAL_OPERATOR_NAME, LEGAL_CONTACT_EMAIL, LEGAL_ADDRESS).
// The texts are a starting template: have them reviewed by a lawyer before a commercial launch.

export type LegalKind = "privacy" | "terms";
export type LegalLocale = "uk" | "ru" | "en";
type Section = { h: string; p: string[] };
type Doc = { title: string; intro: string; sections: Section[] };
type Labels = {
  updated: string;
  draft: string;
  privacy: string;
  terms: string;
  back: string;
  missing: { operator: string; email: string; address: string };
};

export const LEGAL_UPDATED = "2026-11-14";

export const legalLabels: Record<LegalLocale, Labels> = {
  uk: {
    updated: "Редакція від",
    draft:
      "Чернетка: реквізити оператора ще не вказані. Перед комерційним запуском заповніть LEGAL_OPERATOR_NAME, LEGAL_CONTACT_EMAIL і LEGAL_ADDRESS та перевірте текст із юристом.",
    privacy: "Політика конфіденційності",
    terms: "Умови використання",
    back: "На головну",
    missing: {
      operator: "[назва ФОП або компанії]",
      email: "[email для звернень]",
      address: "[адреса]",
    },
  },
  ru: {
    updated: "Редакция от",
    draft:
      "Черновик: реквизиты оператора ещё не указаны. Перед коммерческим запуском заполните LEGAL_OPERATOR_NAME, LEGAL_CONTACT_EMAIL и LEGAL_ADDRESS и проверьте текст с юристом.",
    privacy: "Политика конфиденциальности",
    terms: "Условия использования",
    back: "На главную",
    missing: {
      operator: "[название ФОП или компании]",
      email: "[email для обращений]",
      address: "[адрес]",
    },
  },
  en: {
    updated: "Version of",
    draft:
      "Draft: operator details are not set yet. Before a commercial launch fill in LEGAL_OPERATOR_NAME, LEGAL_CONTACT_EMAIL and LEGAL_ADDRESS and have the text reviewed by a lawyer.",
    privacy: "Privacy policy",
    terms: "Terms of service",
    back: "Home",
    missing: {
      operator: "[business or company name]",
      email: "[contact email]",
      address: "[address]",
    },
  },
};

const docs: Record<LegalKind, Record<LegalLocale, Doc>> = {
  privacy: {
    uk: {
      title: "Політика конфіденційності",
      intro:
        "Ця політика пояснює, які дані обробляє сервіс ReplyLocal, навіщо і як довго їх зберігає, кому передає і які права мають люди, чиї це дані.",
      sections: [
        {
          h: "Хто обробляє дані",
          p: [
            "Сервіс ReplyLocal надає {operator}, {address} (далі — «ми»).",
            "Для даних клієнтів автосервісу (СТО) володільцем персональних даних є СТО, яка користується ReplyLocal. Ми є розпорядником: обробляємо ці дані лише за дорученням СТО і для надання сервісу.",
            "Для даних облікових записів працівників СТО володільцем є ми.",
          ],
        },
        {
          h: "Які дані ми обробляємо",
          p: [
            "Обліковий запис: назва компанії, email, ім’я, роль у команді, хеш пароля (сам пароль ми не зберігаємо), сесії входу.",
            "Листування з клієнтами СТО: ім’я або нікнейм у месенджері, ідентифікатор чату, текст повідомлень, розшифровки голосових повідомлень, номер телефону, дані автомобіля (марка, модель, рік, держномер, VIN, пробіг, опис проблеми), записи на візит і суми виконаних робіт.",
            "Чат на сайті: UTM-мітки й адреса сторінки без параметрів запиту — щоб СТО бачила, звідки прийшло звернення.",
            "Оплата: здійснюється через платіжного провайдера. Дані банківських карток ми не отримуємо і не зберігаємо.",
            "Технічні журнали помилок без вмісту повідомлень, паролів і токенів.",
          ],
        },
        {
          h: "Навіщо",
          p: [
            "Щоб приймати повідомлення з каналів СТО і показувати їх у спільних «Вхідних»; готувати відповіді ШІ на основі бази знань конкретної СТО; створювати заявки на запис, надсилати підтвердження й нагадування; формувати звіти для СТО; захищати сервіс від зловживань; надавати підтримку й виставляти рахунки.",
          ],
        },
        {
          h: "Правові підстави",
          p: [
            "Виконання договору з СТО; згода клієнта, яку він дає перед початком чату на сайті; законний інтерес у безпеці сервісу; виконання вимог законодавства. Обробка відбувається відповідно до Закону України «Про захист персональних даних», а для людей у ЄС — і відповідно до GDPR.",
          ],
        },
        {
          h: "Кому передаються дані",
          p: [
            "Лише постачальникам, без яких сервіс не працює: хостинг і база даних (Vercel, Neon); підготовка відповідей і розшифровка голосових (OpenAI — передаються повідомлення розмови й записи бази знань СТО; за умовами OpenAI API дані за замовчуванням не використовуються для навчання моделей); доставка повідомлень у канал, звідки написав клієнт (Telegram, Meta — WhatsApp та Instagram, Viber); надсилання листів (Resend); прийом оплати (платіжний провайдер).",
            "Ми не продаємо персональні дані й не використовуємо їх для реклами.",
            "Сервери постачальників можуть розташовуватися за межами України, зокрема в ЄС і США.",
          ],
        },
        {
          h: "Скільки зберігаємо",
          p: [
            "Листування без активності видаляється автоматично через {retention} днів. Сесії входу й одноразові посилання видаляються після закінчення строку дії.",
            "СТО може в будь-який момент вивантажити або видалити листування у своєму кабінеті. Після припинення договору дані компанії видаляються на запит протягом 30 днів.",
          ],
        },
        {
          h: "Як захищаємо",
          p: [
            "Шифроване з’єднання (TLS), шифрування токенів підключених каналів, хешування паролів, перевірка підписів вхідних повідомлень, розмежування доступу між компаніями та за ролями всередині команди.",
          ],
        },
        {
          h: "Ваші права",
          p: [
            "Ви можете дізнатися, які дані про вас обробляються, вимагати їх виправлення чи видалення, обмежити обробку, відкликати згоду та подати скаргу Уповноваженому Верховної Ради України з прав людини.",
            "Клієнтам СТО краще звертатися безпосередньо до СТО, яка є володільцем їхніх даних. Ми допоможемо СТО виконати такий запит. Працівники СТО можуть писати нам: {email}.",
          ],
        },
        {
          h: "Cookie і сховище браузера",
          p: [
            "Кабінет використовує лише необхідний cookie сесії, щоб ви залишалися в системі. Чат на сайті зберігає ідентифікатор розмови в сховищі сесії браузера, доки вкладка відкрита. Аналітичних і рекламних cookie немає.",
          ],
        },
        {
          h: "Зміни та контакти",
          p: [
            "Про суттєві зміни цієї політики ми повідомляємо власників кабінетів email щонайменше за 14 днів. Питання щодо даних: {email}.",
          ],
        },
      ],
    },
    ru: {
      title: "Политика конфиденциальности",
      intro:
        "Эта политика объясняет, какие данные обрабатывает сервис ReplyLocal, зачем и как долго их хранит, кому передаёт и какие права есть у людей, чьи это данные.",
      sections: [
        {
          h: "Кто обрабатывает данные",
          p: [
            "Сервис ReplyLocal предоставляет {operator}, {address} (далее — «мы»).",
            "Для данных клиентов автосервиса (СТО) владельцем персональных данных является СТО, которая пользуется ReplyLocal. Мы — распорядитель: обрабатываем эти данные только по поручению СТО и для оказания сервиса.",
            "Для данных учётных записей сотрудников СТО владельцем являемся мы.",
          ],
        },
        {
          h: "Какие данные мы обрабатываем",
          p: [
            "Учётная запись: название компании, email, имя, роль в команде, хеш пароля (сам пароль мы не храним), сессии входа.",
            "Переписка с клиентами СТО: имя или ник в мессенджере, идентификатор чата, текст сообщений, расшифровки голосовых сообщений, номер телефона, данные автомобиля (марка, модель, год, госномер, VIN, пробег, описание проблемы), записи на визит и суммы выполненных работ.",
            "Чат на сайте: UTM-метки и адрес страницы без параметров запроса — чтобы СТО видела, откуда пришло обращение.",
            "Оплата: проходит через платёжного провайдера. Данные банковских карт мы не получаем и не храним.",
            "Технические журналы ошибок без содержания сообщений, паролей и токенов.",
          ],
        },
        {
          h: "Зачем",
          p: [
            "Чтобы принимать сообщения из каналов СТО и показывать их в общих «Входящих»; готовить ответы ИИ по базе знаний конкретной СТО; создавать заявки на запись, отправлять подтверждения и напоминания; формировать отчёты для СТО; защищать сервис от злоупотреблений; оказывать поддержку и выставлять счета.",
          ],
        },
        {
          h: "Правовые основания",
          p: [
            "Исполнение договора с СТО; согласие клиента, которое он даёт перед началом чата на сайте; законный интерес в безопасности сервиса; выполнение требований закона. Обработка ведётся в соответствии с Законом Украины «О защите персональных данных», а для людей в ЕС — также в соответствии с GDPR.",
          ],
        },
        {
          h: "Кому передаются данные",
          p: [
            "Только поставщикам, без которых сервис не работает: хостинг и база данных (Vercel, Neon); подготовка ответов и расшифровка голосовых (OpenAI — передаются сообщения разговора и записи базы знаний СТО; по условиям OpenAI API данные по умолчанию не используются для обучения моделей); доставка сообщений в канал, откуда написал клиент (Telegram, Meta — WhatsApp и Instagram, Viber); отправка писем (Resend); приём оплаты (платёжный провайдер).",
            "Мы не продаём персональные данные и не используем их для рекламы.",
            "Серверы поставщиков могут находиться за пределами Украины, в том числе в ЕС и США.",
          ],
        },
        {
          h: "Сколько храним",
          p: [
            "Переписка без активности удаляется автоматически через {retention} дней. Сессии входа и одноразовые ссылки удаляются после истечения срока действия.",
            "СТО может в любой момент выгрузить или удалить переписку в своём кабинете. После прекращения договора данные компании удаляются по запросу в течение 30 дней.",
          ],
        },
        {
          h: "Как защищаем",
          p: [
            "Шифрованное соединение (TLS), шифрование токенов подключённых каналов, хеширование паролей, проверка подписей входящих сообщений, разграничение доступа между компаниями и по ролям внутри команды.",
          ],
        },
        {
          h: "Ваши права",
          p: [
            "Вы можете узнать, какие данные о вас обрабатываются, потребовать их исправления или удаления, ограничить обработку, отозвать согласие и подать жалобу Уполномоченному Верховной Рады Украины по правам человека.",
            "Клиентам СТО лучше обращаться напрямую в СТО, которая является владельцем их данных. Мы поможем СТО выполнить такой запрос. Сотрудники СТО могут писать нам: {email}.",
          ],
        },
        {
          h: "Cookie и хранилище браузера",
          p: [
            "Кабинет использует только необходимый cookie сессии, чтобы вы оставались в системе. Чат на сайте хранит идентификатор разговора в хранилище сессии браузера, пока вкладка открыта. Аналитических и рекламных cookie нет.",
          ],
        },
        {
          h: "Изменения и контакты",
          p: [
            "О существенных изменениях этой политики мы сообщаем владельцам кабинетов по email минимум за 14 дней. Вопросы о данных: {email}.",
          ],
        },
      ],
    },
    en: {
      title: "Privacy policy",
      intro:
        "This policy explains what data the ReplyLocal service processes, why and for how long it keeps it, who receives it, and what rights the people it belongs to have.",
      sections: [
        {
          h: "Who processes the data",
          p: [
            "ReplyLocal is provided by {operator}, {address} (“we”).",
            "For data about a car service station’s customers, the station that uses ReplyLocal is the controller. We are the processor: we handle that data only on the station’s instructions and to provide the service.",
            "For the accounts of station staff, we are the controller.",
          ],
        },
        {
          h: "What data we process",
          p: [
            "Account: company name, email, name, team role, password hash (we never store the password itself), sign-in sessions.",
            "Conversations with station customers: messenger name or handle, chat ID, message text, voice message transcripts, phone number, car details (make, model, year, plate, VIN, mileage, problem description), visit bookings and amounts for completed work.",
            "Website chat: UTM tags and the page address without query parameters, so the station can see where an inquiry came from.",
            "Payments: handled by a payment provider. We never receive or store card details.",
            "Technical error logs that contain no message content, passwords or tokens.",
          ],
        },
        {
          h: "Why",
          p: [
            "To receive messages from the station’s channels and show them in a shared inbox; to prepare AI replies from that station’s own knowledge base; to create booking requests and send confirmations and reminders; to build reports for the station; to protect the service from abuse; to provide support and invoicing.",
          ],
        },
        {
          h: "Legal basis",
          p: [
            "Performance of the contract with the station; the customer’s consent given before starting a website chat; legitimate interest in keeping the service secure; legal obligations. We process data under the Law of Ukraine “On Personal Data Protection” and, for people in the EU, the GDPR.",
          ],
        },
        {
          h: "Who receives the data",
          p: [
            "Only providers the service cannot run without: hosting and database (Vercel, Neon); reply drafting and voice transcription (OpenAI receives the conversation messages and the station’s knowledge entries; under the OpenAI API terms this data is not used to train models by default); delivery to the channel the customer wrote from (Telegram, Meta for WhatsApp and Instagram, Viber); email delivery (Resend); payments (payment provider).",
            "We do not sell personal data or use it for advertising.",
            "Provider servers may be located outside Ukraine, including in the EU and the USA.",
          ],
        },
        {
          h: "How long we keep it",
          p: [
            "Conversations with no activity are deleted automatically after {retention} days. Sign-in sessions and one-time links are deleted when they expire.",
            "A station can export or delete conversations in its workspace at any time. After the contract ends, company data is deleted on request within 30 days.",
          ],
        },
        {
          h: "How we protect it",
          p: [
            "Encrypted connections (TLS), encrypted channel tokens, hashed passwords, signature checks on incoming messages, and access separated between companies and by role within a team.",
          ],
        },
        {
          h: "Your rights",
          p: [
            "You can ask what data about you is processed, have it corrected or deleted, restrict processing, withdraw consent, and complain to the Ukrainian Parliament Commissioner for Human Rights or your local data protection authority.",
            "Station customers should contact the station directly, since it controls their data. We help stations fulfil such requests. Station staff can write to us at {email}.",
          ],
        },
        {
          h: "Cookies and browser storage",
          p: [
            "The workspace uses only a necessary session cookie to keep you signed in. The website chat keeps the conversation ID in the browser’s session storage while the tab is open. There are no analytics or advertising cookies.",
          ],
        },
        {
          h: "Changes and contact",
          p: [
            "We notify workspace owners by email at least 14 days before material changes to this policy. Questions about data: {email}.",
          ],
        },
      ],
    },
  },
  terms: {
    uk: {
      title: "Умови використання",
      intro:
        "Ці умови є публічною офертою. Реєструючи кабінет або оплачуючи підписку, компанія (далі — «Клієнт») приймає їх у повному обсязі.",
      sections: [
        {
          h: "Сторони й предмет",
          p: [
            "{operator} (далі — «Виконавець») надає Клієнту доступ до сервісу ReplyLocal: спільних «Вхідних» для повідомлень із сайту та месенджерів, відповідей ШІ на основі бази знань Клієнта, онлайн-запису, нагадувань і звітів.",
            "Конкретний набір можливостей залежить від тарифу та каналів, які Клієнт підключив і які дозволили відповідні платформи.",
          ],
        },
        {
          h: "Пробний період і оплата",
          p: [
            "Пілотний період і його умови погоджуються окремо. Далі сервіс оплачується за тарифом, вказаним на сайті або в рахунку, наперед за кожен період.",
            "Якщо оплату не отримано, Виконавець може вимкнути автоматичні відповіді ШІ. Прийом повідомлень і робота співробітників у кабінеті при цьому зберігаються.",
          ],
        },
        {
          h: "Обов’язки Клієнта",
          p: [
            "Підтримувати актуальну й достовірну базу знань: послуги, ціни, адресу, години роботи, правила.",
            "Законно отримувати контакти своїх клієнтів і повідомляти їм, що листування обробляється сервісом зі ШІ.",
            "Не використовувати сервіс для спаму, масових розсилок без згоди отримувачів чи незаконного контенту.",
            "Дотримуватися правил Telegram, Meta (WhatsApp, Instagram) і Viber, зберігати паролі й токени в таємниці та вчасно видаляти доступ звільнених працівників.",
          ],
        },
        {
          h: "Як працює ШІ",
          p: [
            "ШІ відповідає лише на основі бази знань Клієнта і передає розмову людині, якщо фактів бракує. Проте він може помилятися, тому важливі відповіді Клієнт перевіряє сам.",
            "Запис, створений ШІ, є попередньою заявкою, доки її не підтвердить працівник Клієнта.",
            "Виконавець не відповідає за ціни, строки чи обіцянки, які виникли через неповну або неправильну базу знань.",
          ],
        },
        {
          h: "Сторонні платформи",
          p: [
            "Канали працюють через офіційні API Telegram, Meta і Viber. Їхні обмеження — наприклад, 24-годинне вікно для відповіді, перевірка застосунку Meta, платні тарифи на ботів — не залежать від Виконавця.",
          ],
        },
        {
          h: "Доступність",
          p: [
            "Виконавець прагне безперервної роботи сервісу і заздалегідь попереджає про планові роботи. Безперебійність на рівні 100% не гарантується.",
          ],
        },
        {
          h: "Відповідальність",
          p: [
            "Сукупна відповідальність Виконавця обмежується сумою, яку Клієнт сплатив за останні три місяці. Виконавець не відповідає за упущену вигоду та непрямі збитки.",
          ],
        },
        {
          h: "Дані",
          p: [
            "Клієнт є володільцем персональних даних своїх клієнтів. Виконавець обробляє їх за дорученням Клієнта відповідно до Політики конфіденційності. Клієнт може в будь-який момент вивантажити або видалити листування.",
          ],
        },
        {
          h: "Строк дії та припинення",
          p: [
            "Договір діє безстроково. Клієнт може відмовитися від сервісу в будь-який момент, при цьому вже оплачений період не повертається, якщо інше не погоджено.",
            "Виконавець може призупинити доступ у разі порушення цих умов, попередивши Клієнта, крім випадків, коли порушення шкодить іншим користувачам чи безпеці сервісу.",
          ],
        },
        {
          h: "Зміни умов і право",
          p: [
            "Про зміни умов Виконавець повідомляє власника кабінету email щонайменше за 14 днів. До договору застосовується право України. Спори вирішуються переговорами, а якщо домовитися не вдалося — у суді.",
          ],
        },
        {
          h: "Реквізити",
          p: ["{operator}", "{address}", "{email}"],
        },
      ],
    },
    ru: {
      title: "Условия использования",
      intro:
        "Эти условия являются публичной офертой. Регистрируя кабинет или оплачивая подписку, компания (далее — «Клиент») принимает их полностью.",
      sections: [
        {
          h: "Стороны и предмет",
          p: [
            "{operator} (далее — «Исполнитель») предоставляет Клиенту доступ к сервису ReplyLocal: общим «Входящим» для сообщений с сайта и из мессенджеров, ответам ИИ по базе знаний Клиента, онлайн-записи, напоминаниям и отчётам.",
            "Конкретный набор возможностей зависит от тарифа и каналов, которые Клиент подключил и которые разрешили соответствующие платформы.",
          ],
        },
        {
          h: "Пробный период и оплата",
          p: [
            "Пилотный период и его условия согласуются отдельно. Далее сервис оплачивается по тарифу, указанному на сайте или в счёте, заранее за каждый период.",
            "Если оплата не получена, Исполнитель может отключить автоматические ответы ИИ. Приём сообщений и работа сотрудников в кабинете при этом сохраняются.",
          ],
        },
        {
          h: "Обязанности Клиента",
          p: [
            "Поддерживать актуальную и достоверную базу знаний: услуги, цены, адрес, часы работы, правила.",
            "Законно получать контакты своих клиентов и сообщать им, что переписка обрабатывается сервисом с ИИ.",
            "Не использовать сервис для спама, массовых рассылок без согласия получателей или незаконного контента.",
            "Соблюдать правила Telegram, Meta (WhatsApp, Instagram) и Viber, хранить пароли и токены в тайне и вовремя удалять доступ уволенных сотрудников.",
          ],
        },
        {
          h: "Как работает ИИ",
          p: [
            "ИИ отвечает только по базе знаний Клиента и передаёт разговор человеку, если фактов не хватает. Однако он может ошибаться, поэтому важные ответы Клиент проверяет сам.",
            "Запись, созданная ИИ, является предварительной заявкой, пока её не подтвердит сотрудник Клиента.",
            "Исполнитель не отвечает за цены, сроки или обещания, возникшие из-за неполной или неверной базы знаний.",
          ],
        },
        {
          h: "Сторонние платформы",
          p: [
            "Каналы работают через официальные API Telegram, Meta и Viber. Их ограничения — например, 24-часовое окно для ответа, проверка приложения Meta, платные тарифы на ботов — не зависят от Исполнителя.",
          ],
        },
        {
          h: "Доступность",
          p: [
            "Исполнитель стремится к непрерывной работе сервиса и заранее предупреждает о плановых работах. Бесперебойность на уровне 100% не гарантируется.",
          ],
        },
        {
          h: "Ответственность",
          p: [
            "Совокупная ответственность Исполнителя ограничена суммой, которую Клиент заплатил за последние три месяца. Исполнитель не отвечает за упущенную выгоду и косвенные убытки.",
          ],
        },
        {
          h: "Данные",
          p: [
            "Клиент является владельцем персональных данных своих клиентов. Исполнитель обрабатывает их по поручению Клиента в соответствии с Политикой конфиденциальности. Клиент может в любой момент выгрузить или удалить переписку.",
          ],
        },
        {
          h: "Срок действия и прекращение",
          p: [
            "Договор действует бессрочно. Клиент может отказаться от сервиса в любой момент, при этом уже оплаченный период не возвращается, если не согласовано иное.",
            "Исполнитель может приостановить доступ при нарушении этих условий, предупредив Клиента, кроме случаев, когда нарушение вредит другим пользователям или безопасности сервиса.",
          ],
        },
        {
          h: "Изменение условий и право",
          p: [
            "Об изменении условий Исполнитель сообщает владельцу кабинета по email минимум за 14 дней. К договору применяется право Украины. Споры решаются переговорами, а если договориться не удалось — в суде.",
          ],
        },
        {
          h: "Реквизиты",
          p: ["{operator}", "{address}", "{email}"],
        },
      ],
    },
    en: {
      title: "Terms of service",
      intro:
        "These terms are a public offer. By creating a workspace or paying for a subscription, the company (the “Client”) accepts them in full.",
      sections: [
        {
          h: "Parties and subject",
          p: [
            "{operator} (the “Provider”) gives the Client access to the ReplyLocal service: a shared inbox for website and messenger conversations, AI replies based on the Client’s knowledge base, online booking, reminders and reports.",
            "The exact feature set depends on the plan and on the channels the Client has connected and the platforms have approved.",
          ],
        },
        {
          h: "Trial and payment",
          p: [
            "A pilot period and its conditions are agreed separately. After that the service is paid in advance for each period at the rate shown on the website or in the invoice.",
            "If payment is not received, the Provider may switch off automatic AI replies. Incoming messages and staff work in the workspace keep working.",
          ],
        },
        {
          h: "Client obligations",
          p: [
            "Keep the knowledge base accurate and current: services, prices, address, opening hours, rules.",
            "Obtain customer contact details lawfully and tell customers that conversations are handled by a service that uses AI.",
            "Do not use the service for spam, bulk messaging without the recipients’ consent, or unlawful content.",
            "Follow the rules of Telegram, Meta (WhatsApp, Instagram) and Viber, keep passwords and tokens secret, and remove access for staff who leave.",
          ],
        },
        {
          h: "How the AI works",
          p: [
            "The AI answers only from the Client’s knowledge base and hands the conversation to a person when facts are missing. It can still make mistakes, so the Client checks important answers.",
            "A booking created by the AI is a preliminary request until a member of the Client’s staff confirms it.",
            "The Provider is not responsible for prices, deadlines or promises that result from an incomplete or incorrect knowledge base.",
          ],
        },
        {
          h: "Third-party platforms",
          p: [
            "Channels work through the official Telegram, Meta and Viber APIs. Their limits, such as the 24-hour reply window, Meta app review or paid bot plans, are outside the Provider’s control.",
          ],
        },
        {
          h: "Availability",
          p: [
            "The Provider aims for continuous operation and announces planned maintenance in advance. 100% uptime is not guaranteed.",
          ],
        },
        {
          h: "Liability",
          p: [
            "The Provider’s total liability is limited to the amount the Client paid in the last three months. The Provider is not liable for lost profit or indirect damages.",
          ],
        },
        {
          h: "Data",
          p: [
            "The Client is the controller of its customers’ personal data. The Provider processes it on the Client’s instructions as described in the Privacy policy. The Client can export or delete conversations at any time.",
          ],
        },
        {
          h: "Term and termination",
          p: [
            "The agreement has no fixed end date. The Client may stop using the service at any time; a period already paid is not refunded unless agreed otherwise.",
            "The Provider may suspend access for a breach of these terms after warning the Client, except where the breach harms other users or the security of the service.",
          ],
        },
        {
          h: "Changes and governing law",
          p: [
            "The Provider notifies the workspace owner by email at least 14 days before the terms change. The agreement is governed by the law of Ukraine. Disputes are settled by negotiation and, failing that, in court.",
          ],
        },
        {
          h: "Provider details",
          p: ["{operator}", "{address}", "{email}"],
        },
      ],
    },
  },
};

export function legalDocument(kind: LegalKind, locale: LegalLocale) {
  const labels = legalLabels[locale];
  const operator = process.env.LEGAL_OPERATOR_NAME?.trim() ?? "";
  const email = process.env.LEGAL_CONTACT_EMAIL?.trim() ?? "";
  const address = process.env.LEGAL_ADDRESS?.trim() ?? "";
  const days = Number(process.env.DATA_RETENTION_DAYS ?? 90);
  const values: Record<string, string> = {
    operator: operator || labels.missing.operator,
    email: email || labels.missing.email,
    address: address || labels.missing.address,
    retention: String(Number.isFinite(days) && days >= 30 ? days : 90),
  };
  const fill = (text: string) =>
    text.replace(/\{(operator|email|address|retention)\}/g, (_, key) => values[key]);
  const doc = docs[kind][locale];
  return {
    labels,
    draft: !operator || !email || !address,
    title: doc.title,
    intro: fill(doc.intro),
    sections: doc.sections.map((s) => ({ h: s.h, p: s.p.map(fill) })),
  };
}
