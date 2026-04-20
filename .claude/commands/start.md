---
description: Entry point for the AV multi-agent workflow. Main session routes the request directly.
argument-hint: <what you want to do>
---

The user's request is: **$ARGUMENTS**

## Step 1 — Verify setup

1. Confirm `.env` exists at the repo root. If not, tell the user to copy `.env.example` to `.env` and (optionally) fill in remote-server values, then stop.
2. Check if the dashboard is running at `http://localhost:${DASHBOARD_PORT:-3456}` using `curl -sf http://localhost:${DASHBOARD_PORT:-3456}/healthz >/dev/null`. If not, suggest:
   ```bash
   bash scripts/start-dashboard.sh
   ```
   Do not block — continue even if the dashboard is down, but warn the user they won't see the visualization.

## Step 2 — Route directly

You are the Lead Engineer (main session). Do NOT Task a `lead-engineer` subagent — there isn't one, and nested Task is unsupported anyway.

Read `CLAUDE.md` for the routing table. Pick the right specialist(s):
- **Single specialist** for focused requests. Invoke via `Task(subagent_type: "<agent>", ...)`.
- **Multiple specialists in parallel** (single message, multiple `Task` calls) when tasks are disjoint.
- **Sequential chain** when one specialist's output is another's input (e.g., researcher writes a report, then mapping-engineer implements based on it).

For build / sync / run requests, invoke the Skill directly (`sync-to-remote`, `build-remote`, `run-remote`, `cek-remote-log`) — don't route through a specialist.

## Step 3 — Summarize

After specialist(s) return, write 2-3 sentences to the user: what changed, which files, what's next.
