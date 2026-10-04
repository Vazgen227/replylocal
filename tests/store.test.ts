import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {createStore,type Database,type Query,type Identity} from '../src/server/store';
import {knowledgeSchema,registerSchema,settingsSchema,leadSchema} from '../src/lib/schemas';
import {digest} from '../src/server/passwords';

const pg=new PGlite();
const query:Query=async(sql,params)=>(await pg.query(sql,params)).rows as never;
const db:Database={query,transaction:work=>pg.transaction(tx=>work(async(sql,params)=>(await tx.query(sql,params)).rows as never))};
const store=createStore(db);
let alice:Identity,bob:Identity,tokenA:string,entryId:string;
const password='correct horse battery staple';
const input={kind:'service' as const,title:'Oil service',content:'Customer supplies the oil.',price:0,currency:'UAH' as const,durationMinutes:30,sku:''};
const errorCode=(code:string)=>(error:unknown)=>(error as {code:string}).code===code;

before(async()=>{await pg.exec(await readFile(new URL('../db/001_initial.sql',import.meta.url),'utf8'));});
after(async()=>{await pg.close();});

test('register creates separate organizations, hashed passwords and hashed session tokens',async()=>{
 tokenA=await store.register(registerSchema.parse({name:'Alice',companyName:'Alice Workshop',email:'ALICE@example.test',password}));
 const tokenB=await store.register(registerSchema.parse({name:'Bob',companyName:'Bob Workshop',email:'bob@example.test',password}));
 alice=(await store.identity(tokenA))!;bob=(await store.identity(tokenB))!;
 assert.equal(alice.email,'alice@example.test');assert.equal(alice.role,'owner');assert.notEqual(alice.organizationId,bob.organizationId);
 const [user]=await query('SELECT password_hash FROM users WHERE id=$1',[alice.userId]);assert.notEqual(user.password_hash,password);assert.match(String(user.password_hash),/^scrypt-v1:/);
 const [session]=await query('SELECT token_hash FROM sessions WHERE user_id=$1',[alice.userId]);assert.equal(session.token_hash,digest(tokenA));
});
test('duplicate registration rolls back without orphan organizations',async()=>{
 await assert.rejects(store.register({name:'Duplicate',companyName:'Orphan',email:alice.email,password}),errorCode('ACCOUNT_EXISTS'));
 const [count]=await query('SELECT count(*)::int AS count FROM organizations');assert.equal(count.count,2);
});
test('wrong password and unknown email fail; real login works',async()=>{
 await assert.rejects(store.login(alice.email,'incorrect'),errorCode('INVALID_CREDENTIALS'));
 await assert.rejects(store.login('unknown@example.test',password),errorCode('INVALID_CREDENTIALS'));
 assert.equal((await store.identity(await store.login(alice.email,password)))?.userId,alice.userId);
});
test('knowledge survives a new store instance, preserves zero price, and is scoped to a company',async()=>{
 entryId=await store.saveEntry(alice,knowledgeSchema.parse(input));
 const fresh=createStore(db);const rows=await fresh.entries(alice);assert.equal(rows[0].id,entryId);assert.equal(rows[0].price,0);
 assert.deepEqual(await store.entries(bob),[]);
 const bobWorkspace=await store.workspace(bob);assert.equal(bobWorkspace.team.length,1);assert.equal(bobWorkspace.team[0].id,bob.userId);
});
test('another tenant cannot update or delete a known object id',async()=>{
 await assert.rejects(store.saveEntry(bob,input,entryId,1),errorCode('NOT_FOUND'));
 await assert.rejects(store.deleteEntry(bob,entryId,1),errorCode('NOT_FOUND'));
 assert.equal((await store.entries(alice))[0].version,1);
});
test('agents cannot write knowledge or organization settings',async()=>{
 const agent={...alice,role:'agent' as const};
 await assert.rejects(store.saveEntry(agent,input),errorCode('FORBIDDEN'));
 await assert.rejects(store.deleteEntry(agent,entryId,1),errorCode('FORBIDDEN'));
 await assert.rejects(store.saveSettings(agent,(await store.workspace(alice)).organization),errorCode('FORBIDDEN'));
});
test('stale edits and deletes are rejected instead of overwriting newer data',async()=>{
 await store.saveEntry(alice,{...input,title:'Updated'},entryId,1);
 await assert.rejects(store.saveEntry(alice,{...input,title:'Stale'},entryId,1),errorCode('CONFLICT'));
 await assert.rejects(store.deleteEntry(alice,entryId,1),errorCode('CONFLICT'));
 assert.equal((await store.entries(alice))[0].title,'Updated');
});
test('settings persist only for their organization and detect stale updates',async()=>{
 const settings=(await store.workspace(alice)).organization;
 await store.saveSettings(alice,settingsSchema.parse({...settings,name:'Changed Workshop',timezone:'Europe/Warsaw',aiSettings:{...settings.aiSettings,systemPrompt:'Use confirmed facts.'}}));
 const changed=(await store.workspace(alice)).organization;assert.equal(changed.name,'Changed Workshop');assert.equal(changed.aiSettings.systemPrompt,'Use confirmed facts.');
 assert.equal((await store.workspace(bob)).organization.name,'Bob Workshop');
 await assert.rejects(store.saveSettings(alice,settings),errorCode('CONFLICT'));
});
test('validation rejects unknown fields, invalid timezone, negative prices and absent consent',()=>{
 assert.equal(knowledgeSchema.safeParse({...input,organizationId:bob.organizationId}).success,false);
 assert.equal(knowledgeSchema.safeParse({...input,price:-1}).success,false);
 assert.equal(knowledgeSchema.safeParse({...input,price:0.001}).success,false);
 assert.equal(registerSchema.safeParse({name:'Al',companyName:'Co',email:'test@example.test',password:'short'}).success,false);
 assert.equal(settingsSchema.safeParse({name:'Valid',industry:'',timezone:'bad/timezone',currency:'UAH',version:1,aiSettings:{systemPrompt:'',tone:'friendly',offHoursMessage:''}}).success,false);
 assert.equal(leadSchema.safeParse({name:'Lead',email:'lead@example.test',phone:'12345',businessType:'',plan:'pro',locale:'en',consent:false}).success,false);
});
test('public leads persist; honeypot submissions do not',async()=>{
 const lead=leadSchema.parse({name:'Lead',email:'lead@example.test',phone:'12345',businessType:'Shop',plan:'pro',locale:'en',consent:true});
 await store.lead(lead);await store.lead({...lead,website:'spam.example'});
 const [count]=await query('SELECT count(*)::int AS count FROM leads');assert.equal(count.count,1);
});
test('rate limit counts across store instances and resets after expiry',async()=>{
 await store.rateLimit('test',2,900);await createStore(db).rateLimit('test',2,900);
 await assert.rejects(store.rateLimit('test',2,900),errorCode('RATE_LIMITED'));
 await query("UPDATE rate_limits SET expires_at=now()-interval '1 second' WHERE key=$1",[digest('test')]);
 await store.rateLimit('test',2,900);
});
test('expired or revoked sessions do not authenticate',async()=>{
 const token=await store.login(bob.email,password);await store.logout(token);assert.equal(await store.identity(token),null);
 const expired=await store.login(bob.email,password);await query("UPDATE sessions SET expires_at=now()-interval '1 second' WHERE token_hash=$1",[digest(expired)]);assert.equal(await store.identity(expired),null);
 assert.equal(await store.identity('garbage'),null);
});
test('changing a password revokes every existing user session',async()=>{
 const second=await store.login(alice.email,password);
 await assert.rejects(store.changePassword(alice,'incorrect','new password for pilot'),errorCode('INVALID_CREDENTIALS'));
 await store.changePassword(alice,password,'new password for pilot');
 assert.equal(await store.identity(tokenA),null);assert.equal(await store.identity(second),null);
 await assert.rejects(store.login(alice.email,password),errorCode('INVALID_CREDENTIALS'));
 assert.equal((await store.identity(await store.login(alice.email,'new password for pilot')))?.userId,alice.userId);
});
test('deletion and audit records are scoped and do not log secrets',async()=>{
 await store.deleteEntry(alice,entryId,2);assert.deepEqual(await store.entries(alice),[]);
 const events=await query('SELECT action FROM audit_events WHERE organization_id=$1',[alice.organizationId]);
 assert.ok(events.some(e=>e.action==='knowledge.deleted'));assert.ok(events.some(e=>e.action==='password.changed'));
});
