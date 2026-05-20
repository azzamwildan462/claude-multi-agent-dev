#!/usr/bin/env node
// setup.mjs
//
// Cross-platform one-command setup. Works on Linux, macOS, and Windows.
//
// - Verifies prerequisites (Node.js 18+, git)
// - Ensures .env exists (copies from .env.example if missing)
// - Installs dashboard dependencies (npm install)
// - Lints the routing table against .claude/agents/
//
// Usage:  node scripts/setup.mjs   (or:  npm run setup)

import { existsSync, copyFileSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { platform } from "node:os";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");
process.chdir(REPO_ROOT);

const IS_WINDOWS = platform() === "win32";
const NPM = IS_WINDOWS ? "npm.cmd" : "npm";

// --------- pretty output ---------
const C = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
};

const ok = (s) => console.log(`  ${C.green}✓${C.reset} ${s}`);
const warn = (s) => console.log(`  ${C.yellow}!${C.reset} ${s}`);
const err = (s) => console.error(`  ${C.red}✗${C.reset} ${s}`);
const step = (s) =>
  console.log(`\n${C.bold}${C.cyan}==>${C.reset} ${C.bold}${s}${C.reset}`);

console.log(`\n${C.bold}claude-multi-agent-dev · setup${C.reset}`);

// --------- prerequisites ---------
step("checking prerequisites");

const nodeMajor = Number(process.versions.node.split(".")[0]);
if (nodeMajor < 18) {
  err(`node >= 18 required, found v${process.versions.node}`);
  process.exit(1);
}
ok(`node v${process.versions.node}`);

const git = spawnSync("git", ["--version"], { encoding: "utf8" });
if (git.status !== 0) {
  err("git not found");
  process.exit(1);
}
ok(git.stdout.trim());

// --------- .env ---------
step("ensuring .env");

if (!existsSync(".env")) {
  if (!existsSync(".env.example")) {
    err(".env.example is missing — this repo is broken");
    process.exit(1);
  }
  copyFileSync(".env.example", ".env");
  ok("created .env from .env.example");
  warn(
    "review .env; only DASHBOARD_PORT is required for this branch",
  );
} else {
  ok(".env already exists");
}

// Load DASHBOARD_PORT from .env (best-effort)
let dashboardPort = process.env.DASHBOARD_PORT || "3456";
try {
  const envText = readFileSync(".env", "utf8");
  const m = envText.match(/^\s*DASHBOARD_PORT\s*=\s*(.+?)\s*$/m);
  if (m) dashboardPort = m[1].replace(/^["']|["']$/g, "").trim() || dashboardPort;
} catch {}

// --------- dashboard deps ---------
step("installing dashboard dependencies");

if (!existsSync(join("dashboard", "node_modules"))) {
  const npmInstall = spawnSync(NPM, ["install", "--silent"], {
    cwd: "dashboard",
    stdio: "inherit",
    shell: IS_WINDOWS,
  });
  if (npmInstall.status !== 0) {
    err("npm install failed");
    process.exit(1);
  }
  ok("dashboard deps installed");
} else {
  ok("dashboard deps already present");
}

// --------- lint agent routing ---------
step("linting routing table");

const lint = spawnSync(
  process.execPath,
  [join("scripts", "check-agents.mjs")],
  { stdio: "inherit" },
);
if (lint.status !== 0) {
  err("agent routing lint failed — see output above");
  process.exit(1);
}

// --------- done ---------
step("all set");

console.log(`
  ${C.green}✓ setup complete${C.reset}

  next steps:

    1. start the dashboard
       ${C.dim}$${C.reset} npm run dashboard
       ${C.dim}→ http://localhost:${dashboardPort}${C.reset}

    2. start Claude Code in this directory
       ${C.dim}$${C.reset} claude

    3. run the /start command with your request
       ${C.dim}>${C.reset} /start riset pythagoras + tkinter app + IEEE paper

  the main session (Lead Engineer) will route to the right specialist.
  watch the dashboard light up.
`);
