#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import process from "node:process";

const projectRoot = resolve(import.meta.dirname, "..");
const wranglerBin = resolve(projectRoot, "node_modules", "wrangler", "bin", "wrangler.js");
const allowedSecrets = new Set(["CEREBRAS_API_KEY"]);
const secretName = process.argv[2];

if (!allowedSecrets.has(secretName)) {
  console.error("Unsupported Worker secret name.");
  process.exitCode = 2;
} else {
  const secret = process.env[secretName];
  if (typeof secret !== "string" || !secret.trim()) {
    console.error(`The protected ${secretName} value was not injected.`);
    process.exitCode = 2;
  } else {
    const result = spawnSync(process.execPath, [
      wranglerBin,
      "secret",
      "put",
      secretName,
      "--config",
      resolve(projectRoot, "wrangler.jsonc")
    ], {
      cwd: projectRoot,
      env: {
        CLOUDFLARE_ACCOUNT_ID: "f28b2a55054cbc8d998c5963ed34a0a7",
        HOME: "/Users/baney",
        PATH: "/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"
      },
      encoding: "utf8",
      input: `${secret}\n`,
      shell: false,
      stdio: ["pipe", "pipe", "pipe"]
    });

    if (result.status !== 0) {
      console.error(`Worker secret installation failed (exit ${result.status ?? "unknown"}).`);
      process.exitCode = result.status || 1;
    } else {
      console.log(JSON.stringify({ installed: true, name: secretName }));
    }
  }
}
