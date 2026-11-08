import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { createStore, type Database, type Query } from "../src/server/store";
import { createChatStore } from "../src/server/chat-store";
test("upgrade 0.2 → 0.3 preserves existing users, sessions and knowledge and keeps the new public chat disabled", async () => {
  const pg = await PGlite.create();
  const query: Query = async (sql, params) =>
    (await pg.query(sql, params)).rows as never;
  const db: Database = {
    query,
    transaction: (work) =>
      pg.transaction((tx) =>
        work(
          async (sql, params) => (await tx.query(sql, params)).rows as never,
        ),
      ),
  };
  try {
    await pg.exec(
      await readFile(new URL("../db/001_initial.sql", import.meta.url), "utf8"),
    );
    const store = createStore(db),
      token = await store.register({
        name: "Existing Owner",
        companyName: "Existing Business",
        email: "existing@example.test",
        password: "existing long password",
      }),
      actor = (await store.identity(token))!;
    const id = await store.saveEntry(actor, {
      kind: "service",
      title: "Existing service",
      content: "Saved before migration",
      price: null,
      currency: "UAH",
      durationMinutes: null,
      sku: "",
    });
    await pg.exec(
      await readFile(new URL("../db/002_chat.sql", import.meta.url), "utf8"),
    );
    assert.equal(
      (await store.identity(token))?.organizationId,
      actor.organizationId,
    );
    assert.equal((await store.entries(actor))[0].id, id);
    const chat = createChatStore(
        db,
        async () => {
          throw new Error("No AI calls expected");
        },
        () => false,
      ),
      config = await chat.config(actor);
    assert.equal(config.enabled, false);
    assert.equal(config.companyName, "Existing Business");
    assert.equal(config.publicId, actor.organizationId);
  } finally {
    await pg.close();
  }
});

test("upgrade 0.3 → 0.4 preserves website visitor access, existing threads and knowledge", async () => {
  const pg = await PGlite.create();
  const query: Query = async (sql, params) =>
    (await pg.query(sql, params)).rows as never;
  const db: Database = {
    query,
    transaction: (work) =>
      pg.transaction((tx) =>
        work(
          async (sql, params) => (await tx.query(sql, params)).rows as never,
        ),
      ),
  };
  try {
    for (const name of ["001_initial.sql", "002_chat.sql"])
      await pg.exec(
        await readFile(new URL("../db/" + name, import.meta.url), "utf8"),
      );
    const store = createStore(db),
      session = await store.register({
        name: "Existing Owner",
        companyName: "Existing Website",
        email: "old-chat@example.test",
        password: "a long existing password",
      }),
      actor = (await store.identity(session))!,
      chat = createChatStore(
        db,
        async () => {
          throw new Error("Not called");
        },
        () => false,
      ),
      config = await chat.config(actor);
    await chat.saveConfig(actor, {
      enabled: true,
      autoReply: true,
      welcome: "Existing welcome",
      dailyLimit: 50,
      version: config.version,
    });
    // Build an actual v0.3-shaped conversation, before the new channel columns exist.
    const { randomUUID } = await import("node:crypto"),
      { newToken, digest } = await import("../src/server/passwords");
    const token = newToken(),
      id = randomUUID();
    await query(
      "INSERT INTO conversations(id,organization_id,token_hash,visitor_name,locale) VALUES($1,$2,$3,'Existing visitor','en')",
      [id, actor.organizationId, digest(token)],
    );
    await query(
      "INSERT INTO messages(id,conversation_id,sender,content) VALUES($1,$2,'visitor','Saved before upgrade')",
      [randomUUID(), id],
    );
    await pg.exec(
      await readFile(
        new URL("../db/003_omnichannel.sql", import.meta.url),
        "utf8",
      ),
    );
    const t = await chat.visitorThread(id, token);
    assert.equal(t.channel, "website");
    assert.equal(t.messages[0].content, "Saved before upgrade");
    assert.equal((await store.identity(session))!.userId, actor.userId);
    assert.equal((await chat.config(actor)).enabled, true);
    assert.equal((await query("SELECT * FROM channel_connections")).length, 0);
  } finally {
    await pg.close();
  }
});
