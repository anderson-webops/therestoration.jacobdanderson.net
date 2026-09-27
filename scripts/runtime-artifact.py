#!/usr/bin/env python3
"""Build and verify the closed Restoration Linux ARM64 runtime artifact."""

import argparse
import datetime
import gzip
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import platform
import re
import shutil
import stat
import tarfile


REPOSITORY_ROOT = Path(__file__).resolve().parent.parent
CONTRACT = REPOSITORY_ROOT / "deploy/runtime-artifact.json"
MANIFEST = "runtime-manifest.json"
IDENTITY = ".restoration-release-prepared.json"
COMMIT = re.compile(r"^[0-9a-f]{40}$")
PACKAGE_NAME = re.compile(r"^(?:@[A-Za-z0-9._~-]+/)?[A-Za-z0-9._~-]+$")
SEMVER_RELEASE = re.compile(r"^v\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$")
TIMESTAMP = re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?Z$")
FORBIDDEN_NAMES = {".env", ".htpasswd", "credentials.json", "id_ed25519", "id_rsa"}
FORBIDDEN_SUFFIXES = {".db", ".key", ".p12", ".pem", ".pfx", ".sqlite", ".sqlite3"}
DEVELOPMENT_PACKAGES = {"cypress", "eslint", "puppeteer", "tsx", "typescript", "vite", "vitest"}


def read_json(path, label):
    try:
        value = json.loads(Path(path).read_text())
    except (OSError, json.JSONDecodeError) as error:
        raise ValueError(f"invalid {label}") from error
    if not isinstance(value, dict):
        raise ValueError(f"invalid {label}")
    return value


def load_contract():
    value = read_json(CONTRACT, "runtime contract")
    if value.get("version") != 1:
        raise ValueError("unsupported runtime contract")
    return value


def digest(path):
    checksum = hashlib.sha256()
    with Path(path).open("rb") as stream:
        while chunk := stream.read(1024 * 1024):
            checksum.update(chunk)
    return checksum.hexdigest()


def normalized_name(name):
    if not isinstance(name, str) or name.startswith("/") or "\\" in name:
        raise ValueError(f"unsafe artifact path: {name}")
    path = PurePosixPath(name)
    if not path.parts or path.as_posix() != name or any(part in ("", ".", "..") for part in path.parts):
        raise ValueError(f"unsafe artifact path: {name}")
    return name


def permitted(name, contract=None):
    name = normalized_name(name)
    contract = contract or load_contract()
    return name in contract["allowedFiles"] or any(
        name == root or name.startswith(root + "/") for root in contract["allowedRoots"]
    )


def forbidden(name):
    parts = [part.lower() for part in PurePosixPath(name).parts]
    basename = parts[-1]
    return (
        basename in FORBIDDEN_NAMES
        or basename.startswith(".env.")
        or PurePosixPath(basename).suffix in FORBIDDEN_SUFFIXES
        or any(part in {"cache", "logs", "spool", "uploads", "writable-state"} for part in parts)
    )


def inventory(root, contract=None):
    root = Path(root)
    contract = contract or load_contract()
    allowed_executables = set(contract["allowedExecutables"])
    files = {}
    for path in sorted(root.rglob("*")):
        name = path.relative_to(root).as_posix()
        metadata = path.lstat()
        mode = stat.S_IMODE(metadata.st_mode)
        if stat.S_ISLNK(metadata.st_mode) or not (stat.S_ISDIR(metadata.st_mode) or stat.S_ISREG(metadata.st_mode)):
            raise ValueError(f"unsafe artifact object: {name}")
        if mode & 0o022:
            raise ValueError(f"writable artifact path: {name}")
        if stat.S_ISDIR(metadata.st_mode):
            continue
        if metadata.st_nlink != 1:
            raise ValueError(f"forbidden artifact path: {name}")
        if name == MANIFEST:
            continue
        if not permitted(name, contract) or forbidden(name):
            raise ValueError(f"forbidden artifact path: {name}")
        if mode & 0o111 and name not in allowed_executables:
            raise ValueError(f"unexpected executable artifact file: {name}")
        files[name] = {"mode": f"{mode:04o}", "sha256": digest(path), "size": metadata.st_size}
    return files


def resolve_package_directory(root, importer, dependency):
    if not isinstance(dependency, str) or not PACKAGE_NAME.fullmatch(dependency):
        raise ValueError(f"invalid production dependency name: {dependency}")
    current = Path(importer)
    while root == current or root in current.parents:
        candidate = current / "node_modules" / dependency
        if (candidate / "package.json").is_file():
            resolved = candidate.resolve(strict=True)
            if resolved != candidate.absolute() or not (resolved == root or root in resolved.parents):
                raise ValueError(f"unsafe production dependency path: {dependency}")
            return candidate
        if current == root:
            break
        current = current.parent
    return None


def runtime_dependency_closure(root, contract=None):
    root = Path(root).resolve(strict=True)
    contract = contract or load_contract()
    queue = []
    for dependency_root in contract["dependencyRoots"]:
        package = read_json(root / dependency_root / "package.json", f"package {dependency_root}")
        queue.extend((root / dependency_root, name, False) for name in package.get("dependencies", {}))
        queue.extend((root / dependency_root, name, True) for name in package.get("optionalDependencies", {}))
    visited = set()
    while queue:
        importer, dependency, optional = queue.pop()
        package_directory = resolve_package_directory(root, importer, dependency)
        if package_directory is None:
            if optional:
                continue
            raise ValueError(f"production dependency missing: {dependency}")
        relative = package_directory.relative_to(root).as_posix()
        if relative in visited:
            continue
        visited.add(relative)
        package = read_json(package_directory / "package.json", f"runtime package {relative}")
        queue.extend((package_directory, name, False) for name in package.get("dependencies", {}))
        queue.extend((package_directory, name, True) for name in package.get("optionalDependencies", {}))
        peer_metadata = package.get("peerDependenciesMeta", {})
        queue.extend(
            (package_directory, name, bool(peer_metadata.get(name, {}).get("optional")))
            for name in package.get("peerDependencies", {})
        )
    return visited


def package_directories(root):
    for package_file in sorted(Path(root).glob("node_modules/**/package.json")):
        relative = package_file.parent.relative_to(root).as_posix()
        parts = PurePosixPath(relative).parts
        package_index = len(parts) - 1
        if package_index > 0 and parts[package_index - 1].startswith("@"):
            package_index -= 1
        if package_index > 0 and parts[package_index - 1] == "node_modules":
            yield relative, package_file


def prune_runtime_dependencies(root):
    root = Path(root).resolve(strict=True)
    keep = runtime_dependency_closure(root)
    removed = []
    for relative, _package_file in sorted(package_directories(root), key=lambda item: len(item[0]), reverse=True):
        if relative in keep:
            continue
        path = root / relative
        if path.is_symlink():
            raise ValueError("remove workspace and binary links before pruning")
        shutil.rmtree(path)
        removed.append(relative)
    return removed


def validate_identity(root, manifest):
    root_package = read_json(root / "package.json", "root package")
    lock = read_json(root / "package-lock.json", "package lock")
    backend = read_json(root / "back-end/package.json", "back-end package")
    frontend = read_json(root / "front-end/package.json", "front-end package")
    identity = read_json(root / IDENTITY, "release identity")
    versions = {root_package.get("version"), lock.get("version"), backend.get("version"), frontend.get("version")}
    if len(versions) != 1:
        raise ValueError("workspace package versions and lock disagree")
    if set(identity) != {"release", "commitSha", "preparedAt"}:
        raise ValueError("invalid release identity fields")
    if (
        identity.get("release") != "v" + root_package["version"]
        or identity.get("commitSha") != manifest["commit"]
        or not SEMVER_RELEASE.fullmatch(str(identity.get("release", "")))
        or not TIMESTAMP.fullmatch(str(identity.get("preparedAt", "")))
    ):
        raise ValueError("release identity does not match package and source identity")
    try:
        datetime.datetime.fromisoformat(identity["preparedAt"].replace("Z", "+00:00"))
    except ValueError as error:
        raise ValueError("invalid release identity timestamp") from error
    if lock.get("lockfileVersion") != 3 or lock.get("packages", {}).get("back-end", {}).get("dependencies", {}) != backend.get("dependencies", {}):
        raise ValueError("back-end package and root lock dependencies disagree")


def validate(root, manifest):
    root = Path(root).resolve(strict=True)
    contract = load_contract()
    if not isinstance(manifest, dict) or set(manifest) != {"commit", "contractSha256", "contractVersion", "files", "format"}:
        raise ValueError("invalid runtime manifest fields")
    if manifest.get("format") != 1 or manifest.get("contractVersion") != contract["version"]:
        raise ValueError("unsupported runtime manifest")
    if manifest.get("contractSha256") != digest(CONTRACT):
        raise ValueError("runtime contract digest mismatch")
    if not COMMIT.fullmatch(str(manifest.get("commit", ""))):
        raise ValueError("invalid source commit")
    actual = inventory(root, contract)
    if actual != manifest.get("files"):
        raise ValueError("runtime file inventory, modes, hashes, or sizes differ")
    for name in contract["required"]:
        if name not in actual or not (root / name).is_file():
            raise ValueError(f"required runtime path missing: {name}")
    for name in contract["entrypoints"]:
        if name not in actual:
            raise ValueError(f"runtime entrypoint missing: {name}")
    validate_identity(root, manifest)
    expected_packages = runtime_dependency_closure(root, contract)
    observed_packages = {name for name, _package in package_directories(root)}
    if observed_packages != expected_packages:
        raise ValueError("runtime dependencies differ from the back-end production closure")
    for relative, package_file in package_directories(root):
        package_name = str(read_json(package_file, f"runtime package {relative}").get("name", ""))
        if package_name.rsplit("/", 1)[-1] in DEVELOPMENT_PACKAGES:
            raise ValueError(f"development dependency in runtime: {relative}")
    observed_native = sorted(
        name for name in actual
        if name.endswith(".node") or name.endswith(".so") or ".so." in PurePosixPath(name).name
    )
    if observed_native != sorted(contract["nativeBindings"]):
        raise ValueError("runtime native bindings differ from the explicit contract")
    return manifest


def write_archive(root, archive_path, manifest):
    epoch = int(os.environ.get("SOURCE_DATE_EPOCH", "0"))
    with archive_path.open("xb") as output:
        with gzip.GzipFile(filename="", mode="wb", fileobj=output, mtime=epoch) as compressed:
            with tarfile.open(fileobj=compressed, mode="w", format=tarfile.USTAR_FORMAT) as archive:
                for name in sorted([MANIFEST, *manifest["files"]]):
                    path = root / name
                    info = archive.gettarinfo(str(path), arcname=name)
                    info.uid = 0
                    info.gid = 0
                    info.uname = "root"
                    info.gname = "root"
                    info.mtime = epoch
                    with path.open("rb") as source:
                        archive.addfile(info, source)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("operation", choices=["pack", "prune", "unpack", "verify"])
    parser.add_argument("tree", type=Path)
    parser.add_argument("--archive", type=Path)
    parser.add_argument("--commit")
    parser.add_argument("--manifest-sha256")
    parser.add_argument("--sha256")
    args = parser.parse_args()
    root = args.tree.resolve(strict=True)

    if args.operation == "prune":
        print(json.dumps({"pruned": prune_runtime_dependencies(root)}))
        return
    if args.operation == "unpack":
        if not args.archive or not args.sha256 or not args.commit:
            parser.error("unpack requires --archive, --sha256, and --commit")
        if digest(args.archive) != args.sha256 or any(root.iterdir()):
            raise ValueError("archive hash mismatch or destination not empty")
        contract = load_contract()
        with tarfile.open(args.archive, "r:gz") as archive:
            members = archive.getmembers()
            names = [member.name for member in members]
            if (
                len(names) != len(set(names))
                or len(names) > 100_000
                or sum(member.size for member in members) > 512 * 1024 * 1024
                or any(not member.isfile() or (member.name != MANIFEST and not permitted(member.name, contract)) for member in members)
            ):
                raise ValueError("unsafe archive members")
            for member in members:
                target = root / normalized_name(member.name)
                target.parent.mkdir(parents=True, exist_ok=True)
                with archive.extractfile(member) as source, target.open("xb") as output:
                    while chunk := source.read(1024 * 1024):
                        output.write(chunk)
                target.chmod(member.mode & 0o755)
        manifest = validate(root, read_json(root / MANIFEST, "runtime manifest"))
        if manifest["commit"] != args.commit:
            raise ValueError("artifact source identity mismatch")
        print(json.dumps({"unpacked": True, "commit": manifest["commit"], "files": len(manifest["files"])}))
        return
    if args.operation == "pack":
        if platform.system() != "Linux" or platform.machine() != "aarch64":
            raise ValueError("build production artifacts on Linux ARM64")
        if not args.archive or not args.commit or not COMMIT.fullmatch(args.commit):
            parser.error("pack requires --archive and an exact --commit")
        manifest = {
            "format": 1,
            "commit": args.commit,
            "contractVersion": load_contract()["version"],
            "contractSha256": digest(CONTRACT),
            "files": inventory(root),
        }
        validate(root, manifest)
        (root / MANIFEST).write_text(json.dumps(manifest, indent=2, sort_keys=True) + "\n")
        write_archive(root, args.archive, manifest)
        print(json.dumps({"archive": args.archive.name, "sha256": digest(args.archive), "commit": args.commit, "files": len(manifest["files"])}))
        return

    declared = read_json(root / MANIFEST, "runtime manifest")
    if args.manifest_sha256 and digest(root / MANIFEST) != args.manifest_sha256:
        raise ValueError("runtime manifest digest mismatch")
    if args.archive or args.sha256:
        if not args.archive or not args.sha256 or digest(args.archive) != args.sha256:
            raise ValueError("trusted archive checksum mismatch")
        with tarfile.open(args.archive, "r:gz") as archive:
            trusted = json.load(archive.extractfile(MANIFEST))
        if declared != trusted:
            raise ValueError("staged manifest differs from trusted archive")
    manifest = validate(root, declared)
    if args.commit and manifest["commit"] != args.commit:
        raise ValueError("artifact source identity mismatch")
    print(json.dumps({"verified": True, "commit": manifest["commit"], "files": len(manifest["files"])}))


if __name__ == "__main__":
    main()
