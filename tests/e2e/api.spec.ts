import {test,expect} from '@playwright/test';
const origin='http://127.0.0.1:3100';
test('HTTP rejects malformed, cross-origin and unauthorized mutations',async({request})=>{
 const result=await request.post('/api/auth/register',{headers:{Origin:origin},data:{name:'Bad',companyName:'Bad',email:'bad@example.test',password:'short'}});expect(result.status()).toBe(400);expect((await result.json()).fields).toContain('password');
 expect((await request.post('/api/leads',{headers:{Origin:origin,'Content-Type':'text/plain'},data:'bad'})).status()).toBe(415);
 expect((await request.post('/api/leads',{headers:{Origin:origin,'Content-Type':'application/json'},data:'{'})).status()).toBe(400);
 expect((await request.post('/api/leads',{headers:{Origin:origin},data:{name:'Big',content:'a'.repeat(66000)}})).status()).toBe(413);
 expect((await request.post('/api/auth/logout',{headers:{Origin:'https://elsewhere.example'}})).status()).toBe(403);
 expect((await request.post('/api/knowledge',{headers:{Origin:origin},data:{}})).status()).toBe(401);
 expect((await request.patch('/api/settings',{headers:{Origin:origin},data:{}})).status()).toBe(401);
 const response=await request.get('/api/workspace');expect(response.status()).toBe(401);expect(response.headers()['cache-control']).toBe('no-store');
});
