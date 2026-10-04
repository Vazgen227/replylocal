import './env.mjs';
import {writeFile} from 'node:fs/promises';
import pg from 'pg';
if(!process.env.DATABASE_URL)throw new Error('DATABASE_URL required');
const destination=process.argv[2];if(!destination)throw new Error('Usage: npm run leads:export -- /private/path/leads.csv');
const client=new pg.Client({connectionString:process.env.DATABASE_URL});
const cell=value=>{let text=String(value??'');if(/^[=+@\-\t\r\n]/.test(text))text="'"+text;return '"'+text.replaceAll('"','""')+'"';};
try{await client.connect();const {rows}=await client.query('SELECT name,email,phone,business_type,plan,locale,consent_at,created_at FROM leads ORDER BY created_at DESC');const columns=['name','email','phone','business_type','plan','locale','consent_at','created_at'];await writeFile(destination,'\uFEFF'+[columns.join(','),...rows.map(row=>columns.map(c=>cell(row[c] instanceof Date?row[c].toISOString():row[c])).join(','))].join('\r\n'),{flag:'wx',mode:0o600});console.log(`Exported ${rows.length} leads.`);}finally{await client.end();}
