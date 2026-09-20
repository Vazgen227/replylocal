import type {
    IMarketplaceAdapter,
    ChannelId,
    ChannelCategory,
    AdapterCredentials,
    InquiryMessage,
    ProductDetails,
    CloudEvent,
} from './types';

abstract class BaseMarketplaceAdapter implements IMarketplaceAdapter {
    abstract readonly id: ChannelId;
    abstract readonly name: string;
    readonly category: ChannelCategory = 'marketplace';

    protected isConnected: boolean = false;
    protected credentials: AdapterCredentials = {};

    async authenticate(credentials: AdapterCredentials): Promise<boolean> {
        this.credentials = credentials;
        this.isConnected = Boolean(credentials.apiKey || credentials.clientId);
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
            subject: `Marketplace Item ${message.productId ?? 'General'}`,
            data: message,
        };
    }

    verifyWebhookSignature(payload: string, signature: string): boolean {
        return signature.length > 0 && payload.length > 0;
    }

    abstract fetchRecentMessages(limit?: number): Promise<InquiryMessage[]>;
    abstract sendMessage(conversationId: string, text: string): Promise<boolean>;
    abstract getProductDetails(productId: string): Promise<ProductDetails | null>;
    abstract replyToProductReview(reviewId: string, replyText: string): Promise<boolean>;
    abstract syncProductCatalog(): Promise<ProductDetails[]>;
}

export class RozetkaAdapter extends BaseMarketplaceAdapter {
    readonly id: ChannelId = 'rozetka';
    readonly name: string = 'Rozetka Marketplace API';

    async fetchRecentMessages(limit = 10): Promise<InquiryMessage[]> {
        const msgs: InquiryMessage[] = [
            {
                id: 'rz_msg_1',
                conversationId: 'conv_rz_101',
                channelType: 'rozetka',
                productId: 'sku_rz_9482',
                sender: {
                    id: 'rz_buyer_1',
                    name: 'Ігор В.',
                },
                content: 'Чи підійдуть ці гальмівні колодки на BMW 3 F30 2016 року?',
                timestamp: new Date(Date.now() - 600000).toISOString(),
            },
        ];
        return msgs.slice(0, limit);
    }

    async sendMessage(conversationId: string, text: string): Promise<boolean> {
        console.log(`[RozetkaAdapter] Sent reply to buyer question in ${conversationId}: "${text}"`);
        return true;
    }

    async getProductDetails(productId: string): Promise<ProductDetails | null> {
        return {
            id: productId,
            sku: 'RZ-9482-BRK',
            title: 'Комплект передніх гальмівних колодок Ceramic Performance',
            category: 'Автотовари / Гальмівна система',
            price: 1850,
            currency: 'UAH',
            inStock: true,
            specifications: {
                'Сумісність': 'BMW 3 (F30/F31), BMW 4 (F32/F36) 2012-2019',
                'Матеріал': 'Кераміка зі зниженим пилоутворенням',
                'Гарантія': '12 місяців або 20 000 км',
            },
            commonQuestions: [
                {
                    question: 'Чи скриплять колодки при притиранні?',
                    suggestedAnswer: 'Завдяки керамічному складу та антискрипним пластинам колодки не видають шуму.',
                },
            ],
        };
    }

    async replyToProductReview(reviewId: string, replyText: string): Promise<boolean> {
        console.log(`[RozetkaAdapter] Answered review ${reviewId}: "${replyText}"`);
        return true;
    }

    async syncProductCatalog(): Promise<ProductDetails[]> {
        const item = await this.getProductDetails('sku_rz_9482');
        return item ? [item] : [];
    }
}

export class PromAdapter extends BaseMarketplaceAdapter {
    readonly id: ChannelId = 'prom';
    readonly name: string = 'Prom.ua API';

    async fetchRecentMessages(limit = 10): Promise<InquiryMessage[]> {
        const msgs: InquiryMessage[] = [
            {
                id: 'prom_msg_1',
                conversationId: 'conv_prom_202',
                channelType: 'prom',
                productId: 'sku_prom_5521',
                sender: {
                    id: 'prom_buyer_1',
                    name: 'Катерина',
                },
                content: 'Який термін придатності у захисного покриття для кузова?',
                timestamp: new Date(Date.now() - 1800000).toISOString(),
            },
        ];
        return msgs.slice(0, limit);
    }

    async sendMessage(conversationId: string, text: string): Promise<boolean> {
        console.log(`[PromAdapter] Sent answer to question ${conversationId}: "${text}"`);
        return true;
    }

    async getProductDetails(productId: string): Promise<ProductDetails | null> {
        return {
            id: productId,
            sku: 'PR-5521-CER',
            title: 'Керамічне гідрофобне покриття для кузова авто 9H 50ml',
            category: 'Автокосметика та догляд',
            price: 1290,
            currency: 'UAH',
            inStock: true,
            specifications: {
                'Обʼєм': '50 мл (вистачає на 2 шари седана)',
                'Стійкість': 'До 12 місяців гідрофобного ефекту',
                'Термін придатності': '3 роки з дати виробництва',
            },
            commonQuestions: [
                {
                    question: 'Чи можна наносити самостійно?',
                    suggestedAnswer: 'Так, у комплекті йде аплікатор та серветки з мікрофібри з покроковою інструкцією.',
                },
            ],
        };
    }

    async replyToProductReview(reviewId: string, replyText: string): Promise<boolean> {
        console.log(`[PromAdapter] Review reply ${reviewId}: "${replyText}"`);
        return true;
    }

    async syncProductCatalog(): Promise<ProductDetails[]> {
        const item = await this.getProductDetails('sku_prom_5521');
        return item ? [item] : [];
    }
}

export class AmazonAdapter extends BaseMarketplaceAdapter {
    readonly id: ChannelId = 'amazon';
    readonly name: string = 'Amazon SP-API (Selling Partner)';

    async fetchRecentMessages(limit = 10): Promise<InquiryMessage[]> {
        const msgs: InquiryMessage[] = [
            {
                id: 'amz_msg_1',
                conversationId: 'conv_amz_303',
                channelType: 'amazon',
                productId: 'ASIN_B08XYZ123',
                sender: {
                    id: 'amz_buyer_1',
                    name: 'Michael S.',
                },
                content: 'Does this OBD2 diagnostic scanner support iOS and Android simultaneously?',
                timestamp: new Date(Date.now() - 900000).toISOString(),
            },
        ];
        return msgs.slice(0, limit);
    }

    async sendMessage(conversationId: string, text: string): Promise<boolean> {
        console.log(`[AmazonAdapter] Sent Buyer-Seller Message for ${conversationId}: "${text}"`);
        return true;
    }

    async getProductDetails(productId: string): Promise<ProductDetails | null> {
        return {
            id: productId,
            sku: 'ASIN-B08XYZ123',
            title: 'Pro Bluetooth 5.0 OBD2 Diagnostic Scanner & Code Reader',
            category: 'Automotive / Diagnostic Tools',
            price: 49.99,
            currency: 'USD',
            inStock: true,
            specifications: {
                'Connectivity': 'Bluetooth 5.0 Dual Mode (iOS & Android)',
                'Protocols': 'All standard OBD-II protocols (ISO 15765-4, CAN, KWP2000)',
                'Warranty': '2 Years Replacement Warranty',
            },
            commonQuestions: [
                {
                    question: 'Does it clear Check Engine Light?',
                    suggestedAnswer: 'Yes, it reads and resets standard and manufacturer-specific diagnostic trouble codes (DTCs).',
                },
            ],
        };
    }

    async replyToProductReview(reviewId: string, replyText: string): Promise<boolean> {
        console.log(`[AmazonAdapter] Reply to review ${reviewId}: "${replyText}"`);
        return true;
    }

    async syncProductCatalog(): Promise<ProductDetails[]> {
        const item = await this.getProductDetails('ASIN_B08XYZ123');
        return item ? [item] : [];
    }
}
