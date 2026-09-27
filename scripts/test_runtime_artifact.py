import hashlib
import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import tarfile
import tempfile
import unittest


SPEC = importlib.util.spec_from_file_location("artifact", Path(__file__).with_name("runtime-artifact.py"))
artifact = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(artifact)
LEGACY_SPEC = importlib.util.spec_from_file_location("legacy", Path(__file__).with_name("legacy-runtime.py"))
legacy = importlib.util.module_from_spec(LEGACY_SPEC)
LEGACY_SPEC.loader.exec_module(legacy)


class RuntimeArtifactTests(unittest.TestCase):
    def setUp(self):
        base = Path(__file__).resolve().parent.parent / ".ai-work/runs"
        base.mkdir(parents=True, exist_ok=True)
        self.temporary = tempfile.TemporaryDirectory(dir=base)
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        self.contract = artifact.load_contract()
        for name in self.contract["required"]:
            path = self.root / name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text("synthetic runtime file\n")
        package = {"version": "1.0.0"}
        backend = {"version": "1.0.0", "dependencies": {}}
        (self.root / "package.json").write_text(json.dumps(package))
        (self.root / "back-end/package.json").write_text(json.dumps(backend))
        (self.root / "front-end/package.json").write_text(json.dumps(package))
        (self.root / "package-lock.json").write_text(json.dumps({
            "version": "1.0.0",
            "lockfileVersion": 3,
            "packages": {"back-end": backend},
        }))
        (self.root / artifact.IDENTITY).write_text(json.dumps({
            "release": "v1.0.0",
            "commitSha": "a" * 40,
            "preparedAt": "2026-09-27T00:00:00Z",
        }))
        for path in self.root.rglob("*"):
            path.chmod(0o755 if path.is_dir() else 0o644)

    def manifest(self):
        return {
            "format": 1,
            "commit": "a" * 40,
            "contractVersion": self.contract["version"],
            "contractSha256": artifact.digest(artifact.CONTRACT),
            "files": artifact.inventory(self.root),
        }

    def test_valid_tree(self):
        artifact.validate(self.root, self.manifest())

    def test_hash_tampering(self):
        manifest = self.manifest()
        (self.root / "back-end/dist/app.js").write_text("changed")
        with self.assertRaisesRegex(ValueError, "inventory"):
            artifact.validate(self.root, manifest)

    def test_missing_module_even_if_inventory_is_rehashed(self):
        (self.root / "back-end/dist/contact.js").unlink()
        with self.assertRaisesRegex(ValueError, "required runtime path missing"):
            artifact.validate(self.root, self.manifest())

    def test_private_state_symlinks_and_writable_files_are_rejected(self):
        for name in [".env", "credentials.json", "back-end/dist/key.pem", "back-end/dist/site.sqlite3"]:
            with self.subTest(name=name):
                path = self.root / name
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_text("synthetic forbidden content")
                with self.assertRaisesRegex(ValueError, "forbidden"):
                    self.manifest()
                path.unlink()
        escape = self.root / "back-end/dist/escape"
        escape.symlink_to("/tmp")
        with self.assertRaisesRegex(ValueError, "unsafe artifact object"):
            self.manifest()
        escape.unlink()
        writable = self.root / "back-end/dist/server.js"
        writable.chmod(0o666)
        with self.assertRaisesRegex(ValueError, "writable artifact path"):
            self.manifest()

    def test_unlisted_dependency_is_rejected_and_pruned(self):
        package = self.root / "node_modules/unrelated/package.json"
        package.parent.mkdir(parents=True)
        package.write_text(json.dumps({"name": "unrelated", "version": "1.0.0"}))
        package.parent.chmod(0o755)
        package.chmod(0o644)
        with self.assertRaisesRegex(ValueError, "production closure"):
            artifact.validate(self.root, self.manifest())
        self.assertEqual(artifact.prune_runtime_dependencies(self.root), ["node_modules/unrelated"])
        artifact.validate(self.root, self.manifest())

    def test_dependency_names_cannot_escape_the_artifact(self):
        backend = json.loads((self.root / "back-end/package.json").read_text())
        backend["dependencies"] = {"../../outside": "1.0.0"}
        (self.root / "back-end/package.json").write_text(json.dumps(backend))
        lock = json.loads((self.root / "package-lock.json").read_text())
        lock["packages"]["back-end"]["dependencies"] = backend["dependencies"]
        (self.root / "package-lock.json").write_text(json.dumps(lock))
        with self.assertRaisesRegex(ValueError, "invalid production dependency name"):
            artifact.validate(self.root, self.manifest())

    def test_exact_archive_roundtrip_rejects_post_copy_rehashing(self):
        with tempfile.TemporaryDirectory(dir=self.root.parent) as temporary:
            output = Path(temporary)
            archive = output / "runtime.tar.gz"
            unpacked = output / "unpacked"
            unpacked.mkdir()
            (self.root / artifact.MANIFEST).write_text(json.dumps(self.manifest()))
            with tarfile.open(archive, "w:gz") as target:
                for path in self.root.rglob("*"):
                    if path.is_file():
                        target.add(path, arcname=path.relative_to(self.root).as_posix(), recursive=False)
            sha = hashlib.sha256(archive.read_bytes()).hexdigest()
            command = [sys.executable, "-B", str(Path(artifact.__file__))]
            arguments = ["--archive", str(archive), "--sha256", sha, "--commit", "a" * 40]
            subprocess.run([*command, "unpack", str(unpacked), *arguments], check=True, capture_output=True)
            subprocess.run([*command, "verify", str(unpacked), *arguments], check=True, capture_output=True)
            (unpacked / "back-end/dist/contact.js").unlink()
            manifest = json.loads((unpacked / artifact.MANIFEST).read_text())
            manifest["files"].pop("back-end/dist/contact.js")
            (unpacked / artifact.MANIFEST).write_text(json.dumps(manifest))
            result = subprocess.run([*command, "verify", str(unpacked), *arguments], capture_output=True, text=True)
            self.assertNotEqual(result.returncode, 0)
            self.assertIn("differs from trusted archive", result.stderr)


class LegacyRuntimeTests(unittest.TestCase):
    def setUp(self):
        base = Path(__file__).resolve().parent.parent / ".ai-work/runs"
        base.mkdir(parents=True, exist_ok=True)
        self.temporary = tempfile.TemporaryDirectory(dir=base)
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        for name in legacy.REQUIRED:
            path = self.root / name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text("synthetic legacy runtime file\n")
        package = {"version": "4.0.4"}
        backend = {"version": "4.0.4", "dependencies": {}}
        (self.root / "package.json").write_text(json.dumps(package))
        (self.root / "back-end/package.json").write_text(json.dumps(backend))
        (self.root / "front-end/package.json").write_text(json.dumps(package))
        (self.root / "package-lock.json").write_text(json.dumps({
            "version": "4.0.4",
            "lockfileVersion": 3,
            "packages": {"back-end": backend},
        }))
        (self.root / legacy.IDENTITY).write_text(json.dumps({
            "release": legacy.LEGACY_RELEASE,
            "commitSha": legacy.LEGACY_COMMIT,
            "deployedAt": "2026-09-26T00:00:00Z",
        }))
        for path in self.root.rglob("*"):
            path.chmod(0o755 if path.is_dir() else 0o644)
        self.write_manifest()

    def write_manifest(self):
        (self.root / legacy.MANIFEST).write_text(json.dumps({
            "format": 1,
            "kind": "restoration-v4.0.4-legacy-rollback",
            "release": legacy.LEGACY_RELEASE,
            "commit": legacy.LEGACY_COMMIT,
            "deployedAt": "2026-09-26T00:00:00Z",
            "files": legacy.inventory(self.root),
        }))
        (self.root / legacy.MANIFEST).chmod(0o600)

    def test_exact_legacy_runtime_is_accepted(self):
        self.assertEqual(legacy.verify(self.root)["commit"], legacy.LEGACY_COMMIT)

    def test_legacy_runtime_tampering_is_rejected(self):
        (self.root / "back-end/dist/server.js").write_text("tampered\n")
        with self.assertRaisesRegex(ValueError, "differs"):
            legacy.verify(self.root)

    def test_other_legacy_identity_is_rejected(self):
        identity = json.loads((self.root / legacy.IDENTITY).read_text())
        identity["commitSha"] = "c" * 40
        (self.root / legacy.IDENTITY).write_text(json.dumps(identity))
        with self.assertRaisesRegex(ValueError, "exact reviewed"):
            legacy.verify(self.root)


if __name__ == "__main__":
    unittest.main()
