#!/usr/bin/env node
// check-agents.mjs
//
// Cross-platform port of check-agents.sh. Works on Linux, macOS, and Windows
// (no bash required).
//
// Lint: every subagent_type referenced in the Lead Engineer routing table
// (embedded in CLAUDE.md between HTML comment markers) must exist as a file
// at .claude/agents/<name>.md.
//
//   <!-- routing-table: ... -->
//   <!-- end routing-table -->
//
// Usage:  node scripts/check-agents.mjs
// Exit 0 on success; non-zero if any referenced agent is missing.

import { existsSync, readFileSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");
const SOURCE_FILE = join(REPO_ROOT, "CLAUDE.md");
const AGENTS_DIR = join(REPO_ROOT, ".claude", "agents");

if (!existsSync(SOURCE_FILE)) {
  console.error(`✗ missing ${SOURCE_FILE}`);
  process.exit(1);
}

const text = readFileSync(SOURCE_FILE, "utf8");
const blockMatch = text.match(
  /<!-- routing-table:[\s\S]*?-->\s*([\s\S]*?)<!-- end routing-table -->/,
);

if (!blockMatch) {
  console.error(`✗ routing-table block not found in ${SOURCE_FILE}`);
  process.exit(1);
}

const block = blockMatch[1];
const names = [
  ...new Set(
    [...block.matchAll(/`([a-z][a-z0-9-]+)`/g)].map((m) => m[1]),
  ),
].sort();

if (names.length === 0) {
  console.error("✗ no agent names found in routing table");
  process.exit(1);
}

let missing = 0;
for (const n of names) {
  const filePath = join(AGENTS_DIR, `${n}.md`);
  if (existsSync(filePath)) {
    console.log(`  ✓ ${n}`);
  } else {
    console.error(`  ✗ ${n}  (missing .claude/agents/${n}.md)`);
    missing = 1;
  }
}

if (missing) {
  console.error("");
  console.error(
    "Fix: either create the missing agent file(s), or remove the row from the",
  );
  console.error(`routing table in ${SOURCE_FILE}.`);
  process.exit(1);
}

console.log("");
console.log(`routing table OK (${names.length} specialists resolved)`);
