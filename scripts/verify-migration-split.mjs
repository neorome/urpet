#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createRequire } from "node:module";

const root = resolve(import.meta.dirname, "..");
const require = createRequire(import.meta.url);
const wrangler = require(resolve(root, "node_modules", "wrangler", "wrangler-dist", "cli.js"));
const sql = await readFile(resolve(root, "migrations", "0002_guide_reservations.sql"), "utf8");
const statements = wrangler.unstable_splitSqlQuery(sql);

assert.ok(statements.length >= 16, "The guide migration should split into its reviewed statements.");
for (const statement of statements.filter((value) => /CREATE TRIGGER/i.test(value))) {
  assert.match(statement.trimEnd(), /END$/i, "Wrangler split an incomplete D1 trigger statement.");
}

console.log(`Wrangler migration split passed: ${statements.length} complete statements.`);
