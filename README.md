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

Cross-platform — scripts are pure Node.js, no bash required:

- **Linux** (Ubuntu 22.04 / 20.04 tested)
- **macOS** (Intel + Apple Silicon)
- **Windows 10 / 11** (PowerShell 5.1+ or PowerShell 7)

---

## Prerequisites

Required on every platform:

- **Node.js 18+** — for the dashboard, hooks, and helper scripts
- **Claude Code CLI** — install from https://docs.claude.com/claude-code
- **Python 3.10+** — for `python-engineer`, `data-engineer`, `math-engineer`
- **Git** — for cloning and version control

Optional, depending on which specialists you use:

- **TeX Live** (Linux/macOS) or **MiKTeX** (Windows) — for `latex-engineer` and Beamer slides
- **R 4.x** — for `data-engineer` if you prefer R over Python
- **Marp CLI** — for `slide-engineer` if you want Marp decks: `npm install -g @marp-team/marp-cli`
- **A C/C++ compiler** — gcc/g++ (Linux), clang (macOS), MSVC or MinGW (Windows) for `coder`

### Installing prerequisites

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install nodejs npm python3 python3-pip git
sudo apt install texlive-latex-extra texlive-bibtex-extra latexmk   # optional
sudo apt install r-base                                              # optional
```

**macOS (Homebrew):**
```bash
brew install node python git
brew install --cask mactex                                           # optional
brew install r                                                       # optional
```

**Windows (winget):**
```powershell
winget install OpenJS.NodeJS
winget install Python.Python.3.12
winget install Git.Git
winget install MiKTeX.MiKTeX                                         # optional
winget install RProject.R                                            # optional
```

---

## Installation

```bash
# 1. Clone & switch to the general branch
git clone <repo-url> claude-multi-agent-dev
cd claude-multi-agent-dev
git checkout general

# 2. One-command setup (cross-platform — Node.js, no bash needed)
npm run setup

# This script:
#   - checks Node.js, git versions
#   - copies .env.example → .env if missing
#   - runs npm install in dashboard/
#   - lints the routing table against .claude/agents/
```

If you'd rather run things step-by-step:
```bash
cp .env.example .env                  # (Windows: copy .env.example .env)
cd dashboard && npm install && cd ..
npm run check-agents
```

---

## Quickstart

```bash
# 1. Start the dashboard (optional but recommended)
npm run dashboard
# → http://localhost:3456
# Stop: npm run dashboard:stop

# 2. Open Claude Code in this directory
claude

# 3. Kick off with /start
/start research the Pythagorean theorem, then build a Tkinter app demonstrating it,
       and write a 6-page IEEE-formatted paper about it
```

The main Claude session (acting as Lead) parses your request, breaks it into steps, and delegates — in parallel when possible, sequentially when there's a dependency. You see everything in the dashboard.

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

The authoritative routing table lives in `CLAUDE.md`. `npm run check-agents` lints it automatically if any agent file is missing.

---

## Configuration

| File | Purpose |
|---|---|
| `.env` | Only `DASHBOARD_PORT` is required (defaults to 3456). |
| `.mcp.json` | Empty by default. The `_examples` block is a template for adding external MCP servers. |
| `.claude/agents/*.md` | Per-specialist system prompts. Edit to change scope / rules. |
| `CLAUDE.md` | The routing table read by the Lead. The HTML sentinel comments `<!-- routing-table: -->` ... `<!-- end routing-table -->` must stay — `scripts/check-agents.mjs` parses that block. |
| `.claude/hooks/emit.mjs` | Emits every tool call / prompt / handoff to the dashboard. |
| `.claude/hooks/ensure-dashboard.mjs` | Auto-spawns the dashboard at session start if it's not already up. |
| `.claude/skills/os-debug/` | Cross-platform OS-level debugging skill (journalctl/apt on Linux, PowerShell/winget on Windows). |

---

## Dashboard

Open in a browser:

```
http://localhost:${DASHBOARD_PORT:-3456}
```

It shows:

- **9-node agent graph** — Lead in the center, 8 specialists around it. The active node lights up.
- **Activity log** — last ~60 events (tool calls, prompts, handoffs).
- **Delegations panel** — most recent `Task` handoffs.

Main-session events are tagged `lead-engineer` on the dashboard (`emit.mjs` default when no subagent context exists), so your routing decisions light up the Lead node.

---

## npm scripts

| Command | What it does |
|---|---|
| `npm run setup` | One-shot setup — checks prereqs, copies `.env`, installs dashboard deps, lints routing |
| `npm run dashboard` | Starts the dashboard (detached, logs to `dashboard/dashboard.log`) |
| `npm run dashboard:stop` | Stops the dashboard if it was started via the script |
| `npm run check-agents` | Lints the routing table in `CLAUDE.md` against `.claude/agents/` |

All scripts are pure Node.js — no bash, no PowerShell-specific syntax. Run them identically on Linux, macOS, and Windows.

---

## MCP roadmap

This workspace is ready to connect to **external MCP servers** (e.g. Notion, Google Drive, Zotero). Edit `.mcp.json` — the `_examples` block has stdio and HTTP templates. Specialists will automatically use relevant MCP tools when properly registered.

---

## Customization

- **Add a new specialist**: create `.claude/agents/<name>.md` using the same frontmatter style as `researcher.md`, then add a row to the routing table in `CLAUDE.md` (inside the sentinel comments). To make it appear in the dashboard graph, update the `SPECIALISTS` array in `dashboard/public/index.html` (around line 370).
- **Edit a specialist's scope**: modify the corresponding `.claude/agents/<name>.md`. The "Hard rules" and "Output convention" sections matter most.
- **Discussion mode (read-only)**: use the `/diskusi` skill when you want to brainstorm without making any changes.

---

## Why this layout

The 9-role design focuses on academic workflow: research → write → code → analyze → present. See `./plans/general.plan.md` for the design document that drove the structure.

---

## License

MIT — see `LICENSE`.
