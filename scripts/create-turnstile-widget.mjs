#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import process from "node:process";

const projectRoot = resolve(import.meta.dirname, "..");
const wranglerBin = resolve(projectRoot, "node_modules", "wrangler", "bin", "wrangler.js");
const configPath = resolve(projectRoot, "wrangler.jsonc");
const safeEnvironment = {
  CLOUDFLARE_ACCOUNT_ID: "f28b2a55054cbc8d998c5963ed34a0a7",
  HOME: "/Users/baney",
  PATH: "/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"
};

function run(args, input) {
  return spawnSync(process.execPath, [wranglerBin, ...args], {
    cwd: projectRoot,
    env: safeEnvironment,
    encoding: "utf8",
    input,
    shell: false,
    stdio: ["pipe", "pipe", "pipe"]
  });
}

const listed = run(["turnstile", "widget", "list", "--json", "--config", configPath]);
let existingWidget;
if (listed.status === 0) {
  try {
    const widgets = JSON.parse(listed.stdout);
    existingWidget = widgets.find((widget) => widget?.name === "urpet community guide");
  } catch {
    console.error("Turnstile returned an unreadable widget list.");
    process.exitCode = 1;
  }
} else {
  console.error(`Turnstile widget listing failed (exit ${listed.status ?? "unknown"}).`);
  process.exitCode = listed.status || 1;
}

if (!process.exitCode && existingWidget) {
  const exactConfiguration = existingWidget.mode === "managed"
    && existingWidget.region === "world"
    && existingWidget.clearance_level === "no_clearance"
    && Array.isArray(existingWidget.domains)
    && existingWidget.domains.length === 1
    && existingWidget.domains[0] === "urdog.dev";
  if (!exactConfiguration) {
    console.error("An urpet Turnstile widget exists with a different configuration; refusing to create a duplicate.");
    process.exitCode = 1;
  }
}

let createdNew = false;
let credentials;
if (!process.exitCode && existingWidget) {
  const fetched = run([
    "turnstile",
    "widget",
    "get",
    existingWidget.sitekey,
    "--json",
    "--config",
    configPath
  ]);
  if (fetched.status !== 0) {
    console.error(`Turnstile widget retrieval failed (exit ${fetched.status ?? "unknown"}).`);
    process.exitCode = fetched.status || 1;
  } else {
    try {
      credentials = JSON.parse(fetched.stdout);
    } catch {
      console.error("Turnstile returned an unreadable widget response.");
      process.exitCode = 1;
    }
  }
}

if (!process.exitCode && !existingWidget) {
  const created = run([
    "turnstile",
    "widget",
    "create",
    "urpet community guide",
    "--domain",
    "urdog.dev",
    "--mode",
    "managed",
    "--clearance-level",
    "no_clearance",
    "--region",
    "world",
    "--json",
    "--config",
    configPath
  ]);
  if (created.status !== 0) {
    console.error(`Turnstile widget creation failed (exit ${created.status ?? "unknown"}).`);
    process.exitCode = created.status || 1;
  } else {
    try {
      credentials = JSON.parse(created.stdout);
      createdNew = true;
    } catch {
      console.error("Turnstile returned an unreadable creation response.");
      process.exitCode = 1;
    }
  }
}

if (!process.exitCode) {
  const sitekey = credentials?.sitekey;
  const secret = credentials?.secret;
  if (!process.exitCode && (!/^0x[A-Za-z0-9_-]+$/.test(sitekey || "") || typeof secret !== "string" || secret.length < 20)) {
    console.error("Turnstile returned incomplete widget credentials.");
    process.exitCode = 1;
  }

  if (!process.exitCode) {
    const installed = run([
      "secret",
      "put",
      "TURNSTILE_SECRET",
      "--config",
      configPath
    ], `${secret}\n`);
    if (installed.status !== 0) {
      console.error(`Turnstile secret installation failed (exit ${installed.status ?? "unknown"}).`);
      process.exitCode = installed.status || 1;
    } else {
      console.log(JSON.stringify({
        created: createdNew,
        domains: ["urdog.dev"],
        existing: !createdNew,
        mode: "managed",
        name: "urpet community guide",
        secretInstalled: true,
        sitekey
      }));
    }
  }
}
