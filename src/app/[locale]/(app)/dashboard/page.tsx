'use client';
import Link from 'next/link';
import {useLocale,useTranslations} from 'next-intl';
import {BookOpen,Users,Plug,ArrowRight} from 'lucide-react';
import {useWorkspace} from '@/components/workspace-provider';
import {Card,CardContent,CardHeader,CardTitle} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
export default function Dashboard() {
 const {data}=useWorkspace(); const t=useTranslations('backend'),locale=useLocale();
 return <div className="max-w-6xl mx-auto space-y-6"><div><p className="text-xs uppercase tracking-widest text-muted-foreground">ReplyLocal</p><h1 className="text-3xl font-bold mt-2">{data.organization.name}</h1><p className="mt-2 text-muted-foreground">{t('dashboardIntro')}</p></div>
 <div className="grid sm:grid-cols-3 gap-4">{[{label:t('knowledgeCount'),value:data.entries.length,icon:BookOpen},{label:t('teamCount'),value:data.team.length,icon:Users},{label:t('channelCount'),value:0,icon:Plug}].map(x=><Card key={x.label}><CardHeader className="flex flex-row justify-between"><CardTitle className="text-sm">{x.label}</CardTitle><x.icon className="size-4"/></CardHeader><CardContent className="text-3xl font-bold">{x.value}</CardContent></Card>)}</div>
 <Card><CardHeader><CardTitle>{t('nextSteps')}</CardTitle></CardHeader><CardContent className="space-y-5"><p className="text-sm text-muted-foreground">{t('foundationNotice')}</p><div className="grid sm:grid-cols-2 gap-3"><Button asChild variant="outline"><Link href={`/${locale}/settings`}>{t('companySettings')}<ArrowRight className="size-4"/></Link></Button><Button asChild><Link href={`/${locale}/knowledge`}>{t('addKnowledge')}<ArrowRight className="size-4"/></Link></Button></div></CardContent></Card>
 </div>;
}
