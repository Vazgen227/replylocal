import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { WorkspaceProvider } from '@/components/workspace-provider';
import { COOKIE, store } from '@/server/http';
export const dynamic = 'force-dynamic';
export default async function DashboardLayout({children,params}:{children:React.ReactNode;params:Promise<{locale:string}>}) {
  const {locale}=await params;
  const token=(await cookies()).get(COOKIE)?.value;
  if(!token) redirect(`/${locale}/login`);
  const actor=await store.identity(token);
  if(!actor) redirect(`/${locale}/login`);
  return <WorkspaceProvider><div className="flex h-dvh overflow-hidden"><Sidebar /><div className="flex min-w-0 flex-1 flex-col overflow-hidden"><Header /><main className="flex-1 overflow-y-auto bg-muted/30 p-4 md:p-6">{children}</main></div></div></WorkspaceProvider>;
}
