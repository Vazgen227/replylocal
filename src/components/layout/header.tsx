'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { Bell, Search, Moon, Sun, Home } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { toast } from 'sonner';

export function Header() {
    const t = useTranslations('common');
    const tNav = useTranslations('nav');
    const tInbox = useTranslations('inbox');
    const locale = useLocale();
    const pathname = usePathname();
    const { theme, setTheme } = useTheme();

    function getCleanPath(targetLocale: string) {
        const parts = pathname.split('/');
        parts[1] = targetLocale;
        return parts.join('/') || `/${targetLocale}`;
    }

    function toggleTheme() {
        setTheme(theme === 'dark' ? 'light' : 'dark');
    }

    function handleBellClick() {
        toast.info(tInbox('allAssistantsWorkingOk'));
    }

    return (
        <header className="flex h-16 shrink-0 items-center justify-between border-b bg-background px-6">
            <div className="flex items-center gap-4 flex-1 max-w-md">
                <div className="relative w-full">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder={t('search')}
                        className="pl-9 bg-muted/40 border-none focus-visible:ring-1 text-sm"
                    />
                </div>
            </div>

            <div className="flex items-center gap-3">
                {/* Link to Landing Page */}
                <Link href={`/${locale}`}>
                    <Button variant="ghost" size="sm" className="hidden sm:inline-flex gap-1.5 text-xs text-muted-foreground hover:text-foreground">
                        <Home className="h-3.5 w-3.5" />
                        <span>{tNav('landing')}</span>
                    </Button>
                </Link>

                {/* Language Switcher */}
                <div className="flex items-center rounded-lg border bg-muted/30 p-0.5 text-xs font-medium">
                    <Link
                        href={getCleanPath('uk')}
                        className={`px-2 py-1 rounded-md transition-colors ${
                            locale === 'uk' ? 'bg-background text-foreground shadow-xs font-semibold' : 'text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        UK
                    </Link>
                    <Link
                        href={getCleanPath('ru')}
                        className={`px-2 py-1 rounded-md transition-colors ${
                            locale === 'ru' ? 'bg-background text-foreground shadow-xs font-semibold' : 'text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        RU
                    </Link>
                    <Link
                        href={getCleanPath('en')}
                        className={`px-2 py-1 rounded-md transition-colors ${
                            locale === 'en' ? 'bg-background text-foreground shadow-xs font-semibold' : 'text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        EN
                    </Link>
                </div>

                {/* Theme Toggle */}
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    onClick={toggleTheme}
                    title={t('toggleTheme')}
                >
                    <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                    <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                </Button>

                {/* Notifications */}
                <Button
                    variant="ghost"
                    size="icon"
                    className="relative h-8 w-8 text-muted-foreground hover:text-foreground"
                    onClick={handleBellClick}
                >
                    <Bell className="h-4 w-4" />
                    <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                </Button>

                {/* User Avatar */}
                <Avatar className="h-8 w-8 cursor-pointer border">
                    <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
                        АК
                    </AvatarFallback>
                </Avatar>
            </div>
        </header>
    );
}