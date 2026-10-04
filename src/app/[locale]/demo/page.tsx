import Link from 'next/link';
import {getTranslations} from 'next-intl/server';
import {InboxShell} from '@/components/inbox/inbox-shell';
import {mockConversations} from '@/lib/mocks/inbox';
export default async function Demo({params}:{params:Promise<{locale:string}>}) {
 const {locale}=await params;const t=await getTranslations('backend');
 return <main className="p-3 md:p-6"><div className="mb-4 flex flex-wrap gap-3 items-center justify-between"><p className="max-w-3xl text-sm text-muted-foreground">{t('demoNotice')}</p><Link className="underline text-sm" href={`/${locale}`}>ReplyLocal</Link></div><InboxShell conversations={mockConversations.map(c=>({...c,ai:['waiting_for_human','human_handling'].includes(c.status)?{status:'disabled' as const,sources:[]}:c.ai}))}/></main>;
}
