import { endpoint,identity,store } from '@/server/http';
export const runtime='nodejs';
export const GET=endpoint(async()=>store.workspace(await identity()));
