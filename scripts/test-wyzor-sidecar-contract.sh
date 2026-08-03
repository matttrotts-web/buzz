#!/usr/bin/env bash
set -euo pipefail

repo_root=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
ci="$repo_root/.github/workflows/ci.yml"
release="$repo_root/.github/workflows/release.yml"
bundle="$repo_root/scripts/bundle-sidecars.sh"
tauri="$repo_root/desktop/src-tauri/tauri.conf.json"

grep -Fq 'buzz-backend-wyzor-hermes' "$bundle"
grep -Fq 'binaries/buzz-backend-wyzor-hermes' "$tauri"
grep -Fq 'for bin in buzz-acp buzz-agent buzz-dev-mcp git-credential-nostr buzz buzz-backend-wyzor-hermes; do' "$ci"
grep -Fq 'touch "desktop/src-tauri/binaries/buzz-backend-wyzor-hermes-$TARGET"' "$ci"

release_builds=$(grep -Ec 'cargo build --release.*-p wyzor-hermes-provider' "$release")
[[ "$release_builds" -eq 4 ]] || {
  echo "expected all four desktop release builds to compile wyzor-hermes-provider; found $release_builds" >&2
  exit 1
}

echo "Wyzor sidecar contract passed"
