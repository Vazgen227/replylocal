import { z } from 'zod';
import { knowledgeUpdateSchema } from '@/lib/schemas';
import { endpoint,identity,jsonBody,store } from '@/server/http';
export const runtime='nodejs';
type Context={params:Promise<{id:string}>};
export async function PATCH(request:Request,context:Context) {
  return endpoint(async req=>{
    const actor=await identity(); const id=z.uuid().parse((await context.params).id);
    const {version,...input}=await jsonBody(req,knowledgeUpdateSchema);
    await store.rateLimit(`write:${actor.organizationId}`,300,900);
    await store.saveEntry(actor,input,id,version); return {ok:true};
  })(request);
}
export async function DELETE(request:Request,context:Context) {
  return endpoint(async req=>{
    const actor=await identity(); const id=z.uuid().parse((await context.params).id);
    const input=await jsonBody(req,z.object({version:z.number().int().positive()}).strict());
    await store.rateLimit(`write:${actor.organizationId}`,300,900);
    await store.deleteEntry(actor,id,input.version); return {ok:true};
  })(request);
}
