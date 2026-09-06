'use client';

import {
    MessageCircle,
    Send,
    MoreHorizontal,
} from 'lucide-react';
import { InstagramIcon } from '@/components/shared/icons';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

import type {
    ChannelType,
    Conversation,
} from '@/types/inbox';

interface ChatHeaderProps {
    conversation: Conversation;
}

const channelIcons: Record<ChannelType, React.ElementType> = {
    telegram: Send,
    whatsapp: MessageCircle,
    instagram: InstagramIcon,
};

const statusLabels = {
    new: 'New',
    ai_handling: 'AI handling',
    waiting_for_human: 'Needs attention',
    human_handling: 'Human handling',
    resolved: 'Resolved',
} as const;

export function ChatHeader({
                               conversation,
                           }: ChatHeaderProps) {
    const ChannelIcon = channelIcons[conversation.channel.type];

    return (
        <header className="flex h-16 shrink-0 items-center justify-between border-b px-5">
            <div className="flex min-w-0 items-center gap-3">
                <Avatar className="h-9 w-9">
                    <AvatarFallback>
                        {conversation.contact.name
                            .split(' ')
                            .slice(0, 2)
                            .map((part) => part[0])
                            .join('')}
                    </AvatarFallback>
                </Avatar>

                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <h2 className="truncate text-sm font-semibold">
                            {conversation.contact.name}
                        </h2>

                        <ChannelIcon className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>

                    <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {conversation.channel.displayName}
            </span>

                        <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
                            {statusLabels[conversation.status]}
                        </Badge>
                    </div>
                </div>
            </div>

            <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
            >
                <MoreHorizontal className="h-4 w-4" />
            </Button>
        </header>
    );
}