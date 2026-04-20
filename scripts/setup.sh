#!/usr/bin/env bash
# claude-multi-agent-dev · one-command setup (AV branch)
#
# - Verifies prerequisites (node, git, curl)
# - Ensures .env exists (copies from .env.example if missing)
# - Installs dashboard dependencies
# - Lints the lead-engineer routing table against .claude/agents/
#
# Usage:  bash scripts/setup.sh

set -euo pipefail

# --------- pretty output ---------
c_reset="\033[0m"
c_bold="\033[1m"
c_dim="\033[2m"
c_red="\033[31m"
c_green="\033[32m"
c_yellow="\033[33m"
c_cyan="\033[36m"

ok()   { printf "  ${c_green}✓${c_reset} %s\n" "$1"; }
warn() { printf "  ${c_yellow}!${c_reset} %s\n" "$1"; }
err()  { printf "  ${c_red}✗${c_reset} %s\n" "$1"; }
step() { printf "\n${c_bold}${c_cyan}==>${c_reset} ${c_bold}%s${c_reset}\n" "$1"; }

# --------- locate repo root ---------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

printf "\n${c_bold}claude-multi-agent-dev · AV setup${c_reset}\n"

# --------- prerequisites ---------
step "checking prerequisites"

if ! command -v node >/dev/null 2>&1; then
  err "node not found — install Node.js 18+ from https://nodejs.org"
  exit 1
fi
NODE_MAJOR="$(node -e 'console.log(process.versions.node.split(".")[0])')"
if [ "$NODE_MAJOR" -lt 18 ]; then
  err "node >= 18 required, found $(node -v)"
  exit 1
fi
ok "node $(node -v)"

if ! command -v git >/dev/null 2>&1; then
  err "git not found"
  exit 1
fi
ok "git $(git --version | awk '{print $3}')"

if ! command -v curl >/dev/null 2>&1; then
  err "curl not found"
  exit 1
fi
ok "curl present"

# --------- .env ---------
step "ensuring .env"

if [ ! -f .env ]; then
  if [ ! -f .env.example ]; then
    err ".env.example is missing — this repo is broken"
    exit 1
  fi
  cp .env.example .env
  ok "created .env from .env.example"
  warn "review .env; remote-server values are optional and only needed for sync/build/run skills"
fi

# Load .env (best-effort; all fields are optional on AV branch)
set -a
# shellcheck disable=SC1091
source .env || true
set +a

DASHBOARD_PORT="${DASHBOARD_PORT:-3456}"

# --------- dashboard deps ---------
step "installing dashboard dependencies"
if [ ! -d dashboard/node_modules ]; then
  (cd dashboard && npm install --silent)
  ok "dashboard deps installed"
else
  ok "dashboard deps already present"
fi

# --------- lint agent routing ---------
step "linting lead-engineer routing table"
if ! bash scripts/check-agents.sh; then
  err "agent routing lint failed — see output above"
  exit 1
fi

# --------- done ---------
step "all set"
cat <<EOF

  ${c_green}✓ setup complete${c_reset}

  next steps:

    1. start the dashboard
       ${c_dim}\$${c_reset} bash scripts/start-dashboard.sh
       ${c_dim}→ http://localhost:$DASHBOARD_PORT${c_reset}

    2. start Claude Code in this directory
       ${c_dim}\$${c_reset} claude

    3. run the /start command with your request
       ${c_dim}>${c_reset} /start debug lokalisasi yang drift di tikungan

  the lead-engineer will route to the right specialist. watch the dashboard light up.

EOF
