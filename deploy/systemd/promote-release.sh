#!/usr/bin/env bash
set -euo pipefail

PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
export PATH
unset NODE_OPTIONS NODE_PATH PYTHONHOME PYTHONPATH
umask 077

release_root="${RELEASE_ROOT:-/srv/therestoration/releases}"
artifact_root="${ARTIFACT_ROOT:-/srv/therestoration/artifacts}"
legacy_root="${LEGACY_ROOT:-/srv/therestoration/legacy-releases}"
current_link="${CURRENT_LINK:-/srv/therestoration/current}"
release_env_dest="${RELEASE_ENV_DEST:-/etc/therestoration/release.env}"
service_name="${SERVICE_NAME:-restoration-app.service}"
release_group="${RELEASE_GROUP:-restoration}"
health_url="${HEALTH_URL:-http://127.0.0.1:3007/healthz}"
ready_url="${READY_URL:-http://127.0.0.1:3007/readyz}"
public_origin="${PUBLIC_ORIGIN:-https://therestoration.jacobdanderson.net}"
resolve_ipv4="${RESTORATION_RESOLVE_IPV4:-therestoration.jacobdanderson.net:443:127.0.0.1}"
resolve_ipv6="${RESTORATION_RESOLVE_IPV6:-therestoration.jacobdanderson.net:443:[::1]}"
max_attempts="${MAX_ATTEMPTS:-40}"

if [[ $# -ne 3 ]]; then
	echo "Usage: promote-release.sh <protected-archive> <sha256> <commit>" >&2
	exit 2
fi
if [[ ${EUID:-$(id -u)} -ne 0 ]]; then
	echo "Run the installed promotion helper with root privileges." >&2
	exit 1
fi
if [[ ! "$max_attempts" =~ ^[0-9]+$ || "$max_attempts" -lt 1 || "$max_attempts" -gt 120 ]]; then
	echo "MAX_ATTEMPTS must be between 1 and 120." >&2
	exit 1
fi

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
helper_root="$(cd -- "$script_dir/../.." && pwd -P)"
promoter="$script_dir/promote-release.sh"
trusted_paths="$script_dir/trusted-paths.py"
artifact_verifier="$helper_root/scripts/runtime-artifact.py"
legacy_verifier="$helper_root/scripts/legacy-runtime.py"
artifact_contract="$helper_root/deploy/runtime-artifact.json"
node="${NODE_BIN:-/usr/bin/node}"
archive="$1"
archive_sha="$2"
commit="$3"

if [[ ! "$archive_sha" =~ ^[0-9a-f]{64}$ || ! "$commit" =~ ^[0-9a-f]{40}$ ]]; then
	echo "Pass the independently reviewed archive digest and exact source commit." >&2
	exit 1
fi
/usr/bin/python3 -I "$trusted_paths" \
	"$promoter" "$trusted_paths" "$artifact_verifier" "$legacy_verifier" "$artifact_contract" \
	"$archive" "$release_root" "$artifact_root" "$legacy_root" \
	"$(dirname -- "$current_link")" "$node"
if [[ ! -x "$node" || "$($node --version)" != v24.18.1 ]]; then
	echo "/usr/bin/node must remain the approved Node 24.18.1 runtime." >&2
	exit 1
fi

release_root_real="$(cd -- "$release_root" && pwd -P)"
artifact_root_real="$(cd -- "$artifact_root" && pwd -P)"
legacy_root_real="$(cd -- "$legacy_root" && pwd -P)"
recovery_root="$(dirname -- "$current_link")/.deployment-recovery"
acceptance_root="$recovery_root/accepted"
/usr/bin/python3 -I "$trusted_paths" "$recovery_root" "$acceptance_root"
if [[ "$(stat -c '%a' "$recovery_root")" != 700 || "$(stat -c '%a' "$acceptance_root")" != 700 ]]; then
	echo "Deployment recovery directories must have mode 0700." >&2
	exit 1
fi
if [[ -e "$current_link" && ! -L "$current_link" ]]; then
	echo "Refusing to replace non-symlink deployment path: $current_link" >&2
	exit 1
fi

exec 9>"$recovery_root/promotion.lock"
if ! flock -n 9; then
	echo "Another Restoration promotion is active." >&2
	exit 1
fi

retained_archive="$artifact_root_real/$archive_sha.tar.gz"
if [[ -e "$retained_archive" || -L "$retained_archive" ]]; then
	/usr/bin/python3 -I "$trusted_paths" "$retained_archive"
	if [[ "$(sha256sum "$retained_archive" | cut -d ' ' -f 1)" != "$archive_sha" ]]; then
		echo "The retained archive does not match its protected name." >&2
		exit 1
	fi
else
	if [[ "$(sha256sum "$archive" | cut -d ' ' -f 1)" != "$archive_sha" ]]; then
		echo "The supplied archive checksum does not match." >&2
		exit 1
	fi
	install -o 0 -g 0 -m 0600 "$archive" "$retained_archive"
fi

stage="$(mktemp -d "$release_root_real/.stage-XXXXXXXX")"
next_link="${current_link}.next.$$"
release_env_temp="$(mktemp)"
response_health="$(mktemp)"
response_ready="$(mktemp)"
response_release="$(mktemp)"
headers_health="$(mktemp)"
headers_ipv4="$(mktemp)"
headers_ipv6="$(mktemp)"
page_ipv4="$(mktemp)"
page_ipv6="$(mktemp)"
recovery_record=""
mutation_started=false
finished=false
rollback_failed=false

cleanup_stage() {
	if [[ -n "$stage" && -d "$stage" ]]; then
		case "$stage/" in
			"$release_root_real/.stage-"*) rm -rf -- "$stage" ;;
			*) echo "Refusing to remove unexpected staging path: $stage" >&2 ;;
		esac
	fi
}

cleanup() {
	if [[ -L "$next_link" ]]; then unlink -- "$next_link"; fi
	cleanup_stage
	rm -f -- "$release_env_temp" "$response_health" "$response_ready" "$response_release" \
		"$headers_health" "$headers_ipv4" "$headers_ipv6" "$page_ipv4" "$page_ipv6"
}
trap cleanup EXIT

acceptance_record_path() {
	/usr/bin/python3 -I - "$1" "$acceptance_root" <<'PY'
import hashlib
from pathlib import Path
import sys
print(Path(sys.argv[2]) / (hashlib.sha256(sys.argv[1].encode()).hexdigest() + ".json"))
PY
}

validate_acceptance_record() {
	local target="$1" record="$2" expected_archive="${3:-}" expected_commit="${4:-}"
	/usr/bin/python3 -I - "$record" "$target" "$expected_archive" "$expected_commit" <<'PY'
import hashlib
import datetime
import json
from pathlib import Path
import re
import sys

record_path, target, expected_archive, expected_commit = sys.argv[1:]
value = json.loads(Path(record_path).read_text())
identity = json.loads(Path(target, ".restoration-release-prepared.json").read_text())
def timestamp(value):
    try:
        datetime.datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        return isinstance(value, str)
    except ValueError:
        return False
expected_keys = {"archiveSha256", "commit", "deployedAt", "format", "manifestSha256", "preparedAt", "release", "target"}
manifest = Path(target, "runtime-manifest.json")
valid = (
    isinstance(value, dict)
    and set(value) == expected_keys
    and value.get("format") == 1
    and value.get("target") == target
    and re.fullmatch(r"[0-9a-f]{64}", str(value.get("archiveSha256", "")))
    and re.fullmatch(r"[0-9a-f]{64}", str(value.get("manifestSha256", "")))
    and re.fullmatch(r"[0-9a-f]{40}", str(value.get("commit", "")))
    and re.fullmatch(r"v\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?", str(value.get("release", "")))
    and timestamp(value.get("preparedAt"))
    and timestamp(value.get("deployedAt"))
    and value.get("release") == identity.get("release")
    and value.get("commit") == identity.get("commitSha")
    and value.get("preparedAt") == identity.get("preparedAt")
    and hashlib.sha256(manifest.read_bytes()).hexdigest() == value.get("manifestSha256")
    and (not expected_archive or value.get("archiveSha256") == expected_archive)
    and (not expected_commit or value.get("commit") == expected_commit)
)
if not valid:
    raise SystemExit(1)
print("\t".join([value["release"], value["commit"], value["preparedAt"], value["deployedAt"], value["manifestSha256"], value["archiveSha256"]]))
PY
}

record_accepted_release() {
	local target="$1" accepted_archive="$2" accepted_commit="$3"
	local record temporary
	record="$(acceptance_record_path "$target")"
	if [[ -e "$record" || -L "$record" ]]; then
		/usr/bin/python3 -I "$trusted_paths" "$record"
		validate_acceptance_record "$target" "$record" "$accepted_archive" "$accepted_commit" >/dev/null
		return
	fi
	temporary="$(mktemp "$acceptance_root/.acceptance-XXXXXXXX")"
	if ! /usr/bin/python3 -I - "$temporary" "$target" "$accepted_archive" "$accepted_commit" <<'PY'
import datetime
import hashlib
import json
from pathlib import Path
import sys

temporary, target, archive_sha, commit = sys.argv[1:]
identity = json.loads(Path(target, ".restoration-release-prepared.json").read_text())
value = {
    "format": 1,
    "target": target,
    "archiveSha256": archive_sha,
    "commit": commit,
    "manifestSha256": hashlib.sha256(Path(target, "runtime-manifest.json").read_bytes()).hexdigest(),
    "release": identity["release"],
    "preparedAt": identity["preparedAt"],
    "deployedAt": datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z"),
}
Path(temporary).write_text(json.dumps(value, indent=2, sort_keys=True) + "\n")
Path(temporary).chmod(0o600)
PY
	then
		rm -f -- "$temporary"
		return 1
	fi
	mv -T -- "$temporary" "$record"
	/usr/bin/python3 -I "$trusted_paths" "$record"
	validate_acceptance_record "$target" "$record" "$accepted_archive" "$accepted_commit" >/dev/null
}

verify_accepted_release() {
	local target="$1" record fields accepted_commit accepted_manifest accepted_archive retained
	record="$(acceptance_record_path "$target")"
	[[ -f "$record" ]] || return 1
	/usr/bin/python3 -I "$trusted_paths" "$record" --tree "$target" || return 1
	fields="$(validate_acceptance_record "$target" "$record")" || return 1
	IFS=$'\t' read -r _release accepted_commit _prepared _deployed accepted_manifest accepted_archive <<<"$fields"
	retained="$artifact_root_real/$accepted_archive.tar.gz"
	/usr/bin/python3 -I "$trusted_paths" "$retained" || return 1
	/usr/bin/python3 -I "$artifact_verifier" verify "$target" \
		--archive "$retained" --sha256 "$accepted_archive" --commit "$accepted_commit" \
		--manifest-sha256 "$accepted_manifest"
}

target_kind() {
	case "$1/" in
		"$release_root_real/"*) printf '%s\n' artifact ;;
		"$legacy_root_real/"*) printf '%s\n' legacy ;;
		*) return 1 ;;
	esac
}

verify_target() {
	local target="$1" kind
	kind="$(target_kind "$target")" || return 1
	if [[ "$kind" == artifact ]]; then
		verify_accepted_release "$target" >/dev/null
	else
		/usr/bin/python3 -I "$trusted_paths" --tree "$target" \
			&& /usr/bin/python3 -I "$legacy_verifier" verify "$target" >/dev/null
	fi
}

target_identity() {
	local target="$1" kind record fields _release _commit _prepared _deployed _manifest _archive
	kind="$(target_kind "$target")" || return 1
	if [[ "$kind" == legacy ]]; then
		/usr/bin/python3 -I "$legacy_verifier" identity "$target"
		return
	fi
	record="$(acceptance_record_path "$target")"
	fields="$(validate_acceptance_record "$target" "$record")" || return 1
	IFS=$'\t' read -r _release _commit _prepared _deployed _manifest _archive <<<"$fields"
	printf '%s\t%s\t%s\n' "$_release" "$_commit" "$_deployed"
}

/usr/bin/python3 -I "$artifact_verifier" unpack "$stage" \
	--archive "$retained_archive" --sha256 "$archive_sha" --commit "$commit"
readarray -t identity < <(/usr/bin/python3 -I - "$stage/.restoration-release-prepared.json" <<'PY'
import json
from pathlib import Path
import sys
value = json.loads(Path(sys.argv[1]).read_text())
print(value["release"])
print(value["commitSha"])
print(value["preparedAt"])
PY
)
release="${identity[0]}"
if [[ "${identity[1]}" != "$commit" || ! "$release" =~ ^v[0-9]+\.[0-9]+\.[0-9]+([+-][0-9A-Za-z.-]+)?$ ]]; then
	echo "The artifact identity does not match the reviewed source." >&2
	exit 1
fi
candidate="$release-${commit:0:12}"
candidate="$release_root_real/$candidate"

if [[ -e "$candidate" || -L "$candidate" ]]; then
	/usr/bin/python3 -I "$trusted_paths" --tree "$candidate"
	/usr/bin/python3 -I "$artifact_verifier" verify "$candidate" \
		--archive "$retained_archive" --sha256 "$archive_sha" --commit "$commit"
	cmp -s "$stage/runtime-manifest.json" "$candidate/runtime-manifest.json" || {
		echo "An existing immutable release differs from the supplied artifact." >&2
		exit 1
	}
	cleanup_stage
	stage=""
else
	chown -R "0:$release_group" "$stage"
	find "$stage" -type d -exec chmod 0755 {} +
	find "$stage" -type f -exec chmod 0644 {} +
	mv -T -- "$stage" "$candidate"
	stage=""
	/usr/bin/python3 -I "$trusted_paths" --tree "$candidate"
	/usr/bin/python3 -I "$artifact_verifier" verify "$candidate" \
		--archive "$retained_archive" --sha256 "$archive_sha" --commit "$commit"
fi

record_accepted_release "$candidate" "$archive_sha" "$commit"
verify_accepted_release "$candidate" >/dev/null
if ! nginx -t; then
	echo "Nginx configuration must pass before promotion." >&2
	exit 1
fi

previous_target=""
if [[ -L "$current_link" ]]; then
	previous_target="$(readlink -f -- "$current_link" 2>/dev/null || true)"
	if [[ -z "$previous_target" || "$previous_target" == "$release_root_real" \
		|| "$previous_target" == "$legacy_root_real" || "$previous_target" == "$candidate" ]]; then
		echo "Rollback target must be a distinct immutable release." >&2
		exit 1
	fi
	if ! verify_target "$previous_target"; then
		echo "Existing release lacks valid root-protected rollback provenance. Seal the legacy release before promotion." >&2
		exit 1
	fi
elif systemctl is-active --quiet "$service_name"; then
	echo "An active service without a verified current release needs operator review." >&2
	exit 1
fi

write_release_environment() {
	local target="$1" fields target_release target_commit target_deployed
	fields="$(target_identity "$target")"
	IFS=$'\t' read -r target_release target_commit target_deployed <<<"$fields"
	printf 'RESTORATION_RELEASE=%s\nRESTORATION_COMMIT_SHA=%s\nRESTORATION_DEPLOYED_AT=%s\n' \
		"$target_release" "$target_commit" "$target_deployed" > "$release_env_temp"
	install -o 0 -g "$release_group" -m 0640 "$release_env_temp" "$release_env_dest"
}

activate_target() {
	local target="$1"
	if [[ -L "$next_link" ]]; then unlink -- "$next_link"; fi
	ln -s -- "$target" "$next_link"
	mv -Tf -- "$next_link" "$current_link"
}

probe_is_minimal() {
	/usr/bin/python3 -I - "$1" <<'PY'
import json
from pathlib import Path
import sys
raise SystemExit(0 if json.loads(Path(sys.argv[1]).read_text()) == {"ok": True} else 1)
PY
}

identity_matches() {
	local target="$1" actual="$2" fields expected_release expected_commit expected_deployed
	fields="$(target_identity "$target")"
	IFS=$'\t' read -r expected_release expected_commit expected_deployed <<<"$fields"
	/usr/bin/python3 -I - "$expected_release" "$expected_commit" "$expected_deployed" "$actual" <<'PY'
import json
from pathlib import Path
import sys
release, commit, deployed_at, actual_path = sys.argv[1:]
actual = json.loads(Path(actual_path).read_text())
raise SystemExit(0 if actual == {
    "release": release,
    "commitSha": commit,
    "deployedAt": deployed_at,
} else 1)
PY
}

strict_probe_headers() {
	local headers="$1"
	grep -Eiq '^Cache-Control:[[:space:]]*no-store' "$headers" \
		&& ! grep -Eiq '^Set-Cookie:' "$headers" \
		&& ! grep -Eiq '^Location:' "$headers"
}

strict_page_headers() {
	local headers="$1"
	grep -Eiq '^Content-Security-Policy:.*frame-ancestors .none.' "$headers" \
		&& ! grep -Eiq '^Content-Security-Policy:.*unsafe-eval' "$headers" \
		&& grep -Eiq '^X-Content-Type-Options:[[:space:]]*nosniff' "$headers" \
		&& grep -Eiq '^X-Frame-Options:[[:space:]]*DENY' "$headers"
}

edge_status() {
	local family="$1" resolve="$2" url="$3"
	shift 3
	curl --noproxy '*' "$family" --silent --show-error --max-time 5 --resolve "$resolve" \
		--output /dev/null --write-out '%{http_code}' "$@" "$url"
}

wait_for_target() {
	local target="$1" _attempt
	for ((_attempt = 1; _attempt <= max_attempts; _attempt++)); do
		if curl --noproxy '*' --fail --silent --show-error --max-time 5 --dump-header "$headers_health" \
			"$health_url" --output "$response_health" \
			&& probe_is_minimal "$response_health" && strict_probe_headers "$headers_health" \
			&& curl --noproxy '*' --fail --silent --show-error --max-time 5 "$ready_url" --output "$response_ready" \
			&& probe_is_minimal "$response_ready" \
			&& curl --noproxy '*' --ipv4 --fail --silent --show-error --max-time 5 --resolve "$resolve_ipv4" \
				"$public_origin/release.json" --output "$response_release" \
			&& identity_matches "$target" "$response_release" \
			&& curl --noproxy '*' --ipv6 --fail --silent --show-error --max-time 5 --resolve "$resolve_ipv6" \
				"$public_origin/release.json" --output "$response_release" \
			&& identity_matches "$target" "$response_release" \
			&& curl --noproxy '*' --ipv4 --fail --silent --show-error --max-time 5 --resolve "$resolve_ipv4" \
				--dump-header "$headers_ipv4" "$public_origin/" --output "$page_ipv4" \
			&& curl --noproxy '*' --ipv6 --fail --silent --show-error --max-time 5 --resolve "$resolve_ipv6" \
				--dump-header "$headers_ipv6" "$public_origin/" --output "$page_ipv6" \
			&& cmp -s "$target/front-end/dist/index.html" "$page_ipv4" \
			&& cmp -s "$target/front-end/dist/index.html" "$page_ipv6" \
			&& strict_page_headers "$headers_ipv4" && strict_page_headers "$headers_ipv6" \
			&& [[ "$(edge_status --ipv4 "$resolve_ipv4" "$public_origin/healthz")" == 200 ]] \
			&& [[ "$(edge_status --ipv6 "$resolve_ipv6" "$public_origin/healthz" -I)" == 200 ]] \
			&& [[ "$(edge_status --ipv4 "$resolve_ipv4" "$public_origin/readyz" -I)" == 200 ]] \
			&& [[ "$(edge_status --ipv6 "$resolve_ipv6" "$public_origin/readyz")" == 200 ]] \
			&& [[ "$(edge_status --ipv4 "$resolve_ipv4" "$public_origin/api/contact" \
				-X POST -H 'Content-Type: application/json' -H 'Origin: https://attacker.example' -H 'Sec-Fetch-Site: cross-site' --data '{}')" == 403 ]] \
			&& [[ "$(edge_status --ipv6 "$resolve_ipv6" "$public_origin/api/contact" \
				-X POST -H 'Content-Type: application/json' -H 'Origin: https://attacker.example' -H 'Sec-Fetch-Site: cross-site' --data '{}')" == 403 ]] \
			&& [[ "$(edge_status --ipv4 "$resolve_ipv4" "$public_origin/admin")" == 404 ]] \
			&& [[ "$(edge_status --ipv6 "$resolve_ipv6" "$public_origin/admin")" == 404 ]]; then
			return 0
		fi
		sleep 1
	done
	return 1
}

write_recovery_record() {
	local state="$1"
	/usr/bin/python3 -I - "$recovery_record" "$state" "$candidate" "$previous_target" <<'PY'
import datetime
import json
from pathlib import Path
import sys
record, state, candidate, previous = sys.argv[1:]
Path(record).write_text(json.dumps({
    "candidate": candidate,
    "format": 1,
    "previous": previous,
    "state": state,
    "updatedAt": datetime.datetime.now(datetime.timezone.utc).isoformat(),
}, indent=2, sort_keys=True) + "\n")
Path(record).chmod(0o600)
PY
}

rollback() {
	local failed=0
	if [[ -n "$previous_target" ]]; then
		verify_target "$previous_target" || return 1
		activate_target "$previous_target" || failed=1
		write_release_environment "$previous_target" || failed=1
		systemctl restart "$service_name" || failed=1
		nginx -t || failed=1
		wait_for_target "$previous_target" || failed=1
	else
		if [[ -L "$current_link" ]]; then unlink -- "$current_link" || failed=1; fi
		systemctl stop "$service_name" || failed=1
		nginx -t || failed=1
	fi
	return "$failed"
}

on_exit() {
	local status=$?
	trap - EXIT
	trap '' HUP INT TERM
	if [[ "$mutation_started" == true && "$finished" != true ]]; then
		if ! rollback; then
			rollback_failed=true
			write_recovery_record rollback_failed
			echo "CRITICAL: rollback needs operator recovery; protected record retained at $recovery_record" >&2
		fi
		if [[ "$status" -eq 0 ]]; then status=1; fi
	fi
	cleanup
	if [[ "$rollback_failed" != true && -n "$recovery_record" ]]; then rm -f -- "$recovery_record"; fi
	exit "$status"
}
trap on_exit EXIT
trap 'exit 129' HUP
trap 'exit 130' INT
trap 'exit 143' TERM

recovery_record="$(mktemp "$recovery_root/promotion-XXXXXXXX")"
write_recovery_record promotion_started
mutation_started=true
activate_target "$candidate"
write_release_environment "$candidate"
if systemctl restart "$service_name" && nginx -t && wait_for_target "$candidate"; then
	finished=true
	echo "Promoted $candidate and verified health, readiness, identity, content, and edge policy over IPv4 and IPv6."
	exit 0
fi
echo "Candidate acceptance failed; restoring the independently verified previous release." >&2
exit 1
