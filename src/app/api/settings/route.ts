import { settingsSchema } from '@/lib/schemas';
import { endpoint,identity,jsonBody,store } from '@/server/http';
export const runtime='nodejs';
export const PATCH=endpoint(async request=>{
  const actor=await identity(); const input=await jsonBody(request,settingsSchema);
  await store.rateLimit(`write:${actor.organizationId}`,300,900);
  await store.saveSettings(actor,input); return {ok:true};
});
