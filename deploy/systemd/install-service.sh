#!/usr/bin/env bash
set -euo pipefail

PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
export PATH

if [[ ${EUID:-$(id -u)} -ne 0 ]]; then
	echo "Run install-service.sh with root privileges." >&2
	exit 1
fi
if [[ ! -x /usr/bin/node || "$(/usr/bin/node --version)" != "v24.18.1" ]]; then
	echo "/usr/bin/node must be Node 24.18.1." >&2
	exit 1
fi

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"

if ! getent group restoration >/dev/null; then
	groupadd --system restoration
fi
if ! id restoration >/dev/null 2>&1; then
	useradd --system --gid restoration --home-dir /srv/therestoration --shell /usr/sbin/nologin restoration
fi

install -d -o restoration -g restoration -m 0750 /srv/therestoration
install -d -o restoration -g restoration -m 0750 /srv/therestoration/releases
install -d -o restoration -g restoration -m 0750 /srv/therestoration/shared
install -d -o restoration -g restoration -m 0700 /srv/therestoration/shared/npm-cache
install -d -o root -g restoration -m 0750 /etc/therestoration
install -o root -g root -m 0644 "$script_dir/restoration-app.service" /etc/systemd/system/restoration-app.service

if [[ ! -e /etc/therestoration/app.env ]]; then
	install -o root -g restoration -m 0640 "$script_dir/app.env.example" /etc/therestoration/app.env
fi
if [[ ! -e /etc/therestoration/release.env ]]; then
	install -o root -g restoration -m 0640 "$script_dir/release.env.example" /etc/therestoration/release.env
fi

systemctl daemon-reload
systemctl enable restoration-app.service

echo "Installed the Docker-free Restoration service without starting it. Configure /etc/therestoration, include the Nginx location, and promote a prepared release."
