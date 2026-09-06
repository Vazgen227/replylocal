'use client';

import { useState } from 'react';
import type { Conversation, ConversationFilter } from '@/types/inbox';
import { ConversationList } from './conversation-list';
import { ChatHeader } from './chat-header';
import { MessageList } from './message-list';
import { MessageComposer } from './message-composer';
import { AISuggestion } from './ai-suggestion';
import { AIOrchestrator } from '@/lib/ai/orchestrator';
import { toast } from 'sonner';

interface InboxShellProps {
    conversations: Conversation[];
    initialSelectedId?: string;
}

export function InboxShell({
    conversations: initialConversations,
    initialSelectedId,
}: InboxShellProps) {
    const [conversations, setConversations] =
        useState<Conversation[]>(initialConversations);

    const [selectedConversationId, setSelectedConversationId] =
        useState<string>(
            initialSelectedId &&
            initialConversations.some((c) => c.id === initialSelectedId)
                ? initialSelectedId
                : initialConversations[0]?.id ?? ''
        );

    const [searchQuery, setSearchQuery] = useState('');
    const [draftMessage, setDraftMessage] = useState('');
    const [draftReply, setDraftReply] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [activeFilter, setActiveFilter] = useState<ConversationFilter>('all');
    const [activeTone, setActiveTone] = useState<
        'friendly' | 'formal' | 'concise' | 'consultative'
    >('consultative');

    const selectedConversation = conversations.find(
        (c) => c.id === selectedConversationId
    );

    function handleSelectConversation(conversationId: string) {
        setSelectedConversationId(conversationId);
        setIsEditing(false);
        setDraftReply('');
        setDraftMessage('');

        const targetConv = conversations.find((c) => c.id === conversationId);
        if (targetConv) {
            const lastCustomerMsg = [...targetConv.messages]
                .reverse()
                .find((m) => m.sender.type === 'customer');

            if (lastCustomerMsg) {
                const newAiSuggestion = AIOrchestrator.generateSuggestion({
                    conversationId: targetConv.id,
                    customerName: targetConv.contact.name,
                    channel: targetConv.channel.type,
                    lastMessage: lastCustomerMsg.content,
                    tone: activeTone,
                });

                setConversations((prev) =>
                    prev.map((c) =>
                        c.id === targetConv.id
                            ? { ...c, ai: newAiSuggestion }
                            : c
                    )
                );
            }
        }
    }

    function handleSearchChange(query: string) {
        setSearchQuery(query);
    }

    function handleEdit() {
        if (!selectedConversation?.ai.suggestedReply) return;
        setDraftReply(selectedConversation.ai.suggestedReply);
        setIsEditing(true);
    }

    function handleDraftChange(value: string) {
        setDraftReply(value);
    }

    function handleMessageChange(value: string) {
        setDraftMessage(value);
    }

    function handleSend(textToSend?: string) {
        if (!selectedConversation) return;

        const finalMessage =
            textToSend ||
            (isEditing && draftReply.trim().length > 0
                ? draftReply.trim()
                : draftMessage.trim());

        if (!finalMessage) return;

        const now = new Date();
        const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now
            .getMinutes()
            .toString()
            .padStart(2, '0')}`;

        const updatedConversations = conversations.map((conv) => {
            if (conv.id === selectedConversationId) {
                return {
                    ...conv,
                    unreadCount: 0,
                    status: 'human_handling' as const,
                    lastMessage: finalMessage,
                    lastMessageAt: 'Только что',
                    messages: [
                        ...conv.messages,
                        {
                            id: `msg_${crypto.randomUUID()}`,
                            conversationId: conv.id,
                            sender: {
                                type: 'agent' as const,
                                name: 'Вы (Оператор)',
                            },
                            content: finalMessage,
                            timestamp: timeStr,
                            status: 'sent' as const,
                        },
                    ],
                    ai: {
                        ...conv.ai,
                        status: 'idle' as const,
                        suggestedReply: undefined,
                    },
                };
            }
            return conv;
        });

        setConversations(updatedConversations);
        setDraftMessage('');
        setDraftReply('');
        setIsEditing(false);
        toast.success('Сообщение успешно отправлено клиенту');
    }

    function handleSendAISuggestion() {
        if (!selectedConversation?.ai.suggestedReply) return;

        const aiText = isEditing && draftReply ? draftReply : selectedConversation.ai.suggestedReply;
        const now = new Date();
        const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now
            .getMinutes()
            .toString()
            .padStart(2, '0')}`;

        const updatedConversations = conversations.map((conv) => {
            if (conv.id === selectedConversationId) {
                return {
                    ...conv,
                    unreadCount: 0,
                    status: 'resolved' as const,
                    lastMessage: aiText,
                    lastMessageAt: 'Только что',
                    messages: [
                        ...conv.messages,
                        {
                            id: `msg_${crypto.randomUUID()}`,
                            conversationId: conv.id,
                            sender: {
                                type: 'ai' as const,
                                name: 'ReplyLocal AI',
                            },
                            content: aiText,
                            timestamp: timeStr,
                            status: 'read' as const,
                        },
                    ],
                    ai: {
                        ...conv.ai,
                        status: 'idle' as const,
                        suggestedReply: undefined,
                    },
                };
            }
            return conv;
        });

        setConversations(updatedConversations);
        setDraftReply('');
        setIsEditing(false);
        toast.success('AI-ответ отправлен клиенту!');
    }

    function handleRegenerate() {
        if (!selectedConversation) return;

        const tones: Array<'friendly' | 'formal' | 'concise' | 'consultative'> = [
            'consultative',
            'friendly',
            'formal',
            'concise',
        ];
        const nextToneIndex = (tones.indexOf(activeTone) + 1) % tones.length;
        const nextTone = tones[nextToneIndex];
        setActiveTone(nextTone);

        const lastCustomerMsg = [...selectedConversation.messages]
            .reverse()
            .find((m) => m.sender.type === 'customer');

        if (lastCustomerMsg) {
            const newAiSuggestion = AIOrchestrator.generateSuggestion({
                conversationId: selectedConversation.id,
                customerName: selectedConversation.contact.name,
                channel: selectedConversation.channel.type,
                lastMessage: lastCustomerMsg.content,
                tone: nextTone,
            });

            setConversations((prev) =>
                prev.map((c) =>
                    c.id === selectedConversation.id
                        ? { ...c, ai: newAiSuggestion }
                        : c
                )
            );
        }

        toast.info(`Регенерация ответа: стиль «${nextTone}»`);
    }

    function handleHandoff() {
        if (!selectedConversation) return;

        const updatedConversations = conversations.map((conv) => {
            if (conv.id === selectedConversationId) {
                return {
                    ...conv,
                    status: 'waiting_for_human' as const,
                    priority: 'high' as const,
                    messages: [
                        ...conv.messages,
                        {
                            id: `sys_${crypto.randomUUID()}`,
                            conversationId: conv.id,
                            sender: {
                                type: 'system' as const,
                                name: 'Система',
                            },
                            content: '⚠️ AI передал управление оператору. Ожидается ответ менеджера.',
                            timestamp: 'Только что',
                        },
                    ],
                };
            }
            return conv;
        });

        setConversations(updatedConversations);
        toast.warning('Диалог переведен в режим «Требует внимания человека»');
    }

    const filteredConversations = conversations.filter((conv) => {
        const matchesSearch =
            conv.contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            conv.lastMessage.toLowerCase().includes(searchQuery.toLowerCase());

        if (!matchesSearch) return false;

        if (activeFilter === 'all') return true;
        if (activeFilter === 'unread') return conv.unreadCount > 0;
        return conv.status === activeFilter;
    });

    if (!conversations.length || !selectedConversation) {
        return (
            <div className="flex h-full items-center justify-center">
                <p className="text-sm text-muted-foreground">
                    Нет доступных диалогов.
                </p>
            </div>
        );
    }

    return (
        <div className="flex h-[calc(100vh-112px)] overflow-hidden rounded-xl border bg-background shadow-xs">
            <ConversationList
                conversations={filteredConversations}
                selectedConversationId={selectedConversation.id}
                searchValue={searchQuery}
                onSearchChange={handleSearchChange}
                onSelectConversation={handleSelectConversation}
                activeFilter={activeFilter}
                onFilterChange={setActiveFilter}
            />

            <section className="flex min-w-0 flex-1 flex-col bg-background">
                <ChatHeader conversation={selectedConversation} />

                <MessageList messages={selectedConversation.messages} />

                <MessageComposer
                    value={draftMessage}
                    onChange={handleMessageChange}
                    onSend={() => handleSend()}
                />
            </section>

            <div className="hidden xl:flex">
                <AISuggestion
                    ai={selectedConversation.ai}
                    isEditing={isEditing}
                    draftReply={draftReply}
                    onEdit={handleEdit}
                    onSend={handleSendAISuggestion}
                    onRegenerate={handleRegenerate}
                    onHandoff={handleHandoff}
                    onDraftChange={handleDraftChange}
                />
            </div>
        </div>
    );
}