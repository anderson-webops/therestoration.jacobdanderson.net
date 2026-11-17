#!/usr/bin/env bash
set -euo pipefail
umask 077

root="$(cd -- "$(dirname -- "$0")/.." && pwd -P)"
cd -- "$root"
stage="$(realpath "${1:?Pass an empty stage under .ai-work/runs}")"
output="$(realpath "${2:?Pass its owning output directory}")"
case "$output/" in "$root/.ai-work/runs/"*) ;; *) exit 1 ;; esac
case "$stage/" in "$output/"*) ;; *) exit 1 ;; esac
test -d "$stage"
test -z "$(find "$stage" -mindepth 1 -maxdepth 1 -print -quit)"
node scripts/check-build-toolchain.mjs > "$output/build-toolchain.json"
mkdir -p "$stage/back-end" "$stage/front-end" "$stage/vendor"
install -m 0644 package.json package-lock.json "$stage/"
install -m 0644 back-end/package.json "$stage/back-end/"
install -m 0644 front-end/package.json "$stage/front-end/"
for archive in picomatch-4.0.7-webops.1 vite-plugin-vue-layouts-next-3.3.1-webops.1; do
	install -m 0644 "vendor/$archive.tgz" "$stage/vendor/"
done
(
	cd -- "$stage"
	npm ci --workspace back-end --omit=dev --include=optional --ignore-scripts --no-fund --no-audit
)
find "$stage/node_modules" -type l -delete
rm -f -- "$stage/node_modules/.package-lock.json"
python3 -B scripts/runtime-artifact.py prune "$stage" > "$output/pruned-workspace-peers.json"
(
	cd -- "$stage"
	npm ls --workspace back-end --omit=dev --all > "$output/dependency-tree.txt"
	npm audit --workspace back-end --omit=dev --audit-level=low
	npm audit --workspace back-end --audit-level=low
	npm audit signatures --workspace back-end
)
for archive in picomatch-4.0.7-webops.1 vite-plugin-vue-layouts-next-3.3.1-webops.1; do
	rm -- "$stage/vendor/$archive.tgz"
done
rmdir -- "$stage/vendor"
