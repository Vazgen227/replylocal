'use client';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useLocale,useTranslations} from 'next-intl';
import {LayoutDashboard,Inbox,CalendarDays,BookOpen,Plug,BarChart3,Settings,Home} from 'lucide-react';
import {BrandLink} from '@/components/brand';
const links=[['dashboard',LayoutDashboard],['inbox',Inbox],['appointments',CalendarDays],['knowledge',BookOpen],['integrations',Plug],['analytics',BarChart3],['settings',Settings]] as const;
export function Sidebar() {
  const locale=useLocale(),path=usePathname(),t=useTranslations('nav'),b=useTranslations('backend');
  return <aside className="flex w-16 md:w-64 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground">
    <BrandLink href={`/${locale}/dashboard`} compact className="h-16 shrink-0 justify-center border-b md:justify-start md:px-5"/>
    <nav className="flex-1 space-y-1 overflow-y-auto p-2 md:p-3">{links.map(([key,Icon])=>{
      const active=path.startsWith(`/${locale}/${key}`);
      return <Link key={key} title={t(key)} aria-label={t(key)} aria-current={active?'page':undefined} href={`/${locale}/${key}`}
        className={`flex min-h-11 items-center justify-center gap-3 rounded-xl px-3 text-sm font-semibold transition-colors duration-150 md:justify-start ${active?'bg-sidebar-accent text-primary':'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
        <Icon className="size-[1.125rem] shrink-0" aria-hidden="true"/><span className="hidden md:inline">{t(key)}</span></Link>;
    })}</nav>
    <div className="border-t p-2 md:p-4"><p className="mb-3 hidden text-xs text-muted-foreground md:block">{b('pilot')}</p><Link href={`/${locale}`} title={t('landing')} className="flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:justify-start"><Home className="size-4" aria-hidden="true"/><span className="hidden md:inline">{t('landing')}</span></Link></div>
  </aside>;
}
