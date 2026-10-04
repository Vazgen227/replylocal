import { leadSchema } from '@/lib/schemas';
import { endpoint,jsonBody,publicLimit,store } from '@/server/http';
export const runtime='nodejs';
export const POST=endpoint(async request=>{
  const input=await jsonBody(request,leadSchema);
  await publicLimit('lead',input.email,3,60);
  await store.lead(input); return {ok:true};
},201);
