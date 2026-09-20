'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import {
    LayoutDashboard,
    Inbox,
    BookOpen,
    Plug,
    BarChart3,
    Settings,
    Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

const navItems = [
    { href: '', icon: LayoutDashboard, labelKey: 'dashboard' },
    { href: '/inbox', icon: Inbox, labelKey: 'inbox' },
    { href: '/knowledge', icon: BookOpen, labelKey: 'knowledge' },
    { href: '/integrations', icon: Plug, labelKey: 'integrations' },
    { href: '/analytics', icon: BarChart3, labelKey: 'analytics' },
    { href: '/settings', icon: Settings, labelKey: 'settings' },
] as const;

export function Sidebar() {
    const t = useTranslations('nav');
    const locale = useLocale();
    const pathname = usePathname();

    return (
        <aside className="flex h-full w-64 flex-col border-r bg-background">
            {/* Logo */}
            <div className="flex h-16 items-center border-b px-6">
                <Link href={`/${locale}/dashboard`} className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-sm shadow-xs">
                        RL
                    </div>
                    <span className="text-lg font-bold tracking-tight">ReplyLocal</span>
                </Link>
            </div>

            {/* Navigation */}
            <nav className="flex-1 space-y-1 px-3 py-4">
                {navItems.map((item) => {
                    const fullHref = item.href === '' ? `/${locale}/dashboard` : `/${locale}${item.href}`;
                    const isActive =
                        item.href === ''
                            ? pathname === `/${locale}` || pathname === `/${locale}/dashboard`
                            : pathname.startsWith(fullHref);

                    return (
                        <Link
                            key={item.labelKey}
                            href={fullHref}
                            className={cn(
                                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                                isActive
                                    ? 'bg-primary/10 text-primary font-semibold'
                                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                            )}
                        >
                            <item.icon className="h-4 w-4" />
                            <span>{t(item.labelKey)}</span>
                        </Link>
                    );
                })}
            </nav>

            {/* Bottom plan card */}
            <div className="border-t p-3.5">
                <Link
                    href={`/${locale}/settings`}
                    className="block rounded-xl border bg-muted/40 p-3 hover:bg-muted/70 transition-colors"
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                            <Sparkles className="h-3.5 w-3.5 text-violet-600" />
                            <span className="text-xs font-semibold">{t('proPlan')}</span>
                        </div>
                        <Badge variant="outline" className="text-[10px] bg-background">
                            {t('proPlanPrice')}
                        </Badge>
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                        {t('usedMessages', { used: '1 482', total: '5 000' })}
                    </p>
                </Link>
            </div>
        </aside>
    );
}