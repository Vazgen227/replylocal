'use client';

export class ApiError extends Error {
  constructor(public code:string,public status:number,public fields:string[]=[]) {super(code);}
}
export async function api<T= {ok:boolean}>(path:string,method='GET',body?:unknown):Promise<T> {
  const controller=new AbortController(); const timeout=setTimeout(()=>controller.abort(),20000);
  try {
    const response=await fetch(path,{method,credentials:'same-origin',cache:'no-store',signal:controller.signal,
      headers:body===undefined ? undefined : {'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
    const data=await response.json();
    if(!response.ok) throw new ApiError(data.error??'SERVER_ERROR',response.status,data.fields??[]);
    return data;
  } catch(error) {
    if(error instanceof ApiError) throw error;
    throw new ApiError('NETWORK_ERROR',0);
  } finally {clearTimeout(timeout);}
}
