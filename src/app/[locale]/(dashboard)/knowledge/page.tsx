'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
    Plus,
    Trash2,
    Bot,
    Shield,
    CheckCircle2,
    Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    mockServices as initialServices,
    mockPassports as initialPassports,
    mockRules as initialRules,
    defaultAIPersona as initialPersona,
    type ServiceItem,
    type ProductPassport,
    type BusinessRule,
} from '@/lib/mocks/knowledge';
import { toast } from 'sonner';

export default function KnowledgeBasePage() {
    const t = useTranslations('knowledge');
    const tCommon = useTranslations('common');

    const [services, setServices] = useState<ServiceItem[]>(initialServices);
    const [passports, setPassports] = useState<ProductPassport[]>(initialPassports);
    const [rules, setRules] = useState<BusinessRule[]>(initialRules);
    const [persona, setPersona] = useState(initialPersona);

    // Modals
    const [isAddServiceOpen, setIsAddServiceOpen] = useState(false);
    const [isAddPassportOpen, setIsAddPassportOpen] = useState(false);
    const [isAddRuleOpen, setIsAddRuleOpen] = useState(false);

    // Form states
    const [newServiceName, setNewServiceName] = useState('');
    const [newServiceCategory, setNewServiceCategory] = useState('ТО и сервис');
    const [newServicePrice, setNewServicePrice] = useState('650');
    const [newServiceDuration, setNewServiceDuration] = useState('45');
    const [newServiceDesc, setNewServiceDesc] = useState('');

    const [newPassportTitle, setNewPassportTitle] = useState('');
    const [newPassportSku, setNewPassportSku] = useState('');
    const [newPassportMarketplace, setNewPassportMarketplace] = useState<'Ozon' | 'Wildberries' | 'Amazon'>('Ozon');
    const [newPassportPrice, setNewPassportPrice] = useState('1490');

    const [newRuleTitle, setNewRuleTitle] = useState('');
    const [newRuleContent, setNewRuleContent] = useState('');
    const [newRuleKeywords, setNewRuleKeywords] = useState('');

    function handleCreateService(e: React.FormEvent) {
        e.preventDefault();
        const newService: ServiceItem = {
            id: `srv_${crypto.randomUUID()}`,
            name: newServiceName,
            category: newServiceCategory,
            price: Number(newServicePrice) || 500,
            currency: 'UAH',
            durationMinutes: Number(newServiceDuration) || 30,
            description: newServiceDesc || 'Стандартная услуга автосервиса.',
            popular: false,
        };
        setServices((prev) => [newService, ...prev]);
        setIsAddServiceOpen(false);
        setNewServiceName('');
        setNewServiceDesc('');
        toast.success('Услуга успешно добавлена в прайс-лист!');
    }

    function handleDeleteService(id: string) {
        setServices((prev) => prev.filter((s) => s.id !== id));
        toast.info('Услуга удалена из базы знаний');
    }

    function handleCreatePassport(e: React.FormEvent) {
        e.preventDefault();
        const newPassport: ProductPassport = {
            id: `pass_${crypto.randomUUID()}`,
            sku: newPassportSku || 'OZ-NEW-ITEM',
            marketplace: newPassportMarketplace,
            title: newPassportTitle,
            price: Number(newPassportPrice) || 1000,
            currency: 'RUB',
            specifications: {
                'Статус': 'В наличии',
                'Гарантия': 'Официальная гарантия производителя',
            },
            commonQuestions: [
                {
                    question: 'Подходит ли для стандартной комплектации?',
                    answer: 'Да, товар полностью соответствует штатным посадочным местам.',
                },
            ],
        };
        setPassports((prev) => [newPassport, ...prev]);
        setIsAddPassportOpen(false);
        setNewPassportTitle('');
        setNewPassportSku('');
        toast.success('Паспорт товара успешно синхронизирован с AI!');
    }

    function handleDeletePassport(id: string) {
        setPassports((prev) => prev.filter((p) => p.id !== id));
        toast.info('Паспорт товара удален');
    }

    function handleCreateRule(e: React.FormEvent) {
        e.preventDefault();
        const newRule: BusinessRule = {
            id: `rule_${crypto.randomUUID()}`,
            category: 'general',
            title: newRuleTitle,
            rule: newRuleContent,
            triggerKeywords: newRuleKeywords.split(',').map((k) => k.trim()),
        };
        setRules((prev) => [newRule, ...prev]);
        setIsAddRuleOpen(false);
        setNewRuleTitle('');
        setNewRuleContent('');
        setNewRuleKeywords('');
        toast.success('Правило сохранено и подключено к RAG-модулю!');
    }

    function handleDeleteRule(id: string) {
        setRules((prev) => prev.filter((r) => r.id !== id));
        toast.info('Правило удалено');
    }

    function handleSavePersona() {
        toast.success('Настройки AI Persona и Guardrails успешно обновлены!');
    }

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-10">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                        {t('title')}
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        {t('subtitle')}
                    </p>
                </div>
            </div>

            {/* Knowledge Tabs */}
            <Tabs defaultValue="services" className="space-y-6">
                <TabsList className="grid grid-cols-2 md:grid-cols-4 w-full md:w-auto h-auto p-1 bg-muted/60">
                    <TabsTrigger value="services" className="text-xs sm:text-sm py-2">
                        {t('tabServices')} ({services.length})
                    </TabsTrigger>
                    <TabsTrigger value="passports" className="text-xs sm:text-sm py-2">
                        {t('tabPassports')} ({passports.length})
                    </TabsTrigger>
                    <TabsTrigger value="faq" className="text-xs sm:text-sm py-2">
                        {t('tabFaq')} ({rules.length})
                    </TabsTrigger>
                    <TabsTrigger value="persona" className="text-xs sm:text-sm py-2">
                        {t('tabPersona')}
                    </TabsTrigger>
                </TabsList>

                {/* Tab 1: Services & Pricing */}
                <TabsContent value="services" className="space-y-4">
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">
                            AI использует эти данные для точного ответа на ценовые запросы в мессенджерах
                        </p>
                        <Button size="sm" onClick={() => setIsAddServiceOpen(true)} className="gap-1.5">
                            <Plus className="h-4 w-4" />
                            <span>{t('addService')}</span>
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {services.map((service) => (
                            <Card key={service.id} className="shadow-xs hover:border-primary/40 transition-colors">
                                <CardHeader className="pb-2">
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <Badge variant="outline" className="text-[10px] mb-1.5">
                                                {service.category}
                                            </Badge>
                                            <CardTitle className="text-base">{service.name}</CardTitle>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-lg font-bold font-mono text-emerald-600">
                                                {service.price} {service.currency}
                                            </div>
                                            <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                                <Clock className="h-3 w-3" />
                                                <span>~{service.durationMinutes} мин</span>
                                            </div>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-xs text-muted-foreground leading-relaxed">
                                        {service.description}
                                    </p>
                                </CardContent>
                                <CardFooter className="pt-0 flex justify-between items-center text-xs text-muted-foreground border-t p-3 bg-muted/20">
                                    <span className="flex items-center gap-1 text-emerald-600 font-medium">
                                        <CheckCircle2 className="h-3.5 w-3.5" />
                                        Активно для AI RAG
                                    </span>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 text-destructive hover:bg-destructive/10"
                                        onClick={() => handleDeleteService(service.id)}
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                </TabsContent>

                {/* Tab 2: Marketplaces Passports */}
                <TabsContent value="passports" className="space-y-4">
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">
                            Спецификации и ответы на частые вопросы покупателей на Ozon, Wildberries и Amazon
                        </p>
                        <Button size="sm" onClick={() => setIsAddPassportOpen(true)} className="gap-1.5">
                            <Plus className="h-4 w-4" />
                            <span>{t('addPassport')}</span>
                        </Button>
                    </div>

                    <div className="space-y-4">
                        {passports.map((passport) => (
                            <Card key={passport.id} className="shadow-xs">
                                <CardHeader className="pb-3 border-b">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <Badge className="bg-primary/10 text-primary hover:bg-primary/10 border-0 text-xs font-semibold">
                                                    {passport.marketplace}
                                                </Badge>
                                                <span className="text-xs font-mono text-muted-foreground">
                                                    SKU: {passport.sku}
                                                </span>
                                            </div>
                                            <CardTitle className="text-base mt-1">{passport.title}</CardTitle>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-base font-bold font-mono">
                                                {passport.price} {passport.currency}
                                            </span>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-destructive"
                                                onClick={() => handleDeletePassport(passport.id)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-4 space-y-3">
                                    <div>
                                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                            Характеристики (Specs):
                                        </p>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                            {Object.entries(passport.specifications).map(([key, val]) => (
                                                <div key={key} className="rounded-lg bg-muted/40 p-2 border">
                                                    <span className="font-medium text-foreground">{key}:</span>{' '}
                                                    <span className="text-muted-foreground">{val}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                            Частые вопросы покупателей (Buyer FAQ):
                                        </p>
                                        <div className="space-y-2">
                                            {passport.commonQuestions.map((q, idx) => (
                                                <div key={idx} className="rounded-lg bg-muted/20 p-3 border text-xs">
                                                    <p className="font-semibold text-primary">Q: {q.question}</p>
                                                    <p className="mt-1 text-muted-foreground">A: {q.answer}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </TabsContent>

                {/* Tab 3: FAQ and Business Rules */}
                <TabsContent value="faq" className="space-y-4">
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">
                            Регламенты работы, гарантии, условия оплаты и триггеры передачи оператору
                        </p>
                        <Button size="sm" onClick={() => setIsAddRuleOpen(true)} className="gap-1.5">
                            <Plus className="h-4 w-4" />
                            <span>{t('addFaq')}</span>
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {rules.map((rule) => (
                            <Card key={rule.id} className="shadow-xs flex flex-col justify-between">
                                <CardHeader className="pb-2">
                                    <div className="flex items-start justify-between gap-2">
                                        <CardTitle className="text-base">{rule.title}</CardTitle>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 text-destructive"
                                            onClick={() => handleDeleteRule(rule.id)}
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <p className="text-xs text-muted-foreground leading-relaxed">
                                        {rule.rule}
                                    </p>
                                    <div className="flex flex-wrap gap-1">
                                        {rule.triggerKeywords.map((kw) => (
                                            <Badge key={kw} variant="secondary" className="text-[10px]">
                                                #{kw}
                                            </Badge>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </TabsContent>

                {/* Tab 4: AI Persona & Guardrails */}
                <TabsContent value="persona" className="space-y-6">
                    <Card className="shadow-xs">
                        <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                                <Bot className="h-4 w-4 text-primary" />
                                <span>{t('aiToneTitle')}</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs">Системный промпт роли AI</Label>
                                <Textarea
                                    rows={5}
                                    value={persona.systemPrompt}
                                    onChange={(e) => setPersona({ ...persona, systemPrompt: e.target.value })}
                                    className="text-xs leading-relaxed font-sans"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label className="text-xs">Порог автоответа (Confidence SLA)</Label>
                                    <Input
                                        type="number"
                                        step="0.05"
                                        min="0.5"
                                        max="1.0"
                                        value={persona.autoReplyConfidenceThreshold}
                                        onChange={(e) =>
                                            setPersona({
                                                ...persona,
                                                autoReplyConfidenceThreshold: Number(e.target.value),
                                            })
                                        }
                                        className="text-xs font-mono"
                                    />
                                    <p className="text-[11px] text-muted-foreground">
                                        Если уверенность AI ниже 0.85, диалог маркируется для проверки оператором.
                                    </p>
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-xs">Сообщение в нерабочие часы</Label>
                                    <Input
                                        value={persona.operatingHours.autoReplyOffHoursMessage}
                                        onChange={(e) =>
                                            setPersona({
                                                ...persona,
                                                operatingHours: {
                                                    ...persona.operatingHours,
                                                    autoReplyOffHoursMessage: e.target.value,
                                                },
                                            })
                                        }
                                        className="text-xs"
                                    />
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="border-t bg-muted/10 justify-end">
                            <Button size="sm" onClick={handleSavePersona}>
                                {tCommon('save')} настройки
                            </Button>
                        </CardFooter>
                    </Card>

                    <Card className="shadow-xs border-amber-500/30">
                        <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2 text-amber-800 dark:text-amber-400">
                                <Shield className="h-4 w-4" />
                                <span>{t('guardrailsTitle')}</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-wrap gap-1.5">
                                {persona.humanHandoffKeywords.map((kw) => (
                                    <Badge key={kw} variant="outline" className="bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-amber-200">
                                        {kw}
                                    </Badge>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Modal: Add Service */}
            <Dialog open={isAddServiceOpen} onOpenChange={setIsAddServiceOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Добавить услугу в базу знаний</DialogTitle>
                        <DialogDescription>
                            Укажите параметры услуги для обучения AI-ассистента
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreateService} className="space-y-3">
                        <div className="space-y-1">
                            <Label className="text-xs">{t('serviceName')}</Label>
                            <Input
                                required
                                placeholder="Замена тормозных дисков"
                                value={newServiceName}
                                onChange={(e) => setNewServiceName(e.target.value)}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label className="text-xs">{t('servicePrice')} (₴)</Label>
                                <Input
                                    type="number"
                                    required
                                    value={newServicePrice}
                                    onChange={(e) => setNewServicePrice(e.target.value)}
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs">{t('serviceDuration')} (мин)</Label>
                                <Input
                                    type="number"
                                    required
                                    value={newServiceDuration}
                                    onChange={(e) => setNewServiceDuration(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs">{t('serviceCategory')}</Label>
                            <Input
                                value={newServiceCategory}
                                onChange={(e) => setNewServiceCategory(e.target.value)}
                            />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs">Описание и что входит в работу</Label>
                            <Textarea
                                placeholder="Детальное описание услуги для RAG"
                                value={newServiceDesc}
                                onChange={(e) => setNewServiceDesc(e.target.value)}
                            />
                        </div>
                        <DialogFooter className="pt-2">
                            <Button type="button" variant="ghost" onClick={() => setIsAddServiceOpen(false)}>
                                {tCommon('cancel')}
                            </Button>
                            <Button type="submit">{tCommon('save')}</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Modal: Add Product Passport */}
            <Dialog open={isAddPassportOpen} onOpenChange={setIsAddPassportOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Создать Паспорт товара для Маркетплейса</DialogTitle>
                        <DialogDescription>
                            AI будет отвечать на вопросы покупателей по этой карточке
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreatePassport} className="space-y-3">
                        <div className="space-y-1">
                            <Label className="text-xs">{t('productTitle')}</Label>
                            <Input
                                required
                                placeholder="Светодиодные лампы H7 LED 6000K"
                                value={newPassportTitle}
                                onChange={(e) => setNewPassportTitle(e.target.value)}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label className="text-xs">{t('productSku')}</Label>
                                <Input
                                    required
                                    placeholder="OZ-LED-H7"
                                    value={newPassportSku}
                                    onChange={(e) => setNewPassportSku(e.target.value)}
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs">Маркетплейс</Label>
                                <select
                                    className="w-full h-9 rounded-md border bg-background px-3 text-xs"
                                    value={newPassportMarketplace}
                                    onChange={(e) =>
                                        setNewPassportMarketplace(
                                            e.target.value as 'Ozon' | 'Wildberries' | 'Amazon'
                                        )
                                    }
                                >
                                    <option value="Ozon">Ozon</option>
                                    <option value="Wildberries">Wildberries</option>
                                    <option value="Amazon">Amazon</option>
                                </select>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs">{t('servicePrice')}</Label>
                            <Input
                                type="number"
                                value={newPassportPrice}
                                onChange={(e) => setNewPassportPrice(e.target.value)}
                            />
                        </div>
                        <DialogFooter className="pt-2">
                            <Button type="button" variant="ghost" onClick={() => setIsAddPassportOpen(false)}>
                                {tCommon('cancel')}
                            </Button>
                            <Button type="submit">Создать паспорт</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Modal: Add Rule */}
            <Dialog open={isAddRuleOpen} onOpenChange={setIsAddRuleOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Добавить правило / FAQ</DialogTitle>
                        <DialogDescription>
                            Регламенты и условия обслуживания клиентов
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreateRule} className="space-y-3">
                        <div className="space-y-1">
                            <Label className="text-xs">Название регламента</Label>
                            <Input
                                required
                                placeholder="Правила возврата и гарантии"
                                value={newRuleTitle}
                                onChange={(e) => setNewRuleTitle(e.target.value)}
                            />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs">Текст правила / ответа</Label>
                            <Textarea
                                required
                                rows={4}
                                placeholder="Опишите правило максимально подробно"
                                value={newRuleContent}
                                onChange={(e) => setNewRuleContent(e.target.value)}
                            />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs">Ключевые слова-триггеры (через запятую)</Label>
                            <Input
                                placeholder="гарантия, брак, возврат, чек"
                                value={newRuleKeywords}
                                onChange={(e) => setNewRuleKeywords(e.target.value)}
                            />
                        </div>
                        <DialogFooter className="pt-2">
                            <Button type="button" variant="ghost" onClick={() => setIsAddRuleOpen(false)}>
                                {tCommon('cancel')}
                            </Button>
                            <Button type="submit">Сохранить правило</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
