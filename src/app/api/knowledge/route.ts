import { knowledgeSchema } from '@/lib/schemas';
import { endpoint,identity,jsonBody,store } from '@/server/http';
export const runtime='nodejs';
export const GET=endpoint(async()=>({entries:await store.entries(await identity())}));
export const POST=endpoint(async request=>{
  const actor=await identity(); const input=await jsonBody(request,knowledgeSchema);
  await store.rateLimit(`write:${actor.organizationId}`,300,900);
  return {id:await store.saveEntry(actor,input)};
},201);
