'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
    BarChart3,
    Download,
    Layers,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function AnalyticsPage() {
    const t = useTranslations('analytics');

    const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

    function handleExportCSV() {
        toast.success(t('exportSuccess'));
    }

    const funnelStages = [
        { name: t('inquiryLabel'), count: 1482, percent: 100, color: 'bg-blue-500' },
        { name: t('qualifiedLabel'), count: 1245, percent: 84, color: 'bg-violet-500' },
        { name: t('offerLabel'), count: 890, percent: 60, color: 'bg-amber-500' },
        { name: t('bookedLabel'), count: 342, percent: 23, color: 'bg-emerald-500' },
    ];

    const hourlyActivity = [
        { hour: '08:00', count: 42 },
        { hour: '10:00', count: 185 },
        { hour: '12:00', count: 240 },
        { hour: '14:00', count: 210 },
        { hour: '16:00', count: 280 },
        { hour: '18:00', count: 320 },
        { hour: '20:00', count: 145 },
        { hour: '22:00', count: 60 },
    ];

    const topTopics = [
        { topic: t('topic1'), count: 420, share: '28%' },
        { topic: t('topic2'), count: 290, share: '19%' },
        { topic: t('topic3'), count: 240, share: '16%' },
        { topic: t('topic4'), count: 180, share: '12%' },
        { topic: t('topic5'), count: 150, share: '10%' },
        { topic: t('topic6'), count: 202, share: '15%' },
    ];

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

                <div className="flex items-center gap-2.5">
                    <div className="flex items-center rounded-lg border bg-muted/40 p-0.5 text-xs font-medium">
                        <button
                            onClick={() => setTimeRange('7d')}
                            className={`px-2.5 py-1 rounded-md transition-colors ${
                                timeRange === '7d' ? 'bg-background font-semibold shadow-xs' : 'text-muted-foreground'
                            }`}
                        >
                            {t('range7d')}
                        </button>
                        <button
                            onClick={() => setTimeRange('30d')}
                            className={`px-2.5 py-1 rounded-md transition-colors ${
                                timeRange === '30d' ? 'bg-background font-semibold shadow-xs' : 'text-muted-foreground'
                            }`}
                        >
                            {t('range30d')}
                        </button>
                        <button
                            onClick={() => setTimeRange('90d')}
                            className={`px-2.5 py-1 rounded-md transition-colors ${
                                timeRange === '90d' ? 'bg-background font-semibold shadow-xs' : 'text-muted-foreground'
                            }`}
                        >
                            {t('range90d')}
                        </button>
                    </div>

                    <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-1.5">
                        <Download className="h-4 w-4" />
                        <span>{t('exportReport')}</span>
                    </Button>
                </div>
            </div>

            {/* Response Time SLA Comparison Card */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="shadow-xs bg-emerald-500/5 border-emerald-500/20">
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                                {t('aiSpeed')}
                            </CardTitle>
                            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
                                SLA 99.8%
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-1">
                        <div className="text-3xl font-extrabold text-emerald-600 font-mono">4.2 сек</div>
                        <p className="text-xs text-muted-foreground">
                            {t('aiSpeedDesc')}
                        </p>
                    </CardContent>
                </Card>

                <Card className="shadow-xs bg-muted/30">
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-semibold text-muted-foreground">
                                {t('humanSpeed')}
                            </CardTitle>
                            <Badge variant="outline" className="text-xs">
                                {t('industryBenchmark')}
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-1">
                        <div className="text-3xl font-extrabold text-muted-foreground font-mono">18.5 мин</div>
                        <p className="text-xs text-muted-foreground">
                            {t('humanSpeedDesc')}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Funnel & Conversion Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Lead Funnel */}
                <Card className="lg:col-span-2 shadow-xs">
                    <CardHeader className="pb-3 border-b">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Layers className="h-4 w-4 text-primary" />
                            <span>{t('funnelTitle')}</span>
                        </CardTitle>
                        <CardDescription className="text-xs">
                            {t('funnelSubtitle')}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-6">
                        {funnelStages.map((stage) => (
                            <div key={stage.name} className="space-y-2">
                                <div className="flex justify-between text-xs font-semibold">
                                    <span>{stage.name}</span>
                                    <div className="flex items-center gap-2 font-mono">
                                        <span>{stage.count.toLocaleString()}</span>
                                        <span className="text-muted-foreground">({stage.percent}%)</span>
                                    </div>
                                </div>
                                <div className="h-3.5 rounded-full bg-muted overflow-hidden flex items-center">
                                    <div
                                        className={`h-full ${stage.color} rounded-full transition-all`}
                                        style={{ width: `${stage.percent}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                {/* Topics Breakdown */}
                <Card className="shadow-xs flex flex-col justify-between">
                    <CardHeader className="pb-3 border-b">
                        <CardTitle className="text-base">{t('topicBreakdown')}</CardTitle>
                        <CardDescription className="text-xs">
                            {t('topicBreakdownSubtitle')}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-4 divide-y">
                        {topTopics.map((item) => (
                            <div key={item.topic} className="py-2.5 flex items-center justify-between text-xs">
                                <span className="font-medium text-foreground truncate max-w-[200px]">
                                    {item.topic}
                                </span>
                                <div className="flex items-center gap-2 font-mono shrink-0">
                                    <span>{item.count}</span>
                                    <Badge variant="secondary" className="text-[10px]">
                                        {item.share}
                                    </Badge>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                    <div className="p-3 border-t text-center text-xs text-muted-foreground bg-muted/10">
                        {t('clusteredByAi')}
                    </div>
                </Card>
            </div>

            {/* Hourly Activity Bar Chart */}
            <Card className="shadow-xs">
                <CardHeader className="pb-3 border-b">
                    <CardTitle className="text-base flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-primary" />
                        <span>{t('hourlyActivityTitle')}</span>
                    </CardTitle>
                    <CardDescription className="text-xs">
                        {t('hourlyActivityDesc')}
                    </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                    <div className="grid grid-cols-4 sm:grid-cols-8 gap-3 items-end h-48 pt-4">
                        {hourlyActivity.map((bar) => {
                            const maxVal = 320;
                            const heightPercent = Math.round((bar.count / maxVal) * 100);
                            return (
                                <div key={bar.hour} className="flex flex-col items-center gap-2 h-full justify-end">
                                    <span className="text-[10px] font-mono font-semibold text-muted-foreground">
                                        {bar.count}
                                    </span>
                                    <div
                                        className="w-full bg-primary/80 hover:bg-primary rounded-t-md transition-all shadow-xs"
                                        style={{ height: `${heightPercent}%` }}
                                    />
                                    <span className="text-[11px] font-mono text-muted-foreground">
                                        {bar.hour}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
