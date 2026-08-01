#!/usr/bin/env bash
set -euo pipefail

repo_root=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
workflow="$repo_root/.github/workflows/wyzor-upstream-intake.yml"

[[ -f "$workflow" ]] || {
  echo "missing Wyzor upstream intake workflow" >&2
  exit 1
}

grep -Fq 'schedule:' "$workflow"
grep -Fq 'workflow_dispatch:' "$workflow"
grep -Fq 'contents: write' "$workflow"
grep -Fq 'pull-requests: write' "$workflow"
grep -Fq 'fetch-depth: 0' "$workflow"
grep -Fq 'https://github.com/block/buzz.git' "$workflow"
grep -Fq 'scripts/wyzor-upstream-intake.sh prepare' "$workflow"
grep -Fq 'scripts/test-wyzor-upstream-intake.sh' "$workflow"
grep -Fq 'scripts/test-wyzor-product-identity.mjs' "$workflow"
grep -Fq 'gh pr create --draft' "$workflow"

if grep -Eq 'gh pr merge|git push[^\n]*(main|production)|db:migrate|systemctl|/Applications/' "$workflow"; then
  echo "upstream intake workflow may merge, deploy, migrate, or install" >&2
  exit 1
fi

echo "Wyzor upstream workflow contract passed"
