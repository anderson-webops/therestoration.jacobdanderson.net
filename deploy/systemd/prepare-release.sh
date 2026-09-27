#!/usr/bin/env bash
set -euo pipefail

root="$(cd -- "$(dirname -- "$0")/../.." && pwd -P)"
if [[ $# -ne 1 ]]; then
	echo "Usage: prepare-release.sh <empty-output-directory-under-.ai-work/runs>" >&2
	exit 2
fi

exec "$root/scripts/build-arm64-release.sh" "$1"
