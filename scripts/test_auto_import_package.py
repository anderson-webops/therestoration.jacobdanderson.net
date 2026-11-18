import copy
import importlib.util
import io
import json
from pathlib import Path
import tarfile
import unittest


SPEC = importlib.util.spec_from_file_location('auto_import', Path(__file__).with_name('package-auto-import.py'))
PRODUCER = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(PRODUCER)


class AutoImportPackageTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.record = json.loads((PRODUCER.SOURCE / 'UPSTREAM.json').read_text())
        cls.original = (PRODUCER.SOURCE / cls.record['archive']).read_bytes()

    def test_reproducible_archive_preserves_all_original_code_types_and_licenses(self):
        archive = PRODUCER.build_archive(self.original, self.record)
        self.assertEqual(archive, PRODUCER.build_archive(self.original, self.record))
        self.assertEqual(archive, PRODUCER.TARGET.read_bytes())
        before, modes = PRODUCER.archive_files(self.original)
        after, current_modes = PRODUCER.archive_files(archive)
        self.assertEqual(set(after), set(before) | {'package/UPSTREAM-PACKAGE.json', 'package/WEBOPS-AUTO-IMPORT.json'})
        for filename, data in before.items():
            self.assertEqual(current_modes[filename], modes[filename])
            if filename != 'package/package.json':
                self.assertEqual(after[filename], data, filename)
        self.assertEqual(after['package/UPSTREAM-PACKAGE.json'], before['package/package.json'])
        metadata = json.loads(after['package/package.json'])
        expected = json.loads(before['package/package.json'])
        expected.update(version=self.record['patchedVersion'], private=True)
        expected['dependencies'].update(self.record['qualifiedDependencies'])
        self.assertEqual(metadata, expected)

    def test_changed_identity_digest_provider_and_inventory_fail_closed(self):
        for field, value in [('schemaVersion', 100), ('patchedVersion', '21.1.0'), ('integrity', 'sha512-invalid'), ('qualifiedDependencies', {'unimport': '*', 'local-pkg': '*'})]:
            with self.subTest(field=field):
                record = copy.deepcopy(self.record)
                record[field] = value
                with self.assertRaises(ValueError):
                    PRODUCER.build_archive(self.original, record)
        record = copy.deepcopy(self.record)
        del record['files']['dist/vite.mjs']
        with self.assertRaises(ValueError):
            PRODUCER.build_archive(self.original, record)
        with self.assertRaises(ValueError):
            PRODUCER.build_archive(self.original + b'changed', self.record)

    def test_unsafe_paths_links_duplicate_members_and_expansion_fail_closed(self):
        for filename, kind in [('package/../escape', tarfile.REGTYPE), ('package/link', tarfile.SYMTYPE), ('/outside', tarfile.REGTYPE)]:
            output = io.BytesIO()
            with tarfile.open(fileobj=output, mode='w:gz') as bundle:
                member = tarfile.TarInfo(filename)
                member.mode = 0o644
                member.type = kind
                bundle.addfile(member)
            with self.assertRaises(ValueError):
                PRODUCER.archive_files(output.getvalue())
        output = io.BytesIO()
        with tarfile.open(fileobj=output, mode='w:gz') as bundle:
            for _unused in range(2):
                member = tarfile.TarInfo('package/repeated')
                member.mode = 0o644
                bundle.addfile(member)
        with self.assertRaises(ValueError):
            PRODUCER.archive_files(output.getvalue())
        with self.assertRaises(ValueError):
            PRODUCER.archive_files(b'x' * (4 * 1024 * 1024 + 1))


if __name__ == '__main__':
    unittest.main()
