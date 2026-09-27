#!/usr/bin/env bash
set -euo pipefail
umask 077

root="$(cd -- "$(dirname -- "$0")/.." && pwd -P)"
cd -- "$root"
test "$(id -u)" -ne 0
test "$(uname -s)" = Linux
test "$(uname -m)" = aarch64
test "$(node --version)" = v24.18.1
test "$(npm --version)" = 12.0.2
test -z "$(git status --porcelain)"
git check-ignore -q .ai-work/

output="$(realpath "${1:?Pass an empty output directory under .ai-work/runs}")"
case "$output/" in
	"$root/.ai-work/runs/"*) ;;
	*) echo "Output must be repository-owned scratch under .ai-work/runs." >&2; exit 1 ;;
esac
test -z "$(find "$output" -mindepth 1 -maxdepth 1 -print -quit)"

commit="$(git rev-parse HEAD)"
version="$(node -p 'require("./package.json").version')"
release="v$version"
export PUPPETEER_SKIP_DOWNLOAD=true
export SOURCE_DATE_EPOCH
SOURCE_DATE_EPOCH="$(git show -s --format=%ct HEAD)"
unset NODE_ENV NODE_OPTIONS

for directory in . front-end back-end; do
	while IFS= read -r -d '' environment_file; do
		[[ "$(basename -- "$environment_file")" == .env.example ]] || {
			echo "Source-local environment files are forbidden: $environment_file" >&2
			exit 1
		}
	done < <(find "$directory" -maxdepth 1 -type f \( -name .env -o -name '.env.*' \) -print0)
done

npm ci --include=dev --include=optional --strict-allow-scripts --no-fund
npm run audit:all
npm run audit:prod
npm audit signatures
npm run check:native-bindings
npm run test:runtime-artifact
npm run build
npm run verify:deploy-assets
npm run verify:site
npm run test:promotion

export RESTORATION_RELEASE="$release"
export RESTORATION_COMMIT_SHA="$commit"
export RESTORATION_PREPARED_AT
RESTORATION_PREPARED_AT="$(date -u -d "@$SOURCE_DATE_EPOCH" +%Y-%m-%dT%H:%M:%SZ)"
node scripts/write-release-metadata.mjs

stage="$output/stage"
unpacked="$output/unpacked"
negative="$output/negative"
mkdir -p "$stage/back-end" "$stage/front-end" "$unpacked" "$negative"
install -m 0644 package.json package-lock.json .restoration-release-prepared.json "$stage/"
install -m 0644 back-end/package.json "$stage/back-end/"
install -m 0644 front-end/package.json "$stage/front-end/"
cp -R back-end/dist "$stage/back-end/"
cp -R front-end/dist "$stage/front-end/"

(
	cd -- "$stage"
	npm ci --workspace back-end --omit=dev --include=optional --ignore-scripts --no-fund --no-audit
	npm audit --workspace back-end --omit=dev --audit-level=low
	npm ls --workspace back-end --omit=dev --all > "$output/dependency-tree.txt"
)
find "$stage/node_modules" -type l -delete
rm -f -- "$stage/node_modules/.package-lock.json"
python3 -B scripts/runtime-artifact.py prune "$stage" > "$output/pruned-workspace-peers.json"
find "$stage" -type d -exec chmod 0755 {} +
find "$stage" -type f -exec chmod 0644 {} +
RESTORATION_RUNTIME_ROOT="$stage" node scripts/verify-production-install.mjs

archive="$output/therestoration-$release-${commit:0:12}-linux-arm64.tar.gz"
python3 -B scripts/runtime-artifact.py pack "$stage" --archive "$archive" --commit "$commit" > "$output/artifact.json"
sha="$(sha256sum "$archive" | cut -d ' ' -f 1)"
python3 -B scripts/runtime-artifact.py unpack "$unpacked" --archive "$archive" --sha256 "$sha" --commit "$commit"
cp -R "$unpacked/." "$negative/"
rm -- "$negative/back-end/dist/contact.js"
if python3 -B scripts/runtime-artifact.py verify "$negative" --archive "$archive" --sha256 "$sha" --commit "$commit"; then
	echo "An incomplete copied artifact was incorrectly accepted." >&2
	exit 1
fi
bash scripts/test-unpacked-artifact.sh "$negative" missing-module > "$output/acceptance.jsonl"
bash scripts/test-unpacked-artifact.sh "$unpacked" complete >> "$output/acceptance.jsonl"
python3 -B scripts/runtime-artifact.py verify "$unpacked" --archive "$archive" --sha256 "$sha" --commit "$commit"
cp "$unpacked/runtime-manifest.json" "$archive.manifest.json"

python3 -B - "$archive" "$commit" "$output" <<'PY'
import hashlib
import json
from pathlib import Path
import sys

archive = Path(sys.argv[1])
commit = sys.argv[2]
output = Path(sys.argv[3])
records = [json.loads(line) for line in (output / "acceptance.jsonl").read_text().splitlines()]
assert any(record.get("negativeModule") == "passed" and record.get("commit") == commit for record in records)
assert any(record.get("accepted") is True and record.get("commit") == commit for record in records)
harness = [
    Path("deploy/runtime-artifact.json"),
    Path("deploy/systemd/install-service.sh"),
    Path("deploy/systemd/promote-release.sh"),
    Path("deploy/systemd/seal-v4.0.4-rollback.sh"),
    Path("deploy/systemd/trusted-paths.py"),
    Path("scripts/artifact-acceptance/runtime.mjs"),
    Path("scripts/build-arm64-release.sh"),
    Path("scripts/runtime-artifact.py"),
    Path("scripts/legacy-runtime.py"),
    Path("scripts/test-promotion-recovery.py"),
    Path("scripts/test-promotion-recovery.sh"),
    Path("scripts/test-unpacked-artifact.sh"),
]
receipt = {
    "passed": True,
    "commit": commit,
    "archiveSha256": hashlib.sha256(archive.read_bytes()).hexdigest(),
    "records": records,
    "harnessFiles": {str(path): hashlib.sha256(path.read_bytes()).hexdigest() for path in harness},
}
Path(str(archive) + ".acceptance.json").write_text(json.dumps(receipt, indent=2) + "\n")
PY

test -z "$(git status --porcelain)"
printf '%s  %s\n' "$sha" "$(basename "$archive")" > "$archive.sha256"
cat "$output/artifact.json" "$archive.acceptance.json"
