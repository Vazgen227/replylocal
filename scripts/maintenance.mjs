import "./env.mjs";
import pg from "pg";
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL required");
const days = Number(process.env.DATA_RETENTION_DAYS ?? 90);
if (!Number.isInteger(days) || days < 30 || days > 3650)
  throw new Error("DATA_RETENTION_DAYS must be 30..3650");
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
try {
  await client.connect();
  await client.query("BEGIN");
  await client.query("DELETE FROM sessions WHERE expires_at<now()");
  await client.query("DELETE FROM rate_limits WHERE expires_at<now()");
  const result = await client.query(
    "DELETE FROM conversations WHERE updated_at<now()-$1*interval '1 day'",
    [days],
  );
  await client.query(
    "DELETE FROM ai_usage WHERE day<(now() AT TIME ZONE 'UTC')::date-365",
  );
  await client.query("DELETE FROM password_resets WHERE expires_at<now()");
  await client.query("DELETE FROM team_invites WHERE expires_at<now()");
  await client.query(
    "DELETE FROM background_jobs WHERE status='done' AND updated_at<now()-interval '7 days'",
  );
  await client.query(
    "DELETE FROM background_jobs WHERE status='failed' AND updated_at<now()-$1*interval '1 day'",
    [days],
  );
  await client.query(
    "DELETE FROM inbound_events WHERE created_at<now()-$1*interval '1 day'",
    [days],
  );
  await client.query(
    "DELETE FROM billing_events WHERE created_at<now()-interval '365 days'",
  );
  await client.query("COMMIT");
  console.log(
    `Expired sessions/counters cleaned; ${result.rowCount} old conversations deleted.`,
  );
} catch (e) {
  await client.query("ROLLBACK").catch(() => {});
  throw e;
} finally {
  await client.end();
}
