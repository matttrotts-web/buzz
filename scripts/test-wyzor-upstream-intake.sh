#!/usr/bin/env bash
set -euo pipefail

repo_root=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
updater="$repo_root/scripts/wyzor-upstream-intake.sh"
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT

git -C "$tmp" init -q -b main source
git -C "$tmp/source" config user.name Test
git -C "$tmp/source" config user.email test@example.com
printf 'base\n' >"$tmp/source/README.md"
git -C "$tmp/source" add README.md
git -C "$tmp/source" commit -qm base
git -C "$tmp/source" tag -a desktop-v1.2.3 -m desktop-v1.2.3
git -C "$tmp/source" tag -a desktop-v9.9.9-rc.1 -m desktop-v9.9.9-rc.1
git clone -q --bare "$tmp/source" "$tmp/upstream.git"
git clone -q --bare "$tmp/source" "$tmp/fork.git"
git clone -q "$tmp/upstream.git" "$tmp/work"
git -C "$tmp/work" remote rename origin upstream
git -C "$tmp/work" remote add origin "$tmp/fork.git"

output=$(cd "$tmp/work" && UPSTREAM_REMOTE=upstream BASE_REF=HEAD "$updater" detect)
grep -Fxq 'latest_tag=desktop-v1.2.3' <<<"$output"
grep -Fxq 'integrated_tag=desktop-v1.2.3' <<<"$output"
grep -Fxq 'update_available=false' <<<"$output"

printf 'release 1.3.0\n' >>"$tmp/source/README.md"
git -C "$tmp/source" commit -qam 'upstream release 1.3.0'
git -C "$tmp/source" tag -a desktop-v1.3.0 -m desktop-v1.3.0
git -C "$tmp/source" push -q "$tmp/upstream.git" main --tags

git -C "$tmp/work" config user.name 'Wyzor Update Bot'
git -C "$tmp/work" config user.email 'wyzor-update-bot@users.noreply.github.com'
output=$(
  cd "$tmp/work" &&
    UPSTREAM_REMOTE=upstream FORK_REMOTE=origin BASE_REF=origin/main \
      "$updater" prepare
)
grep -Fxq 'status=prepared' <<<"$output"
grep -Fxq 'latest_tag=desktop-v1.3.0' <<<"$output"
grep -Fxq 'branch=codex/upstream-buzz-1.3.0' <<<"$output"
[[ "$(git -C "$tmp/work" branch --show-current)" == 'codex/upstream-buzz-1.3.0' ]]
git -C "$tmp/work" merge-base --is-ancestor desktop-v1.3.0 HEAD
[[ "$(git -C "$tmp/work" show -s --format='%P' HEAD | wc -w | tr -d ' ')" == 2 ]]
git -C "$tmp/work" show -s --format='%B' HEAD | grep -Fq 'Signed-off-by:'

git clone -q "$tmp/fork.git" "$tmp/fork-work"
git -C "$tmp/fork-work" config user.name Test
git -C "$tmp/fork-work" config user.email test@example.com
sed '1s/base/wyzor custom/' "$tmp/fork-work/README.md" >"$tmp/fork-work/README.next"
mv "$tmp/fork-work/README.next" "$tmp/fork-work/README.md"
git -C "$tmp/fork-work" commit -qam 'wyzor customization'
git -C "$tmp/fork-work" push -q origin main

sed '1s/base/upstream conflict/' "$tmp/source/README.md" >"$tmp/source/README.next"
mv "$tmp/source/README.next" "$tmp/source/README.md"
git -C "$tmp/source" commit -qam 'upstream release 1.4.0'
git -C "$tmp/source" tag -a desktop-v1.4.0 -m desktop-v1.4.0
git -C "$tmp/source" push -q "$tmp/upstream.git" main --tags

git clone -q "$tmp/fork.git" "$tmp/conflict-work"
git -C "$tmp/conflict-work" remote add upstream "$tmp/upstream.git"
git -C "$tmp/conflict-work" config user.name 'Wyzor Update Bot'
git -C "$tmp/conflict-work" config user.email 'wyzor-update-bot@users.noreply.github.com'
set +e
output=$(
  cd "$tmp/conflict-work" &&
    UPSTREAM_REMOTE=upstream FORK_REMOTE=origin BASE_REF=origin/main \
      "$updater" prepare 2>&1
)
status=$?
set -e
[[ "$status" == 2 ]]
grep -Fxq 'status=conflict' <<<"$output"
grep -Fxq 'conflicts=README.md' <<<"$output"
[[ -z "$(git -C "$tmp/conflict-work" status --porcelain)" ]]
if git -C "$tmp/conflict-work" rev-parse --verify MERGE_HEAD >/dev/null 2>&1; then
  echo "conflicted intake left MERGE_HEAD behind" >&2
  exit 1
fi

echo "Wyzor upstream intake contract passed"
