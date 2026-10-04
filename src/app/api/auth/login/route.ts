import { loginSchema } from '@/lib/schemas';
import { endpoint,jsonBody,publicLimit,setSession,store } from '@/server/http';
export const runtime='nodejs';
export const POST=endpoint(async request=>{
  const input=await jsonBody(request,loginSchema);
  await publicLimit('login',input.email,10,120);
  await setSession(await store.login(input.email,input.password));
  return {ok:true};
});
