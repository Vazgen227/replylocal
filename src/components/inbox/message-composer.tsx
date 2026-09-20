'use client';

import { useTranslations } from 'next-intl';
import { Paperclip, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

interface MessageComposerProps {
    value?: string;
    onChange?: (value: string) => void;
    onSend?: () => void;
}

export function MessageComposer({
    value = '',
    onChange,
    onSend,
}: MessageComposerProps) {
    const t = useTranslations('inbox');

    function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            onSend?.();
        }
    }

    function handleAttach() {
        toast.info(t('attachReady'));
    }

    return (
        <div className="border-t bg-background p-4">
            <div className="rounded-xl border bg-muted/20 p-3 transition-colors focus-within:border-primary/50 focus-within:bg-background">
                <Textarea
                    value={value}
                    onChange={(event) => onChange?.(event.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={t('typeMessage')}
                    className="min-h-[80px] resize-none border-0 bg-transparent p-0 shadow-none focus-visible:ring-0 text-sm leading-relaxed"
                />

                <div className="mt-2 flex items-center justify-between pt-2 border-t border-border/40">
                    <div className="flex items-center gap-1.5">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            onClick={handleAttach}
                            type="button"
                            title={t('attachFile')}
                        >
                            <Paperclip className="h-4 w-4" />
                        </Button>
                        <span className="text-[11px] text-muted-foreground hidden sm:inline">
                            {t('ctrlEnterToSend')}
                        </span>
                    </div>

                    <Button
                        size="sm"
                        onClick={onSend}
                        disabled={!value.trim()}
                        className="gap-1.5 shadow-xs"
                    >
                        <span>{t('send')}</span>
                        <Send className="h-3.5 w-3.5" />
                    </Button>
                </div>
            </div>
        </div>
    );
}