'use client';
import { createContext,useCallback,useContext,useEffect,useState } from 'react';
import { useLocale,useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import type { Workspace } from '@/lib/schemas';
import { api,ApiError } from '@/lib/api-client';
import { Button } from '@/components/ui/button';

const Context=createContext<{data:Workspace;reload:()=>Promise<Workspace>}|null>(null);
export function WorkspaceProvider({children}:{children:React.ReactNode}) {
  const [data,setData]=useState<Workspace|null>(null); const [error,setError]=useState('');
  const locale=useLocale(); const router=useRouter(); const t=useTranslations('backend');
  const reload=useCallback(async()=>{
    try {const value=await api<Workspace>('/api/workspace');setData(value);setError('');return value;}
    catch(error) {
      if(error instanceof ApiError && error.code==='UNAUTHORIZED') {setData(null);router.replace(`/${locale}/login`);}
      else setError(error instanceof ApiError?error.code:'SERVER_ERROR');
      throw error;
    }
  },[locale,router]);
  useEffect(()=>{
    let active=true;
    api<Workspace>('/api/workspace').then(value=>{if(active){setData(value);setError('');}}).catch(error=>{
      if(!active)return;
      if(error instanceof ApiError && error.code==='UNAUTHORIZED') router.replace(`/${locale}/login`);
      else setError(error instanceof ApiError?error.code:'SERVER_ERROR');
    });
    return ()=>{active=false;};
  },[locale,router]);
  if(error) return <div className="m-auto max-w-lg p-6 space-y-4" role="alert"><p>{t.has(error)?t(error):t('SERVER_ERROR')}</p><Button onClick={()=>void reload().catch(()=>{})}>{t('retry')}</Button></div>;
  if(!data) return <p className="m-auto p-6" role="status">{t('loading')}</p>;
  return <Context.Provider value={{data,reload}}>{children}</Context.Provider>;
}
export function useWorkspace() {
  const value=useContext(Context); if(!value) throw new Error('WorkspaceProvider required'); return value;
}
