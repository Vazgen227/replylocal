'use client';
import {useTranslations} from 'next-intl';
import {Card,CardContent,CardHeader,CardTitle} from '@/components/ui/card';
export default function Analytics(){const t=useTranslations('backend');return <Card className="max-w-3xl mx-auto"><CardHeader><CardTitle>{t('analytics')}</CardTitle></CardHeader><CardContent><p className="text-muted-foreground">{t('analyticsPending')}</p></CardContent></Card>;}
