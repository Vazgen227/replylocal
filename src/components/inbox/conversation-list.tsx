'use client';

import { Search } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';

import type {Conversation, ConversationFilter} from '@/types/inbox';

import { ConversationItem } from './conversation-item';

interface ConversationListProps {
    conversations: Conversation[];
    selectedConversationId?: string;

    onSelectConversation?: (conversationId: string) => void;

    onSearchChange?: (value: string) => void;

    searchValue?: string;

    activeFilter: ConversationFilter;
    onFilterChange: (filter: ConversationFilter) => void;
}

export function ConversationList({
                                     conversations,
                                     selectedConversationId,
                                     onSelectConversation,
                                     onSearchChange,
                                     searchValue = '',
                                     activeFilter,
                                     onFilterChange,
                                 }: ConversationListProps) {
    return (
        <section className="flex h-full w-[340px] shrink-0 flex-col border-r bg-background">

            {/* Header */}

            <div className="flex h-16 items-center justify-between border-b px-4">
                <div>
                    <h2 className="text-sm font-semibold">
                        Conversations
                    </h2>

                    <p className="text-xs text-muted-foreground">
                        {conversations.length} conversations
                    </p>
                </div>
            </div>

            {/* Search */}

            <div className="p-3">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                    <Input
                        value={searchValue}
                        onChange={(event) =>
                            onSearchChange?.(event.target.value)
                        }
                        placeholder="Search conversations..."
                        className="h-9 bg-muted/40 pl-9"
                    />
                </div>
            </div>

            {/* Filters */}

            <div className="px-3 pb-3">
                <div className="flex gap-1 overflow-x-auto">
                    <Button
                        variant={
                            activeFilter === 'all'
                                ? 'default'
                                : 'ghost'
                        }
                        size="sm"
                        className="shrink-0 text-xs"
                        onClick={() =>
                            onFilterChange('all')
                        }
                    >
                        All
                    </Button>

                    <Button
                        variant={
                            activeFilter === 'new'
                                ? 'default'
                                : 'ghost'
                        }
                        size="sm"
                        className="shrink-0 text-xs"
                        onClick={() =>
                            onFilterChange('new')
                        }
                    >
                        New
                    </Button>

                    <Button
                        variant={
                            activeFilter === 'waiting_for_human'
                                ? 'default'
                                : 'ghost'
                        }
                        size="sm"
                        className="shrink-0 text-xs"
                        onClick={() =>
                            onFilterChange(
                                'waiting_for_human'
                            )
                        }
                    >
                        Needs attention
                    </Button>

                    <Button
                        variant={
                            activeFilter === 'resolved'
                                ? 'default'
                                : 'ghost'
                        }
                        size="sm"
                        className="shrink-0 text-xs"
                        onClick={() =>
                            onFilterChange('resolved')
                        }
                    >
                        Resolved
                    </Button>
                </div>
            </div>

            <Separator />

            {/* Conversations */}

            <ScrollArea className="min-h-0 flex-1">
                <div>
                    {conversations.map((conversation) => (
                        <ConversationItem
                            key={conversation.id}
                            conversation={conversation}
                            active={
                                selectedConversationId ===
                                conversation.id
                            }
                            onSelect={
                                onSelectConversation
                            }
                        />
                    ))}

                    {conversations.length === 0 && (
                        <div className="px-4 py-10 text-center">
                            <p className="text-sm font-medium">
                                No conversations
                            </p>

                            <p className="mt-1 text-xs text-muted-foreground">
                                Try changing your search or filter.
                            </p>
                        </div>
                    )}
                </div>
            </ScrollArea>
        </section>
    );
}