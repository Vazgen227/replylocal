import 'server-only';
import { Pool, type PoolClient } from 'pg';
import type { Database, Query } from './store';
import { AppError } from './errors';

const globalDb = globalThis as unknown as { replylocalPool?: Pool };
function pool() {
  if (!process.env.DATABASE_URL) throw new AppError(503, 'NOT_CONFIGURED');
  if (!globalDb.replylocalPool) {
    globalDb.replylocalPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 3, idleTimeoutMillis: 10000, connectionTimeoutMillis: 5000,
      statement_timeout: 10000,
      // Use the provider's verified TLS connection string. Never disable certificate validation.
    });
    globalDb.replylocalPool.on('error', () => console.error('[database] idle connection failed'));
  }
  return globalDb.replylocalPool;
}
function executor(client: Pool | PoolClient): Query {
  return async (sql, params = []) => (await client.query(sql, params)).rows;
}
export const database: Database = {
  query: (sql, params) => executor(pool())(sql, params),
  transaction: async work => {
    const client = await pool().connect();
    try { await client.query('BEGIN'); const result = await work(executor(client)); await client.query('COMMIT'); return result; }
    catch (error) { await client.query('ROLLBACK'); throw error; }
    finally { client.release(); }
  },
};
