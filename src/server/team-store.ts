import { randomUUID } from "node:crypto";
import type { Database, Identity } from "./store";
import { createStore } from "./store";
import { AppError } from "./errors";
import { digest, hashPassword, newToken } from "./passwords";
import { seal } from "./crypto-secrets";
import { emailConfigured } from "./omni-store";
const url = () => new URL(process.env.APP_URL ?? "http://localhost").origin;
function admin(a: Identity) {
  if (a.role === "agent") throw new AppError(403, "FORBIDDEN");
}
export function createTeamStore(db: Database) {
  const base = createStore(db);
  return {
    async list(actor: Identity) {
      const members = await db.query(
        "SELECT u.id,u.name,u.email,m.role FROM memberships m JOIN users u ON u.id=m.user_id WHERE m.organization_id=$1 ORDER BY u.name",
        [actor.organizationId],
      );
      const invites =
        actor.role === "agent"
          ? []
          : await db.query(
              'SELECT id,email,role,expires_at AS "expiresAt" FROM team_invites WHERE organization_id=$1 AND used_at IS NULL AND expires_at>now() ORDER BY created_at DESC',
              [actor.organizationId],
            );
      const [p] = await db.query(
        "SELECT enabled FROM notification_preferences WHERE organization_id=$1",
        [actor.organizationId],
      );
      return {
        members,
        invites,
        notifications: p?.enabled !== false,
        emailConfigured: emailConfigured(),
      };
    },
    async invite(actor: Identity, email: string, role: "admin" | "agent") {
      admin(actor);
      if (actor.role !== "owner" && role === "admin")
        throw new AppError(403, "FORBIDDEN");
      const token = newToken(),
        id = randomUUID(),
        mailId = randomUUID();
      await db.transaction(async (q) => {
        await q("SELECT id FROM organizations WHERE id=$1 FOR UPDATE", [
          actor.organizationId,
        ]);
        const [n] = await q<{ count: number }>(
          "SELECT ((SELECT count(*) FROM memberships WHERE organization_id=$1)+(SELECT count(*) FROM team_invites WHERE organization_id=$1 AND used_at IS NULL AND expires_at>now()))::int AS count",
          [actor.organizationId],
        );
        if (n.count >= 50) throw new AppError(409, "TEAM_LIMIT");
        const member = await q(
          "SELECT u.id FROM users u JOIN memberships m ON m.user_id=u.id WHERE m.organization_id=$1 AND u.email=$2",
          [actor.organizationId, email],
        );
        if (member.length) throw new AppError(409, "ALREADY_MEMBER");
        await q(
          "DELETE FROM team_invites WHERE organization_id=$1 AND email=$2 AND used_at IS NULL",
          [actor.organizationId, email],
        );
        await q(
          "INSERT INTO team_invites(id,organization_id,email,role,token_hash) VALUES($1,$2,$3,$4,$5)",
          [id, actor.organizationId, email, role, digest(token)],
        );
        if (emailConfigured())
          await q(
            "INSERT INTO background_jobs(id,key,organization_id,kind,payload) VALUES($1,$2,$3,'email',$4::jsonb)",
            [
              mailId,
              "invite:" + id,
              actor.organizationId,
              JSON.stringify({
                encrypted: seal(
                  {
                    to: email,
                    subject:
                      "ReplyLocal: приглашение в команду / team invitation",
                    text:
                      url() +
                      "/ru/join?token=" +
                      token +
                      "\nСсылка действует 48 часов. Войдите под " +
                      email +
                      ".",
                  },
                  "mail:" + mailId,
                ),
              }),
            ],
          );
      });
      return {
        link: url() + "/ru/join?token=" + token,
        emailQueued: emailConfigured(),
      };
    },
    async registerInvite(
      token: string,
      email: string,
      name: string,
      password: string,
    ) {
      const hash = await hashPassword(password);
      try {
        return await db.transaction(async (q) => {
          const [invite] = await q<{
            id: string;
            organization_id: string;
            email: string;
            role: string;
          }>(
            "SELECT * FROM team_invites WHERE token_hash=$1 AND used_at IS NULL AND expires_at>now() FOR UPDATE",
            [digest(token)],
          );
          if (!invite) throw new AppError(404, "INVITE_EXPIRED");
          if (invite.email !== email)
            throw new AppError(403, "INVITE_EMAIL_MISMATCH");
          const id = randomUUID();
          await q(
            "INSERT INTO users(id,email,name,password_hash) VALUES($1,$2,$3,$4)",
            [id, email, name, hash],
          );
          await q(
            "INSERT INTO memberships(user_id,organization_id,role) VALUES($1,$2,$3)",
            [id, invite.organization_id, invite.role],
          );
          await q("UPDATE team_invites SET used_at=now() WHERE id=$1", [
            invite.id,
          ]);
          const session = newToken();
          await q(
            "INSERT INTO sessions(token_hash,user_id,organization_id,expires_at) VALUES($1,$2,$3,now()+interval '7 days')",
            [digest(session), id, invite.organization_id],
          );
          return session;
        });
      } catch (e) {
        if ((e as { code: string }).code === "23505")
          throw new AppError(409, "ACCOUNT_EXISTS");
        throw e;
      }
    },
    async accept(actor: Identity, token: string) {
      return db.transaction(async (q) => {
        const [invite] = await q<{
          id: string;
          organization_id: string;
          email: string;
          role: string;
        }>(
          "SELECT * FROM team_invites WHERE token_hash=$1 AND used_at IS NULL AND expires_at>now() FOR UPDATE",
          [digest(token)],
        );
        if (!invite) throw new AppError(404, "INVITE_EXPIRED");
        if (invite.email !== actor.email)
          throw new AppError(403, "INVITE_EMAIL_MISMATCH");
        await q(
          "INSERT INTO memberships(user_id,organization_id,role) VALUES($1,$2,$3) ON CONFLICT(user_id,organization_id) DO NOTHING",
          [actor.userId, invite.organization_id, invite.role],
        );
        await q("UPDATE team_invites SET used_at=now() WHERE id=$1", [
          invite.id,
        ]);
        const session = newToken();
        await q(
          "INSERT INTO sessions(token_hash,user_id,organization_id,expires_at) VALUES($1,$2,$3,now()+interval '7 days')",
          [digest(session), actor.userId, invite.organization_id],
        );
        return session;
      });
    },
    async revoke(actor: Identity, id: string) {
      admin(actor);
      await db.query(
        "DELETE FROM team_invites WHERE id=$1 AND organization_id=$2",
        [id, actor.organizationId],
      );
    },
    async member(
      actor: Identity,
      userId: string,
      role: "admin" | "agent" | null,
    ) {
      admin(actor);
      if (userId === actor.userId) throw new AppError(403, "FORBIDDEN");
      await db.transaction(async (q) => {
        const [m] = await q<{ role: string }>(
          "SELECT role FROM memberships WHERE user_id=$1 AND organization_id=$2 FOR UPDATE",
          [userId, actor.organizationId],
        );
        if (!m) throw new AppError(404, "NOT_FOUND");
        if (
          m.role === "owner" ||
          (actor.role !== "owner" && (m.role === "admin" || role === "admin"))
        )
          throw new AppError(403, "FORBIDDEN");
        if (role)
          await q(
            "UPDATE memberships SET role=$3 WHERE user_id=$1 AND organization_id=$2",
            [userId, actor.organizationId, role],
          );
        else {
          await q(
            "DELETE FROM memberships WHERE user_id=$1 AND organization_id=$2",
            [userId, actor.organizationId],
          );
          await q(
            "UPDATE conversations SET assigned_to=NULL,version=version+1,outcome_version=outcome_version+1 WHERE assigned_to=$1 AND organization_id=$2",
            [userId, actor.organizationId],
          );
        }
        await q(
          "DELETE FROM sessions WHERE user_id=$1 AND organization_id=$2",
          [userId, actor.organizationId],
        );
      });
    },
    async workspaces(actor: Identity) {
      return db.query(
        "SELECT o.id,o.name,m.role FROM memberships m JOIN organizations o ON o.id=m.organization_id WHERE m.user_id=$1 ORDER BY o.name",
        [actor.userId],
      );
    },
    async switch(actor: Identity, organizationId: string) {
      return db.transaction(async (q) => {
        if (
          !(
            await q(
              "SELECT role FROM memberships WHERE user_id=$1 AND organization_id=$2 FOR SHARE",
              [actor.userId, organizationId],
            )
          ).length
        )
          throw new AppError(403, "FORBIDDEN");
        const token = newToken();
        await q(
          "INSERT INTO sessions(token_hash,user_id,organization_id,expires_at) VALUES($1,$2,$3,now()+interval '7 days')",
          [digest(token), actor.userId, organizationId],
        );
        return token;
      });
    },
    async notifications(actor: Identity, enabled: boolean) {
      admin(actor);
      await db.query(
        "INSERT INTO notification_preferences(organization_id,enabled) VALUES($1,$2) ON CONFLICT(organization_id) DO UPDATE SET enabled=excluded.enabled",
        [actor.organizationId, enabled],
      );
    },
    async requestReset(email: string) {
      if (!emailConfigured()) throw new AppError(503, "EMAIL_NOT_CONFIGURED");
      await base.rateLimit("reset:" + email, 3, 900);
      await base.rateLimit("reset:global", 100, 900);
      const [u] = await db.query<{ id: string }>(
        "SELECT id FROM users WHERE email=$1",
        [email],
      );
      if (!u) return;
      const token = newToken(),
        id = randomUUID();
      await db.transaction(async (q) => {
        await q("DELETE FROM password_resets WHERE user_id=$1", [u.id]);
        await q(
          "INSERT INTO password_resets(token_hash,user_id) VALUES($1,$2)",
          [digest(token), u.id],
        );
        await q(
          "INSERT INTO background_jobs(id,key,kind,payload) VALUES($1,$2,'email',$3::jsonb)",
          [
            id,
            "reset:" + id,
            JSON.stringify({
              encrypted: seal(
                {
                  to: email,
                  subject: "ReplyLocal: сброс пароля / reset password",
                  text:
                    url() +
                    "/ru/reset?token=" +
                    token +
                    "\nСсылка действует 30 минут. Если вы не запрашивали сброс, проигнорируйте письмо.",
                },
                "mail:" + id,
              ),
            }),
          ],
        );
      });
    },
    async reset(token: string, password: string) {
      const hash = await hashPassword(password);
      await db.transaction(async (q) => {
        const [r] = await q<{ user_id: string }>(
          "DELETE FROM password_resets WHERE token_hash=$1 AND expires_at>now() RETURNING user_id",
          [digest(token)],
        );
        if (!r) throw new AppError(400, "RESET_EXPIRED");
        await q("UPDATE users SET password_hash=$2 WHERE id=$1", [
          r.user_id,
          hash,
        ]);
        await q("DELETE FROM sessions WHERE user_id=$1", [r.user_id]);
        await q("DELETE FROM password_resets WHERE user_id=$1", [r.user_id]);
      });
    },
  };
}
