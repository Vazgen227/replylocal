'use client';

import { useTranslations } from 'next-intl';
import {
    MessageCircle,
    Send,
} from 'lucide-react';
import { InstagramIcon } from '@/components/shared/icons';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

import type {
    ChannelType,
    Conversation,
} from '@/types/inbox';

interface ConversationItemProps {
    conversation: Conversation;
    active: boolean;

    // TODO:
    // Здесь ты позже подключишь свою логику выбора conversation.
    onSelect?: (conversationId: string) => void;
}

const channelIcons: Record<ChannelType, React.ElementType> = {
    telegram: Send,
    whatsapp: MessageCircle,
    instagram: InstagramIcon,
};

const statusStyles = {
    new: 'bg-blue-50 text-blue-700 border-blue-200',
    ai_handling: 'bg-violet-50 text-violet-700 border-violet-200',
    waiting_for_human: 'bg-amber-50 text-amber-700 border-amber-200',
    human_handling: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    resolved: 'bg-zinc-100 text-zinc-600 border-zinc-200',
} as const;

function getInitials(name: string) {
    return name
        .split(' ')
        .slice(0, 2)
        .map((part) => part[0])
        .join('');
}

export function ConversationItem({
                                     conversation,
                                     active,
                                     onSelect,
                                 }: ConversationItemProps) {
    const t = useTranslations('inbox');
    const ChannelIcon = channelIcons[conversation.channel.type];

    return (
        <button
            type="button"
            onClick={() => onSelect?.(conversation.id)}
            className={cn(
                'w-full border-b p-4 text-left transition-colors',
                'hover:bg-muted/50',
                active && 'bg-muted/70'
            )}
        >
            <div className="flex items-start gap-3">
                <Avatar className="mt-0.5 h-10 w-10">
                    <AvatarFallback>
                        {getInitials(conversation.contact.name)}
                    </AvatarFallback>
                </Avatar>

                <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2">
                            <p className="truncate text-sm font-semibold">
                                {conversation.contact.name}
                            </p>

                            <ChannelIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        </div>

                        <span className="shrink-0 text-[11px] text-muted-foreground">
              {conversation.lastMessageAt}
            </span>
                    </div>

                    <p className="mt-1 truncate text-sm text-muted-foreground">
                        {conversation.lastMessage}
                    </p>

                    <div className="mt-3 flex items-center justify-between gap-2">
                        <Badge
                            variant="outline"
                            className={cn(
                                'text-[10px] font-medium',
                                statusStyles[conversation.status]
                            )}
                        >
                            {t(conversation.status)}
                        </Badge>

                        {conversation.unreadCount > 0 && (
                            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
                {conversation.unreadCount}
              </span>
                        )}
                    </div>
                </div>
            </div>
        </button>
    );
}