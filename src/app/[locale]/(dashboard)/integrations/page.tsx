'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
    Plug,
    Send,
    MessageCircle,
    ShoppingBag,
    Store,
    Globe,
    Webhook,
    CheckCircle2,
    XCircle,
    Settings,
    Activity,
    RefreshCw,
    Code,
} from 'lucide-react';
import { InstagramIcon } from '@/components/shared/icons';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { integrationRegistry, type IntegrationStatus } from '@/lib/adapters/registry';
import { toast } from 'sonner';

export default function IntegrationsPage() {
    const t = useTranslations('integrations');
    const tCommon = useTranslations('common');

    const [integrations, setIntegrations] = useState<IntegrationStatus[]>(
        integrationRegistry.getIntegrationsList()
    );
    const [selectedIntegration, setSelectedIntegration] = useState<IntegrationStatus | null>(null);
    const [isConfigOpen, setIsConfigOpen] = useState(false);
    const [apiKey, setApiKey] = useState('sec_live_798124981724981');
    const [autoReplyEnabled, setAutoReplyEnabled] = useState(true);
    const [isTesting, setIsTesting] = useState(false);

    const eventLogs = integrationRegistry.getEventLogs();

    function handleOpenConfig(integration: IntegrationStatus) {
        setSelectedIntegration(integration);
        setIsConfigOpen(true);
    }

    function handleTestConnection() {
        setIsTesting(true);
        setTimeout(() => {
            setIsTesting(false);
            if (selectedIntegration) {
                setIntegrations((prev) =>
                    prev.map((item) =>
                        item.id === selectedIntegration.id
                            ? { ...item, connected: true, lastSyncAt: 'Только что' }
                            : item
                    )
                );
            }
            toast.success(t('connectionSuccess'));
        }, 1200);
    }

    function handleSaveConfig() {
        setIsConfigOpen(false);
        toast.success(tCommon('saved'));
    }

    const iconMap: Record<string, React.ElementType> = {
        Send: Send,
        MessageCircle: MessageCircle,
        Instagram: InstagramIcon,
        ShoppingBag: ShoppingBag,
        Store: Store,
        Globe: Globe,
        Webhook: Webhook,
    };

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

            {/* Architecture Banner */}
            <div className="rounded-2xl border bg-primary/5 p-4 border-primary/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <Plug className="h-5 w-5" />
                    </div>
                    <div>
                        <p className="text-sm font-semibold">
                            Universal Adapter Pattern & CloudEvents Standard
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Все входящие сообщения автоматически нормализуются в единый формат и обрабатываются через асинхронную шину событий.
                        </p>
                    </div>
                </div>
                <Badge variant="outline" className="bg-background text-xs font-mono self-start sm:self-center">
                    Adapter Registry: 6 Active
                </Badge>
            </div>

            {/* Main Tabs */}
            <Tabs defaultValue="all" className="space-y-6">
                <TabsList className="bg-muted/60">
                    <TabsTrigger value="all" className="text-xs sm:text-sm">
                        Все адаптеры ({integrations.length})
                    </TabsTrigger>
                    <TabsTrigger value="messengers" className="text-xs sm:text-sm">
                        {t('messengersTab')}
                    </TabsTrigger>
                    <TabsTrigger value="marketplaces" className="text-xs sm:text-sm">
                        {t('marketplacesTab')}
                    </TabsTrigger>
                    <TabsTrigger value="logs" className="text-xs sm:text-sm">
                        {t('eventLogsTitle')}
                    </TabsTrigger>
                </TabsList>

                {/* Grid for All / Messengers / Marketplaces */}
                <TabsContent value="all" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {integrations.map((item) => {
                            const IconComponent = iconMap[item.icon] || Plug;
                            return (
                                <Card key={item.id} className="shadow-xs flex flex-col justify-between hover:border-primary/40 transition-colors">
                                    <CardHeader className="pb-3">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center">
                                                    <IconComponent className="h-5 w-5 text-foreground" />
                                                </div>
                                                <div>
                                                    <CardTitle className="text-base">{item.name}</CardTitle>
                                                    <div className="flex items-center gap-1.5 mt-1">
                                                        {item.connected ? (
                                                            <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-600">
                                                                <CheckCircle2 className="h-3 w-3" />
                                                                {tCommon('connected')}
                                                            </span>
                                                        ) : (
                                                            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                                                <XCircle className="h-3 w-3" />
                                                                {tCommon('disconnected')}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-2 text-xs text-muted-foreground">
                                        <p>{item.description}</p>
                                        <div className="flex justify-between pt-2 border-t text-[11px]">
                                            <span>Синхронизация:</span>
                                            <span className="font-medium text-foreground">{item.lastSyncAt}</span>
                                        </div>
                                        <div className="flex justify-between text-[11px]">
                                            <span>Обработано событий:</span>
                                            <span className="font-mono font-semibold text-foreground">{item.eventsCount.toLocaleString()}</span>
                                        </div>
                                    </CardContent>
                                    <CardFooter className="pt-0 border-t p-3 bg-muted/20">
                                        <Button
                                            variant={item.connected ? 'outline' : 'default'}
                                            size="sm"
                                            className="w-full text-xs gap-1.5"
                                            onClick={() => handleOpenConfig(item)}
                                        >
                                            <Settings className="h-3.5 w-3.5" />
                                            <span>{item.connected ? tCommon('configure') : tCommon('connect')}</span>
                                        </Button>
                                    </CardFooter>
                                </Card>
                            );
                        })}
                    </div>
                </TabsContent>

                <TabsContent value="messengers" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {integrations
                            .filter((i) => i.category === 'messenger')
                            .map((item) => {
                                const IconComponent = iconMap[item.icon] || Plug;
                                return (
                                    <Card key={item.id} className="shadow-xs flex flex-col justify-between">
                                        <CardHeader className="pb-3">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center">
                                                    <IconComponent className="h-5 w-5 text-foreground" />
                                                </div>
                                                <div>
                                                    <CardTitle className="text-base">{item.name}</CardTitle>
                                                    <span className="text-[11px] text-emerald-600 font-medium">✓ {tCommon('connected')}</span>
                                                </div>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="text-xs text-muted-foreground">
                                            {item.description}
                                        </CardContent>
                                        <CardFooter className="p-3 border-t bg-muted/20">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="w-full text-xs"
                                                onClick={() => handleOpenConfig(item)}
                                            >
                                                {tCommon('configure')}
                                            </Button>
                                        </CardFooter>
                                    </Card>
                                );
                            })}
                    </div>
                </TabsContent>

                <TabsContent value="marketplaces" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {integrations
                            .filter((i) => i.category === 'marketplace')
                            .map((item) => {
                                const IconComponent = iconMap[item.icon] || Plug;
                                return (
                                    <Card key={item.id} className="shadow-xs flex flex-col justify-between">
                                        <CardHeader className="pb-3">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center">
                                                    <IconComponent className="h-5 w-5 text-foreground" />
                                                </div>
                                                <div>
                                                    <CardTitle className="text-base">{item.name}</CardTitle>
                                                    <span className="text-[11px] text-muted-foreground">
                                                        {item.connected ? '✓ Подключено' : 'Не подключено'}
                                                    </span>
                                                </div>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="text-xs text-muted-foreground">
                                            {item.description}
                                        </CardContent>
                                        <CardFooter className="p-3 border-t bg-muted/20">
                                            <Button
                                                variant={item.connected ? 'outline' : 'default'}
                                                size="sm"
                                                className="w-full text-xs"
                                                onClick={() => handleOpenConfig(item)}
                                            >
                                                {item.connected ? tCommon('configure') : tCommon('connect')}
                                            </Button>
                                        </CardFooter>
                                    </Card>
                                );
                            })}
                    </div>
                </TabsContent>

                {/* CloudEvents Live Logs Tab */}
                <TabsContent value="logs" className="space-y-4">
                    <Card className="shadow-xs">
                        <CardHeader className="pb-3 border-b">
                            <CardTitle className="text-base flex items-center gap-2">
                                <Code className="h-4 w-4 text-primary" />
                                <span>{t('eventLogsTitle')}</span>
                            </CardTitle>
                            <CardDescription className="text-xs">
                                Полный журнал поступающих и отправляемых событий в стандарте CNCF CloudEvents JSON
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="divide-y font-mono text-xs max-h-[500px] overflow-y-auto">
                                {eventLogs.map((evt) => (
                                    <div key={evt.id} className="p-4 space-y-2 hover:bg-muted/30">
                                        <div className="flex items-center justify-between text-muted-foreground text-[11px]">
                                            <span className="font-semibold text-primary">{evt.type}</span>
                                            <span>{new Date(evt.time).toISOString()}</span>
                                        </div>
                                        <div className="rounded-lg bg-zinc-950 p-3 text-zinc-100 text-[11px] overflow-x-auto">
                                            <pre>{JSON.stringify(evt, null, 2)}</pre>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Config Modal */}
            <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <span>Настройка: {selectedIntegration?.name}</span>
                        </DialogTitle>
                        <DialogDescription>
                            Адаптер для подключения канала к AI-движку ReplyLocal
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <Label className="text-xs">{t('apiKeyLabel')}</Label>
                            <Input
                                type="password"
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                className="font-mono text-xs"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs">{t('webhookUrlLabel')}</Label>
                            <Input
                                readOnly
                                value={`https://api.replylocal.io/v1/webhooks/${selectedIntegration?.id}`}
                                className="font-mono text-xs bg-muted/40"
                            />
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t">
                            <div className="space-y-0.5">
                                <Label className="text-xs font-semibold">{t('autoReplyToggle')}</Label>
                                <p className="text-[11px] text-muted-foreground">
                                    AI будет автоматически отвечать на входящие запросы
                                </p>
                            </div>
                            <Switch
                                checked={autoReplyEnabled}
                                onCheckedChange={setAutoReplyEnabled}
                            />
                        </div>

                        <Button
                            type="button"
                            variant="outline"
                            className="w-full text-xs gap-2"
                            onClick={handleTestConnection}
                            disabled={isTesting}
                        >
                            {isTesting ? (
                                <>
                                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                    <span>Проверка связи с API...</span>
                                </>
                            ) : (
                                <>
                                    <Activity className="h-3.5 w-3.5" />
                                    <span>{t('testConnection')}</span>
                                </>
                            )}
                        </Button>
                    </div>

                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsConfigOpen(false)}>
                            {tCommon('cancel')}
                        </Button>
                        <Button onClick={handleSaveConfig}>
                            {tCommon('save')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
