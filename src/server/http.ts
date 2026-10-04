import 'server-only';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { database } from './database';
import { AppError } from './errors';
import { createStore, SESSION_SECONDS } from './store';

export const store = createStore(database);
export const COOKIE = 'replylocal_session';
export function checkOrigin(request: Request) {
  if (!process.env.APP_URL) throw new AppError(503,'NOT_CONFIGURED');
  const expected = new URL(process.env.APP_URL);
  if (process.env.NODE_ENV === 'production' && expected.protocol !== 'https:') throw new AppError(503,'NOT_CONFIGURED');
  if (request.headers.get('origin') !== expected.origin) throw new AppError(403,'ORIGIN_REJECTED');
}
export async function jsonBody<T>(request: Request, schema: z.ZodType<T>): Promise<T> {
  checkOrigin(request);
  if (request.headers.get('content-type')?.split(';')[0].trim() !== 'application/json') throw new AppError(415,'INVALID_CONTENT_TYPE');
  const reader = request.body?.getReader();
  if (!reader) throw new AppError(400,'INVALID_INPUT');
  let size=0; const chunks: Uint8Array[]=[];
  while (true) {
    const {value,done}=await reader.read(); if(done) break;
    size+=value.byteLength;
    if(size>65536) { await reader.cancel(); throw new AppError(413,'BODY_TOO_LARGE'); }
    chunks.push(value);
  }
  let data: unknown;
  try { data=JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw new AppError(400,'INVALID_INPUT'); }
  return schema.parse(data);
}
export async function identity() {
  const actor = await store.identity((await cookies()).get(COOKIE)?.value);
  if (!actor) throw new AppError(401,'UNAUTHORIZED');
  return actor;
}
export async function setSession(token: string) {
  (await cookies()).set(COOKIE,token,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:SESSION_SECONDS});
}
export async function clearSession() {
  (await cookies()).set(COOKIE,'',{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:0});
}
export function endpoint(fn: (request: Request) => Promise<unknown>, status=200) {
  return async (request: Request) => {
    try { return Response.json(await fn(request),{status,headers:{'Cache-Control':'no-store'}}); }
    catch(error) {
      if (error instanceof z.ZodError) return Response.json({error:'INVALID_INPUT',fields:[...new Set(error.issues.map(i=>i.path.join('.')))]},{status:400,headers:{'Cache-Control':'no-store'}});
      if (error instanceof AppError) return Response.json({error:error.code},{status:error.status,headers:{'Cache-Control':'no-store',...(error.status===429?{'Retry-After':'900'}:{})}});
      const incident=crypto.randomUUID();
      // Never log raw requests, SQL parameters, passwords, tokens, or database URLs.
      console.error('[api]',incident,error instanceof Error ? error.name : 'UnknownError');
      return Response.json({error:'SERVER_ERROR',incident},{status:500,headers:{'Cache-Control':'no-store'}});
    }
  };
}
export async function publicLimit(scope: string, key: string, perKey: number, global: number) {
  // Database counters work across Vercel instances. No trust in spoofable forwarded IP headers.
  await store.rateLimit(`${scope}:global`,global,900);
  await store.rateLimit(`${scope}:${key}`,perKey,900);
}
