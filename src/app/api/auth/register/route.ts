import { registerSchema } from '@/lib/schemas';
import { endpoint,jsonBody,publicLimit,setSession,store } from '@/server/http';
import { AppError } from '@/server/errors';
export const runtime='nodejs';
export const POST=endpoint(async request=>{
  const input=await jsonBody(request,registerSchema);
  if(process.env.ALLOW_SIGNUP!=='true') throw new AppError(403,'SIGNUP_CLOSED');
  await publicLimit('register',input.email,5,30);
  await setSession(await store.register(input));
  return {ok:true};
},201);
