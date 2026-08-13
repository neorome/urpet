#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { createRequire } from "node:module";

const root = resolve(import.meta.dirname, "..");
const require = createRequire(import.meta.url);
const wrangler = require(resolve(root, "node_modules", "wrangler", "wrangler-dist", "cli.js"));
const migrationsDirectory = resolve(root, "migrations");
const migrationFiles = (await readdir(migrationsDirectory))
  .filter((name) => /^\d+_.+\.sql$/.test(name))
  .sort();
let statementCount = 0;

assert.ok(migrationFiles.length >= 3, "Every reviewed D1 migration must be present.");
for (const migrationFile of migrationFiles) {
  const sql = await readFile(resolve(migrationsDirectory, migrationFile), "utf8");
  const statements = wrangler.unstable_splitSqlQuery(sql);
  assert.ok(statements.length > 0, `${migrationFile} must contain at least one statement.`);
  statementCount += statements.length;
  for (const statement of statements.filter((value) => /CREATE TRIGGER/i.test(value))) {
    assert.match(statement.trimEnd(), /END$/i, `Wrangler split an incomplete D1 trigger in ${migrationFile}.`);
  }
}

console.log(`Wrangler migration split passed: ${migrationFiles.length} migrations, ${statementCount} complete statements.`);
