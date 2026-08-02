#!/usr/bin/env bash
set -euo pipefail

PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
export PATH

release_root="${RELEASE_ROOT:-/srv/therestoration/releases}"
current_link="${CURRENT_LINK:-/srv/therestoration/current}"
release_env_dest="${RELEASE_ENV_DEST:-/etc/therestoration/release.env}"
service_name="${SERVICE_NAME:-restoration-app.service}"
health_url="${HEALTH_URL:-http://127.0.0.1:3007/healthz}"
ready_url="${READY_URL:-http://127.0.0.1:3007/readyz}"
public_origin="${PUBLIC_ORIGIN:-https://therestoration.jacobdanderson.net}"
resolve_ipv4="${RESTORATION_RESOLVE_IPV4:-therestoration.jacobdanderson.net:443:127.0.0.1}"
resolve_ipv6="${RESTORATION_RESOLVE_IPV6:-therestoration.jacobdanderson.net:443:[::1]}"

if [[ $# -ne 1 ]]; then
	echo "Usage: promote-release.sh /srv/therestoration/releases/<prepared-release>" >&2
	exit 2
fi
if [[ ${EUID:-$(id -u)} -ne 0 ]]; then
	echo "Run promotion with root privileges." >&2
	exit 1
fi
if [[ ! -x /usr/bin/node || "$(/usr/bin/node --version)" != "v24.18.1" ]]; then
	echo "/usr/bin/node must be Node 24.18.1." >&2
	exit 1
fi

release_root_real="$(cd -- "$release_root" && pwd -P)"
candidate="$(cd -- "$1" && pwd -P)"
case "$candidate/" in
	"$release_root_real/"*) ;;
	*) echo "Candidate must resolve beneath $release_root_real: $candidate" >&2; exit 1 ;;
esac
if [[ "$candidate" == "$release_root_real" ]]; then
	echo "Candidate must be a prepared release beneath, not equal to, $release_root_real." >&2
	exit 1
fi

for required_path in \
	.restoration-release-prepared.json \
	back-end/dist/server.js \
	back-end/package.json \
	front-end/dist/index.html \
	node_modules/express/package.json; do
	if [[ ! -e "$candidate/$required_path" ]]; then
		echo "Prepared release is missing $required_path." >&2
		exit 1
	fi
done
if [[ -e "$current_link" && ! -L "$current_link" ]]; then
	echo "Refusing to replace non-symlink deployment path: $current_link" >&2
	exit 1
fi
if ! nginx -t; then
	echo "Nginx configuration must pass before promotion." >&2
	exit 1
fi

previous_target=""
if [[ -L "$current_link" ]]; then
	previous_target="$(readlink -f -- "$current_link" 2>/dev/null || true)"
	if [[ -z "$previous_target" ]]; then
		echo "Existing deployment symlink does not resolve: $current_link" >&2
		exit 1
	fi
	case "$previous_target/" in
		"$release_root_real/"*) ;;
		*) echo "Existing deployment target is outside $release_root_real: $previous_target" >&2; exit 1 ;;
	esac
	if [[ ! -f "$previous_target/.restoration-release-prepared.json" ]]; then
		echo "Existing direct-runtime release is missing its rollback identity." >&2
		exit 1
	fi
fi

next_link="${current_link}.next.$$"
release_env_temp="$(mktemp)"
response_health="$(mktemp)"
response_ready="$(mktemp)"
response_release="$(mktemp)"
headers_ipv4="$(mktemp)"
headers_ipv6="$(mktemp)"
cleanup() {
	if [[ -L "$next_link" ]]; then unlink -- "$next_link"; fi
	rm -f -- "$release_env_temp" "$response_health" "$response_ready" "$response_release" "$headers_ipv4" "$headers_ipv6"
}
trap cleanup EXIT

activate_target() {
	local target="$1"
	ln -s -- "$target" "$next_link"
	mv -Tf -- "$next_link" "$current_link"
}

write_release_environment() {
	local target="$1"
	/usr/bin/node -e '
const fs = require("node:fs")
const release = JSON.parse(fs.readFileSync(process.argv[1], "utf8"))
if (!/^v\d+\.\d+\.\d+$/.test(release.release)) process.exit(1)
if (!/^[0-9a-f]{40}$/.test(release.commitSha)) process.exit(1)
if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(release.deployedAt)) process.exit(1)
process.stdout.write(`RESTORATION_RELEASE=${release.release}\nRESTORATION_COMMIT_SHA=${release.commitSha}\nRESTORATION_DEPLOYED_AT=${release.deployedAt}\n`)
' "$target/.restoration-release-prepared.json" > "$release_env_temp"
	install -o root -g restoration -m 0640 "$release_env_temp" "$release_env_dest"
}

identity_matches() {
	local expected="$1"
	local actual="$2"
	/usr/bin/node -e '
const fs = require("node:fs")
const expected = JSON.parse(fs.readFileSync(process.argv[1], "utf8"))
const actual = JSON.parse(fs.readFileSync(process.argv[2], "utf8"))
if (expected.release !== actual.release || expected.commitSha !== actual.commitSha || expected.deployedAt !== actual.deployedAt) process.exit(1)
' "$expected" "$actual"
}

health_identity_matches() {
	local expected="$1"
	local actual="$2"
	/usr/bin/node -e '
const fs = require("node:fs")
const expected = JSON.parse(fs.readFileSync(process.argv[1], "utf8"))
const body = JSON.parse(fs.readFileSync(process.argv[2], "utf8"))
const actual = body.deployment
if (!body.ok || !actual || expected.release !== actual.release || expected.commitSha !== actual.commitSha || expected.deployedAt !== actual.deployedAt) process.exit(1)
' "$expected" "$actual"
}

ready_identity_matches() {
	local expected="$1"
	local actual="$2"
	/usr/bin/node -e '
const fs = require("node:fs")
const expected = JSON.parse(fs.readFileSync(process.argv[1], "utf8"))
const body = JSON.parse(fs.readFileSync(process.argv[2], "utf8"))
const actual = body.deployment
if (!body.ready || !body.components?.contactMail?.ok || !actual || expected.release !== actual.release || expected.commitSha !== actual.commitSha || expected.deployedAt !== actual.deployedAt) process.exit(1)
' "$expected" "$actual"
}

strict_page_headers() {
	local headers="$1"
	grep -Eiq '^Content-Security-Policy:.*frame-ancestors .none.' "$headers" \
		&& ! grep -Eiq '^Content-Security-Policy:.*unsafe-eval' "$headers" \
		&& grep -Eiq '^X-Content-Type-Options:[[:space:]]*nosniff' "$headers" \
		&& grep -Eiq '^X-Frame-Options:[[:space:]]*DENY' "$headers"
}

edge_status() {
	local family="$1"
	local resolve="$2"
	local url="$3"
	shift 3
	curl --noproxy '*' "$family" --silent --show-error --max-time 5 --resolve "$resolve" \
		--output /dev/null --write-out '%{http_code}' "$@" "$url"
}

wait_for_target() {
	local target="$1"
	local marker="$target/.restoration-release-prepared.json"
	local attempt
	for attempt in {1..40}; do
		if curl --noproxy '*' --fail --silent --show-error --max-time 5 "$health_url" --output "$response_health" \
			&& health_identity_matches "$marker" "$response_health" \
			&& curl --noproxy '*' --fail --silent --show-error --max-time 5 "$ready_url" --output "$response_ready" \
			&& ready_identity_matches "$marker" "$response_ready" \
			&& curl --noproxy '*' --ipv4 --fail --silent --show-error --max-time 5 --resolve "$resolve_ipv4" \
				"$public_origin/release.json" --output "$response_release" \
			&& identity_matches "$marker" "$response_release" \
			&& curl --noproxy '*' --ipv6 --fail --silent --show-error --max-time 5 --resolve "$resolve_ipv6" \
				"$public_origin/release.json" --output "$response_release" \
			&& identity_matches "$marker" "$response_release" \
			&& curl --noproxy '*' --ipv4 --fail --silent --show-error --max-time 5 --resolve "$resolve_ipv4" \
				--dump-header "$headers_ipv4" "$public_origin/" --output /dev/null \
			&& curl --noproxy '*' --ipv6 --fail --silent --show-error --max-time 5 --resolve "$resolve_ipv6" \
				--dump-header "$headers_ipv6" "$public_origin/" --output /dev/null \
			&& strict_page_headers "$headers_ipv4" \
			&& strict_page_headers "$headers_ipv6" \
			&& [[ "$(edge_status --ipv4 "$resolve_ipv4" "$public_origin/api/contact" \
				-X POST -H 'Content-Type: application/json' -H 'Origin: https://attacker.example' -H 'Sec-Fetch-Site: cross-site' --data '{}')" == "403" ]] \
			&& [[ "$(edge_status --ipv6 "$resolve_ipv6" "$public_origin/api/contact" \
				-X POST -H 'Content-Type: application/json' -H 'Origin: https://attacker.example' -H 'Sec-Fetch-Site: cross-site' --data '{}')" == "403" ]] \
			&& [[ "$(edge_status --ipv4 "$resolve_ipv4" "$public_origin/admin")" == "404" ]] \
			&& [[ "$(edge_status --ipv6 "$resolve_ipv6" "$public_origin/admin")" == "404" ]]; then
			return 0
		fi
		sleep 1
	done
	return 1
}

activate_target "$candidate"
write_release_environment "$candidate"

if systemctl restart "$service_name" \
	&& nginx -t \
	&& systemctl reload nginx \
	&& wait_for_target "$candidate"; then
	echo "Promoted $candidate and verified readiness, exact IPv4/IPv6 identity, and strict edge policy."
	exit 0
fi

echo "Candidate runtime health or edge policy failed; restoring the previous direct release." >&2
if [[ -n "$previous_target" ]]; then
	activate_target "$previous_target"
	write_release_environment "$previous_target"
	systemctl restart "$service_name"
	nginx -t && systemctl reload nginx
	if ! wait_for_target "$previous_target"; then
		echo "The previous release was restored but did not pass readiness, identity, and edge checks." >&2
	fi
else
	unlink -- "$current_link"
	systemctl stop "$service_name" || true
	nginx -t && systemctl reload nginx
fi
exit 1
