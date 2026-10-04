'use client';
import {useTranslations} from 'next-intl';
import {Card,CardContent,CardHeader,CardTitle} from '@/components/ui/card';
import {Badge} from '@/components/ui/badge';
export default function Integrations(){const t=useTranslations('backend');return <div className="max-w-6xl mx-auto space-y-6"><h1 className="text-3xl font-bold">{t('integrations')}</h1><p className="text-muted-foreground max-w-3xl">{t('integrationPending')}</p><div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{['Telegram','WhatsApp','Instagram','Rozetka','Prom','Amazon','Shopify','Website chat'].map(name=><Card key={name}><CardHeader><CardTitle>{name}</CardTitle></CardHeader><CardContent><Badge variant="outline">{t('notConnected')}</Badge></CardContent></Card>)}</div></div>;}
