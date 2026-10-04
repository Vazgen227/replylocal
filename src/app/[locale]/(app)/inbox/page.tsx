'use client';
import {useLocale,useTranslations} from 'next-intl';
import Link from 'next/link';
import {MessageCircle} from 'lucide-react';
import {Card,CardContent,CardHeader,CardTitle} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
export default function Inbox(){const t=useTranslations('backend'),locale=useLocale();return <Card className="max-w-3xl mx-auto"><CardHeader><MessageCircle className="size-8 text-primary mb-3"/><CardTitle>{t('inboxEmpty')}</CardTitle></CardHeader><CardContent className="space-y-5"><p className="text-muted-foreground">{t('inboxPending')}</p><Button asChild variant="outline"><Link href={`/${locale}/integrations`}>{t('integrations')}</Link></Button></CardContent></Card>;}
