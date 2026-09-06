import type { Conversation } from '@/types/inbox';

export const mockConversations: Conversation[] = [
    {
        id: 'conv_001',
        contact: {
            id: 'contact_001',
            name: 'Андрей Коваленко',
            username: '@andrey_bmw',
        },
        channel: {
            type: 'telegram',
            displayName: 'Telegram',
            connected: true,
        },
        status: 'ai_handling',
        priority: 'normal',
        unreadCount: 2,
        lastMessage: 'Сколько стоит диагностика BMW?',
        lastMessageAt: '2 мин',
        assignedTo: 'AI',
        ai: {
            status: 'ready',
            suggestedReply:
                'Добрый день! Стоимость диагностики начинается от 500 грн. Подскажите, пожалуйста, модель и год автомобиля, и я уточню стоимость для вас.',
            confidence: 0.94,
            sources: ['Services', 'Pricing', 'Business rules'],
            generatedAt: '1 мин назад',
        },
        messages: [
            {
                id: 'msg_001',
                conversationId: 'conv_001',
                sender: {
                    type: 'customer',
                    name: 'Андрей Коваленко',
                },
                content: 'Добрый день! Сколько стоит диагностика BMW?',
                timestamp: '15:21',
                status: 'read',
            },
            {
                id: 'msg_002',
                conversationId: 'conv_001',
                sender: {
                    type: 'customer',
                    name: 'Андрей Коваленко',
                },
                content: 'И сколько по времени это занимает?',
                timestamp: '15:22',
                status: 'read',
            },
        ],
    },

    {
        id: 'conv_002',
        contact: {
            id: 'contact_002',
            name: 'Марина Савчук',
            phone: '+380 67 123 45 67',
        },
        channel: {
            type: 'whatsapp',
            displayName: 'WhatsApp',
            connected: true,
        },
        status: 'waiting_for_human',
        priority: 'high',
        unreadCount: 1,
        lastMessage: 'Можно записаться сегодня после 18:00?',
        lastMessageAt: '5 мин',
        assignedTo: 'Human',
        ai: {
            status: 'ready',
            suggestedReply:
                'Я могу помочь с записью. Сейчас проверю доступные окна на сегодня после 18:00.',
            confidence: 0.87,
            sources: ['Business rules'],
            generatedAt: '4 мин назад',
        },
        messages: [
            {
                id: 'msg_003',
                conversationId: 'conv_002',
                sender: {
                    type: 'customer',
                    name: 'Марина Савчук',
                },
                content: 'Здравствуйте! Можно записаться сегодня после 18:00?',
                timestamp: '15:18',
                status: 'read',
            },
        ],
    },

    {
        id: 'conv_003',
        contact: {
            id: 'contact_003',
            name: 'Олег Мельник',
            username: '@oleg_auto',
        },
        channel: {
            type: 'instagram',
            displayName: 'Instagram',
            connected: true,
        },
        status: 'ai_handling',
        priority: 'normal',
        unreadCount: 0,
        lastMessage: 'А если я приеду без записи?',
        lastMessageAt: '14 мин',
        assignedTo: 'AI',
        ai: {
            status: 'ready',
            suggestedReply:
                'Можно приехать и без предварительной записи, однако наличие свободного места зависит от загрузки сервиса. Рекомендуем записаться заранее.',
            confidence: 0.91,
            sources: ['FAQ', 'Business rules'],
            generatedAt: '13 мин назад',
        },
        messages: [
            {
                id: 'msg_004',
                conversationId: 'conv_003',
                sender: {
                    type: 'customer',
                    name: 'Олег Мельник',
                },
                content: 'А если я приеду без записи?',
                timestamp: '15:06',
                status: 'read',
            },
            {
                id: 'msg_005',
                conversationId: 'conv_003',
                sender: {
                    type: 'ai',
                    name: 'ReplyLocal AI',
                },
                content:
                    'Можно приехать и без предварительной записи, однако наличие свободного места зависит от загрузки сервиса.',
                timestamp: '15:07',
                status: 'read',
            },
        ],
    },

    {
        id: 'conv_004',
        contact: {
            id: 'contact_004',
            name: 'Анна Гончар',
            username: '@anna_g',
        },
        channel: {
            type: 'whatsapp',
            displayName: 'WhatsApp',
            connected: true,
        },
        status: 'resolved',
        priority: 'low',
        unreadCount: 0,
        lastMessage: 'Спасибо, всё отлично!',
        lastMessageAt: '1 ч',
        assignedTo: 'AI',
        ai: {
            status: 'idle',
            sources: [],
        },
        messages: [
            {
                id: 'msg_006',
                conversationId: 'conv_004',
                sender: {
                    type: 'customer',
                    name: 'Анна Гончар',
                },
                content: 'Спасибо, всё отлично!',
                timestamp: '14:02',
                status: 'read',
            },
        ],
    },

    {
        id: 'conv_005',
        contact: {
            id: 'contact_005',
            name: 'Дмитрий Бондарь',
            phone: '+380 93 765 43 21',
        },
        channel: {
            type: 'telegram',
            displayName: 'Telegram',
            connected: true,
        },
        status: 'waiting_for_human',
        priority: 'urgent',
        unreadCount: 3,
        lastMessage: 'Машина не заводится, что делать?',
        lastMessageAt: '1 ч',
        assignedTo: 'Human',
        ai: {
            status: 'ready',
            suggestedReply:
                'В таком случае лучше передать диалог специалисту, чтобы он уточнил симптомы и предложил дальнейшие действия.',
            confidence: 0.79,
            sources: ['Business rules'],
            generatedAt: '58 мин назад',
        },
        messages: [
            {
                id: 'msg_007',
                conversationId: 'conv_005',
                sender: {
                    type: 'customer',
                    name: 'Дмитрий Бондарь',
                },
                content: 'Мне нужна диагностика, но машина не заводится.',
                timestamp: '14:02',
                status: 'read',
            },
            {
                id: 'msg_008',
                conversationId: 'conv_005',
                sender: {
                    type: 'customer',
                    name: 'Дмитрий Бондарь',
                },
                content: 'Машина стоит прямо возле сервиса.',
                timestamp: '14:03',
                status: 'read',
            },
        ],
    },
];