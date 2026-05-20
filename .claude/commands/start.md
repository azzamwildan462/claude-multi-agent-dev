---
description: Entry point for the general-purpose multi-agent workflow. Main session routes the request directly.
argument-hint: <what you want to do>
---

The user's request is: **$ARGUMENTS**

## Step 1 — Verify setup

Check if the dashboard is running at `http://localhost:${DASHBOARD_PORT:-3456}`. Use a cross-platform check (works on Linux, macOS, and Windows):

```bash
node -e "fetch('http://localhost:'+(process.env.DASHBOARD_PORT||3456)+'/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
```

If it exits non-zero, suggest:

```bash
npm run dashboard
```

Do not block — continue even if the dashboard is down, but warn the user they won't see the visualization.

## Step 2 — Route directly

You are the Lead Engineer (main session). Do NOT Task a `lead-engineer` subagent — there isn't one, and nested Task is unsupported anyway.

Read `CLAUDE.md` for the routing table. Pick the right specialist(s):

- **Single specialist** for focused requests. Invoke via `Task(subagent_type: "<agent>", ...)`.
- **Multiple specialists in parallel** (single message, multiple `Task` calls) when tasks are disjoint.
- **Sequential chain** when one specialist's output is another's input (e.g., `researcher` writes a report, then `slide-engineer` builds a deck from it; `math-engineer` derives a formula, `writer-editor` writes the prose, `latex-engineer` wraps both into `.tex`).

## Step 3 — Summarize

After specialist(s) return, write 2-3 sentences to the user: what changed, which files, what's next. Mirror their language (Bahasa Indonesia or English).
