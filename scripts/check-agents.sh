#!/usr/bin/env bash
# check-agents.sh
#
# Lint: every subagent_type referenced in the Lead Engineer routing table
# (embedded in CLAUDE.md between HTML comment markers) must exist as a file
# at .claude/agents/<name>.md.
#
#   <!-- routing-table: ... -->
#   <!-- end routing-table -->
#
# The main Claude session plays the Lead role (nested Task is unsupported),
# so the routing table lives in CLAUDE.md — which the main session loads
# automatically — not in a subagent file.
#
# Exit 0 on success; non-zero if any referenced agent is missing.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

SOURCE_FILE="CLAUDE.md"
AGENTS_DIR=".claude/agents"

if [ ! -f "$SOURCE_FILE" ]; then
  echo "✗ missing $SOURCE_FILE" >&2
  exit 1
fi

# Extract block between the two marker comments, then pull out backtick-quoted
# names. This is deliberately strict — the table is small and authoritative.
block="$(awk '/<!-- routing-table:/{f=1; next} /<!-- end routing-table -->/{f=0} f' "$SOURCE_FILE")"

if [ -z "$block" ]; then
  echo "✗ routing-table block not found in $SOURCE_FILE" >&2
  exit 1
fi

# Pull every `word-with-dashes` that looks like a subagent filename.
mapfile -t names < <(printf '%s\n' "$block" \
  | grep -oE '`[a-z][a-z0-9-]+`' \
  | tr -d '`' \
  | sort -u)

if [ "${#names[@]}" -eq 0 ]; then
  echo "✗ no agent names found in routing table" >&2
  exit 1
fi

missing=0
for n in "${names[@]}"; do
  if [ -f "$AGENTS_DIR/$n.md" ]; then
    echo "  ✓ $n"
  else
    echo "  ✗ $n  (missing $AGENTS_DIR/$n.md)" >&2
    missing=1
  fi
done

if [ "$missing" -ne 0 ]; then
  echo >&2
  echo "Fix: either create the missing agent file(s), or remove the row from the" >&2
  echo "routing table in $SOURCE_FILE." >&2
  exit 1
fi

echo
echo "routing table OK (${#names[@]} specialists resolved)"
