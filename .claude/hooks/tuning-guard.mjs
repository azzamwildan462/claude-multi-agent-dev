#!/usr/bin/env node
// PreToolUse guard for the tuning-engineer subagent.
//
// The tuning-engineer is ONLY allowed to edit parameter / config / rviz files.
// Any Edit/Write against code files (.cpp, .hpp, .py, CMakeLists.txt,
// package.xml, etc.) is refused by this hook as a second line of defense
// behind the system prompt rule in .claude/agents/tuning-engineer.md.
//
// Registered in .claude/settings.json with matcher "Edit|Write".
//
// Exit codes (per Claude Code hooks spec):
//   0  = allow (default)
//   2  = block with stderr message shown to the model
//   any other non-zero = treated as soft failure; do not block

import { readFileSync } from "node:fs";

// Never hang: short stdin read with a timeout.
async function readStdin() {
  if (process.stdin.isTTY) return "";
  return new Promise((resolve) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (c) => (data += c));
    process.stdin.on("end", () => resolve(data));
    setTimeout(() => resolve(data), 300);
  });
}

function safeParse(s) {
  try {
    return JSON.parse(s || "");
  } catch {
    return null;
  }
}

// Whitelist: param yaml, config yaml anywhere under a config dir, RViz configs.
// Launch XML is NOT whitelisted wholesale — tuning-engineer is told in its
// prompt to only touch <param> blocks, but the launch-graph structure is code-
// shaped, so we force it through lead review by blocking Edit/Write on it here.
const PARAM_PATTERNS = [
  /\.param\.yaml$/i,
  /(^|\/)config\/.+\.ya?ml$/i,
  /\.rviz$/i,
];

function isParamFile(p) {
  if (!p) return false;
  return PARAM_PATTERNS.some((re) => re.test(p));
}

(async () => {
  const payload = safeParse(await readStdin()) || {};
  const agent = payload.agent_type || payload.subagent_type || null;

  // Only apply to the tuning-engineer. Everybody else is untouched.
  if (agent !== "tuning-engineer") process.exit(0);

  const tool = payload.tool_name || "";
  if (tool !== "Edit" && tool !== "Write") process.exit(0);

  const filePath = payload.tool_input && payload.tool_input.file_path;
  if (isParamFile(filePath)) process.exit(0);

  // Block.
  const msg =
    "tuning-engineer is restricted to parameter files. " +
    `Attempted ${tool} on "${filePath || "<unknown>"}" which is not a ` +
    "*.param.yaml, config/*.yaml, or *.rviz file. Hand this task back to the " +
    "lead-engineer so the right specialist (control / planning / perception / " +
    "localization / mapping / sensing / hardware) can make the code change.";
  process.stderr.write(msg + "\n");
  process.exit(2);
})().catch(() => {
  // Do not block on internal failure — fail open to avoid dead-locking sessions.
  process.exit(0);
});
