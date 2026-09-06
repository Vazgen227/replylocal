'use client';

import { Bot, Check, CheckCheck, Clock, User, UserCheck } from 'lucide-react';
import type { Message } from '@/types/inbox';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface MessageBubbleProps {
    message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
    const isCustomer = message.sender.type === 'customer';
    const isAI = message.sender.type === 'ai';
    const isAgent = message.sender.type === 'agent';
    const isSystem = message.sender.type === 'system';

    if (isSystem) {
        return (
            <div className="flex justify-center my-2">
                <div className="rounded-full bg-muted/60 px-3 py-1 text-xs text-muted-foreground border">
                    {message.content}
                </div>
            </div>
        );
    }

    return (
        <div
            className={cn(
                'flex items-end gap-2.5',
                isCustomer ? 'justify-start' : 'justify-end'
            )}
        >
            {isCustomer && (
                <Avatar className="h-7 w-7 mb-1 shrink-0">
                    <AvatarFallback className="text-[11px] bg-secondary text-secondary-foreground">
                        {message.sender.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                </Avatar>
            )}

            <div
                className={cn(
                    'group relative max-w-[80%] rounded-2xl px-4 py-2.5 shadow-xs transition-all',
                    isCustomer
                        ? 'bg-card text-card-foreground border rounded-bl-xs'
                        : isAI
                        ? 'bg-violet-600 text-white dark:bg-violet-700 rounded-br-xs'
                        : 'bg-primary text-primary-foreground rounded-br-xs'
                )}
            >
                {/* Sender badge if not customer */}
                <div className="flex items-center gap-1.5 mb-1">
                    {isAI && (
                        <div className="flex items-center gap-1 text-[11px] font-medium text-violet-200">
                            <Bot className="h-3 w-3" />
                            <span>ReplyLocal AI</span>
                        </div>
                    )}
                    {isAgent && (
                        <div className="flex items-center gap-1 text-[11px] font-medium text-primary-foreground/80">
                            <UserCheck className="h-3 w-3" />
                            <span>{message.sender.name}</span>
                        </div>
                    )}
                </div>

                <p className="text-sm leading-relaxed whitespace-pre-wrap select-text">
                    {message.content}
                </p>

                {/* Footer with timestamp and delivery status */}
                <div
                    className={cn(
                        'mt-1 flex items-center justify-end gap-1 text-[10px]',
                        isCustomer
                            ? 'text-muted-foreground'
                            : isAI
                            ? 'text-violet-200/90'
                            : 'text-primary-foreground/75'
                    )}
                >
                    <span>{message.timestamp}</span>

                    {!isCustomer && (
                        <span className="inline-flex">
                            {message.status === 'sending' && (
                                <Clock className="h-3 w-3 animate-spin" />
                            )}
                            {message.status === 'sent' && (
                                <Check className="h-3 w-3" />
                            )}
                            {(message.status === 'delivered' ||
                                message.status === 'read' ||
                                !message.status) && (
                                <CheckCheck className="h-3 w-3 text-emerald-300 dark:text-emerald-400" />
                            )}
                        </span>
                    )}
                </div>
            </div>

            {!isCustomer && (
                <Avatar className="h-7 w-7 mb-1 shrink-0">
                    <AvatarFallback
                        className={cn(
                            'text-[11px]',
                            isAI ? 'bg-violet-100 text-violet-700' : 'bg-primary/10 text-primary'
                        )}
                    >
                        {isAI ? <Bot className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />}
                    </AvatarFallback>
                </Avatar>
            )}
        </div>
    );
}
