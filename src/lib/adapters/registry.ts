import type { ChannelId, IChannelAdapter, CloudEvent } from './types';
import { TelegramAdapter, WhatsAppAdapter, InstagramAdapter } from './channel-adapters';
import { RozetkaAdapter, PromAdapter, AmazonAdapter } from './marketplace-adapters';

export interface IntegrationStatus {
    id: ChannelId;
    name: string;
    category: 'messenger' | 'marketplace' | 'webhook';
    connected: boolean;
    lastSyncAt: string;
    eventsCount: number;
    description: string;
    icon: string;
}

export class IntegrationRegistry {
    private adapters: Map<ChannelId, IChannelAdapter> = new Map();
    private eventLogs: CloudEvent[] = [];

    constructor() {
        this.register(new TelegramAdapter());
        this.register(new WhatsAppAdapter());
        this.register(new InstagramAdapter());
        this.register(new RozetkaAdapter());
        this.register(new PromAdapter());
        this.register(new AmazonAdapter());

        this.initMockEvents();
    }

    register(adapter: IChannelAdapter) {
        this.adapters.set(adapter.id, adapter);
    }

    getAdapter(id: ChannelId): IChannelAdapter | undefined {
        return this.adapters.get(id);
    }

    getAllAdapters(): IChannelAdapter[] {
        return Array.from(this.adapters.values());
    }

    getIntegrationsList(): IntegrationStatus[] {
        return [
            {
                id: 'telegram',
                name: 'Telegram Bot API',
                category: 'messenger',
                connected: true,
                lastSyncAt: '1 мин назад',
                eventsCount: 1420,
                description: 'Автоматические ответы в личных чатах и группах с клиентами',
                icon: 'Send',
            },
            {
                id: 'whatsapp',
                name: 'WhatsApp Cloud API',
                category: 'messenger',
                connected: true,
                lastSyncAt: '3 мин назад',
                eventsCount: 3890,
                description: 'Официальный Business API для работы с базой клиентов и лидами',
                icon: 'MessageCircle',
            },
            {
                id: 'instagram',
                name: 'Instagram Direct API',
                category: 'messenger',
                connected: true,
                lastSyncAt: '12 мин назад',
                eventsCount: 840,
                description: 'Ответы на входящие сообщения в Direct и реакции на Stories',
                icon: 'Instagram',
            },
            {
                id: 'rozetka',
                name: 'Rozetka Marketplace API',
                category: 'marketplace',
                connected: true,
                lastSyncAt: '5 мин назад',
                eventsCount: 2150,
                description: 'Автоответы на вопросы к товарам и отзывы покупателей Rozetka',
                icon: 'ShoppingBag',
            },
            {
                id: 'prom',
                name: 'Prom.ua API',
                category: 'marketplace',
                connected: false,
                lastSyncAt: 'Не подключено',
                eventsCount: 0,
                description: 'Обработка вопросов по артикулам и отзывов на Prom',
                icon: 'Store',
            },
            {
                id: 'amazon',
                name: 'Amazon SP-API',
                category: 'marketplace',
                connected: false,
                lastSyncAt: 'Не подключено',
                eventsCount: 0,
                description: 'Глобальные продажи: ответы на Buyer-Seller сообщения и отзывы',
                icon: 'Globe',
            },
            {
                id: 'webhook',
                name: 'CloudEvents Webhook & Unified API',
                category: 'webhook',
                connected: true,
                lastSyncAt: 'В реальном времени',
                eventsCount: 8300,
                description: 'Интеграция с внешней CRM, телефонией или кастомным бэкендом',
                icon: 'Webhook',
            },
        ];
    }

    private initMockEvents() {
        this.eventLogs = [
            {
                specversion: '1.0',
                id: 'evt_9918231',
                source: 'replylocal/adapter/telegram',
                type: 'com.replylocal.inquiry.created',
                datacontenttype: 'application/json',
                time: new Date(Date.now() - 60000).toISOString(),
                subject: 'Inquiry from @andrey_bmw',
                data: {
                    sender: 'Андрей Коваленко',
                    text: 'Сколько стоит диагностика BMW?',
                    channel: 'telegram',
                },
            },
            {
                specversion: '1.0',
                id: 'evt_9918232',
                source: 'replylocal/ai/orchestrator',
                type: 'com.replylocal.ai.suggested',
                datacontenttype: 'application/json',
                time: new Date(Date.now() - 55000).toISOString(),
                subject: 'AI Response generated with 94% confidence',
                data: {
                    sources: ['Services', 'Pricing', 'Business rules'],
                    confidence: 0.94,
                },
            },
            {
                specversion: '1.0',
                id: 'evt_9918233',
                source: 'replylocal/adapter/rozetka',
                type: 'com.replylocal.inquiry.created',
                datacontenttype: 'application/json',
                time: new Date(Date.now() - 300000).toISOString(),
                subject: 'Product Question for SKU RZ-9482-BRK',
                data: {
                    sender: 'Игорь В.',
                    text: 'Подойдут ли эти тормозные колодки на BMW 3 F30 2016 года?',
                    channel: 'rozetka',
                },
            },
            {
                specversion: '1.0',
                id: 'evt_9918234',
                source: 'replylocal/core/handoff',
                type: 'com.replylocal.handoff.triggered',
                datacontenttype: 'application/json',
                time: new Date(Date.now() - 600000).toISOString(),
                subject: 'Escalated to human operator: urgent priority',
                data: {
                    contact: 'Дмитрий Бондарь',
                    reason: 'Emergency / Car breakdown near service',
                },
            },
        ];
    }

    getEventLogs(): CloudEvent[] {
        return this.eventLogs;
    }

    logEvent(event: CloudEvent) {
        this.eventLogs.unshift(event);
    }
}

export const integrationRegistry = new IntegrationRegistry();
