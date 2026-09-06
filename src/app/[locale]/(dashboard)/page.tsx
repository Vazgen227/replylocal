'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import {
    Bot,
    Clock,
    TrendingUp,
    Users,
    DollarSign,
    Send,
    MessageCircle,
    ShoppingBag,
    ArrowUpRight,
    AlertTriangle,
    Activity,
    Plus,
} from 'lucide-react';
import { InstagramIcon } from '@/components/shared/icons';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { integrationRegistry } from '@/lib/adapters/registry';
import { mockConversations } from '@/lib/mocks/inbox';

export default function DashboardOverviewPage() {
    const locale = useLocale();
    const t = useTranslations('dashboard');
    const tCommon = useTranslations('common');

    const eventLogs = integrationRegistry.getEventLogs();
    const urgentConversations = mockConversations.filter(
        (c) => c.status === 'waiting_for_human' || c.priority === 'urgent' || c.priority === 'high'
    );

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-10">
            {/* Header / Greeting */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                        {t('title')}
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        {t('subtitle')}
                    </p>
                </div>

                <div className="flex items-center gap-2.5">
                    <Link href={`/${locale}/knowledge`}>
                        <Button variant="outline" size="sm" className="gap-1.5">
                            <Plus className="h-4 w-4" />
                            <span>{t('addRule')}</span>
                        </Button>
                    </Link>

                    <Link href={`/${locale}/inbox`}>
                        <Button size="sm" className="gap-1.5 shadow-xs">
                            <Bot className="h-4 w-4" />
                            <span>{t('openInbox')}</span>
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Top KPI Metrics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-card shadow-xs">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            {t('kpiTotalInquiries')}
                        </CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl sm:text-3xl font-bold font-mono">1,482</div>
                        <p className="text-xs text-emerald-600 flex items-center gap-1 mt-1 font-medium">
                            <TrendingUp className="h-3 w-3" />
                            <span>+24% по сравнению с прошлым мес.</span>
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-card shadow-xs border-primary/20 bg-primary/5">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-xs font-semibold text-primary uppercase tracking-wider">
                            {t('kpiAiAutomated')}
                        </CardTitle>
                        <Bot className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl sm:text-3xl font-bold font-mono text-primary">84.6%</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            1,254 диалога закрыто без участия человека
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-card shadow-xs">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            {t('kpiAvgResponse')}
                        </CardTitle>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl sm:text-3xl font-bold font-mono text-emerald-600">4.2 сек</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            против 18.5 мин у человека (SLA 99.8%)
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-card shadow-xs">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            {t('kpiSavedRevenue')}
                        </CardTitle>
                        <DollarSign className="h-4 w-4 text-emerald-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl sm:text-3xl font-bold font-mono text-emerald-600">+48,200 ₴</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            142 сконвертированных лида в этом месяце
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Middle Section: Needs Attention & Channel Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Urgent & Human Handoffs */}
                <Card className="lg:col-span-2 shadow-xs">
                    <CardHeader className="flex flex-row items-center justify-between pb-3 border-b">
                        <div>
                            <CardTitle className="text-base flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4 text-amber-500" />
                                <span>{t('recentAttention')}</span>
                            </CardTitle>
                            <CardDescription className="text-xs mt-0.5">
                                Диалоги, переданные AI человеку из-за нестандартных запросов
                            </CardDescription>
                        </div>
                        <Link href={`/${locale}/inbox`}>
                            <Button variant="ghost" size="sm" className="text-xs gap-1">
                                <span>{tCommon('viewAll')}</span>
                                <ArrowUpRight className="h-3.5 w-3.5" />
                            </Button>
                        </Link>
                    </CardHeader>
                    <CardContent className="p-0 divide-y">
                        {urgentConversations.map((conv) => (
                            <Link
                                key={conv.id}
                                href={`/${locale}/inbox/${conv.id}`}
                                className="flex items-center justify-between p-4 hover:bg-muted/40 transition-colors"
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <Avatar className="h-9 w-9">
                                        <AvatarFallback className="text-xs bg-muted">
                                            {conv.contact.name.slice(0, 2).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="font-semibold text-sm truncate">
                                                {conv.contact.name}
                                            </p>
                                            <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">
                                                {conv.priority === 'urgent' ? 'Срочно' : 'Требует ответа'}
                                            </Badge>
                                        </div>
                                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                                            {conv.lastMessage}
                                        </p>
                                    </div>
                                </div>

                                <div className="text-right shrink-0 ml-4">
                                    <span className="text-[11px] text-muted-foreground">
                                        {conv.lastMessageAt}
                                    </span>
                                    <div className="text-xs font-semibold text-primary mt-1">
                                        Ответить →
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </CardContent>
                </Card>

                {/* Channel Distribution */}
                <Card className="shadow-xs flex flex-col justify-between">
                    <CardHeader className="pb-3 border-b">
                        <CardTitle className="text-base">{t('channelDistribution')}</CardTitle>
                        <CardDescription className="text-xs">
                            Активность входящих сообщений по адаптерам
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-4">
                        <div className="space-y-1.5">
                            <div className="flex justify-between text-xs font-medium">
                                <span className="flex items-center gap-1.5">
                                    <Send className="h-3.5 w-3.5 text-sky-500" />
                                    Telegram Bot API
                                </span>
                                <span className="font-mono">42% (622)</span>
                            </div>
                            <div className="h-2 rounded-full bg-muted overflow-hidden">
                                <div className="h-full bg-sky-500 rounded-full w-[42%]" />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <div className="flex justify-between text-xs font-medium">
                                <span className="flex items-center gap-1.5">
                                    <MessageCircle className="h-3.5 w-3.5 text-emerald-500" />
                                    WhatsApp Cloud API
                                </span>
                                <span className="font-mono">35% (518)</span>
                            </div>
                            <div className="h-2 rounded-full bg-muted overflow-hidden">
                                <div className="h-full bg-emerald-500 rounded-full w-[35%]" />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <div className="flex justify-between text-xs font-medium">
                                <span className="flex items-center gap-1.5">
                                    <InstagramIcon className="h-3.5 w-3.5 text-pink-500" />
                                    Instagram Direct
                                </span>
                                <span className="font-mono">15% (222)</span>
                            </div>
                            <div className="h-2 rounded-full bg-muted overflow-hidden">
                                <div className="h-full bg-pink-500 rounded-full w-[15%]" />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <div className="flex justify-between text-xs font-medium">
                                <span className="flex items-center gap-1.5">
                                    <ShoppingBag className="h-3.5 w-3.5 text-blue-600" />
                                    Ozon & WB Seller API
                                </span>
                                <span className="font-mono">8% (120)</span>
                            </div>
                            <div className="h-2 rounded-full bg-muted overflow-hidden">
                                <div className="h-full bg-blue-600 rounded-full w-[8%]" />
                            </div>
                        </div>
                    </CardContent>
                    <div className="p-4 border-t bg-muted/20">
                        <Link href={`/${locale}/integrations`}>
                            <Button variant="outline" size="sm" className="w-full text-xs gap-1.5">
                                <Plus className="h-3.5 w-3.5" />
                                <span>{t('connectChannel')}</span>
                            </Button>
                        </Link>
                    </div>
                </Card>
            </div>

            {/* Bottom Section: Live CloudEvents Stream */}
            <Card className="shadow-xs">
                <CardHeader className="flex flex-row items-center justify-between pb-3 border-b">
                    <div>
                        <CardTitle className="text-base flex items-center gap-2">
                            <Activity className="h-4 w-4 text-primary" />
                            <span>{t('liveEventStream')}</span>
                        </CardTitle>
                        <CardDescription className="text-xs">
                            Асинхронные события в формате спецификации CNCF CloudEvents v1.0
                        </CardDescription>
                    </div>
                    <Badge variant="outline" className="font-mono text-[10px] bg-muted/60">
                        EDA • Event-Driven Bus Active
                    </Badge>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="divide-y font-mono text-xs">
                        {eventLogs.map((evt) => (
                            <div key={evt.id} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-muted/30 transition-colors">
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                                    <span className="font-semibold text-foreground truncate">{evt.type}</span>
                                    <span className="text-muted-foreground hidden md:inline">[{evt.source}]</span>
                                </div>
                                <div className="flex items-center gap-4 text-muted-foreground text-[11px] shrink-0">
                                    <span className="truncate max-w-[280px]">{evt.subject}</span>
                                    <span className="font-sans">{new Date(evt.time).toLocaleTimeString()}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}