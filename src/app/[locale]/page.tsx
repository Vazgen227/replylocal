'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import {
    Bot,
    Check,
    CheckCircle2,
    Send,
    ShoppingBag,
    Store,
    Globe,
    Zap,
    Shield,
    Users,
    Sparkles,
    ArrowRight,
    Calculator,
    Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

export default function LandingPage() {
    const locale = useLocale();
    const t = useTranslations('landing');
    const tNav = useTranslations('nav');
    const tCommon = useTranslations('common');

    // Calculator State
    const [inquiries, setInquiries] = useState<number>(450);
    const [avgCheck, setAvgCheck] = useState<number>(1200);
    const [conversionRate, setConversionRate] = useState<number>(18);

    // Lost leads formula: ~35% of potential clients abandon when response is delayed >10 min
    const estimatedLostLeads = Math.round((inquiries * (conversionRate / 100)) * 0.35);
    const estimatedMonthlyRecovered = Math.round(estimatedLostLeads * avgCheck);
    const roiMultiplier = Math.round((estimatedMonthlyRecovered / (49 * 40)) * 10) / 10;

    // Fake Door Modal State
    const [isBetaModalOpen, setIsBetaModalOpen] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState<string>('Профі ($49)');
    const [leadName, setLeadName] = useState('');
    const [leadEmail, setLeadEmail] = useState('');
    const [leadPhone, setLeadPhone] = useState('');
    const [leadBizType, setLeadBizType] = useState('');
    const [isSubmitted, setIsSubmitted] = useState(false);

    function handleOpenBetaModal(planName: string) {
        setSelectedPlan(planName);
        setIsSubmitted(false);
        setIsBetaModalOpen(true);
    }

    function handleBetaSubmit(e: React.FormEvent) {
        e.preventDefault();
        setIsSubmitted(true);
    }

    function handleScrollTo(e: React.MouseEvent<HTMLAnchorElement>, id: string) {
        e.preventDefault();
        const element = document.getElementById(id);
        if (element) {
            const headerOffset = 80;
            const elementPosition = element.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth',
            });
            window.history.pushState(null, '', `#${id}`);
        }
    }

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary/20">
            {/* Top Navigation */}
            <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md">
                <div className="container mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
                    <Link href={`/${locale}`} className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-base shadow-sm">
                            RL
                        </div>
                        <span className="text-xl font-bold tracking-tight">ReplyLocal</span>
                    </Link>

                    <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
                        <a
                            href="#features"
                            onClick={(e) => handleScrollTo(e, 'features')}
                            className="hover:text-foreground transition-colors cursor-pointer"
                        >
                            {tNav('features')}
                        </a>
                        <a
                            href="#calculator"
                            onClick={(e) => handleScrollTo(e, 'calculator')}
                            className="hover:text-foreground transition-colors cursor-pointer"
                        >
                            {tNav('calculator')}
                        </a>
                        <a
                            href="#audiences"
                            onClick={(e) => handleScrollTo(e, 'audiences')}
                            className="hover:text-foreground transition-colors cursor-pointer"
                        >
                            {tNav('audiences')}
                        </a>
                        <a
                            href="#pricing"
                            onClick={(e) => handleScrollTo(e, 'pricing')}
                            className="hover:text-foreground transition-colors cursor-pointer"
                        >
                            {tNav('pricing')}
                        </a>
                    </nav>

                    <div className="flex items-center gap-3">
                        {/* Language Switcher */}
                        <div className="flex items-center rounded-lg border bg-muted/40 p-0.5 text-xs font-medium">
                            <Link
                                href="/uk"
                                className={`px-2 py-1 rounded-md transition-colors ${
                                    locale === 'uk' ? 'bg-background text-foreground shadow-xs font-semibold' : 'text-muted-foreground'
                                }`}
                            >
                                UK
                            </Link>
                            <Link
                                href="/ru"
                                className={`px-2 py-1 rounded-md transition-colors ${
                                    locale === 'ru' ? 'bg-background text-foreground shadow-xs font-semibold' : 'text-muted-foreground'
                                }`}
                            >
                                RU
                            </Link>
                            <Link
                                href="/en"
                                className={`px-2 py-1 rounded-md transition-colors ${
                                    locale === 'en' ? 'bg-background text-foreground shadow-xs font-semibold' : 'text-muted-foreground'
                                }`}
                            >
                                EN
                            </Link>
                        </div>

                        <Link href={`/${locale}/dashboard`}>
                            <Button variant="outline" size="sm" className="hidden sm:inline-flex">
                                {tNav('demoDashboard')}
                            </Button>
                        </Link>

                        <Button size="sm" onClick={() => handleOpenBetaModal(t('planStart'))}>
                            {t('ctaPrimary')}
                        </Button>
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <section className="relative overflow-hidden pt-16 pb-20 md:pt-24 md:pb-28">
                <div className="container mx-auto max-w-6xl px-4 sm:px-6">
                    <div className="flex flex-col items-center text-center">
                        <div className="inline-flex items-center gap-2 rounded-full border bg-muted/60 px-4 py-1.5 text-xs font-semibold text-primary mb-6 shadow-xs animate-fade-in">
                            <Sparkles className="h-3.5 w-3.5" />
                            <span>{t('badge')}</span>
                        </div>

                        <h1 className="max-w-4xl text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl leading-tight sm:leading-none">
                            {t('heroTitle')}
                        </h1>

                        <p className="mt-6 max-w-2xl text-lg sm:text-xl text-muted-foreground leading-relaxed">
                            {t('heroSubtitle')}
                        </p>

                        <div className="mt-8 flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                            <Button
                                size="lg"
                                className="h-12 px-8 text-base shadow-md gap-2"
                                onClick={() => handleOpenBetaModal(t('planPro'))}
                            >
                                <span>{t('ctaPrimary')}</span>
                                <ArrowRight className="h-4 w-4" />
                            </Button>

                            <Link href={`/${locale}/dashboard`}>
                                <Button size="lg" variant="outline" className="h-12 px-8 text-base w-full sm:w-auto">
                                    {t('ctaSecondary')}
                                </Button>
                            </Link>
                        </div>

                        <p className="mt-4 text-xs text-muted-foreground">
                            {t('trustedBy')}
                        </p>

                        {/* Interactive Hero Demo Preview */}
                        <div className="mt-14 w-full max-w-4xl rounded-2xl border bg-card/60 p-4 sm:p-6 shadow-xl backdrop-blur-xs">
                            <div className="flex items-center justify-between border-b pb-4 mb-4 text-left">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-3 gap-1.5">
                                        <div className="h-3 w-3 rounded-full bg-red-400" />
                                        <div className="h-3 w-3 rounded-full bg-amber-400" />
                                        <div className="h-3 w-3 rounded-full bg-emerald-400" />
                                    </div>
                                    <span className="text-xs font-mono text-muted-foreground">
                                        live-ai-response-stream • 4.2s SLA
                                    </span>
                                </div>
                                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
                                    {t('demoOnlineBadge')}
                                </Badge>
                            </div>

                            <div className="grid md:grid-cols-2 gap-4 text-left">
                                <div className="rounded-xl bg-muted/40 p-4 border">
                                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                                        <span className="font-semibold text-foreground flex items-center gap-1.5">
                                            <Send className="h-3.5 w-3.5 text-sky-500" />
                                            {t('demoCustomerLabel')}
                                        </span>
                                        <span>{t('demoCustomerTime')}</span>
                                    </div>
                                    <p className="text-sm font-medium">
                                        {t('demoCustomerMsg')}
                                    </p>
                                </div>

                                <div className="rounded-xl bg-primary/5 p-4 border border-primary/20 relative overflow-hidden">
                                    <div className="flex items-center justify-between text-xs text-primary mb-2">
                                        <span className="font-semibold flex items-center gap-1.5">
                                            <Bot className="h-3.5 w-3.5" />
                                            {t('demoAiLabel')}
                                        </span>
                                        <Badge className="bg-violet-100 text-violet-700 border-violet-200 text-[10px] h-4">
                                            {t('demoAiConfidence')}
                                        </Badge>
                                    </div>
                                    <p className="text-sm leading-relaxed text-foreground">
                                        {t('demoAiMsg')}
                                    </p>
                                    <div className="mt-2.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                                        <span className="text-emerald-600 font-medium">{t('demoPriceList')}</span>
                                        <span>•</span>
                                        <span className="text-emerald-600 font-medium">{t('demoMasterSchedule')}</span>
                                        <span>•</span>
                                        <span>{t('demoTarget')}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Target Audiences Section */}
            <section id="audiences" className="py-16 bg-muted/30 border-y scroll-mt-20">
                <div className="container mx-auto max-w-6xl px-4 sm:px-6">
                    <div className="text-center max-w-3xl mx-auto mb-12">
                        <h2 className="text-3xl font-bold tracking-tight">
                            {t('audiencesTitle')}
                        </h2>
                        <p className="mt-3 text-muted-foreground">
                            {t('audiencesSubtitle')}
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-6">
                        <Card className="bg-background shadow-xs hover:shadow-md transition-shadow">
                            <CardHeader>
                                <div className="h-10 w-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center mb-3">
                                    <Store className="h-5 w-5" />
                                </div>
                                <CardTitle className="text-lg">{t('audLocalTitle')}</CardTitle>
                                <CardDescription>{t('audLocalDesc')}</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-2 text-sm text-muted-foreground">
                                <p>{t('audLocalPain')}</p>
                                <p>{t('audLocalSolution')}</p>
                            </CardContent>
                            <CardFooter>
                                <Badge variant="secondary" className="text-xs">{t('audLocalChannels')}</Badge>
                            </CardFooter>
                        </Card>

                        <Card className="bg-background shadow-xs hover:shadow-md transition-shadow border-primary/30">
                            <CardHeader>
                                <div className="h-10 w-10 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center mb-3">
                                    <ShoppingBag className="h-5 w-5" />
                                </div>
                                <CardTitle className="text-lg">{t('audMarketplacesTitle')}</CardTitle>
                                <CardDescription>{t('audMarketplacesDesc')}</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-2 text-sm text-muted-foreground">
                                <p>{t('audMarketplacesPain')}</p>
                                <p>{t('audMarketplacesSolution')}</p>
                            </CardContent>
                            <CardFooter>
                                <Badge variant="secondary" className="text-xs">{t('audMarketplacesChannels')}</Badge>
                            </CardFooter>
                        </Card>

                        <Card className="bg-background shadow-xs hover:shadow-md transition-shadow">
                            <CardHeader>
                                <div className="h-10 w-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-3">
                                    <Users className="h-5 w-5" />
                                </div>
                                <CardTitle className="text-lg">{t('audAgenciesTitle')}</CardTitle>
                                <CardDescription>{t('audAgenciesDesc')}</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-2 text-sm text-muted-foreground">
                                <p>{t('audAgenciesPain')}</p>
                                <p>{t('audAgenciesSolution')}</p>
                            </CardContent>
                            <CardFooter>
                                <Badge variant="secondary" className="text-xs">{t('audAgenciesChannels')}</Badge>
                            </CardFooter>
                        </Card>
                    </div>
                </div>
            </section>

            {/* Interactive Leaky Funnel Calculator */}
            <section id="calculator" className="py-20 scroll-mt-20">
                <div className="container mx-auto max-w-5xl px-4 sm:px-6">
                    <div className="rounded-3xl border bg-card p-6 sm:p-10 shadow-lg">
                        <div className="text-center max-w-2xl mx-auto mb-10">
                            <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary mb-3">
                                <Calculator className="h-3.5 w-3.5" />
                                <span>{t('calculatorTitle')}</span>
                            </div>
                            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
                                {t('calculatorSubtitle')}
                            </h2>
                        </div>

                        <div className="grid md:grid-cols-2 gap-8 items-center">
                            <div className="space-y-6">
                                <div>
                                    <div className="flex justify-between text-sm font-semibold mb-2">
                                        <Label>{t('calcInquiriesLabel')}</Label>
                                        <span className="text-primary font-mono">{t('calcInquiriesCount', { count: inquiries })}</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="50"
                                        max="3000"
                                        step="50"
                                        value={inquiries}
                                        onChange={(e) => setInquiries(Number(e.target.value))}
                                        className="w-full accent-primary cursor-pointer"
                                    />
                                </div>

                                <div>
                                    <div className="flex justify-between text-sm font-semibold mb-2">
                                        <Label>{t('calcAvgCheckLabel')}</Label>
                                        <span className="text-primary font-mono">{avgCheck.toLocaleString()} {tCommon('currency')}</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="200"
                                        max="10000"
                                        step="100"
                                        value={avgCheck}
                                        onChange={(e) => setAvgCheck(Number(e.target.value))}
                                        className="w-full accent-primary cursor-pointer"
                                    />
                                </div>

                                <div>
                                    <div className="flex justify-between text-sm font-semibold mb-2">
                                        <Label>{t('calcCurrentConversionLabel')}</Label>
                                        <span className="text-primary font-mono">{conversionRate}%</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="5"
                                        max="50"
                                        step="1"
                                        value={conversionRate}
                                        onChange={(e) => setConversionRate(Number(e.target.value))}
                                        className="w-full accent-primary cursor-pointer"
                                    />
                                </div>

                                <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3.5 text-xs text-amber-800 dark:text-amber-300">
                                    {t('calcFact')}
                                </div>
                            </div>

                            <div className="rounded-2xl bg-muted/50 p-6 border flex flex-col justify-between h-full">
                                <div>
                                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                        {t('calcRecoveredLabel')}
                                    </p>
                                    <p className="text-3xl sm:text-4xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-2 font-mono">
                                        +{estimatedMonthlyRecovered.toLocaleString()} {tCommon('currency')}
                                        <span className="text-xs font-normal text-muted-foreground">{t('calcMonthSuffix')}</span>
                                    </p>

                                    <div className="mt-6 space-y-3 text-sm">
                                        <div className="flex justify-between py-1.5 border-b">
                                            <span className="text-muted-foreground">{t('calcRetainedLeadsLabel')}</span>
                                            <span className="font-semibold text-foreground">{t('calcRetainedLeadsValue', { count: estimatedLostLeads })}</span>
                                        </div>
                                        <div className="flex justify-between py-1.5 border-b">
                                            <span className="text-muted-foreground">{t('calcRoiProLabel')}</span>
                                            <span className="font-bold text-primary font-mono">{roiMultiplier}x ROI</span>
                                        </div>
                                    </div>
                                </div>

                                <Button
                                    className="mt-8 w-full h-11"
                                    onClick={() => handleOpenBetaModal(t('planPro'))}
                                >
                                    {t('calcCtaButton')}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features & Architecture Section */}
            <section id="features" className="py-16 bg-muted/20 border-t scroll-mt-20">
                <div className="container mx-auto max-w-6xl px-4 sm:px-6">
                    <div className="text-center max-w-3xl mx-auto mb-14">
                        <h2 className="text-3xl font-bold tracking-tight">
                            {t('featuresTitle')}
                        </h2>
                        <p className="mt-3 text-muted-foreground">
                            {t('featuresSubtitle')}
                        </p>
                    </div>

                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="rounded-2xl border bg-card p-6 shadow-xs">
                            <div className="h-10 w-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center mb-4">
                                <Globe className="h-5 w-5" />
                            </div>
                            <h3 className="font-semibold text-base mb-2">{t('feat1Title')}</h3>
                            <p className="text-xs text-muted-foreground leading-relaxed">{t('feat1Desc')}</p>
                        </div>

                        <div className="rounded-2xl border bg-card p-6 shadow-xs">
                            <div className="h-10 w-10 rounded-xl bg-violet-100 text-violet-600 flex items-center justify-center mb-4">
                                <Zap className="h-5 w-5" />
                            </div>
                            <h3 className="font-semibold text-base mb-2">{t('feat2Title')}</h3>
                            <p className="text-xs text-muted-foreground leading-relaxed">{t('feat2Desc')}</p>
                        </div>

                        <div className="rounded-2xl border bg-card p-6 shadow-xs">
                            <div className="h-10 w-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center mb-4">
                                <Shield className="h-5 w-5" />
                            </div>
                            <h3 className="font-semibold text-base mb-2">{t('feat3Title')}</h3>
                            <p className="text-xs text-muted-foreground leading-relaxed">{t('feat3Desc')}</p>
                        </div>

                        <div className="rounded-2xl border bg-card p-6 shadow-xs">
                            <div className="h-10 w-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4">
                                <Clock className="h-5 w-5" />
                            </div>
                            <h3 className="font-semibold text-base mb-2">{t('feat4Title')}</h3>
                            <p className="text-xs text-muted-foreground leading-relaxed">{t('feat4Desc')}</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Pricing Section */}
            <section id="pricing" className="py-20 scroll-mt-20">
                <div className="container mx-auto max-w-6xl px-4 sm:px-6">
                    <div className="text-center max-w-3xl mx-auto mb-14">
                        <h2 className="text-3xl font-bold tracking-tight">
                            {t('pricingTitle')}
                        </h2>
                        <p className="mt-3 text-muted-foreground">
                            {t('pricingSubtitle')}
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8 items-stretch">
                        {/* Start Plan */}
                        <Card className="flex flex-col justify-between bg-card shadow-xs">
                            <CardHeader>
                                <CardTitle className="text-xl">{t('planStart')}</CardTitle>
                                <CardDescription>{t('planStartDesc')}</CardDescription>
                                <div className="mt-4 flex items-baseline gap-1">
                                    <span className="text-4xl font-extrabold">{t('planStartPrice')}</span>
                                    <span className="text-xs text-muted-foreground">{t('planStartPeriod')}</span>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-3 text-sm">
                                <div className="flex items-center gap-2">
                                    <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                                    <span>{t('planStartF1')}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                                    <span>{t('planStartF2')}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                                    <span>{t('planStartF3')}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                                    <span>{t('planStartF4')}</span>
                                </div>
                            </CardContent>
                            <CardFooter>
                                <Button
                                    variant="outline"
                                    className="w-full"
                                    onClick={() => handleOpenBetaModal(t('planStart'))}
                                >
                                    {t('selectPlanStart')}
                                </Button>
                            </CardFooter>
                        </Card>

                        {/* Pro Plan */}
                        <Card className="flex flex-col justify-between bg-card shadow-lg border-2 border-primary relative">
                            <CardHeader>
                                <div className="flex items-center justify-between gap-2">
                                    <CardTitle className="text-xl">{t('planPro')}</CardTitle>
                                    <span className="rounded-full bg-primary px-3 py-0.5 text-xs font-semibold text-primary-foreground shadow-xs">
                                        {t('planProBadge')}
                                    </span>
                                </div>
                                <CardDescription className="mt-1">{t('planProDesc')}</CardDescription>
                                <div className="mt-4 flex items-baseline gap-1">
                                    <span className="text-4xl font-extrabold">{t('planProPrice')}</span>
                                    <span className="text-xs text-muted-foreground">{t('planProPeriod')}</span>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-3 text-sm">
                                <div className="flex items-center gap-2">
                                    <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                                    <span>{t('planProF1')}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                                    <span>{t('planProF2')}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                                    <span>{t('planProF3')}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                                    <span>{t('planProF4')}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                                    <span>{t('planProF5')}</span>
                                </div>
                            </CardContent>
                            <CardFooter>
                                <Button
                                    className="w-full shadow-md"
                                    onClick={() => handleOpenBetaModal(t('planPro'))}
                                >
                                    {t('selectPlanPro')}
                                </Button>
                            </CardFooter>
                        </Card>

                        {/* Enterprise Plan */}
                        <Card className="flex flex-col justify-between bg-card shadow-xs">
                            <CardHeader>
                                <CardTitle className="text-xl">{t('planEnterprise')}</CardTitle>
                                <CardDescription>{t('planEnterpriseDesc')}</CardDescription>
                                <div className="mt-4 flex items-baseline gap-1">
                                    <span className="text-4xl font-extrabold">{t('planEnterprisePrice')}</span>
                                    <span className="text-xs text-muted-foreground">/{t('planEnterprisePeriod')}</span>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-3 text-sm">
                                <div className="flex items-center gap-2">
                                    <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                                    <span>{t('planEnterpriseF1')}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                                    <span>{t('planEnterpriseF2')}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                                    <span>{t('planEnterpriseF3')}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                                    <span>{t('planEnterpriseF4')}</span>
                                </div>
                            </CardContent>
                            <CardFooter>
                                <Button
                                    variant="outline"
                                    className="w-full"
                                    onClick={() => handleOpenBetaModal(t('planEnterprise'))}
                                >
                                    {t('selectPlanEnterprise')}
                                </Button>
                            </CardFooter>
                        </Card>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="mt-auto border-t bg-muted/40 py-10">
                <div className="container mx-auto max-w-6xl px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold text-xs">
                            RL
                        </div>
                        <span className="font-semibold text-foreground">ReplyLocal</span>
                        <span>{t('footerCopy')}</span>
                    </div>

                    <div className="flex items-center gap-6">
                        <Link href={`/${locale}/dashboard`} className="hover:underline">
                            {tNav('dashboard')}
                        </Link>
                        <Link href={`/${locale}/inbox`} className="hover:underline">
                            {tNav('inbox')}
                        </Link>
                        <Link href={`/${locale}/integrations`} className="hover:underline">
                            {tNav('integrations')}
                        </Link>
                    </div>
                </div>
            </footer>

            {/* Fake Door Lead Capture Modal */}
            <Dialog open={isBetaModalOpen} onOpenChange={setIsBetaModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-xl">{t('modalTitle')}</DialogTitle>
                        <DialogDescription>{t('modalSubtitle')}</DialogDescription>
                    </DialogHeader>

                    {!isSubmitted ? (
                        <form onSubmit={handleBetaSubmit} className="space-y-4 pt-2">
                            <div className="rounded-lg bg-primary/10 p-3 text-xs font-medium text-primary">
                                {t('selectedPlanBadge', { plan: selectedPlan })}
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="leadName">{t('formName')}</Label>
                                <Input
                                    id="leadName"
                                    required
                                    placeholder={t('modalNamePlaceholder')}
                                    value={leadName}
                                    onChange={(e) => setLeadName(e.target.value)}
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="leadEmail">{t('formEmail')}</Label>
                                <Input
                                    id="leadEmail"
                                    type="email"
                                    required
                                    placeholder="alex@myshop.com"
                                    value={leadEmail}
                                    onChange={(e) => setLeadEmail(e.target.value)}
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="leadPhone">{t('formPhone')}</Label>
                                <Input
                                    id="leadPhone"
                                    required
                                    placeholder="+380... / @username"
                                    value={leadPhone}
                                    onChange={(e) => setLeadPhone(e.target.value)}
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="leadBizType">{t('formBusinessType')}</Label>
                                <Input
                                    id="leadBizType"
                                    placeholder={t('modalBizPlaceholder')}
                                    value={leadBizType}
                                    onChange={(e) => setLeadBizType(e.target.value)}
                                />
                            </div>

                            <Button type="submit" className="w-full mt-4 h-11 text-base">
                                {t('formSubmit')}
                            </Button>
                        </form>
                    ) : (
                        <div className="py-6 text-center space-y-4">
                            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                                <CheckCircle2 className="h-8 w-8" />
                            </div>
                            <h3 className="text-lg font-bold">{t('modalSuccessTitle')}</h3>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                {t('modalSuccessDesc')}
                            </p>
                            <Button
                                className="mt-4 w-full"
                                variant="outline"
                                onClick={() => setIsBetaModalOpen(false)}
                            >
                                {tCommon('close')}
                            </Button>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
