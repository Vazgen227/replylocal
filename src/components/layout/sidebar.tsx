'use client';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useLocale,useTranslations} from 'next-intl';
import {LayoutDashboard,Inbox,BookOpen,Plug,BarChart3,Settings,Home} from 'lucide-react';
const links=[['dashboard',LayoutDashboard],['inbox',Inbox],['knowledge',BookOpen],['integrations',Plug],['analytics',BarChart3],['settings',Settings]] as const;
export function Sidebar() {
  const locale=useLocale(),path=usePathname(),t=useTranslations('nav'),b=useTranslations('backend');
  return <aside className="flex w-14 md:w-60 shrink-0 flex-col border-r bg-background">
    <Link href={`/${locale}/dashboard`} className="flex h-16 shrink-0 items-center justify-center md:justify-start gap-2 md:px-5 font-bold"><span className="bg-primary text-primary-foreground rounded-lg p-2 text-xs">RL</span><span className="hidden md:inline">ReplyLocal</span></Link>
    <nav className="flex-1 space-y-1 p-2">{links.map(([key,Icon])=><Link key={key} title={t(key)} aria-label={t(key)} href={`/${locale}/${key}`} className={`flex items-center justify-center md:justify-start gap-3 rounded-lg p-2.5 text-sm ${path.startsWith(`/${locale}/${key}`)?'bg-primary/10 font-semibold':'text-muted-foreground hover:bg-muted'}`}><Icon className="size-4 shrink-0"/><span className="hidden md:inline">{t(key)}</span></Link>)}</nav>
    <div className="border-t p-2 md:p-4"><p className="hidden md:block text-xs text-muted-foreground mb-3">{b('pilot')}</p><Link href={`/${locale}`} title={t('landing')} className="flex items-center justify-center md:justify-start gap-2 text-xs"><Home className="size-4"/><span className="hidden md:inline">{t('landing')}</span></Link></div>
  </aside>;
}
