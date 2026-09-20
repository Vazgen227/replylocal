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
    const tLanding = useTranslations('landing');
    const tCommon = useTranslations('common');

    // Profile State
    const [companyName, setCompanyName] = useState('АвтоТехЦентр «ReplyLocal Motors»');
    const [industry, setIndustry] = useState('Автосервіс та продаж автозапчастин');
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
        { id: 'usr_1', name: 'Олексій Коваленко', email: 'alex@replylocal.motors', role: 'Власник (Owner)' },
        { id: 'usr_2', name: 'Марія Смірнова', email: 'maria@replylocal.motors', role: 'Старший менеджер (Admin)' },
        { id: 'usr_3', name: 'Денис Петров', email: 'denis@replylocal.motors', role: 'Оператор зміни (Agent)' },
    ]);

    function handleSaveGeneral(e: React.FormEvent) {
        e.preventDefault();
        toast.success(tCommon('saved'));
    }

    function handleUpgradePlan(plan: 'start' | 'pro' | 'enterprise') {
        setActivePlan(plan);
        toast.success(t('planUpdatedToast', { plan: plan.toUpperCase() }));
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
                                    {t('generalProfileDesc')}
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
                                        <Label className="text-xs">{t('currencyLabel')}</Label>
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
                                <span>{t('aiSettingsTitle')}</span>
                            </CardTitle>
                            <CardDescription className="text-xs">
                                {t('aiSettingsDesc')}
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
                                        {t('currentConfidence', { val: '85' })}
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center justify-between py-2 border-t">
                                <div className="space-y-0.5">
                                    <Label className="text-xs font-semibold">{t('autoHandoffTitle')}</Label>
                                    <p className="text-[11px] text-muted-foreground">
                                        {t('autoHandoffDesc')}
                                    </p>
                                </div>
                                <Switch checked={autoHandoff} onCheckedChange={setAutoHandoff} />
                            </div>

                            <div className="flex items-center justify-between py-2 border-t">
                                <div className="space-y-0.5">
                                    <Label className="text-xs font-semibold">{t('weekendAiTitle')}</Label>
                                    <p className="text-[11px] text-muted-foreground">
                                        {t('weekendAiDesc')}
                                    </p>
                                </div>
                                <Switch checked={weekendAiMode} onCheckedChange={setWeekendAiMode} />
                            </div>
                        </CardContent>
                        <CardFooter className="border-t bg-muted/10 justify-end">
                            <Button size="sm" onClick={() => toast.success(tCommon('saved'))}>
                                {t('saveAiParams')}
                            </Button>
                        </CardFooter>
                    </Card>
                </TabsContent>

                {/* Tab 3: Billing & Subscription Plans */}
                <TabsContent value="billing" className="space-y-6">
                    <Card className="shadow-xs border-primary/30 bg-primary/5">
                        <CardHeader className="flex flex-row items-center justify-between pb-3">
                            <div>
                                <Badge className="mb-1 text-xs">{t('currentPlanBadge', { plan: activePlan.toUpperCase() })}</Badge>
                                <CardTitle className="text-lg">{t('currentPlanTitle')}</CardTitle>
                                <CardDescription className="text-xs">
                                    {t('billingNextCharge')}
                                </CardDescription>
                            </div>
                            <CreditCard className="h-8 w-8 text-primary opacity-80" />
                        </CardHeader>
                    </Card>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Start */}
                        <Card className="flex flex-col justify-between shadow-xs">
                            <CardHeader>
                                <CardTitle className="text-base">{tLanding('planStart')}</CardTitle>
                                <CardDescription className="text-xs">{tLanding('planStartDesc')}</CardDescription>
                                <div className="text-2xl font-bold font-mono mt-2">{tLanding('planStartPrice')} <span className="text-xs text-muted-foreground font-sans">{tLanding('planStartPeriod')}</span></div>
                            </CardHeader>
                            <CardContent className="text-xs text-muted-foreground space-y-2">
                                <div>• {tLanding('planStartF1')}</div>
                                <div>• {tLanding('planStartF2')}</div>
                                <div>• {tLanding('planStartF3')}</div>
                            </CardContent>
                            <CardFooter>
                                <Button
                                    variant={activePlan === 'start' ? 'outline' : 'default'}
                                    size="sm"
                                    className="w-full"
                                    onClick={() => handleUpgradePlan('start')}
                                >
                                    {activePlan === 'start' ? t('currentPlanBtn') : t('switchStartBtn')}
                                </Button>
                            </CardFooter>
                        </Card>

                        {/* Pro */}
                        <Card className="flex flex-col justify-between shadow-xs border-2 border-primary">
                            <CardHeader>
                                <div className="flex justify-between items-center">
                                    <CardTitle className="text-base">{tLanding('planPro')}</CardTitle>
                                    <Badge className="text-[10px]">{tCommon('active')}</Badge>
                                </div>
                                <CardDescription className="text-xs">{tLanding('planProDesc')}</CardDescription>
                                <div className="text-2xl font-bold font-mono mt-2">{tLanding('planProPrice')} <span className="text-xs text-muted-foreground font-sans">{tLanding('planProPeriod')}</span></div>
                            </CardHeader>
                            <CardContent className="text-xs text-muted-foreground space-y-2">
                                <div>• {tLanding('planProF1')}</div>
                                <div>• {tLanding('planProF2')}</div>
                                <div>• {tLanding('planProF3')}</div>
                                <div>• {tLanding('planProF4')}</div>
                            </CardContent>
                            <CardFooter>
                                <Button size="sm" className="w-full" disabled>
                                    {t('currentPlanBtn')}
                                </Button>
                            </CardFooter>
                        </Card>

                        {/* Enterprise */}
                        <Card className="flex flex-col justify-between shadow-xs">
                            <CardHeader>
                                <CardTitle className="text-base">{tLanding('planEnterprise')}</CardTitle>
                                <CardDescription className="text-xs">{tLanding('planEnterpriseDesc')}</CardDescription>
                                <div className="text-2xl font-bold font-mono mt-2">{tLanding('planEnterprisePrice')}</div>
                            </CardHeader>
                            <CardContent className="text-xs text-muted-foreground space-y-2">
                                <div>• {tLanding('planEnterpriseF1')}</div>
                                <div>• {tLanding('planEnterpriseF2')}</div>
                                <div>• {tLanding('planEnterpriseF3')}</div>
                            </CardContent>
                            <CardFooter>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full"
                                    onClick={() => handleUpgradePlan('enterprise')}
                                >
                                    {t('requestEnterpriseBtn')}
                                </Button>
                            </CardFooter>
                        </Card>
                    </div>
                </TabsContent>

                {/* Tab 4: Team Members & Multi-tenancy */}
                <TabsContent value="team" className="space-y-4">
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">
                            {t('teamSubtitle')}
                        </p>
                        <Button size="sm" onClick={() => toast.info(t('inviteSentToast'))}>
                            <Plus className="h-4 w-4 mr-1.5" />
                            <span>{t('inviteTeamMember')}</span>
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
