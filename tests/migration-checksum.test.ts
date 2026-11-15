import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { promisify } from "node:util";
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import {
  migrationChecksum,
  sameMigration,
} from "../scripts/migration-checksum.mjs";

const sha = (s: string) => createHash("sha256").update(s).digest("hex");
const lf = "CREATE TABLE a(id int);\nCREATE TABLE b(id int);\n";
const crlf = lf.replace(/\n/g, "\r\n");

test("checksum ignores line endings", () => {
  assert.equal(migrationChecksum(lf), sha(lf));
  assert.equal(migrationChecksum(crlf), sha(lf));
});

test("applied migration matches whether it was stored from LF or CRLF bytes", () => {
  for (const stored of [sha(lf), sha(crlf)])
    for (const file of [lf, crlf]) assert.ok(sameMigration(stored, file));
});

test("a real content change is still rejected", () => {
  const changed = lf.replace("b(id int)", "b(id bigint)");
  assert.equal(sameMigration(sha(lf), changed), false);
  assert.equal(sameMigration(sha(crlf), changed.replace(/\n/g, "\r\n")), false);
});

test("migrator accepts 001 applied from a Windows checkout and applies the rest", async () => {
  const db = await PGlite.create();
  const port = 54339;
  const server = new PGLiteSocketServer({ db, host: "127.0.0.1", port });
  await server.start();
  try {
    const initial = (
      await readFile(new URL("../db/001_initial.sql", import.meta.url), "utf8")
    ).replace(/\r\n/g, "\n");
    await db.exec(initial);
    await db.exec(
      "CREATE TABLE schema_migrations(name text PRIMARY KEY,checksum text NOT NULL,applied_at timestamptz NOT NULL DEFAULT now())",
    );
    // State of a database migrated from Windows: checksum of the CRLF bytes.
    await db.query("INSERT INTO schema_migrations(name,checksum) VALUES($1,$2)", [
      "001_initial.sql",
      sha(initial.replace(/\n/g, "\r\n")),
    ]);
    const { stdout } = await promisify(execFile)(
      process.execPath,
      ["scripts/migrate.mjs"],
      {
        cwd: new URL("..", import.meta.url),
        env: {
          PATH: process.env.PATH,
          NODE_ENV: "test",
          DATABASE_URL: `postgresql://postgres:postgres@127.0.0.1:${port}/postgres`,
        },
      },
    );
    assert.match(stdout, /Database migrations complete/);
    const { rows } = await db.query<{ name: string }>(
      "SELECT name FROM schema_migrations ORDER BY name",
    );
    assert.deepEqual(
      rows.map((r) => r.name),
      [
        "001_initial.sql",
        "002_chat.sql",
        "003_omnichannel.sql",
        "004_service_station.sql",
        "005_retention.sql",
      ],
    );
  } finally {
    await server.stop();
    await db.close();
  }
});
