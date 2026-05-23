# claude-multi-agent-dev (general branch)

A Claude Code multi-agent workspace for writing papers, building slides, coding in Python, analyzing data, and running literature research.

Just type a request like *"polish my abstract paragraph"* or *"build a 15-minute Beamer deck from my paper"*, and the **main Claude session (Lead Engineer)** routes it to the right specialist — writer, slide-engineer, data-engineer, latex-engineer, etc. Coordination is **ad-hoc** (no GitHub issues / PRs / per-task branches); the main session delegates directly via the `Task` tool.

> **Why is the main session the Lead?** Claude Code doesn't allow nested `Task` (a subagent can't spawn another subagent). So the coordinator has to be the main session — it reads `CLAUDE.md`, picks specialists from the routing table, and Tasks them (in parallel when disjoint, sequentially when one's output feeds the next).

> **AV variant.** Branch `main` / `av-dev` carries a 10-specialist roster for autonomous-vehicle work (Autoware-based). This branch (`general`) is the general-purpose version for academic and software work.

---

## Architecture

```
                           ┌──────────────────┐
                           │   Lead Engineer  │  (routes each request)
                           └──┬────────────┬──┘
             ┌────────────────┤            ├────────────────┐
             │                │            │                │
   ┌─────────┼─────────┐      │            │     ┌─────────┼─────────┐
   ▼         ▼         ▼      ▼            ▼     ▼         ▼         ▼
┌────────┐┌───────┐┌────────┐┌────────┐┌────────┐┌────────┐┌────────┐┌──────┐
│Researcher││LaTeX││Python ││ Data   ││ Coder  ││ Writer ││ Slides ││ Math │
└────────┘└───────┘└────────┘└────────┘└────────┘└────────┘└────────┘└──────┘
```

| Agent | Role |
|---|---|
| **main session** (Lead Engineer) | Reads each request, routes to a specialist via `Task`, summarizes the outcome. Never writes domain content itself. |
| **researcher** | Literature review, library comparison, API docs, SOTA survey. Output to `docs/research/`. |
| **latex-engineer** | LaTeX typesetting — `.tex`, `.bib`, packages, build pipeline, fix compile errors. |
| **python-engineer** | General Python — scripts, CLI, small ML, scientific computing, packaging. |
| **data-engineer** | Data analysis & statistics — Jupyter notebooks, pandas, R, plots, statistical tests. |
| **coder** | Catch-all for non-Python code — bash, PowerShell, SQL, JS/TS, C/C++, Makefile, CMake. |
| **writer-editor** | Prose — essays, abstracts, proposals, journal drafts, paragraph editing. English + Bahasa Indonesia. |
| **slide-engineer** | Presentation decks — Beamer, Marp, reveal.js, PowerPoint outline. Includes speaker notes. |
| **math-engineer** | Derivations, proofs, sympy verification, optimization formulation. Outputs LaTeX math snippets. |

---

## Supported platforms

- **Linux** (Ubuntu 22.04 / 20.04 tested)
- **macOS** (Intel + Apple Silicon)
- **Windows 10 / 11** (PowerShell 5.1+ or PowerShell 7)

---

## The minimal stack

**Multi-agent routing is a Claude Code feature, not a service we run.** The Lead delegates via the built-in `Task` tool — no extra processes required.

What's truly required to use this workspace:

- **Claude Code CLI** — https://docs.claude.com/claude-code (this is the only hard dependency)
- **Git** — to clone the repo

That's it. Once Claude Code is installed and you've cloned the repo, `claude → /start <request>` already works.

Everything else is **per-specialist tooling** — only needed if that specialist actually runs:

| Specialist | What you need installed |
|---|---|
| `python-engineer`, `data-engineer`, `math-engineer` | Python 3.10+ |
| `latex-engineer`, Beamer in `slide-engineer` | TeX Live (Linux/macOS) or MiKTeX (Windows) |
| `data-engineer` if you want R | R 4.x |
| `slide-engineer` for Marp decks | Marp CLI (`npm i -g @marp-team/marp-cli`) |
| `coder` for C/C++ | gcc/g++ (Linux), clang (macOS), MSVC/MinGW (Windows) |

Install tooling only when you hit a specialist that needs it; missing tools will surface clearly.

### Installing per-platform tooling (examples)

**Linux (Ubuntu/Debian):**
```bash
sudo apt install python3 python3-pip git
sudo apt install texlive-latex-extra texlive-bibtex-extra latexmk   # optional
sudo apt install r-base                                              # optional
```

**macOS (Homebrew):**
```bash
brew install python git
brew install --cask mactex                                           # optional
brew install r                                                       # optional
```

**Windows (winget):**
```powershell
winget install Python.Python.3.12
winget install Git.Git
winget install MiKTeX.MiKTeX                                         # optional
winget install RProject.R                                            # optional
```

---

## Quickstart — minimal path (no dashboard)

```bash
# 1. Clone & switch to the general branch
git clone <repo-url> claude-multi-agent-dev
cd claude-multi-agent-dev
git checkout general

# 2. Open Claude Code in this directory
claude

# 3. Kick off with /start
/start research the Pythagorean theorem, then build a Tkinter app demonstrating it,
       and write a 6-page IEEE-formatted paper about it
```

That's it. The Lead routes your request through specialists via the `Task` tool. You'll see progress in the terminal as each subagent runs.

---

## Optional: live dashboard

The repo ships with a small Node.js dashboard that visualizes the 9-node agent graph (Lead + 8 specialists), activity log, and delegation tree. **Purely observability** — multi-agent works the same whether or not it's running.

### Installing the dashboard

Requires **Node.js 18+** (which is usually present already because Claude Code itself runs on Node).

```bash
# One-shot setup: copies .env.example → .env, installs dashboard deps, lints routing table
npm run setup

# Start the dashboard
npm run dashboard
# → http://localhost:3456
# Stop: npm run dashboard:stop
```

If you'd rather do it manually:
```bash
cp .env.example .env                  # (Windows: copy .env.example .env)
cd dashboard && npm install && cd ..
npm run dashboard
```

### Skipping the dashboard

If `dashboard/node_modules` isn't installed, the SessionStart hook detects this and exits silently — it won't slow you down or error out. The event-emitter hook (`emit.mjs`) likewise no-ops when the dashboard isn't reachable. So you can ignore the whole thing and just use `claude → /start ...`.

---

## Usage examples

Multi-agent is most useful when one request needs **multiple specialists in sequence**. Below are a few complete scenarios.

### Scenario 1 — Pythagoras: research + app + IEEE paper

```
> research the Pythagorean theorem, build a Tkinter app demonstrating it,
  and write a 6-page IEEE-formatted paper about it
```

Lead breaks this into a 5-step chain:

1. **`researcher`** → collect material (history, proofs, modern applications), write to `docs/research/pythagoras.md` with citations.
2. **`math-engineer`** (parallel with #3) → derive several proofs of the theorem (geometric + algebraic), verify with sympy, output LaTeX math snippets.
3. **`python-engineer`** (parallel with #2) → build a Tkinter app: input two sides → output hypotenuse + triangle visualization. Sanity-runs it.
4. **`writer-editor`** → write 6 pages of IEEE prose (abstract, intro, related work, method, app demo, conclusion) based on research + math output.
5. **`latex-engineer`** → pick up an IEEE template (`IEEEtran.cls`), wrap the prose + math + app screenshot, build the PDF with `latexmk`. Fix compile errors if any.

Final artifacts: a runnable `pythagoras_app.py` + `paper/paper.pdf` (6 pages, IEEE) + `docs/research/pythagoras.md` as reference.

### Scenario 2 — Lecture slides from a paper

```
> build 50-minute lecture slides on the Transformer architecture,
  based on the "Attention is All You Need" paper
```

1. **`researcher`** → read the PDF, write a structured summary to `docs/research/transformer.md` (motivation, architecture, results, critiques).
2. **`slide-engineer`** → read the summary, build a Beamer or Marp deck of ~25 slides (~2 min/slide), with speaker notes per slide. Structure: hook → RNN/LSTM bottleneck → self-attention → encoder-decoder → experiments → discussion.

### Scenario 3 — Build a small tool with research backing

```
> compare Python OCR libraries for Indonesian-language documents,
  then build a CLI tool that OCRs PDF files
```

1. **`researcher`** → compare Tesseract, EasyOCR, PaddleOCR on Indonesian documents. Output `docs/research/ocr-indonesian.md` + recommendation.
2. **`python-engineer`** → implement a CLI tool (`argparse` / `typer`) using the recommended library, read PDF → emit text. Tests with a sample PDF.

### Scenario 4 — Disjoint requests in parallel

```
> while you research the best Python scraping libraries, also polish my abstract.md
```

Since the two requests are independent, Lead Tasks them **in parallel** (one message, two tool calls):

- **`researcher`** → writes the comparison to `docs/research/python-scraping.md`.
- **`writer-editor`** → edits `abstract.md` directly, showing before → after.

### Scenario 5 — Single specialist

For focused requests, Lead routes straight to one specialist:

| Request | Specialist |
|---|---|
| `write a Python script to batch-rename files using regex` | `python-engineer` |
| `fix the grammar in this paragraph` | `writer-editor` |
| `derive the gradient of the MSE loss function` | `math-engineer` |
| `write a Makefile for a small C project` | `coder` |
| `compile error: ! Package biblatex Error: ...` | `latex-engineer` |

---

## Routing table

| Request category | Specialist |
|---|---|
| Literature / web / API / library comparison / SOTA survey | `researcher` |
| LaTeX `.tex`, BibTeX, compile errors, packages, figure/table layout | `latex-engineer` |
| Python script / CLI / small ML / scientific computing / packaging | `python-engineer` |
| Data analysis, statistical tests, plots, notebooks, pandas, R | `data-engineer` |
| Bash / PowerShell / SQL / JS/TS / C/C++ / Makefile / CMake / glue script | `coder` |
| Prose: essay, abstract, proposal, journal draft, paragraph editing | `writer-editor` |
| Slides: Beamer, Marp, reveal.js, PowerPoint outline | `slide-engineer` |
| Math: derivations, proofs, sympy, optimization formulation | `math-engineer` |

The authoritative routing table lives in `CLAUDE.md`. If you have Node.js, `npm run check-agents` lints it; otherwise you can just verify manually that every name in the table has a matching `.claude/agents/<name>.md`.

---

## Configuration

Core files (used by Claude Code at runtime — no other process needed):

| File | Purpose |
|---|---|
| `.claude/agents/*.md` | Per-specialist system prompts. Edit to change scope / rules. |
| `CLAUDE.md` | The routing table read by the Lead. The HTML sentinel comments `<!-- routing-table: -->` ... `<!-- end routing-table -->` must stay — they mark the block linted by `scripts/check-agents.mjs`. |
| `.claude/commands/start.md` | The `/start` slash command. |
| `.claude/skills/os-debug/` | Cross-platform OS-level debugging skill (journalctl/apt on Linux, PowerShell/winget on Windows). |
| `.mcp.json` | Empty by default. The `_examples` block is a template for adding external MCP servers. |

Optional (only relevant if you run the dashboard):

| File | Purpose |
|---|---|
| `.env` | `DASHBOARD_PORT` (defaults to 3456 if missing or absent). |
| `.claude/hooks/emit.mjs` | Posts every tool call / prompt / handoff to the dashboard. No-ops silently if the dashboard isn't running. |
| `.claude/hooks/ensure-dashboard.mjs` | Auto-spawns the dashboard at session start if `dashboard/node_modules` is installed. No-ops silently otherwise. |
| `dashboard/` | Node.js dashboard server + UI. |

---

## Optional npm scripts

Only useful if you opted into the dashboard. All scripts are pure Node.js — same syntax on Linux, macOS, and Windows.

| Command | What it does |
|---|---|
| `npm run setup` | One-shot setup — copies `.env`, installs dashboard deps, lints routing table |
| `npm run dashboard` | Starts the dashboard (detached, logs to `dashboard/dashboard.log`) |
| `npm run dashboard:stop` | Stops the dashboard if it was started via the script |
| `npm run check-agents` | Lints the routing table in `CLAUDE.md` against `.claude/agents/` |

---

## MCP roadmap

This workspace is ready to connect to **external MCP servers** (e.g. Notion, Google Drive, Zotero). Edit `.mcp.json` — the `_examples` block has stdio and HTTP templates. Specialists will automatically use relevant MCP tools when properly registered.

---

## Customization

- **Add a new specialist**: create `.claude/agents/<name>.md` using the same frontmatter style as `researcher.md`, then add a row to the routing table in `CLAUDE.md` (inside the sentinel comments). That's enough for the Lead to route to it. If you also use the dashboard, update the `SPECIALISTS` array in `dashboard/public/index.html` (around line 370) so the new node appears in the graph.
- **Edit a specialist's scope**: modify the corresponding `.claude/agents/<name>.md`. The "Hard rules" and "Output convention" sections matter most.
- **Discussion mode (read-only)**: use the `/diskusi` skill when you want to brainstorm without making any changes.

---

## Why this layout

The 9-role design focuses on academic workflow: research → write → code → analyze → present. See `./plans/general.plan.md` for the design document that drove the structure.

---

## License

MIT — see `LICENSE`.
