export interface ServiceItem {
    id: string;
    name: string;
    category: string;
    price: number;
    currency: 'RUB' | 'UAH' | 'USD' | 'EUR';
    durationMinutes: number;
    description: string;
    popular: boolean;
}

export interface ProductPassport {
    id: string;
    sku: string;
    marketplace: 'Rozetka' | 'Prom' | 'Amazon' | 'Shopify';
    title: string;
    price: number;
    currency: string;
    specifications: Record<string, string>;
    commonQuestions: Array<{
        question: string;
        answer: string;
    }>;
}

export interface BusinessRule {
    id: string;
    category: 'schedule' | 'payment' | 'warranty' | 'escalation' | 'general';
    title: string;
    rule: string;
    triggerKeywords: string[];
}

export interface AIPersonaConfig {
    businessName: string;
    industry: string;
    tone: 'friendly' | 'formal' | 'concise' | 'consultative';
    systemPrompt: string;
    autoReplyConfidenceThreshold: number; // e.g. 0.85
    humanHandoffKeywords: string[];
    operatingHours: {
        weekdays: string;
        weekends: string;
        autoReplyOffHoursMessage: string;
    };
}

export const mockServices: ServiceItem[] = [
    {
        id: 'srv_1',
        name: 'Компьютерная диагностика двигателя и систем',
        category: 'Диагностика',
        price: 500,
        currency: 'UAH',
        durationMinutes: 45,
        description: 'Полное считывание кодов ошибок, проверка параметров датчиков в реальном времени, сброс сервисных интервалов.',
        popular: true,
    },
    {
        id: 'srv_2',
        name: 'Замена моторного масла и масляного фильтра',
        category: 'ТО',
        price: 400,
        currency: 'UAH',
        durationMinutes: 30,
        description: 'Снятие/установка защиты картера, слив отработанного масла, замена фильтра и колец, заливка свежего масла.',
        popular: true,
    },
    {
        id: 'srv_3',
        name: 'Замена передних тормозных колодок',
        category: 'Тормозная система',
        price: 600,
        currency: 'UAH',
        durationMinutes: 60,
        description: 'Очистка суппортов, смазка направляющих, замена колодок и датчиков износа.',
        popular: false,
    },
    {
        id: 'srv_4',
        name: 'Комплексная химчистка салона и озонация',
        category: 'Детейлинг',
        price: 2800,
        currency: 'UAH',
        durationMinutes: 240,
        description: 'Глубокая влажная очистка сидений, ковролина, потолка, пластика с последующей антибактериальной озонацией.',
        popular: true,
    },
];

export const mockPassports: ProductPassport[] = [
    {
        id: 'pass_1',
        sku: 'RZ-9482-BRK',
        marketplace: 'Rozetka',
        title: 'Керамічні гальмівні колодки Performance для BMW 3/4 series',
        price: 1850,
        currency: 'UAH',
        specifications: {
            'Сумісність': 'BMW 3 (F30/F31), BMW 4 (F32/F36) 2012-2019',
            'Вісь встановлення': 'Передня',
            'Матеріал': 'Кераміка без скрипу та пилу',
            'Гарантія': '12 міс',
        },
        commonQuestions: [
            {
                question: 'Чи підійдуть на BMW 320d 2016?',
                answer: 'Так, ці колодки повністю сумісні з усіма модифікаціями F30 з базовими гальмами.',
            },
            {
                question: 'Чи є в комплекті датчик зносу?',
                answer: 'Датчик зносу постачається окремо, артикул RZ-9482-SNS.',
            },
        ],
    },
    {
        id: 'pass_2',
        sku: 'PR-5521-CER',
        marketplace: 'Prom',
        title: 'Гідрофобне керамічне покриття 9H для кузова авто 50мл',
        price: 1290,
        currency: 'UAH',
        specifications: {
            'Обʼєм': '50 мл',
            'Твердість': '9H Real Diamond Ceramic',
            'Стійкість': 'До 12 місяців захисту від подряпин та бруду',
        },
        commonQuestions: [
            {
                question: 'Чи вистачить флакона на кросовер?',
                answer: 'Так, обʼєму 50 мл достатньо для покриття кросовера (наприклад, RAV4 або X5) у 2 повні шари.',
            },
        ],
    },
];

export const mockRules: BusinessRule[] = [
    {
        id: 'rule_1',
        category: 'schedule',
        title: 'График работы и прием по записи',
        rule: 'Автосервис работает ежедневно с 09:00 до 20:00. Прием автомобилей осуществляется по предварительной записи. Без записи возможен только срочный осмотр при наличии свободных подъемников.',
        triggerKeywords: ['график', 'время', 'запись', 'часы работы', 'без записи', 'сегодня'],
    },
    {
        id: 'rule_2',
        category: 'warranty',
        title: 'Гарантийные обязательства',
        rule: 'На все выполненные работы предоставляется гарантия 6 месяцев или 10 000 км пробега. На оригинальные запчасти — гарантия 12 месяцев.',
        triggerKeywords: ['гарантия', 'брак', 'сломалось', 'возврат'],
    },
    {
        id: 'rule_3',
        category: 'payment',
        title: 'Способы оплаты',
        rule: 'Принимаем оплату наличными, банковскими картами (Visa/Mastercard), через QR-код и безналичным расчетом для юридических лиц с НДС.',
        triggerKeywords: ['оплата', 'карта', 'нал', 'безнал', 'счет', 'терминал'],
    },
    {
        id: 'rule_4',
        category: 'escalation',
        title: 'Экстренная эскалация на оператора',
        rule: 'При возникновении аварийной ситуации (машина заглохла на дороге, ДТП, эвакуатор) AI обязан немедленно предложить помощь эвакуатора и передать диалог дежурному мастеру.',
        triggerKeywords: ['не заводится', 'заглохла', 'эвакуатор', 'дтп', 'срочно', 'авария', 'горит чек'],
    },
];

export const defaultAIPersona: AIPersonaConfig = {
    businessName: 'АвтоТехЦентр «ReplyLocal Motors»',
    industry: 'Автосервис и продажа автозапчастей',
    tone: 'consultative',
    systemPrompt: `Вы — экспертный AI-ассистент компании ReplyLocal Motors. Ваша цель — вежливо, быстро и точно отвечать на вопросы клиентов в Telegram, WhatsApp, Instagram и маркетплейсах.
Главная задача диалога — выявить потребность клиента, сориентировать по стоимости и предложить удобное время для записи на сервис.
Не спорьте с клиентом. Если клиент задает вопрос, выходящий за рамки базы знаний, мягко предложите соединить со специалистом.`,
    autoReplyConfidenceThreshold: 0.85,
    humanHandoffKeywords: ['человек', 'оператор', 'менеджер', 'жалоба', 'верните деньги', 'суд', 'директор', 'не согласен'],
    operatingHours: {
        weekdays: '09:00 - 20:00',
        weekends: '10:00 - 18:00',
        autoReplyOffHoursMessage: 'Здравствуйте! Наш сервис сейчас закрыт (работаем с 09:00). Я зафиксировал ваш вопрос и забронировал приоритет на утро. Могу я уточнить модель авто?',
    },
};
