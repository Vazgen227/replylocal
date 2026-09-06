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

export class OzonAdapter extends BaseMarketplaceAdapter {
    readonly id: ChannelId = 'ozon';
    readonly name: string = 'Ozon Seller API';

    async fetchRecentMessages(limit = 10): Promise<InquiryMessage[]> {
        const msgs: InquiryMessage[] = [
            {
                id: 'ozon_msg_1',
                conversationId: 'conv_ozon_101',
                channelType: 'ozon',
                productId: 'sku_oz_9482',
                sender: {
                    id: 'ozon_buyer_1',
                    name: 'Игорь В.',
                },
                content: 'Подойдут ли эти тормозные колодки на BMW 3 F30 2016 года?',
                timestamp: new Date(Date.now() - 600000).toISOString(),
            },
        ];
        return msgs.slice(0, limit);
    }

    async sendMessage(conversationId: string, text: string): Promise<boolean> {
        console.log(`[OzonAdapter] Sent reply to buyer question in ${conversationId}: "${text}"`);
        return true;
    }

    async getProductDetails(productId: string): Promise<ProductDetails | null> {
        return {
            id: productId,
            sku: 'OZ-9482-BRK',
            title: 'Комплект передних тормозных колодок Ceramic Performance',
            category: 'Автотовары / Тормозная система',
            price: 2450,
            currency: 'RUB',
            inStock: true,
            specifications: {
                'Совместимость': 'BMW 3 (F30/F31), BMW 4 (F32/F36) 2012-2019',
                'Материал': 'Керамика с пониженным пылеобразованием',
                'Гарантия': '12 месяцев или 20 000 км',
            },
            commonQuestions: [
                {
                    question: 'Скрипят ли колодки при притирке?',
                    suggestedAnswer: 'Благодаря керамическому составу и антискрипным пластинам колодки не издают шума.',
                },
            ],
        };
    }

    async replyToProductReview(reviewId: string, replyText: string): Promise<boolean> {
        console.log(`[OzonAdapter] Answered review ${reviewId}: "${replyText}"`);
        return true;
    }

    async syncProductCatalog(): Promise<ProductDetails[]> {
        const item = await this.getProductDetails('sku_oz_9482');
        return item ? [item] : [];
    }
}

export class WildberriesAdapter extends BaseMarketplaceAdapter {
    readonly id: ChannelId = 'wildberries';
    readonly name: string = 'Wildberries Seller API';

    async fetchRecentMessages(limit = 10): Promise<InquiryMessage[]> {
        const msgs: InquiryMessage[] = [
            {
                id: 'wb_msg_1',
                conversationId: 'conv_wb_202',
                channelType: 'wildberries',
                productId: 'sku_wb_5521',
                sender: {
                    id: 'wb_buyer_1',
                    name: 'Екатерина',
                },
                content: 'Какой срок годности у защитного покрытия для кузова?',
                timestamp: new Date(Date.now() - 1800000).toISOString(),
            },
        ];
        return msgs.slice(0, limit);
    }

    async sendMessage(conversationId: string, text: string): Promise<boolean> {
        console.log(`[WildberriesAdapter] Sent answer to question ${conversationId}: "${text}"`);
        return true;
    }

    async getProductDetails(productId: string): Promise<ProductDetails | null> {
        return {
            id: productId,
            sku: 'WB-5521-CER',
            title: 'Керамическое гидрофобное покрытие для кузова автомобиля 9H 50ml',
            category: 'Автокосметика и уход',
            price: 1890,
            currency: 'RUB',
            inStock: true,
            specifications: {
                'Объем': '50 мл (хватает на 2 слоя седана)',
                'Стойкость': 'До 12 месяцев гидрофобного эффекта',
                'Срок годности': '3 года с даты производства',
            },
            commonQuestions: [
                {
                    question: 'Можно ли наносить самостоятельно?',
                    suggestedAnswer: 'Да, в комплекте идет аппликатор и салфетки из микрофибры с пошаговой инструкцией.',
                },
            ],
        };
    }

    async replyToProductReview(reviewId: string, replyText: string): Promise<boolean> {
        console.log(`[WildberriesAdapter] Review reply ${reviewId}: "${replyText}"`);
        return true;
    }

    async syncProductCatalog(): Promise<ProductDetails[]> {
        const item = await this.getProductDetails('sku_wb_5521');
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
