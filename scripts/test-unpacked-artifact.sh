#!/usr/bin/env bash
set -euo pipefail

artifact="$(realpath "${1:?Pass the exact unpacked artifact}")"
case_name="${2:-complete}"
[[ "$case_name" == complete || "$case_name" == missing-module ]]
script_dir="$(cd -- "$(dirname -- "$0")" && pwd -P)"
node="$(realpath "$(command -v node)")"
test "$(id -u)" -ne 0
test "$(uname -s)" = Linux
test "$(uname -m)" = aarch64
test "$(node --version)" = v24.18.1

if [[ "$case_name" == complete ]]; then
	python3 -B "$script_dir/runtime-artifact.py" verify "$artifact"
fi

timeout -k 5 120 bwrap --unshare-all --die-with-parent --new-session \
	--ro-bind /usr /usr --symlink usr/bin /bin --symlink usr/lib /lib \
	--ro-bind "$node" /runtime/node --proc /proc --dev /dev --tmpfs /tmp --tmpfs /state \
	--ro-bind "$artifact" /app --ro-bind "$script_dir/artifact-acceptance" /harness \
	--clearenv --setenv PATH /runtime:/usr/bin:/bin --setenv HOME /state \
	--setenv NODE_OPTIONS --max-old-space-size=96 --setenv UV_THREADPOOL_SIZE 2 \
	--chdir /app /runtime/node /harness/runtime.mjs "$case_name"

if [[ "$case_name" == complete ]]; then
	python3 -B "$script_dir/runtime-artifact.py" verify "$artifact"
fi
