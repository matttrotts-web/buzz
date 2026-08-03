#!/usr/bin/env bash
set -euo pipefail

mode="${1:-detect}"
upstream_remote="${UPSTREAM_REMOTE:-upstream}"
fork_remote="${FORK_REMOTE:-origin}"
base_ref="${BASE_REF:-origin/main}"
output_file="${OUTPUT_FILE:-}"

fail() {
  echo "Wyzor upstream intake: $*" >&2
  exit 1
}

emit() {
  printf '%s\n' "$1"
  if [[ -n "$output_file" ]]; then
    printf '%s\n' "$1" >>"$output_file"
  fi
}

[[ "$mode" == detect || "$mode" == prepare ]] || fail "unknown mode '$mode'"
git rev-parse --git-dir >/dev/null 2>&1 || fail "run from a Git worktree"
if [[ "$mode" == prepare ]]; then
  git fetch "$fork_remote" '+refs/heads/main:refs/remotes/origin/main' --force --no-tags >/dev/null
fi
git rev-parse --verify "${base_ref}^{commit}" >/dev/null 2>&1 || fail "missing base ref '$base_ref'"

git fetch "$upstream_remote" '+refs/tags/desktop-v*:refs/tags/desktop-v*' --force --no-prune >/dev/null

release_tags=()
while IFS= read -r tag; do
  release_tags+=("$tag")
done < <(
  git tag --list 'desktop-v*' --sort=-v:refname |
    grep -E '^desktop-v[0-9]+\.[0-9]+\.[0-9]+$'
)
(( ${#release_tags[@]} > 0 )) || fail "upstream has no stable desktop release tags"

latest_tag="${release_tags[0]}"
integrated_tag="none"
for tag in "${release_tags[@]}"; do
  if git merge-base --is-ancestor "${tag}^{commit}" "${base_ref}^{commit}"; then
    integrated_tag="$tag"
    break
  fi
done

update_available=true
if [[ "$integrated_tag" == "$latest_tag" ]]; then
  update_available=false
fi

emit "latest_tag=$latest_tag"
emit "integrated_tag=$integrated_tag"
emit "update_available=$update_available"

if [[ "$mode" == detect ]]; then
  exit 0
fi

if [[ "$update_available" == false ]]; then
  emit "status=no-update"
  exit 0
fi

[[ -z "$(git status --porcelain)" ]] || fail "prepare requires a clean worktree"
version="${latest_tag#desktop-v}"
branch="${BRANCH_PREFIX:-codex/upstream-buzz-}${version}"
git switch -C "$branch" "${base_ref}^{commit}" >/dev/null

if ! git merge --no-ff --no-commit "${latest_tag}^{commit}"; then
  conflicts=$(git diff --name-only --diff-filter=U | paste -sd ',' -)
  git merge --abort >/dev/null 2>&1 || true
  emit "status=conflict"
  emit "branch=$branch"
  emit "conflicts=${conflicts:-unknown}"
  exit 2
fi

git commit -s -m "chore: merge Buzz ${version} into Wyzor Ops Mesh" >/dev/null
emit "status=prepared"
emit "branch=$branch"
emit "commit=$(git rev-parse HEAD)"
