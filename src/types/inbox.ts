export type ChannelType = 'telegram' | 'whatsapp' | 'instagram';

export type ConversationStatus =
    | 'new'
    | 'ai_handling'
    | 'waiting_for_human'
    | 'human_handling'
    | 'resolved';

export type ConversationPriority =
    | 'low'
    | 'normal'
    | 'high'
    | 'urgent';

export type MessageSenderType =
    | 'customer'
    | 'ai'
    | 'agent'
    | 'system';

export type MessageStatus =
    | 'sending'
    | 'sent'
    | 'delivered'
    | 'read'
    | 'failed';

export type AIStatus =
    | 'idle'
    | 'generating'
    | 'ready'
    | 'error'
    | 'disabled';

export type ConversationFilter =
    | 'all'
    | 'new'
    | 'ai_handling'
    | 'waiting_for_human'
    | 'unread'
    | 'human_handling'
    | 'resolved';

export interface Contact {
    id: string;
    name: string;
    username?: string;
    phone?: string;
    avatar?: string;
}

export interface Channel {
    type: ChannelType;
    displayName: string;
    connected: boolean;
}

export interface Message {
    id: string;
    conversationId: string;
    sender: {
        type: MessageSenderType;
        name: string;
    };
    content: string;
    timestamp: string;
    status?: MessageStatus;
}

export interface AISuggestion {
    status: AIStatus;
    suggestedReply?: string;
    confidence?: number;
    sources: string[];
    generatedAt?: string;
}

export interface Conversation {
    id: string;
    contact: Contact;
    channel: Channel;
    status: ConversationStatus;
    priority: ConversationPriority;
    unreadCount: number;
    lastMessage: string;
    lastMessageAt: string;
    assignedTo?: string;
    ai: AISuggestion;
    messages: Message[];
}