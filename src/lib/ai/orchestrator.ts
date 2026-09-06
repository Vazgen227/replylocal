import {
    mockServices,
    mockPassports,
    defaultAIPersona,
} from '@/lib/mocks/knowledge';
import type { AISuggestion } from '@/types/inbox';

export interface AIRequestContext {
    conversationId: string;
    customerName: string;
    channel: string;
    lastMessage: string;
    tone?: 'friendly' | 'formal' | 'concise' | 'consultative';
}

export class AIOrchestrator {
    /**
     * Simulates RAG (Retrieval-Augmented Generation)
     * Matches the customer message with Services, Passports, and Business Rules.
     */
    static generateSuggestion(context: AIRequestContext): AISuggestion {
        const text = context.lastMessage.toLowerCase();
        const tone = context.tone || defaultAIPersona.tone;
        const matchedSources: string[] = [];

        // Check for emergency / escalation keywords
        const isEscalation = defaultAIPersona.humanHandoffKeywords.some((kw) =>
            text.includes(kw)
        ) || text.includes('не заводится') || text.includes('дтп');

        if (isEscalation) {
            matchedSources.push('Business rules (Escalation protocol)');
            return {
                status: 'ready',
                confidence: 0.76,
                sources: matchedSources,
                generatedAt: 'Только что',
                suggestedReply:
                    'Понимаю важность ситуации! Переключаю диалог на старшего мастера смены. Он свяжется с вами в течение 2 минут для решения вопроса.',
            };
        }

        // Match services
        const matchedService = mockServices.find(
            (s) =>
                text.includes(s.category.toLowerCase()) ||
                text.includes('диагностика') ||
                text.includes('масло') ||
                text.includes('колодк') ||
                text.includes('химчистк')
        );

        if (matchedService) {
            matchedSources.push(`Services Catalog (${matchedService.name})`);
            matchedSources.push('Pricing list');
        }

        // Match rules
        if (text.includes('время') || text.includes('запись') || text.includes('сегодня') || text.includes('без записи')) {
            matchedSources.push('Business rules (Operating hours & Booking)');
        }

        // Match passports
        const matchedPassport = mockPassports.find(
            (passport) => text.includes('bmw') || text.includes('покрыти') || text.includes('колодк') || text.includes(passport.sku.toLowerCase())
        );
        if (matchedPassport) {
            matchedSources.push(`Product Passport (${matchedPassport.marketplace}: ${matchedPassport.sku})`);
        }

        if (matchedSources.length === 0) {
            matchedSources.push('AI General Knowledge');
            matchedSources.push('Tone & Greeting Rules');
        }

        // Tone adjustments
        let reply = '';
        if (text.includes('диагностика')) {
            if (tone === 'concise') {
                reply = 'Диагностика от 500 грн, занимает ~45 мин. Назовите модель авто и желаемое время для записи.';
            } else if (tone === 'formal') {
                reply = 'Здравствуйте! Стоимость комплексной компьютерной диагностики составляет от 500 грн. Длительность процедуры — 45 минут. Пожалуйста, укажите модель автомобиля и удобное для вас время визита.';
            } else {
                reply = 'Добрый день! Стоимость диагностики начинается от 500 грн. Подскажите, пожалуйста, модель и год автомобиля, и я с радостью подберу удобное время для записи.';
            }
        } else if (text.includes('после 18:00') || text.includes('записаться')) {
            if (tone === 'concise') {
                reply = 'Сегодня после 18:00 свободно 18:30 и 19:15. Какое время забронировать за вами?';
            } else {
                reply = 'Здравствуйте! С удовольствием помогу с записью. На сегодня после 18:00 есть свободные окна на 18:30 и 19:15. Какое время вам лучше зарезервировать?';
            }
        } else if (text.includes('без записи')) {
            reply = 'Можно приехать и без предварительной записи, однако наличие свободного поста зависит от текущей загрузки. Чтобы вам не пришлось ждать, рекомендуем зафиксировать время визита.';
        } else {
            reply = `Добрый день! Благодарим за обращение. Подскажите, пожалуйста, детали вашего вопроса, чтобы мы могли сориентировать вас по стоимости и времени.`;
        }

        const confidence = matchedSources.length > 1 ? 0.94 : 0.88;

        return {
            status: 'ready',
            confidence,
            sources: matchedSources,
            generatedAt: '1 мин назад',
            suggestedReply: reply,
        };
    }
}
