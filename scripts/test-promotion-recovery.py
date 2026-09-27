"""Exercise the installed archive-only promoter under a synthetic root."""

import fcntl
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import shutil
import signal
import stat
import subprocess
import sys
import tarfile


assert os.geteuid() == 0 and not Path("/srv").exists()
SOURCE = Path("/source")
CANDIDATE_COMMIT = "a" * 40
PREVIOUS_COMMIT = "b" * 40
STUB = r'''#!/usr/bin/python3
import hashlib, json, os, pathlib, signal, sys
root = pathlib.Path(os.environ["FIXTURE_ROOT"])
mode = os.environ["FIXTURE_MODE"]
name = pathlib.Path(sys.argv[0]).name
args = sys.argv[1:]
current = root / "current"
target = current.resolve() if current.is_symlink() else None
candidate = target is not None and target.name.startswith("v1.0.1-")
def once(key):
    path = root / key
    if path.exists(): return False
    path.touch(); return True
if name == "sleep": sys.exit(0)
if name == "systemctl":
    if args[0] == "is-active": sys.exit(0 if current.is_symlink() else 3)
    if args[0] == "restart" and candidate and mode == "interrupt" and once("interrupted"):
        os.kill(os.getppid(), signal.SIGTERM)
    if args[0] == "restart" and candidate and mode == "restart-failure" and once("restart-failed"):
        sys.exit(1)
    if args[0] == "restart" and not candidate and mode == "rollback-failure": sys.exit(1)
    sys.exit(0)
if name == "nginx":
    if candidate and mode == "nginx-failure" and once("nginx-failed"): sys.exit(1)
    sys.exit(0)
if name == "curl":
    if candidate and mode in {"bad-health", "legacy-bad-health", "rollback-failure", "first-failure"}: sys.exit(22)
    url = next(value for value in args if value.startswith(("http://", "https://")))
    with (root / "probes").open("a") as stream: stream.write(" ".join(args) + "\n")
    if "--write-out" in args:
        if url.endswith("/api/contact"): print("403", end="")
        elif url.endswith("/admin"): print("404", end="")
        else: print("200", end="")
        sys.exit(0)
    output = pathlib.Path(args[args.index("--output") + 1])
    if url.endswith("/release.json"):
        if target.parent.name == "legacy-releases":
            record = json.loads((target / ".restoration-legacy-runtime.json").read_text())
        else:
            key = hashlib.sha256(str(target).encode()).hexdigest()
            record = json.loads((root / ".deployment-recovery/accepted" / f"{key}.json").read_text())
        output.write_text(json.dumps({"release": record["release"], "commitSha": record["commit"], "deployedAt": record["deployedAt"]}))
    elif url.endswith(("/healthz", "/readyz")):
        output.write_text('{"ok":true}')
    else:
        output.write_bytes((target / "front-end/dist/index.html").read_bytes())
    if "--dump-header" in args:
        headers = pathlib.Path(args[args.index("--dump-header") + 1])
        if url.endswith("/healthz"):
            headers.write_text("Cache-Control: no-store\n")
        else:
            headers.write_text("Content-Security-Policy: default-src 'self'; frame-ancestors 'none'\nX-Content-Type-Options: nosniff\nX-Frame-Options: DENY\n")
    sys.exit(0)
raise SystemExit(f"Unexpected fixture command: {name}")
'''


def load_artifact(control: Path):
	spec = importlib.util.spec_from_file_location("artifact", control / "scripts/runtime-artifact.py")
	artifact = importlib.util.module_from_spec(spec)
	assert spec.loader is not None
	spec.loader.exec_module(artifact)
	return artifact


def load_legacy(control: Path):
	spec = importlib.util.spec_from_file_location("legacy", control / "scripts/legacy-runtime.py")
	legacy = importlib.util.module_from_spec(spec)
	assert spec.loader is not None
	spec.loader.exec_module(legacy)
	return legacy


def make_archive(root: Path, artifact, version: str, commit: str, name: str):
	tree = root / f"build-{name}"
	tree.mkdir()
	contract = artifact.load_contract()
	for required in contract["required"]:
		path = tree / required
		path.parent.mkdir(parents=True, exist_ok=True)
		path.write_text("synthetic runtime file\n")
	package = {"version": version}
	backend = {"version": version, "dependencies": {}}
	(tree / "package.json").write_text(json.dumps(package))
	(tree / "back-end/package.json").write_text(json.dumps(backend))
	(tree / "front-end/package.json").write_text(json.dumps(package))
	(tree / "package-lock.json").write_text(json.dumps({
		"version": version,
		"lockfileVersion": 3,
		"packages": {"back-end": backend},
	}))
	(tree / artifact.IDENTITY).write_text(json.dumps({
		"release": f"v{version}",
		"commitSha": commit,
		"preparedAt": "2026-09-27T00:00:00Z",
	}))
	(tree / "front-end/dist/index.html").write_text("<!doctype html><title>Restoration fixture</title>\n")
	(tree / "back-end/dist/app.js").write_text(
		"import { writeFileSync } from 'node:fs'; writeFileSync('/fixture/ROOT_CODE_EXECUTED','bad')\n"
	)
	for path in tree.rglob("*"):
		path.chmod(0o755 if path.is_dir() else 0o644)
	manifest = {
		"format": 1,
		"commit": commit,
		"contractVersion": contract["version"],
		"contractSha256": artifact.digest(artifact.CONTRACT),
		"files": artifact.inventory(tree),
	}
	(tree / artifact.MANIFEST).write_text(json.dumps(manifest, sort_keys=True))
	archive = root / "incoming" / f"{name}.tar.gz"
	with tarfile.open(archive, "w:gz") as target:
		for path in sorted(tree.rglob("*")):
			if path.is_file():
				target.add(path, arcname=path.relative_to(tree).as_posix(), recursive=False)
	archive.chmod(0o600)
	digest = hashlib.sha256(archive.read_bytes()).hexdigest()
	return tree, archive, digest


def accepted_record(root: Path, target: Path, archive_sha: str, commit: str):
	identity = json.loads((target / ".restoration-release-prepared.json").read_text())
	key = hashlib.sha256(str(target).encode()).hexdigest()
	record = root / ".deployment-recovery/accepted" / f"{key}.json"
	record.write_text(json.dumps({
		"format": 1,
		"target": str(target),
		"archiveSha256": archive_sha,
		"commit": commit,
		"manifestSha256": hashlib.sha256((target / "runtime-manifest.json").read_bytes()).hexdigest(),
		"release": identity["release"],
		"preparedAt": identity["preparedAt"],
		"deployedAt": "2026-09-26T00:00:00Z",
	}, sort_keys=True))
	record.chmod(0o600)
	return record


def setup(root: Path, mode: str):
	root.mkdir(parents=True, mode=0o755)
	for directory, mode in [
		(root / "releases", 0o755),
		(root / "legacy-releases", 0o755),
		(root / "artifacts", 0o700),
		(root / "incoming", 0o700),
		(root / ".deployment-recovery", 0o700),
		(root / ".deployment-recovery/accepted", 0o700),
		(root / "etc", 0o700),
	]:
		directory.mkdir(mode=mode)
	control = root / "control"
	(control / "deploy/systemd").mkdir(parents=True)
	(control / "scripts").mkdir(parents=True)
	(control / "deploy").mkdir(exist_ok=True)
	for source, destination in [
		(SOURCE / "deploy/systemd/promote-release.sh", control / "deploy/systemd/promote-release.sh"),
		(SOURCE / "deploy/systemd/trusted-paths.py", control / "deploy/systemd/trusted-paths.py"),
		(SOURCE / "scripts/runtime-artifact.py", control / "scripts/runtime-artifact.py"),
		(SOURCE / "scripts/legacy-runtime.py", control / "scripts/legacy-runtime.py"),
		(SOURCE / "deploy/runtime-artifact.json", control / "deploy/runtime-artifact.json"),
	]:
		shutil.copy2(source, destination)
	artifact = load_artifact(control)
	_candidate_tree, candidate_archive, candidate_sha = make_archive(
		root, artifact, "1.0.1", CANDIDATE_COMMIT, "candidate"
	)
	previous_tree, previous_archive, previous_sha = make_archive(
		root, artifact, "1.0.0", PREVIOUS_COMMIT, "previous"
	)
	previous = root / "releases" / f"v1.0.0-{PREVIOUS_COMMIT[:12]}"
	shutil.copytree(previous_tree, previous)
	retained_previous = root / "artifacts" / f"{previous_sha}.tar.gz"
	shutil.copy2(previous_archive, retained_previous)
	retained_previous.chmod(0o600)
	previous_record = accepted_record(root, previous, previous_sha, PREVIOUS_COMMIT)
	if mode.startswith("legacy-"):
		legacy = load_legacy(control)
		legacy_source = root / "legacy-source"
		shutil.copytree(previous_tree, legacy_source)
		for package_path in ["package.json", "back-end/package.json", "front-end/package.json"]:
			value = json.loads((legacy_source / package_path).read_text())
			value["version"] = "4.0.4"
			(legacy_source / package_path).write_text(json.dumps(value))
		lock = json.loads((legacy_source / "package-lock.json").read_text())
		lock["version"] = "4.0.4"
		lock["packages"]["back-end"]["version"] = "4.0.4"
		(legacy_source / "package-lock.json").write_text(json.dumps(lock))
		(legacy_source / ".restoration-release-prepared.json").write_text(json.dumps({
			"release": legacy.LEGACY_RELEASE,
			"commitSha": legacy.LEGACY_COMMIT,
			"deployedAt": "2026-09-26T00:00:00Z",
		}))
		for path in legacy_source.rglob("*"):
			path.chmod(0o755 if path.is_dir() else 0o644)
		previous = root / "legacy-releases" / f"legacy-v4.0.4-{legacy.LEGACY_COMMIT[:12]}"
		legacy.capture(legacy_source, previous)
	(root / "current").symlink_to(previous)
	return control, candidate_archive, candidate_sha, previous, previous_record


Path("/usr/local/bin").mkdir(parents=True)
for command_name in ["curl", "nginx", "sleep", "systemctl"]:
	command = Path("/usr/local/bin") / command_name
	command.write_text(STUB)
	command.chmod(0o755)

modes = [
	"success",
	"legacy-success",
	"legacy-bad-health",
	"bad-health",
	"interrupt",
	"restart-failure",
	"nginx-failure",
	"rollback-failure",
	"lock-contention",
	"wrong-digest",
	"mutable-helper",
	"mutable-archive",
	"tampered-previous",
	"missing-previous-acceptance",
	"first-success",
	"first-failure",
]
if len(sys.argv) > 1 and sys.argv[1] != "all":
	assert sys.argv[1] in modes
	modes = [sys.argv[1]]

for mode in modes:
	root = Path("/fixture") / mode
	control, archive, digest, previous, previous_record = setup(root, mode)
	if mode.startswith("first-"):
		(root / "current").unlink()
	if mode == "wrong-digest":
		digest = "0" * 64
	if mode == "mutable-helper":
		(control / "deploy/systemd/promote-release.sh").chmod(0o777)
	if mode == "mutable-archive":
		archive.chmod(0o666)
	if mode == "tampered-previous":
		(previous / "back-end/dist/server.js").write_text("tampered\n")
	if mode == "missing-previous-acceptance":
		previous_record.unlink()
	held = None
	if mode == "lock-contention":
		held = (root / ".deployment-recovery/promotion.lock").open("w")
		fcntl.flock(held, fcntl.LOCK_EX | fcntl.LOCK_NB)
	environment = {
		**os.environ,
		"ARTIFACT_ROOT": str(root / "artifacts"),
		"CURRENT_LINK": str(root / "current"),
		"FIXTURE_MODE": mode,
		"FIXTURE_ROOT": str(root),
		"LEGACY_ROOT": str(root / "legacy-releases"),
		"MAX_ATTEMPTS": "2",
		"NODE_BIN": "/runtime/node",
		"RELEASE_ENV_DEST": str(root / "etc/release.env"),
		"RELEASE_GROUP": "root",
		"RELEASE_ROOT": str(root / "releases"),
	}
	command = [
		"bash",
		str(control / "deploy/systemd/promote-release.sh"),
		str(archive),
		digest,
		CANDIDATE_COMMIT,
	]
	try:
		result = subprocess.run(command, env=environment, capture_output=True, text=True, timeout=20)
	finally:
		if held:
			held.close()
	evidence = result.stdout + result.stderr
	success = mode in {"success", "legacy-success", "first-success"}
	assert (result.returncode == 0) == success, (mode, evidence)
	assert not Path("/fixture/ROOT_CODE_EXECUTED").exists(), (mode, "candidate code executed as root")
	candidate = root / "releases" / f"v1.0.1-{CANDIDATE_COMMIT[:12]}"
	if mode == "first-failure":
		assert not (root / "current").exists(), evidence
	elif mode not in {"mutable-helper"}:
		assert (root / "current").resolve() == (candidate if success else previous), (mode, evidence)
	records = list((root / ".deployment-recovery").glob("promotion-????????"))
	if mode == "rollback-failure":
		assert len(records) == 1 and stat.S_IMODE(records[0].stat().st_mode) == 0o600, evidence
	else:
		assert not records, (mode, evidence)
	assert not list((root / "releases").glob(".stage-*")), (mode, "staging directory retained")
	if mode == "interrupt":
		assert result.returncode == 143 and (root / "interrupted").exists(), evidence
	if success:
		probes = (root / "probes").read_text()
		assert "--ipv4" in probes and "--ipv6" in probes and "/readyz" in probes
	print(json.dumps({"promotionRecovery": mode, "result": "passed"}), flush=True)
