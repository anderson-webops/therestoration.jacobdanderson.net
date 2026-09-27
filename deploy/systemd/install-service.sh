#!/usr/bin/env bash
# Bootstrap only from a separately reviewed, root-owned source copy.
set -euo pipefail

PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
export PATH
unset NODE_OPTIONS NODE_PATH PYTHONHOME PYTHONPATH
umask 077

if [[ ${EUID:-$(id -u)} -ne 0 ]]; then
	echo "Run the reviewed administrative installer as root." >&2
	exit 1
fi

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
source_root="$(cd -- "$script_dir/../.." && pwd -P)"
trusted_paths="$script_dir/trusted-paths.py"
node=/usr/bin/node

/usr/bin/python3 -I "$trusted_paths" \
	"$script_dir/install-service.sh" "$script_dir/promote-release.sh" "$trusted_paths" \
	"$script_dir/seal-v4.0.4-rollback.sh" \
	"$script_dir/restoration-app.service" "$script_dir/app.env.example" \
	"$script_dir/release.env.example" "$source_root/scripts/runtime-artifact.py" \
	"$source_root/scripts/legacy-runtime.py" "$source_root/deploy/runtime-artifact.json" \
	"$source_root/package.json" "$node"
if [[ ! -x "$node" || "$($node --version)" != v24.18.1 ]]; then
	echo "/usr/bin/node must remain the approved Node 24.18.1 runtime." >&2
	exit 1
fi

version="$($node -p 'require(process.argv[1]).version' "$source_root/package.json")"
if [[ ! "$version" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
	echo "The source package must declare a release version." >&2
	exit 1
fi

if ! getent group restoration >/dev/null; then
	groupadd --system restoration
fi
if ! id restoration >/dev/null 2>&1; then
	useradd --system --gid restoration --home-dir /srv/therestoration --shell /usr/sbin/nologin restoration
fi
service_gid="$(id -g restoration)"

ensure_directory() {
	local path="$1" owner="$2" group="$3" mode="$4"
	if [[ ! -e "$path" ]]; then
		install -d -o "$owner" -g "$group" -m "$mode" "$path"
		return
	fi
	if [[ -L "$path" || ! -d "$path" ]]; then
		echo "Expected a real directory: $path" >&2
		exit 1
	fi
	chown "$owner:$group" "$path"
	chmod "$mode" "$path"
}

base=/srv/therestoration
ensure_directory "$base" root "$service_gid" 0750
ensure_directory "$base/releases" root "$service_gid" 0750
ensure_directory "$base/legacy-releases" root "$service_gid" 0750
ensure_directory "$base/artifacts" root root 0700
ensure_directory "$base/incoming" root root 0700
ensure_directory "$base/.deployment-recovery" root root 0700
ensure_directory "$base/.deployment-recovery/accepted" root root 0700
ensure_directory "$base/shared" restoration "$service_gid" 0750
ensure_directory "$base/shared/npm-cache" restoration "$service_gid" 0700

config_root=/etc/therestoration
ensure_directory "$config_root" root "$service_gid" 0750
for pair in "app.env:$script_dir/app.env.example" "release.env:$script_dir/release.env.example"; do
	name="${pair%%:*}"
	example="${pair#*:}"
	destination="$config_root/$name"
	if [[ ! -e "$destination" ]]; then
		install -o root -g restoration -m 0640 "$example" "$destination"
	elif [[ -L "$destination" || ! -f "$destination" ]]; then
		echo "Protected environment path needs operator review: $destination" >&2
		exit 1
	else
		chown root:restoration "$destination"
		chmod 0640 "$destination"
	fi
done

helper_parent=/usr/local/libexec/therestoration-release
helper_root="$helper_parent/$version"
if [[ -e "$helper_root" || -L "$helper_root" ]]; then
	echo "Reviewed helper version already exists and will not be overwritten: $helper_root" >&2
	exit 1
fi
install -d -o root -g root -m 0755 "$helper_parent" "$helper_root" \
	"$helper_root/deploy" "$helper_root/deploy/systemd" "$helper_root/scripts"
install -o root -g root -m 0755 \
	"$script_dir/install-service.sh" "$script_dir/promote-release.sh" \
	"$script_dir/seal-v4.0.4-rollback.sh" "$trusted_paths" \
	"$helper_root/deploy/systemd/"
install -o root -g root -m 0755 \
	"$source_root/scripts/runtime-artifact.py" "$source_root/scripts/legacy-runtime.py" \
	"$helper_root/scripts/"
install -o root -g root -m 0644 "$source_root/deploy/runtime-artifact.json" "$helper_root/deploy/"
/usr/bin/python3 -I "$helper_root/deploy/systemd/trusted-paths.py" --tree "$helper_root"

current_helper="$helper_parent/current"
if [[ -e "$current_helper" && ! -L "$current_helper" ]]; then
	echo "Refusing to replace a non-symlink helper pointer: $current_helper" >&2
	exit 1
fi
next_helper="$helper_parent/.current.$$"
ln -s -- "$helper_root" "$next_helper"
mv -Tf -- "$next_helper" "$current_helper"

unit=/etc/systemd/system/restoration-app.service
if [[ -e "$unit" || -L "$unit" ]]; then
	/usr/bin/python3 -I "$helper_root/deploy/systemd/trusted-paths.py" "$unit"
fi
install -o root -g root -m 0644 "$script_dir/restoration-app.service" "$unit"
systemctl daemon-reload
systemctl enable restoration-app.service

cat <<EOF
Installed immutable Restoration release controls at $helper_root without restarting production.
The existing pre-artifact release is intentionally not rollback-eligible yet. Seal it once through a separately reviewed root-only transition before promoting the first artifact release.
EOF
