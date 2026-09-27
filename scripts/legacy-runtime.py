#!/usr/bin/env python3
"""Capture and verify the exact v4.0.4 runtime for one-time rollback."""

import argparse
import datetime
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import stat
import shutil


LEGACY_RELEASE = "v4.0.4"
LEGACY_COMMIT = "396f75b089d1e8c4f60f349d43ec426a80a3a1db"
MANIFEST = ".restoration-legacy-runtime.json"
IDENTITY = ".restoration-release-prepared.json"
REQUIRED = {
	"package.json",
	"package-lock.json",
	"back-end/package.json",
	"back-end/dist/server.js",
	"back-end/dist/app.js",
	"back-end/dist/contact.js",
	"back-end/dist/deployment.js",
	"front-end/package.json",
	"front-end/dist/index.html",
	"front-end/dist/404.html",
	IDENTITY,
}


def load_runtime_artifact():
	path = Path(__file__).with_name("runtime-artifact.py")
	spec = importlib.util.spec_from_file_location("restoration_runtime_artifact", path)
	module = importlib.util.module_from_spec(spec)
	assert spec.loader is not None
	spec.loader.exec_module(module)
	return module


artifact = load_runtime_artifact()


def digest_bytes(data: bytes) -> str:
	return hashlib.sha256(data).hexdigest()


def read_regular(path: Path) -> bytes:
	metadata = path.lstat()
	if not stat.S_ISREG(metadata.st_mode) or metadata.st_nlink != 1 or metadata.st_mode & 0o022:
		raise ValueError(f"unsafe legacy runtime file: {path}")
	flags = os.O_RDONLY | getattr(os, "O_NOFOLLOW", 0)
	descriptor = os.open(path, flags)
	try:
		opened = os.fstat(descriptor)
		if not stat.S_ISREG(opened.st_mode) or opened.st_nlink != 1:
			raise ValueError(f"legacy runtime file changed while opened: {path}")
		chunks = []
		while chunk := os.read(descriptor, 1024 * 1024):
			chunks.append(chunk)
		closed = os.fstat(descriptor)
		if (opened.st_dev, opened.st_ino, opened.st_size, opened.st_mtime_ns) != (
			closed.st_dev,
			closed.st_ino,
			closed.st_size,
			closed.st_mtime_ns,
		):
			raise ValueError(f"legacy runtime file changed while read: {path}")
		return b"".join(chunks)
	finally:
		os.close(descriptor)


def read_json(path: Path) -> dict:
	value = json.loads(read_regular(path))
	if not isinstance(value, dict):
		raise ValueError(f"expected a JSON object: {path}")
	return value


def identity(root: Path) -> dict:
	value = read_json(root / IDENTITY)
	if set(value) != {"release", "commitSha", "deployedAt"}:
		raise ValueError("legacy identity has unexpected fields")
	if value["release"] != LEGACY_RELEASE or value["commitSha"] != LEGACY_COMMIT:
		raise ValueError("legacy identity is not the exact reviewed v4.0.4 release")
	try:
		datetime.datetime.fromisoformat(str(value["deployedAt"]).replace("Z", "+00:00"))
	except ValueError as error:
		raise ValueError("legacy deployment timestamp is invalid") from error
	if read_json(root / "package.json").get("version") != LEGACY_RELEASE.removeprefix("v"):
		raise ValueError("legacy package version differs from its release identity")
	return value


def selected_paths(root: Path) -> list[str]:
	root = root.resolve(strict=True)
	selected = set(REQUIRED)
	for relative_root in ("back-end/dist", "front-end/dist"):
		for path in (root / relative_root).rglob("*"):
			if path.is_file() and not path.is_symlink():
				selected.add(path.relative_to(root).as_posix())
	closure = artifact.runtime_dependency_closure(root, {"dependencyRoots": ["back-end"]})
	for package_directory in closure:
		for path in (root / package_directory).rglob("*"):
			if path.is_file() and not path.is_symlink():
				selected.add(path.relative_to(root).as_posix())
	missing = REQUIRED - selected
	if missing:
		raise ValueError(f"legacy runtime paths missing: {sorted(missing)}")
	return sorted(selected)


def inventory(root: Path) -> dict:
	root = root.resolve(strict=True)
	files = {}
	for name in selected_paths(root):
		if artifact.forbidden(name):
			raise ValueError(f"forbidden legacy runtime path: {name}")
		path = root / name
		resolved = path.resolve(strict=True)
		if resolved != path.absolute() or root not in resolved.parents:
			raise ValueError(f"unsafe legacy runtime path: {name}")
		data = read_regular(path)
		files[name] = {"sha256": digest_bytes(data), "size": len(data)}
	return files


def capture(source: Path, target: Path) -> dict:
	if os.geteuid() != 0:
		raise ValueError("legacy capture requires root")
	source = source.resolve(strict=True)
	if target.exists() or target.is_symlink():
		raise ValueError("legacy rollback target must not already exist")
	value = identity(source)
	before = inventory(source)
	target.mkdir(mode=0o755)
	try:
		for name in sorted(before):
			data = read_regular(source / name)
			if digest_bytes(data) != before[name]["sha256"] or len(data) != before[name]["size"]:
				raise ValueError(f"legacy source changed during capture: {name}")
			destination = target / name
			destination.parent.mkdir(parents=True, exist_ok=True, mode=0o755)
			with destination.open("xb") as stream:
				stream.write(data)
			destination.chmod(0o644)
		after = inventory(source)
		if before != after:
			raise ValueError("legacy source changed during capture")
		manifest = {
			"format": 1,
			"kind": "restoration-v4.0.4-legacy-rollback",
			"release": value["release"],
			"commit": value["commitSha"],
			"deployedAt": value["deployedAt"],
			"files": before,
		}
		(target / MANIFEST).write_text(json.dumps(manifest, indent=2, sort_keys=True) + "\n")
		(target / MANIFEST).chmod(0o600)
		verify(target)
		return manifest
	except BaseException:
		shutil.rmtree(target, ignore_errors=True)
		raise


def verify(target: Path) -> dict:
	target = target.resolve(strict=True)
	manifest = read_json(target / MANIFEST)
	if (
		set(manifest) != {"commit", "deployedAt", "files", "format", "kind", "release"}
		or manifest.get("format") != 1
		or manifest.get("kind") != "restoration-v4.0.4-legacy-rollback"
		or manifest.get("release") != LEGACY_RELEASE
		or manifest.get("commit") != LEGACY_COMMIT
		or identity(target) != {
			"release": manifest["release"],
			"commitSha": manifest["commit"],
			"deployedAt": manifest["deployedAt"],
		}
		or inventory(target) != manifest.get("files")
	):
		raise ValueError("sealed legacy rollback differs from its protected manifest")
	return manifest


def main():
	parser = argparse.ArgumentParser(description=__doc__)
	parser.add_argument("operation", choices=["capture", "compare-source", "identity", "verify"])
	parser.add_argument("path", type=Path)
	parser.add_argument("second", nargs="?", type=Path)
	args = parser.parse_args()
	if args.operation == "capture":
		if args.second is None:
			parser.error("capture requires source and target")
		result = capture(args.path, args.second)
	elif args.operation == "compare-source":
		if args.second is None:
			parser.error("compare-source requires source and sealed target")
		result = verify(args.second)
		if inventory(args.path) != result["files"] or identity(args.path)["commitSha"] != result["commit"]:
			raise ValueError("sealed rollback differs from the active legacy source")
	elif args.operation == "identity":
		result = verify(args.path)
		print("\t".join([result["release"], result["commit"], result["deployedAt"]]))
		return
	else:
		result = verify(args.path)
	print(json.dumps({"verified": True, "release": result["release"], "commit": result["commit"]}))


if __name__ == "__main__":
	main()
