import { z } from 'zod';
import { passwordSchema } from '@/lib/schemas';
import { clearSession,endpoint,identity,jsonBody,store } from '@/server/http';
export const runtime='nodejs';
export const POST=endpoint(async request=>{
  const actor=await identity();
  const input=await jsonBody(request,z.object({currentPassword:z.string().min(1).max(128),newPassword:passwordSchema}).strict());
  await store.rateLimit(`password:${actor.userId}`,5,900);
  await store.changePassword(actor,input.currentPassword,input.newPassword);
  await clearSession(); return {ok:true};
});
