import type {
    IChannelAdapter,
    ChannelId,
    ChannelCategory,
    AdapterCredentials,
    InquiryMessage,
    CloudEvent,
} from './types';

abstract class BaseChannelAdapter implements IChannelAdapter {
    abstract readonly id: ChannelId;
    abstract readonly name: string;
    readonly category: ChannelCategory = 'messenger';

    protected isConnected: boolean = false;
    protected credentials: AdapterCredentials = {};

    async authenticate(credentials: AdapterCredentials): Promise<boolean> {
        this.credentials = credentials;
        this.isConnected = Boolean(credentials.apiKey || credentials.botToken);
        return this.isConnected;
    }

    formatAsCloudEvent(message: InquiryMessage): CloudEvent<InquiryMessage> {
        return {
            specversion: '1.0',
            id: `evt_${crypto.randomUUID()}`,
            source: `replylocal/adapter/${this.id}`,
            type: 'com.replylocal.inquiry.created',
            datacontenttype: 'application/json',
            time: new Date().toISOString(),
            subject: `Conversation ${message.conversationId}`,
            data: message,
        };
    }

    verifyWebhookSignature(payload: string, signature: string): boolean {
        // Standard HMAC-SHA256 signature verification simulation
        return signature.length > 0 && payload.length > 0;
    }

    abstract fetchRecentMessages(limit?: number): Promise<InquiryMessage[]>;
    abstract sendMessage(conversationId: string, text: string): Promise<boolean>;
}

export class TelegramAdapter extends BaseChannelAdapter {
    readonly id: ChannelId = 'telegram';
    readonly name: string = 'Telegram Bot API';

    async fetchRecentMessages(limit = 10): Promise<InquiryMessage[]> {
        const msgs: InquiryMessage[] = [
            {
                id: 'tg_msg_1',
                conversationId: 'conv_001',
                channelType: 'telegram',
                sender: {
                    id: 'tg_user_1',
                    name: 'Андрей Коваленко',
                    username: '@andrey_bmw',
                },
                content: 'Сколько стоит диагностика BMW?',
                timestamp: new Date(Date.now() - 120000).toISOString(),
            },
        ];
        return msgs.slice(0, limit);
    }

    async sendMessage(conversationId: string, text: string): Promise<boolean> {
        console.log(`[TelegramAdapter] Dispatched message to ${conversationId}: "${text}"`);
        return true;
    }
}

export class WhatsAppAdapter extends BaseChannelAdapter {
    readonly id: ChannelId = 'whatsapp';
    readonly name: string = 'WhatsApp Cloud API';

    async fetchRecentMessages(limit = 10): Promise<InquiryMessage[]> {
        const msgs: InquiryMessage[] = [
            {
                id: 'wa_msg_1',
                conversationId: 'conv_002',
                channelType: 'whatsapp',
                sender: {
                    id: 'wa_user_1',
                    name: 'Марина Савчук',
                    phone: '+380671234567',
                },
                content: 'Можно записаться сегодня после 18:00?',
                timestamp: new Date(Date.now() - 300000).toISOString(),
            },
        ];
        return msgs.slice(0, limit);
    }

    async sendMessage(conversationId: string, text: string): Promise<boolean> {
        console.log(`[WhatsAppAdapter] Dispatched WhatsApp message to ${conversationId}: "${text}"`);
        return true;
    }
}

export class InstagramAdapter extends BaseChannelAdapter {
    readonly id: ChannelId = 'instagram';
    readonly name: string = 'Instagram Graph API';

    async fetchRecentMessages(limit = 10): Promise<InquiryMessage[]> {
        const msgs: InquiryMessage[] = [
            {
                id: 'ig_msg_1',
                conversationId: 'conv_003',
                channelType: 'instagram',
                sender: {
                    id: 'ig_user_1',
                    name: 'Олег Мельник',
                    username: '@oleg_auto',
                },
                content: 'А если я приеду без записи?',
                timestamp: new Date(Date.now() - 840000).toISOString(),
            },
        ];
        return msgs.slice(0, limit);
    }

    async sendMessage(conversationId: string, text: string): Promise<boolean> {
        console.log(`[InstagramAdapter] Dispatched IG Direct message to ${conversationId}: "${text}"`);
        return true;
    }
}
