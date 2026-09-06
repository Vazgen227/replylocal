'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
    Building2,
    Bot,
    CreditCard,
    Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

export default function SettingsPage() {
    const t = useTranslations('settings');
    const tCommon = useTranslations('common');

    // Profile State
    const [companyName, setCompanyName] = useState('АвтоТехЦентр «ReplyLocal Motors»');
    const [industry, setIndustry] = useState('Автосервис и продажа автозапчастей');
    const [timezone, setTimezone] = useState('Europe/Kyiv (UTC+03:00 / RFC 3339)');
    const [currency, setCurrency] = useState('UAH (₴) - ISO 4217');

    // AI SLA State
    const [confidenceThreshold, setConfidenceThreshold] = useState('0.85');
    const [autoHandoff, setAutoHandoff] = useState(true);
    const [weekendAiMode, setWeekendAiMode] = useState(true);

    // Active Plan
    const [activePlan, setActivePlan] = useState<'start' | 'pro' | 'enterprise'>('pro');

    // Team members
    const [team] = useState([
        { id: 'usr_1', name: 'Алексей Коваленко', email: 'alex@replylocal.motors', role: 'Владелец (Owner)' },
        { id: 'usr_2', name: 'Мария Смирнова', email: 'maria@replylocal.motors', role: 'Старший менеджер (Admin)' },
        { id: 'usr_3', name: 'Денис Петров', email: 'denis@replylocal.motors', role: 'Оператор смены (Agent)' },
    ]);

    function handleSaveGeneral(e: React.FormEvent) {
        e.preventDefault();
        toast.success(tCommon('saved'));
    }

    function handleUpgradePlan(plan: 'start' | 'pro' | 'enterprise') {
        setActivePlan(plan);
        toast.success(`Тарифный план успешно обновлен на «${plan.toUpperCase()}»`);
    }

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-10">
            {/* Header */}
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                    {t('title')}
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                    {t('subtitle')}
                </p>
            </div>

            {/* Settings Tabs */}
            <Tabs defaultValue="general" className="space-y-6">
                <TabsList className="bg-muted/60">
                    <TabsTrigger value="general" className="text-xs sm:text-sm">
                        {t('tabGeneral')}
                    </TabsTrigger>
                    <TabsTrigger value="ai" className="text-xs sm:text-sm">
                        {t('tabAi')}
                    </TabsTrigger>
                    <TabsTrigger value="billing" className="text-xs sm:text-sm">
                        {t('tabBilling')}
                    </TabsTrigger>
                    <TabsTrigger value="team" className="text-xs sm:text-sm">
                        {t('tabTeam')} ({team.length})
                    </TabsTrigger>
                </TabsList>

                {/* Tab 1: General Company Profile */}
                <TabsContent value="general" className="space-y-4">
                    <Card className="shadow-xs">
                        <form onSubmit={handleSaveGeneral}>
                            <CardHeader>
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Building2 className="h-4 w-4 text-primary" />
                                    <span>{t('tabGeneral')}</span>
                                </CardTitle>
                                <CardDescription className="text-xs">
                                    Основные реквизиты компании и региональные стандарты
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-1.5">
                                    <Label className="text-xs">{t('companyName')}</Label>
                                    <Input
                                        value={companyName}
                                        onChange={(e) => setCompanyName(e.target.value)}
                                        className="text-sm"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-xs">{t('industry')}</Label>
                                    <Input
                                        value={industry}
                                        onChange={(e) => setIndustry(e.target.value)}
                                        className="text-sm"
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs">{t('timezone')}</Label>
                                        <Input
                                            value={timezone}
                                            onChange={(e) => setTimezone(e.target.value)}
                                            className="text-xs font-mono"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs">Основная валюта (ISO 4217)</Label>
                                        <Input
                                            value={currency}
                                            onChange={(e) => setCurrency(e.target.value)}
                                            className="text-xs font-mono"
                                        />
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter className="border-t bg-muted/10 justify-end">
                                <Button type="submit" size="sm">
                                    {tCommon('save')}
                                </Button>
                            </CardFooter>
                        </form>
                    </Card>
                </TabsContent>

                {/* Tab 2: AI & SLA Parameters */}
                <TabsContent value="ai" className="space-y-4">
                    <Card className="shadow-xs">
                        <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                                <Bot className="h-4 w-4 text-primary" />
                                <span>Параметры работы AI-ассистента</span>
                            </CardTitle>
                            <CardDescription className="text-xs">
                                Тонкая настройка точности, автоответов и порогов эскалации
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs">{t('slaThreshold')}</Label>
                                <div className="flex items-center gap-3">
                                    <Input
                                        type="number"
                                        step="0.05"
                                        min="0.5"
                                        max="1.0"
                                        value={confidenceThreshold}
                                        onChange={(e) => setConfidenceThreshold(e.target.value)}
                                        className="w-32 font-mono text-xs"
                                    />
                                    <span className="text-xs text-muted-foreground">
                                        (Текущее значение: 85% уверенности)
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center justify-between py-2 border-t">
                                <div className="space-y-0.5">
                                    <Label className="text-xs font-semibold">Автоматический Human Handoff</Label>
                                    <p className="text-[11px] text-muted-foreground">
                                        Передавать управление человеку при обнаружении стоп-слов или негатива
                                    </p>
                                </div>
                                <Switch checked={autoHandoff} onCheckedChange={setAutoHandoff} />
                            </div>

                            <div className="flex items-center justify-between py-2 border-t">
                                <div className="space-y-0.5">
                                    <Label className="text-xs font-semibold">AI Автопилот в выходные и праздники</Label>
                                    <p className="text-[11px] text-muted-foreground">
                                        Брать лиды и записывать на рабочие дни 24/7 без участия оператора
                                    </p>
                                </div>
                                <Switch checked={weekendAiMode} onCheckedChange={setWeekendAiMode} />
                            </div>
                        </CardContent>
                        <CardFooter className="border-t bg-muted/10 justify-end">
                            <Button size="sm" onClick={() => toast.success(tCommon('saved'))}>
                                {tCommon('save')} параметры AI
                            </Button>
                        </CardFooter>
                    </Card>
                </TabsContent>

                {/* Tab 3: Billing & Subscription Plans */}
                <TabsContent value="billing" className="space-y-6">
                    <Card className="shadow-xs border-primary/30 bg-primary/5">
                        <CardHeader className="flex flex-row items-center justify-between pb-3">
                            <div>
                                <Badge className="mb-1 text-xs">Текущий план: {activePlan.toUpperCase()}</Badge>
                                <CardTitle className="text-lg">Тариф «Профи» ($49 / месяц)</CardTitle>
                                <CardDescription className="text-xs">
                                    Следующее списание: 01 октября 2026 • Лимит сообщений: 5 000 / мес (использовано 1 482)
                                </CardDescription>
                            </div>
                            <CreditCard className="h-8 w-8 text-primary opacity-80" />
                        </CardHeader>
                    </Card>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Start */}
                        <Card className="flex flex-col justify-between shadow-xs">
                            <CardHeader>
                                <CardTitle className="text-base">Старт</CardTitle>
                                <CardDescription className="text-xs">Для небольшого бизнеса</CardDescription>
                                <div className="text-2xl font-bold font-mono mt-2">$19 <span className="text-xs text-muted-foreground font-sans">/ мес</span></div>
                            </CardHeader>
                            <CardContent className="text-xs text-muted-foreground space-y-2">
                                <div>• До 2 каналов (Telegram, WhatsApp)</div>
                                <div>• До 1 000 сообщений в месяц</div>
                                <div>• Базовая база знаний</div>
                            </CardContent>
                            <CardFooter>
                                <Button
                                    variant={activePlan === 'start' ? 'outline' : 'default'}
                                    size="sm"
                                    className="w-full"
                                    onClick={() => handleUpgradePlan('start')}
                                >
                                    {activePlan === 'start' ? 'Текущий тариф' : 'Перейти на Старт'}
                                </Button>
                            </CardFooter>
                        </Card>

                        {/* Pro */}
                        <Card className="flex flex-col justify-between shadow-xs border-2 border-primary">
                            <CardHeader>
                                <div className="flex justify-between items-center">
                                    <CardTitle className="text-base">Профи</CardTitle>
                                    <Badge className="text-[10px]">Активен</Badge>
                                </div>
                                <CardDescription className="text-xs">Для растущих компаний и селлеров</CardDescription>
                                <div className="text-2xl font-bold font-mono mt-2">$49 <span className="text-xs text-muted-foreground font-sans">/ мес</span></div>
                            </CardHeader>
                            <CardContent className="text-xs text-muted-foreground space-y-2">
                                <div>• До 6 каналов (+ Instagram, Ozon, WB)</div>
                                <div>• До 5 000 сообщений в месяц</div>
                                <div>• RAG + Паспорт товара</div>
                                <div>• Приоритетный SLA</div>
                            </CardContent>
                            <CardFooter>
                                <Button size="sm" className="w-full" disabled>
                                    Текущий тариф
                                </Button>
                            </CardFooter>
                        </Card>

                        {/* Enterprise */}
                        <Card className="flex flex-col justify-between shadow-xs">
                            <CardHeader>
                                <CardTitle className="text-base">Корпоративный</CardTitle>
                                <CardDescription className="text-xs">Для сетей и крупных брендов</CardDescription>
                                <div className="text-2xl font-bold font-mono mt-2">Custom</div>
                            </CardHeader>
                            <CardContent className="text-xs text-muted-foreground space-y-2">
                                <div>• Неограниченно каналов и диалогов</div>
                                <div>• White-label адаптеры и iPaaS</div>
                                <div>• Выделенный SLA 99.9%</div>
                            </CardContent>
                            <CardFooter>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full"
                                    onClick={() => handleUpgradePlan('enterprise')}
                                >
                                    Запросить Enterprise
                                </Button>
                            </CardFooter>
                        </Card>
                    </div>
                </TabsContent>

                {/* Tab 4: Team Members & Multi-tenancy */}
                <TabsContent value="team" className="space-y-4">
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">
                            Сотрудники и операторы, имеющие доступ к диалогам и базе знаний
                        </p>
                        <Button size="sm" onClick={() => toast.info('Приглашение отправлено на указанный email')}>
                            <Plus className="h-4 w-4 mr-1.5" />
                            <span>Пригласить сотрудника</span>
                        </Button>
                    </div>

                    <Card className="shadow-xs">
                        <CardContent className="p-0 divide-y">
                            {team.map((member) => (
                                <div key={member.id} className="p-4 flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-semibold">{member.name}</p>
                                        <p className="text-xs text-muted-foreground font-mono">{member.email}</p>
                                    </div>
                                    <Badge variant="outline" className="text-xs">
                                        {member.role}
                                    </Badge>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
