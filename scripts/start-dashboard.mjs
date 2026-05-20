#!/usr/bin/env node
// start-dashboard.mjs
//
// Cross-platform port of start-dashboard.sh. Works on Linux, macOS, and Windows.
//
// Usage:
//   node scripts/start-dashboard.mjs           # start
//   node scripts/start-dashboard.mjs stop      # stop
// Or via npm: `npm run dashboard` / `npm run dashboard:stop`

import {
  existsSync,
  readFileSync,
  writeFileSync,
  unlinkSync,
  openSync,
} from "node:fs";
import { spawn, spawnSync } from "node:child_process";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { platform } from "node:os";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");
const DASHBOARD_DIR = join(REPO_ROOT, "dashboard");

const IS_WINDOWS = platform() === "win32";
const NPM = IS_WINDOWS ? "npm.cmd" : "npm";

// Load DASHBOARD_PORT from .env
let dashboardPort = process.env.DASHBOARD_PORT || "3456";
const envPath = join(REPO_ROOT, ".env");
if (existsSync(envPath)) {
  try {
    const envText = readFileSync(envPath, "utf8");
    const m = envText.match(/^\s*DASHBOARD_PORT\s*=\s*(.+?)\s*$/m);
    if (m) dashboardPort = m[1].replace(/^["']|["']$/g, "").trim() || dashboardPort;
  } catch {}
}

const PID_FILE = join(DASHBOARD_DIR, ".dashboard.pid");

function pidAlive(pid) {
  try {
    process.kill(Number(pid), 0);
    return true;
  } catch {
    return false;
  }
}

function killPid(pid) {
  try {
    process.kill(Number(pid));
    return true;
  } catch {
    return false;
  }
}

const cmd = (process.argv[2] || "start").toLowerCase();

if (cmd === "stop") {
  if (existsSync(PID_FILE)) {
    const pid = readFileSync(PID_FILE, "utf8").trim();
    if (killPid(pid)) {
      console.log(`  stopped dashboard (pid ${pid})`);
    } else {
      console.log(`  no running dashboard at pid ${pid}`);
    }
    try {
      unlinkSync(PID_FILE);
    } catch {}
  } else {
    console.log("  no pid file — dashboard not running (or started externally)");
  }
  process.exit(0);
}

if (cmd !== "start") {
  console.error(`usage: node scripts/start-dashboard.mjs [start|stop]`);
  process.exit(1);
}

// Already running?
if (existsSync(PID_FILE)) {
  const pid = readFileSync(PID_FILE, "utf8").trim();
  if (pidAlive(pid)) {
    console.log(`  dashboard already running (pid ${pid})`);
    console.log(`  http://localhost:${dashboardPort}`);
    process.exit(0);
  }
  try {
    unlinkSync(PID_FILE);
  } catch {}
}

// Ensure deps
if (!existsSync(join(DASHBOARD_DIR, "node_modules"))) {
  console.log("  installing dashboard dependencies...");
  const inst = spawnSync(NPM, ["install", "--silent"], {
    cwd: DASHBOARD_DIR,
    stdio: "inherit",
    shell: IS_WINDOWS,
  });
  if (inst.status !== 0) {
    console.error("  ✗ npm install failed");
    process.exit(1);
  }
}

console.log(`  starting orchestration dashboard on port ${dashboardPort}`);

const logPath = join(DASHBOARD_DIR, "dashboard.log");
const logFd = openSync(logPath, "a");

const child = spawn(process.execPath, ["server.js"], {
  cwd: DASHBOARD_DIR,
  detached: true,
  stdio: ["ignore", logFd, logFd],
  env: { ...process.env, DASHBOARD_PORT: String(dashboardPort) },
  windowsHide: true,
});

if (!child.pid) {
  console.error("  ✗ dashboard failed to start — see dashboard/dashboard.log");
  process.exit(1);
}

writeFileSync(PID_FILE, String(child.pid));
child.unref();

// Give it a moment to boot
await new Promise((r) => setTimeout(r, 500));

if (!pidAlive(child.pid)) {
  console.error("  ✗ dashboard failed to start — see dashboard/dashboard.log");
  try {
    unlinkSync(PID_FILE);
  } catch {}
  process.exit(1);
}

console.log(`  ✓ dashboard running (pid ${child.pid})`);
console.log(`  → http://localhost:${dashboardPort}`);
console.log("  logs: dashboard/dashboard.log");
console.log("  stop: npm run dashboard:stop");
