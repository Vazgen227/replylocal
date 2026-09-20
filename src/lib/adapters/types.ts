/**
 * Universal Adapter Pattern & CloudEvents Specifications for ReplyLocal
 * Allows seamless extension across Messengers (Telegram, WhatsApp, IG)
 * and Marketplaces (Rozetka, Prom, Amazon, Shopify).
 */

export type ChannelId =
    | 'telegram'
    | 'whatsapp'
    | 'instagram'
    | 'rozetka'
    | 'prom'
    | 'amazon'
    | 'shopify'
    | 'webhook';

export type ChannelCategory = 'messenger' | 'marketplace' | 'webhook';

export interface CloudEvent<T = Record<string, unknown>> {
    specversion: '1.0';
    id: string;
    source: string; // e.g. "replylocal/adapter/telegram", "replylocal/adapter/rozetka"
    type:
        | 'com.replylocal.inquiry.created'
        | 'com.replylocal.message.sent'
        | 'com.replylocal.ai.suggested'
        | 'com.replylocal.handoff.triggered'
        | 'com.replylocal.product.synced';
    datacontenttype: 'application/json';
    time: string; // ISO 8601 / RFC 3339 timestamp
    subject?: string;
    data: T;
}

export interface InquiryMessage {
    id: string;
    conversationId: string;
    channelType: ChannelId;
    sender: {
        id: string;
        name: string;
        username?: string;
        phone?: string;
    };
    content: string;
    timestamp: string; // RFC 3339
    mediaUrl?: string;
    productId?: string;
    metadata?: Record<string, unknown>;
}

export interface ProductDetails {
    id: string;
    sku: string;
    title: string;
    category: string;
    price: number;
    currency: 'RUB' | 'UAH' | 'USD' | 'EUR';
    inStock: boolean;
    specifications: Record<string, string>;
    commonQuestions: Array<{
        question: string;
        suggestedAnswer: string;
    }>;
}

export interface AdapterCredentials {
    apiKey?: string;
    apiSecret?: string;
    botToken?: string;
    webhookUrl?: string;
    clientId?: string;
}

/**
 * Universal Interface for Messenger Channels
 */
export interface IChannelAdapter {
    readonly id: ChannelId;
    readonly name: string;
    readonly category: ChannelCategory;

    authenticate(credentials: AdapterCredentials): Promise<boolean>;
    fetchRecentMessages(limit?: number): Promise<InquiryMessage[]>;
    sendMessage(conversationId: string, text: string): Promise<boolean>;
    verifyWebhookSignature(payload: string, signature: string): boolean;
    formatAsCloudEvent(message: InquiryMessage): CloudEvent<InquiryMessage>;
}

/**
 * Universal Interface for Marketplace & E-commerce Channels (Rozetka, Prom, Amazon)
 */
export interface IMarketplaceAdapter extends IChannelAdapter {
    getProductDetails(productId: string): Promise<ProductDetails | null>;
    replyToProductReview(reviewId: string, replyText: string): Promise<boolean>;
    syncProductCatalog(): Promise<ProductDetails[]>;
}
