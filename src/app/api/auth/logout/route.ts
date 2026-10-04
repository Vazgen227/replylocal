import { cookies } from 'next/headers';
import { COOKIE,checkOrigin,clearSession,endpoint,store } from '@/server/http';
export const runtime='nodejs';
export const POST=endpoint(async request=>{
  checkOrigin(request);
  const token=(await cookies()).get(COOKIE)?.value;
  if(token) await store.logout(token);
  await clearSession(); return {ok:true};
});
