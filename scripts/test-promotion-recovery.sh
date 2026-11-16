#!/usr/bin/env bash
set -euo pipefail

root="$(cd -- "$(dirname -- "$0")/.." && pwd -P)"
node="$(realpath "$(command -v node)")"
test "$(uname -s)" = Linux
test "$(id -u)" -ne 0
test "$(node --version)" = v26.13.1

umask 077
node_sha256="$(sha256sum "$node" | cut -d ' ' -f 1)"
exec 3<"$node"

timeout -k 5 120 bwrap --unshare-all --die-with-parent --new-session --uid 0 --gid 0 \
	--ro-bind /usr /usr --symlink usr/bin /bin --symlink usr/lib /lib --symlink usr/lib64 /lib64 \
	--tmpfs /usr/local --perms 0755 --ro-bind-data 3 /runtime/node --proc /proc --dev /dev --tmpfs /tmp --tmpfs /fixture \
	--ro-bind "$root/deploy" /source/deploy --ro-bind "$root/scripts" /source/scripts \
	--clearenv --setenv PATH /usr/local/bin:/runtime:/usr/bin:/bin --setenv HOME /tmp \
	--setenv FIXTURE_NODE_SHA256 "$node_sha256" \
	--chdir /tmp /usr/bin/python3 -B /source/scripts/test-promotion-recovery.py "${1:-all}"
