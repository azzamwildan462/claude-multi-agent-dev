# claude-multi-agent-dev (AV branch)

Claude Code multi-agent workspace for **Autonomous Vehicle development based on Autoware**.

You give it a prompt like *"debug lokalisasi yang drift di tikungan"* and the **main Claude session (Lead Engineer)** routes it to the right specialist — perception, planning, control, localization, mapping, tuning, etc. Coordination is **ad-hoc** (no GitHub issues / PRs / branches per task); the main session delegates directly via the `Task` tool. Build & run happen on a remote server via pre-configured skills.

> **Why main session as Lead?** Claude Code does not allow nested `Task` (a subagent can't spawn another subagent). So the coordinator has to be the main session — it reads `CLAUDE.md`, picks specialist(s) from the routing table, and Tasks them (in parallel when disjoint, sequentially when one feeds the next).

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
┌──────┐┌──────┐┌─────────┐┌─────────┐┌──────────┐┌────────┐┌───────┐┌───────┐
│ HW   ││Sense ││Localize ││Mapping  ││Perception││Planning││Control││Sys-Ev │
└──────┘└──────┘└─────────┘└─────────┘└──────────┘└────────┘└───────┘└───────┘
                            ┌────────┐┌──────────┐
                            │ Tuning ││Researcher│
                            └────────┘└──────────┘
```

| Agent | Role |
|---|---|
| **main session** (Lead Engineer) | Reads each request, routes to a specialist (or several) via `Task`, summarizes. Never writes domain code. |
| **hardware-engineer** | Kernel modules, USB, CAN, EtherCAT (SOEM), tshark. Low-frequency. |
| **sensing-engineer** | Lidar / camera / radar ROS2 drivers; `/sensing/**` topic wiring, calibration. |
| **localization-engineer** | Debug + evaluate Autoware localization (NDT, YabLoc, EKF, pose init). |
| **mapping-engineer** | Lidar-IMU / Lidar-IMU-WheelEnc SLAM, GTSAM, loop closure, georeferencing, HD maps. |
| **perception-engineer** | Object detection, tracking, camera-lidar fusion. |
| **planning-engineer** | Path + behavior planning; custom scenario modules (e.g. road bump). |
| **control-engineer** | Trajectory → steering / throttle / brake. MPC, pure pursuit, longitudinal / lateral. |
| **system-evaluator** | End-to-end pipeline health, data drops, latency, rosbag analysis. |
| **tuning-engineer** | **Params / configs only.** Cannot edit code (enforced by PreToolUse hook). |
| **researcher** | Literature / web / algorithm research. Outputs to `docs/research/`. |

---

## Prerequisites

- **Ubuntu 22.04** (tested) or Ubuntu 20.04. Linux-only — no Windows / macOS support.
- **ROS2 Humble Hawksbill**
- **colcon** + **ament_cmake** (standard ROS2 build tooling)
- An **Autoware workspace** — or any colcon `src/` containing your AV packages (the agents don't require a specific `src/autoware/*` layout)
- **Claude Code CLI** — install from https://docs.claude.com/claude-code
- A **remote build host** (optional) if you want to use the `sync-to-remote` / `build-remote` / `run-remote` skills; otherwise skip those.

---

## Quickstart

```bash
# 1. One-command setup
bash scripts/setup.sh

# 2. Start the dashboard (optional but recommended)
bash scripts/start-dashboard.sh
# → http://localhost:3456

# 3. Start Claude Code in this directory
claude

# 4. Kick off with /start
/start debug lokalisasi drift di tikungan
```

The main Claude session (playing Lead) reads your request, picks the right specialist(s), and delegates — in parallel if disjoint, sequential if chained. You see it all light up on the dashboard: active agent, activity log, recent delegations.

---

## Remote build & run

Build and run happen on a remote server via skills (pre-configured in this workspace):

| Slash command | Skill | What it does |
|---|---|---|
| `/sync` | `sync-to-remote` | rsync the working tree to the remote host |
| `/build` | `build-remote` | compile on the remote host |
| `/run` | `run-remote` | launch the AV pipeline (mapping + rosbag replay) on the remote host |
| — | `cek-remote-log` | fetch and analyze the remote `run.log` |

The specialists are instructed to invoke these skills when the user asks to build, sync, run, or check logs.

---

## Configuration

- `.env` — only `DASHBOARD_PORT` is strictly required. `REMOTE_HOST` / `REMOTE_USER` are optional placeholders used by remote skills if/when you wire them up.
- `.mcp.json` — intentionally empty. Add domain MCPs (e.g. a ROS2 MCP) here when they become useful.
- `.claude/agents/*.md` — per-specialist system prompts. Edit these to change scope / rules.
- `CLAUDE.md` — contains the authoritative routing table (read by the main Claude session that acts as Lead). `scripts/check-agents.sh` lints it against the files in `.claude/agents/`.
- `.claude/hooks/tuning-guard.mjs` — PreToolUse guard that blocks the `tuning-engineer` from editing code files.
- `.claude/hooks/emit.mjs` — emits every tool call / prompt / handoff to the dashboard.

---

## Why this layout

The 11-role design mirrors the Autoware stack. See `./plans/av-dev.plan.md` for the design doc that drove the structure.

---

## License

MIT — see `LICENSE`.
