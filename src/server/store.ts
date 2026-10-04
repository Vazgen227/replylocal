import { randomUUID } from 'node:crypto';
import type { z } from 'zod';
import type { registerSchema, leadSchema, KnowledgeInput, KnowledgeEntry, OrganizationSettings, Workspace } from '../lib/schemas';
import { AppError } from './errors';
import { digest, dummyHash, hashPassword, newToken, verifyPassword } from './passwords';

// This module is framework independent so its transactions can be tested against PostgreSQL.
export type Query = <T extends Record<string, unknown> = Record<string, unknown>>(sql: string, params?: unknown[]) => Promise<T[]>;
export interface Database { query: Query; transaction<T>(work: (query: Query) => Promise<T>): Promise<T> }
export type Identity = { userId: string; organizationId: string; role: 'owner' | 'admin' | 'agent'; name: string; email: string };
export const SESSION_SECONDS = 60 * 60 * 24 * 7;

export function createStore(db: Database) {
  async function audit(q: Query, actor: Identity, action: string, id?: string) {
    await q('INSERT INTO audit_events(organization_id,actor_id,action,entity_id) VALUES($1,$2,$3,$4)', [actor.organizationId, actor.userId, action, id ?? null]);
  }
  function canWrite(actor: Identity) {
    if (!['owner', 'admin'].includes(actor.role)) throw new AppError(403, 'FORBIDDEN');
  }
  async function issueSession(q: Query, userId: string, organizationId: string) {
    const token = newToken();
    await q("INSERT INTO sessions(token_hash,user_id,organization_id,expires_at) VALUES($1,$2,$3,now()+interval '7 days')", [digest(token), userId, organizationId]);
    return token;
  }
  async function entries(actor: Identity): Promise<KnowledgeEntry[]> {
    return await db.query(`SELECT id,kind,title,content,price::float8 AS price,currency,duration_minutes AS "durationMinutes",sku,version,updated_at AS "updatedAt"
      FROM knowledge_entries WHERE organization_id=$1 ORDER BY updated_at DESC,id`, [actor.organizationId]) as unknown as KnowledgeEntry[];
  }
  return {
    async register(input: z.infer<typeof registerSchema>) {
      const passwordHash = await hashPassword(input.password);
      try {
        return await db.transaction(async q => {
          const userId = randomUUID(), orgId = randomUUID();
          await q('INSERT INTO users(id,email,name,password_hash) VALUES($1,$2,$3,$4)', [userId,input.email,input.name,passwordHash]);
          await q('INSERT INTO organizations(id,name) VALUES($1,$2)', [orgId,input.companyName]);
          await q("INSERT INTO memberships(user_id,organization_id,role) VALUES($1,$2,'owner')", [userId,orgId]);
          await audit(q,{ userId, organizationId: orgId, role:'owner', name:input.name,email:input.email },'organization.created',orgId);
          return await issueSession(q,userId,orgId);
        });
      } catch (error) {
        if ((error as { code?: string }).code === '23505') throw new AppError(409,'ACCOUNT_EXISTS');
        throw error;
      }
    },
    async login(email: string, password: string) {
      const [user] = await db.query<{ id:string; password_hash:string; organization_id:string }>(`SELECT u.id,u.password_hash,m.organization_id
        FROM users u JOIN memberships m ON m.user_id=u.id WHERE u.email=$1 ORDER BY m.organization_id LIMIT 1`, [email]);
      const valid = await verifyPassword(password, user?.password_hash ?? dummyHash);
      if (!user || !valid) throw new AppError(401,'INVALID_CREDENTIALS');
      return db.transaction(async q => {
        // Serialize with password changes; credentials may have changed while scrypt was running.
        const [current] = await q('SELECT password_hash FROM users WHERE id=$1 FOR UPDATE',[user.id]);
        if (current?.password_hash !== user.password_hash) throw new AppError(401,'INVALID_CREDENTIALS');
        return issueSession(q,user.id,user.organization_id);
      });
    },
    async identity(token: string | undefined): Promise<Identity | null> {
      if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
      const [row] = await db.query(`SELECT u.id AS "userId",m.organization_id AS "organizationId",m.role,u.name,u.email
        FROM sessions s JOIN users u ON u.id=s.user_id
        JOIN memberships m ON m.user_id=s.user_id AND m.organization_id=s.organization_id
        WHERE s.token_hash=$1 AND s.expires_at>now()`,[digest(token)]);
      return (row as Identity | undefined) ?? null;
    },
    async logout(token: string) { await db.query('DELETE FROM sessions WHERE token_hash=$1',[digest(token)]); },
    async changePassword(actor: Identity, current: string, next: string) {
      const [user] = await db.query<{ password_hash:string }>('SELECT password_hash FROM users WHERE id=$1',[actor.userId]);
      if (!user || !await verifyPassword(current,user.password_hash)) throw new AppError(401,'INVALID_CREDENTIALS');
      const nextHash = await hashPassword(next);
      await db.transaction(async q => {
        const rows = await q('UPDATE users SET password_hash=$1 WHERE id=$2 AND password_hash=$3 RETURNING id',[nextHash,actor.userId,user.password_hash]);
        if (!rows.length) throw new AppError(409,'CONFLICT');
        await q('DELETE FROM sessions WHERE user_id=$1',[actor.userId]);
        await audit(q,actor,'password.changed');
      });
    },
    async rateLimit(key: string, limit: number, seconds: number) {
      const [row] = await db.query<{ hits:number }>(`INSERT INTO rate_limits(key,hits,expires_at) VALUES($1,1,now()+$2*interval '1 second')
        ON CONFLICT(key) DO UPDATE SET hits=CASE WHEN rate_limits.expires_at<=now() THEN 1 ELSE rate_limits.hits+1 END,
        expires_at=CASE WHEN rate_limits.expires_at<=now() THEN excluded.expires_at ELSE rate_limits.expires_at END RETURNING hits`,[digest(key),seconds]);
      if (row.hits>limit) throw new AppError(429,'RATE_LIMITED');
    },
    async workspace(actor: Identity): Promise<Workspace> {
      const [organization] = await db.query('SELECT name,industry,timezone,currency,ai_settings AS "aiSettings",version FROM organizations WHERE id=$1',[actor.organizationId]);
      const team = await db.query('SELECT u.id,u.name,u.email,m.role FROM memberships m JOIN users u ON u.id=m.user_id WHERE m.organization_id=$1 ORDER BY u.name',[actor.organizationId]);
      return { user: { id:actor.userId,name:actor.name,email:actor.email,role:actor.role }, organization, team, entries: await entries(actor) } as Workspace;
    },
    async saveSettings(actor: Identity, input: OrganizationSettings) {
      canWrite(actor);
      await db.transaction(async q => {
        const rows = await q(`UPDATE organizations SET name=$1,industry=$2,timezone=$3,currency=$4,ai_settings=$5::jsonb,version=version+1
          WHERE id=$6 AND version=$7 RETURNING id`,[input.name,input.industry,input.timezone,input.currency,JSON.stringify(input.aiSettings),actor.organizationId,input.version]);
        if (!rows.length) throw new AppError(409,'CONFLICT');
        await audit(q,actor,'settings.updated',actor.organizationId);
      });
    },
    entries,
    async saveEntry(actor: Identity, input: KnowledgeInput, id?: string, version?: number) {
      canWrite(actor);
      return db.transaction(async q => {
        const values = [input.kind,input.title,input.content,input.price,input.currency,input.durationMinutes,input.sku];
        const entryId = id ?? randomUUID();
        if (id) {
          const rows = await q(`UPDATE knowledge_entries SET kind=$1,title=$2,content=$3,price=$4,currency=$5,duration_minutes=$6,sku=$7,version=version+1,updated_at=now()
            WHERE id=$8 AND organization_id=$9 AND version=$10 RETURNING id`,[...values,id,actor.organizationId,version]);
          if (!rows.length) {
            const own = await q('SELECT id FROM knowledge_entries WHERE id=$1 AND organization_id=$2',[id,actor.organizationId]);
            throw new AppError(own.length ? 409 : 404,own.length ? 'CONFLICT':'NOT_FOUND');
          }
        } else {
          // Per-organization lock makes the pilot storage limit safe under concurrent requests.
          await q('SELECT id FROM organizations WHERE id=$1 FOR UPDATE',[actor.organizationId]);
          const [count] = await q<{ count:number }>('SELECT count(*)::int AS count FROM knowledge_entries WHERE organization_id=$1',[actor.organizationId]);
          if (count.count>=1000) throw new AppError(409,'KNOWLEDGE_LIMIT');
          await q(`INSERT INTO knowledge_entries(kind,title,content,price,currency,duration_minutes,sku,id,organization_id)
            VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,[...values,entryId,actor.organizationId]);
        }
        await audit(q,actor,id ? 'knowledge.updated':'knowledge.created',entryId);
        return entryId;
      });
    },
    async deleteEntry(actor: Identity, id: string, version: number) {
      canWrite(actor);
      await db.transaction(async q => {
        const rows = await q('DELETE FROM knowledge_entries WHERE id=$1 AND organization_id=$2 AND version=$3 RETURNING id',[id,actor.organizationId,version]);
        if (!rows.length) {
          const own = await q('SELECT id FROM knowledge_entries WHERE id=$1 AND organization_id=$2',[id,actor.organizationId]);
          throw new AppError(own.length ? 409 : 404,own.length ? 'CONFLICT':'NOT_FOUND');
        }
        await audit(q,actor,'knowledge.deleted',id);
      });
    },
    async lead(input: z.infer<typeof leadSchema>) {
      if (input.website) return; // Honeypot: do not store automated submissions.
      await db.query('INSERT INTO leads(id,name,email,phone,business_type,plan,locale) VALUES($1,$2,$3,$4,$5,$6,$7)',
        [randomUUID(),input.name,input.email,input.phone,input.businessType,input.plan,input.locale]);
    },
  };
}
