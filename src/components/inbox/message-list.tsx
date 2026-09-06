'use client';

import { ScrollArea } from '@/components/ui/scroll-area';

import type { Message } from '@/types/inbox';

import { MessageBubble } from './message-bubble';

interface MessageListProps {
    messages: Message[];
}

export function MessageList({
                                messages,
                            }: MessageListProps) {
    return (
        <ScrollArea className="min-h-0 flex-1">
            <div className="space-y-5 p-5">
                {messages.map((message) => (
                    <MessageBubble
                        key={message.id}
                        message={message}
                    />
                ))}
            </div>
        </ScrollArea>
    );
}