import './env.mjs';
import {readdir,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import pg from 'pg';
if(!process.env.DATABASE_URL) throw new Error('Set DATABASE_URL in .env.local or the environment');
const client=new pg.Client({connectionString:process.env.DATABASE_URL,connectionTimeoutMillis:10000});
try {
 await client.connect();
 // Transaction-level lock works with transaction-pooling proxies too.
 await client.query('BEGIN');
 await client.query('SELECT pg_advisory_xact_lock(723491862)');
 await client.query('CREATE TABLE IF NOT EXISTS schema_migrations(name text PRIMARY KEY,checksum text NOT NULL,applied_at timestamptz NOT NULL DEFAULT now())');
 for(const name of (await readdir(new URL('../db/',import.meta.url))).filter(n=>/^\d+.*\.sql$/.test(n)).sort()){
  const sql=await readFile(new URL(`../db/${name}`,import.meta.url),'utf8');
  const checksum=createHash('sha256').update(sql).digest('hex');
  const {rows}=await client.query('SELECT checksum FROM schema_migrations WHERE name=$1',[name]);
  if(rows.length){if(rows[0].checksum!==checksum)throw new Error(`Applied migration changed: ${name}`);continue;}
  await client.query(sql);
  await client.query('INSERT INTO schema_migrations(name,checksum) VALUES($1,$2)',[name,checksum]);
  console.log(`Applied ${name}`);
 }
 await client.query('COMMIT');console.log('Database migrations complete.');
} catch(error){await client.query('ROLLBACK').catch(()=>{});console.error('Migration failed:',error instanceof Error?error.message:'Unknown error');process.exitCode=1;}
finally{await client.end();}
