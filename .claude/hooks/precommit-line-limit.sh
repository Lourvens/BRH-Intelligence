#!/usr/bin/env bash
# Claude Code PreToolUse hook: block `git commit` while a staged code file
# exceeds the 250-line cap. The split playbook is
# .agents/skills/code-organization/SKILL.md.

set -euo pipefail

input=$(cat)

# Extract the Bash command from the hook payload.
command=$(printf '%s' "$input" | python3 -c "
import json, sys
try:
    print(json.load(sys.stdin).get('tool_input', {}).get('command', ''))
except Exception:
    print('')
" 2>/dev/null || true)

# Act only when the command runs `git commit` (including after `cd ... &&`).
if ! printf '%s' "$command" | grep -Eq '(^|[;&|])[[:space:]]*git[[:space:]]+commit([[:space:]]|$)'; then
  exit 0
fi

# Staged files that add, copy, modify or rename content.
staged=$(git diff --staged --name-only --diff-filter=ACMR 2>/dev/null || true)
if [[ -z "$staged" ]]; then
  exit 0
fi

code_re='\.(py|ts|tsx|js|jsx|mjs|cjs)$'

declare -a offenders=()
while IFS= read -r f; do
  [[ -z "$f" ]] && continue
  [[ "$f" =~ $code_re ]] || continue
  # Vendored skills, agent worktrees and experiments are outside the product.
  [[ "$f" =~ ^(\.agents/|\.claude/|experiments/) ]] && continue
  [[ -f "$f" ]] || continue
  lines=$(wc -l < "$f" | tr -d ' ')
  if (( lines > 250 )); then
    offenders+=("$f ($lines lines)")
  fi
done <<< "$staged"

if (( ${#offenders[@]} == 0 )); then
  exit 0
fi

{
  echo "BLOCKED: ${#offenders[@]} staged code file(s) exceed the 250-line cap."
  echo ""
  echo "Offenders:"
  printf '  - %s\n' "${offenders[@]}"
  echo ""
  echo "Split by concern before retrying the commit. Read"
  echo ".agents/skills/code-organization/SKILL.md for the split playbook."
  echo "Required after the split: every touched code file <= 250 lines,"
  echo "make lint clean, and the focused tests green."
} >&2

exit 2
