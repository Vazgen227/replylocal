// Test-only PostgreSQL-compatible server. Never use this unauthenticated server in production.
import {PGlite} from '@electric-sql/pglite';
import {PGLiteSocketServer} from '@electric-sql/pglite-socket';
import {spawn} from 'node:child_process';
const db=await PGlite.create();
const server=new PGLiteSocketServer({db,host:'127.0.0.1',port:54329,maxConnections:10});
await server.start();
const env={...process.env,NODE_ENV:'development',DATABASE_URL:'postgresql://postgres:postgres@127.0.0.1:54329/postgres',APP_URL:'http://127.0.0.1:3100',ALLOW_SIGNUP:'true',NEXT_TELEMETRY_DISABLED:'1'};
function run(args){return new Promise((resolve,reject)=>{const p=spawn(process.execPath,args,{env,stdio:'inherit'});p.on('error',reject);p.on('exit',code=>code===0?resolve():reject(new Error(`Command exited ${code}`)));});}
let app;
try {
 await run(['scripts/migrate.mjs']);await run(['scripts/migrate.mjs']);
 app=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--hostname','127.0.0.1','--port','3100'],{env,stdio:'inherit'});
 let ready=false;
 for(let attempt=0;attempt<60;attempt++){
   try{const response=await fetch(`${env.APP_URL}/en/login`);if(response.ok){ready=true;break;}}catch{}
   if(app.exitCode!==null)throw new Error('Next.js stopped before readiness');
   await new Promise(resolve=>setTimeout(resolve,500));
 }
 if(!ready)throw new Error('Next.js did not become ready');
 await run(['node_modules/@playwright/test/cli.js','test']);
} catch(error){console.error(error.message);process.exitCode=1;}
finally {
 if(app){app.kill('SIGTERM');await new Promise(resolve=>{if(app.exitCode!==null)return resolve();app.once('exit',resolve);setTimeout(()=>{app.kill('SIGKILL');resolve();},5000).unref();});}
 await server.stop();await db.close();
}
