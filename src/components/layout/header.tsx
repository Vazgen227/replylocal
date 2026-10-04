'use client';
import {useState} from 'react';
import Link from 'next/link';
import {usePathname,useRouter} from 'next/navigation';
import {useLocale,useTranslations} from 'next-intl';
import {Moon,Sun,LogOut} from 'lucide-react';
import {useTheme} from 'next-themes';
import {Button} from '@/components/ui/button';
import {useWorkspace} from '@/components/workspace-provider';
import {api,ApiError} from '@/lib/api-client';
import {toast} from 'sonner';
export function Header() {
  const {data}=useWorkspace(); const t=useTranslations('backend');
  const locale=useLocale(),path=usePathname(),router=useRouter();
  const {resolvedTheme,setTheme}=useTheme(); const [busy,setBusy]=useState(false);
  async function logout() {
    setBusy(true);
    try {await api('/api/auth/logout','POST');router.replace(`/${locale}/login`);router.refresh();}
    catch(error){const code=error instanceof ApiError?error.code:'SERVER_ERROR';toast.error(t.has(code)?t(code):t('SERVER_ERROR'));}
    finally{setBusy(false);}
  }
  return <header className="flex min-h-16 shrink-0 flex-wrap items-center justify-between gap-2 border-b bg-background px-3 md:px-6 py-2">
    <div className="min-w-0"><p className="max-w-48 truncate text-sm font-semibold">{data.organization.name}</p><p className="text-xs text-muted-foreground">{data.user.name}</p></div>
    <div className="flex items-center gap-1">
      {['uk','ru','en'].map(lang=><Link key={lang} href={path.replace(/^\/(uk|ru|en)(?=\/|$)/,`/${lang}`)} className={`rounded px-2 py-1 text-xs ${locale===lang?'bg-muted font-bold':''}`}>{lang.toUpperCase()}</Link>)}
      <Button variant="ghost" size="icon" aria-label={t('theme')} onClick={()=>setTheme(resolvedTheme==='dark'?'light':'dark')}><Sun className="dark:hidden size-4"/><Moon className="hidden dark:block size-4"/></Button>
      <Button variant="ghost" size="icon" aria-label={t('logout')} title={t('logout')} disabled={busy} onClick={logout}><LogOut className="size-4"/></Button>
    </div>
  </header>;
}
