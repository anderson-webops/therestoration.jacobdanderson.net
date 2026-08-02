#!/usr/bin/env bash
set -euo pipefail

system_path=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
node_bin_dir="${NODE_BIN_DIR:-/usr/bin}"
if [[ "$node_bin_dir" != /* ]] || [[ ! -x "$node_bin_dir/node" ]] || [[ ! -x "$node_bin_dir/npm" ]]; then
	echo "NODE_BIN_DIR must be an absolute directory containing executable node and npm binaries." >&2
	exit 1
fi
node_bin_dir_real="$(cd -- "$node_bin_dir" && pwd -P)"
PATH="$node_bin_dir_real:$system_path"
export PATH
export PUPPETEER_SKIP_DOWNLOAD=true

release_root="${RELEASE_ROOT:-/srv/therestoration/releases}"

if [[ $# -ne 1 ]]; then
	echo "Usage: prepare-release.sh /srv/therestoration/releases/<release>" >&2
	exit 2
fi
if [[ ${EUID:-$(id -u)} -eq 0 ]]; then
	echo "Prepare releases as the unprivileged restoration deployment user, not root." >&2
	exit 1
fi

release_root_real="$(cd -- "$release_root" && pwd -P)"
candidate="$(cd -- "$1" && pwd -P)"
case "$candidate/" in
	"$release_root_real/"*) ;;
	*) echo "Candidate must resolve beneath $release_root_real: $candidate" >&2; exit 1 ;;
esac
if [[ "$candidate" == "$release_root_real" ]]; then
	echo "Candidate must be a release checkout beneath, not equal to, $release_root_real." >&2
	exit 1
fi
if [[ ! -f "$candidate/package-lock.json" ]] || ! git -C "$candidate" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
	echo "Candidate must be a complete Git checkout with the committed root lockfile." >&2
	exit 1
fi
if [[ -n "$(git -C "$candidate" status --porcelain)" ]]; then
	echo "Candidate checkout must be clean before preparation." >&2
	exit 1
fi

for environment_directory in "$candidate" "$candidate/front-end" "$candidate/back-end"; do
	while IFS= read -r -d '' environment_file; do
		if [[ "$(basename -- "$environment_file")" != ".env.example" ]]; then
			echo "Release preparation refuses source-local environment files: $environment_file" >&2
			exit 1
		fi
	done < <(find "$environment_directory" -maxdepth 1 -type f \( -name '.env' -o -name '.env.*' \) -print0)
done

if [[ "$(node --version)" != "v24.18.1" || "$(npm --version)" != "12.0.2" ]]; then
	echo "Preparation requires Node 24.18.1 and npm 12.0.2." >&2
	exit 1
fi

git -C "$candidate" fetch --quiet origin main --tags
export RESTORATION_COMMIT_SHA="$(git -C "$candidate" rev-parse HEAD)"
export RESTORATION_VERSION="$(node -p "require('$candidate/package.json').version")"
export RESTORATION_RELEASE="v$RESTORATION_VERSION"
export RESTORATION_DEPLOYED_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
release_tag="$RESTORATION_RELEASE"

if [[ "$(git -C "$candidate" cat-file -t "refs/tags/$release_tag" 2>/dev/null || true)" != "tag" ]]; then
	echo "$release_tag must exist as an annotated release tag before preparation." >&2
	exit 1
fi
if [[ "$(git -C "$candidate" rev-parse "$release_tag^{}")" != "$RESTORATION_COMMIT_SHA" ]]; then
	echo "$release_tag must peel to the exact candidate revision." >&2
	exit 1
fi
if [[ "$(git -C "$candidate" rev-parse origin/main)" != "$RESTORATION_COMMIT_SHA" ]]; then
	echo "The release candidate must be the exact fetched origin/main revision." >&2
	exit 1
fi

npm_cache="${NPM_CONFIG_CACHE:-$(dirname "$release_root_real")/shared/npm-cache}"
mkdir -p "$npm_cache"
export NPM_CONFIG_CACHE="$(cd -- "$npm_cache" && pwd -P)"

unset NODE_ENV
cd -- "$candidate"
npm ci --include=dev --include=optional --strict-allow-scripts
npm run audit:all
npm run audit:prod
npm audit signatures
npm run validate
npm run a11y
npm run test:e2e
node scripts/write-release-metadata.mjs

npm ci --omit=dev --include=optional --workspace back-end --include-workspace-root=false --strict-allow-scripts
node scripts/prune-production-dependencies.mjs
npm audit --omit=dev --audit-level=low
npm ls --omit=dev --workspace back-end --all >/dev/null
npm run verify:production-install
npm run test:direct-runtime

echo "Prepared Docker-free Restoration runtime release $candidate at $RESTORATION_COMMIT_SHA."
