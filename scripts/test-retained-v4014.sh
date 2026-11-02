#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 || $# -gt 2 || ( $# -eq 2 && "${2:-}" != --exercise-runtime ) ]]; then
	echo "Usage: test-retained-v4014.sh <published-v4.0.14-archive> [--exercise-runtime]" >&2
	exit 2
fi

source_root="$(cd -- "$(dirname -- "$0")/.." && pwd -P)"
archive="$(realpath "$1")"
archive_sha=93ea2d6bb5496ad8924a080aac07c8548cfcd89ee8e00186cf7b221ad0449cc5
manifest_sha=efa242003892a088ec2ebf92eb85807c0c553c875d43a12a745963d3736f9ea0
commit=c35232fbcac1214ee37be2d879c9833064c64f97

if [[ "$(sha256sum "$archive" | cut -d ' ' -f 1)" != "$archive_sha" ]]; then
	echo "Retained release archive differs from the accepted v4.0.14 bytes." >&2
	exit 1
fi

mkdir -p "$source_root/.ai-work/runs"
temporary="$(mktemp -d "$source_root/.ai-work/runs/retained-v4014-XXXXXXXX")"
trap 'rm -rf -- "$temporary"' EXIT
mkdir "$temporary/tree"
tar -xzf "$archive" -C "$temporary/tree"
if [[ "$(sha256sum "$temporary/tree/runtime-manifest.json" | cut -d ' ' -f 1)" != "$manifest_sha" ]]; then
	echo "Retained release manifest differs from the accepted v4.0.14 bytes." >&2
	exit 1
fi

verifier=(python3 -B "$source_root/scripts/runtime-artifact.py" verify "$temporary/tree"
	--archive "$archive" --sha256 "$archive_sha" --commit "$commit" --manifest-sha256 "$manifest_sha")
if "${verifier[@]}" >"$temporary/current-only.log" 2>&1; then
	echo "Current-only verification accepted a historical contract." >&2
	exit 1
fi
grep -q "runtime contract digest mismatch" "$temporary/current-only.log"
"${verifier[@]}" --retained-contract
if [[ "${2:-}" == --exercise-runtime ]]; then
	bash "$source_root/scripts/test-unpacked-artifact.sh" "$temporary/tree" complete \
		--archive "$archive" --sha256 "$archive_sha" --commit "$commit" \
		--manifest-sha256 "$manifest_sha" --retained-contract
fi

printf 'tampered\n' >> "$temporary/tree/front-end/dist/index.html"
if "${verifier[@]}" --retained-contract >"$temporary/tampered.log" 2>&1; then
	echo "Retained release verification accepted changed runtime bytes." >&2
	exit 1
fi
grep -q "runtime file inventory" "$temporary/tampered.log"
echo "Exact v4.0.14 archive, historical contract, and tamper rejection passed."
