#!/usr/bin/env bash
set -euo pipefail

PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
export PATH
unset NODE_OPTIONS NODE_PATH PYTHONHOME PYTHONPATH
umask 077

legacy_release=v4.0.4
legacy_commit=396f75b089d1e8c4f60f349d43ec426a80a3a1db
base="${BASE_ROOT:-/srv/therestoration}"
release_root="$base/releases"
legacy_root="$base/legacy-releases"
current_link="$base/current"
service_name="${SERVICE_NAME:-restoration-app.service}"
health_url="${HEALTH_URL:-http://127.0.0.1:3007/healthz}"
ready_url="${READY_URL:-http://127.0.0.1:3007/readyz}"

if [[ $# -ne 1 || "$1" != "$legacy_commit" ]]; then
	echo "Usage: seal-v4.0.4-rollback.sh $legacy_commit" >&2
	exit 2
fi
if [[ ${EUID:-$(id -u)} -ne 0 ]]; then
	echo "Seal the one-time legacy rollback with root privileges during an approved maintenance window." >&2
	exit 1
fi

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
helper_root="$(cd -- "$script_dir/../.." && pwd -P)"
trusted_paths="$script_dir/trusted-paths.py"
legacy_tool="$helper_root/scripts/legacy-runtime.py"
/usr/bin/python3 -I "$trusted_paths" \
	"$script_dir/seal-v4.0.4-rollback.sh" "$trusted_paths" "$legacy_tool" \
	"$release_root" "$legacy_root" "$base/.deployment-recovery"

if [[ ! -L "$current_link" ]]; then
	echo "The current deployment must be a release symlink." >&2
	exit 1
fi
source_target="$(readlink -f -- "$current_link")"
release_root_real="$(cd -- "$release_root" && pwd -P)"
case "$source_target/" in
	"$release_root_real/"*) ;;
	*) echo "The active v4.0.4 source is outside the expected release root." >&2; exit 1 ;;
esac

recovery_root="$base/.deployment-recovery"
exec 9>"$recovery_root/promotion.lock"
if ! flock -n 9; then
	echo "Another Restoration promotion or transition is active." >&2
	exit 1
fi

sealed="$legacy_root/legacy-${legacy_release}-${legacy_commit:0:12}"
if ! nginx -t; then
	echo "Nginx configuration must pass before the one-time transition." >&2
	exit 1
fi
next_link="${current_link}.next.$$"
restore_link="${current_link}.restore.$$"
transition_started=false
switched=false
successful=false
cleanup() {
	if [[ -L "$next_link" ]]; then unlink -- "$next_link"; fi
	if [[ -L "$restore_link" ]]; then unlink -- "$restore_link"; fi
}
recover_on_exit() {
	local status=$?
	trap - EXIT
	if [[ "$transition_started" == true && "$successful" != true ]]; then
		if [[ "$switched" == true ]]; then
			if [[ ! -L "$restore_link" ]]; then ln -s -- "$source_target" "$restore_link"; fi
			mv -Tf -- "$restore_link" "$current_link" || true
			systemctl restart "$service_name" || true
		else
			systemctl start "$service_name" || true
		fi
	fi
	cleanup
	exit "$status"
}
trap recover_on_exit EXIT

systemctl stop "$service_name"
transition_started=true
if pgrep -u restoration >/dev/null; then
	echo "A restoration-owned process remains after service shutdown; refusing to capture mutable rollback input." >&2
	exit 1
fi
chown -R -h root:restoration "$source_target"
if [[ -e "$sealed" || -L "$sealed" ]]; then
	/usr/bin/python3 -I "$trusted_paths" --tree "$sealed"
	/usr/bin/python3 -I "$legacy_tool" verify "$sealed" >/dev/null
	/usr/bin/python3 -I "$legacy_tool" compare-source "$source_target" "$sealed" >/dev/null
else
	/usr/bin/python3 -I "$legacy_tool" capture "$source_target" "$sealed" >/dev/null
	chown -R root:restoration "$sealed"
	find "$sealed" -type d -exec chmod 0755 {} +
	find "$sealed" -type f -exec chmod 0644 {} +
	chmod 0600 "$sealed/.restoration-legacy-runtime.json"
	/usr/bin/python3 -I "$trusted_paths" --tree "$sealed"
	/usr/bin/python3 -I "$legacy_tool" verify "$sealed" >/dev/null
	/usr/bin/python3 -I "$legacy_tool" compare-source "$source_target" "$sealed" >/dev/null
fi

ln -s -- "$sealed" "$next_link"
ln -s -- "$source_target" "$restore_link"
mv -Tf -- "$next_link" "$current_link"
switched=true
if systemctl start "$service_name"; then
	for _attempt in {1..40}; do
		if curl --noproxy '*' --fail --silent --show-error --max-time 5 "$health_url" | grep -Eq '^\{"ok":true\}$' \
			&& curl --noproxy '*' --fail --silent --show-error --max-time 5 "$ready_url" | grep -Eq '^\{"ok":true\}$'; then
			successful=true
			echo "Sealed and activated the exact root-owned $legacy_release rollback tree without changing release identity."
			exit 0
		fi
		sleep 1
	done
fi

echo "The sealed legacy runtime failed readiness; restoring the original release pointer." >&2
exit 1
