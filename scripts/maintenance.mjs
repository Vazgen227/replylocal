import './env.mjs';
import pg from 'pg';
const client=new pg.Client({connectionString:process.env.DATABASE_URL});
if(!process.env.DATABASE_URL)throw new Error('DATABASE_URL required');
try{await client.connect();await client.query('DELETE FROM sessions WHERE expires_at<now()');await client.query('DELETE FROM rate_limits WHERE expires_at<now()');console.log('Expired sessions and request counters removed.');}finally{await client.end();}
