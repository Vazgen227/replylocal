'use client';

import { useTranslations } from 'next-intl';
import {
    Bot,
    Check,
    Pencil,
    RefreshCw,
    UserRound,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';

import type { AISuggestion } from '@/types/inbox';

interface AISuggestionProps {
    ai: AISuggestion;

    isEditing: boolean;
    draftReply: string;

    onEdit: () => void;
    onSend: () => void;
    onRegenerate: () => void;
    onHandoff: () => void;
    onDraftChange: (value: string) => void;
}

export function AISuggestion({
                                 ai,
                                 isEditing = false,
                                 draftReply = '',
                                 onEdit,
                                 onSend,
                                 onRegenerate,
                                 onHandoff,
                                 onDraftChange,
                             }: AISuggestionProps) {
    const t = useTranslations('inbox');
    const tCommon = useTranslations('common');

    if (ai.status === 'disabled') {
        return null;
    }

    return (
        <aside className="flex h-full w-[360px] shrink-0 flex-col border-l bg-background">
            <div className="flex h-16 shrink-0 items-center gap-3 border-b px-5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Bot className="h-4 w-4" />
                </div>

                <div>
                    <p className="text-sm font-semibold">{t('assistantTitle')}</p>
                    <p className="text-xs text-muted-foreground">
                        {t('suggestedResponse')}
                    </p>
                </div>
            </div>

            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
                <div className="p-5">
                    <div className="rounded-2xl border bg-muted/30 p-4">
                        <div className="flex items-center justify-between gap-2">
                            <Badge
                                variant="outline"
                                className="bg-background text-[10px]"
                            >
                                {t('aiSuggestion')}
                            </Badge>

                            {ai.status === 'ready' && (
                                <span className="text-[11px] text-emerald-600">
                  {t('ready')}
                </span>
                            )}
                        </div>

                        <div className="mt-4">
                            {isEditing ? (
                                <Textarea
                                    value={draftReply}
                                    onChange={(event) =>
                                        onDraftChange?.(event.target.value)
                                    }
                                    className="min-h-[180px] resize-none bg-background"
                                />
                            ) : (
                                <p className="text-sm leading-6 text-foreground">
                                    {ai.suggestedReply ??
                                        t('noSuggestion')}
                                </p>
                            )}
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                            {!isEditing && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={onEdit}
                                >
                                    <Pencil className="mr-2 h-3.5 w-3.5" />
                                    {tCommon('edit')}
                                </Button>
                            )}

                            <Button
                                size="sm"
                                onClick={onSend}
                            >
                                <Check className="mr-2 h-3.5 w-3.5" />
                                {t('send')}
                            </Button>

                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={onRegenerate}
                            >
                                <RefreshCw className="mr-2 h-3.5 w-3.5" />
                                {t('regenerate')}
                            </Button>
                        </div>
                    </div>

                    {ai.sources.length > 0 && (
                        <div className="mt-5">
                            <p className="text-xs font-semibold text-muted-foreground">
                                {t('basedOn')}
                            </p>

                            <div className="mt-3 space-y-2">
                                {ai.sources.map((source) => (
                                    <div
                                        key={source}
                                        className="flex items-center gap-2 text-sm"
                                    >
                                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                                            <Check className="h-3 w-3" />
                                        </div>

                                        <span>{source}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <Separator className="my-5" />

                    <div>
                        <p className="text-xs font-semibold text-muted-foreground">
                            {t('handoff')}
                        </p>

                        <p className="mt-2 text-sm leading-5 text-muted-foreground">
                            {t('handoffDesc')}
                        </p>

                        <Button
                            variant="outline"
                            className="mt-3 w-full"
                            onClick={onHandoff}
                        >
                            <UserRound className="mr-2 h-4 w-4" />
                            {t('handOffToHuman')}
                        </Button>
                    </div>
                </div>
            </div>
        </aside>
    );
}