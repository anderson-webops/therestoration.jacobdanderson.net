import argparse
import gzip
import hashlib
import importlib.util
import io
import json
from pathlib import Path, PurePosixPath
import tarfile


SPEC = importlib.util.spec_from_file_location('unimport_build', Path(__file__).with_name('build-unimport-source.py'))
BUILD = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(BUILD)
ROOT = BUILD.ROOT
SOURCE = BUILD.SOURCE
parser = argparse.ArgumentParser()
parser.add_argument('--installed', action='store_true')
parser.add_argument('--installed-prefix', type=Path)
arguments = parser.parse_args()
original = SOURCE.verify_source()
qualification = json.loads((SOURCE.SOURCE / 'QUALIFIED.json').read_text())
SOURCE.require(qualification['schemaVersion'] == 1 and qualification['commit'] == '08f3b30e16373ee63e3f40bce86741fc9b97b821', 'Review changed canonical source qualification')
SOURCE.require(qualification['compilerArchive'] == 'vendor/unimport-7.0.3-webops.2.tgz', 'Review changed compiler archive path')
expected_inputs = {'scripts/check-unimport-source.py', 'scripts/build-unimport-source.py', 'scripts/unimport-build.config.mjs', 'vendor/unimport/build/package.json', 'vendor/unimport/build/package-lock.json', 'vendor/unimport/runtime/package.json', 'vendor/unimport/runtime/package-lock.json'}
SOURCE.require(set(qualification['inputs']) == expected_inputs, 'The complete qualified source recipe is required')
for filename, digest in qualification['inputs'].items():
    SOURCE.require(not Path(filename).is_absolute() and '..' not in Path(filename).parts, 'Canonical inputs must remain repository relative')
    SOURCE.require(hashlib.sha256(SOURCE.regular_bytes(ROOT / filename)).hexdigest() == digest, 'Canonical source-build input mismatch')
payload = SOURCE.regular_bytes(ROOT / qualification['compilerArchive'])
SOURCE.require(len(payload) <= 4 * 1024 * 1024 and hashlib.sha256(payload).hexdigest() == qualification['compilerArchiveSha256'], 'Qualified compiler archive mismatch')
files = {}
with gzip.GzipFile(fileobj=io.BytesIO(payload)) as compressed:
    expanded = compressed.read(8 * 1024 * 1024 + 1)
SOURCE.require(len(expanded) <= 8 * 1024 * 1024, 'Expanded compiler archive exceeds its bound')
with tarfile.open(fileobj=io.BytesIO(expanded), mode='r:') as archive:
    for member in archive:
        name = PurePosixPath(member.name)
        SOURCE.require(member.isfile() and member.mode == 0o644 and name.parts[0] == 'package' and len(name.parts) > 1 and str(name) == member.name and '..' not in name.parts and not name.is_absolute(), 'Compiler archive must contain safe regular package files')
        SOURCE.require(member.size <= 2 * 1024 * 1024 and len(files) < 64 and member.name not in files, 'Compiler archive inventory exceeds its bounds')
        files[member.name.removeprefix('package/')] = archive.extractfile(member).read()
required = {'dist/index.mjs', 'dist/unplugin.mjs', 'dist/addons.mjs', 'dist/index.d.mts', 'dist/unplugin.d.mts', 'dist/addons.d.mts', 'package.json', 'LICENSE', 'README.md', 'UPSTREAM-PACKAGE.json', 'WEBOPS-SOURCE.json'}
SOURCE.require(required <= files.keys(), 'Compiler public runtime, declarations or provenance missing')
provenance = json.loads(files['WEBOPS-SOURCE.json'])
SOURCE.require(provenance['schemaVersion'] == 2 and provenance['source'] == json.loads((SOURCE.SOURCE / 'UPSTREAM.json').read_text()), 'Compiler source provenance mismatch')
SOURCE.require(provenance['build']['node'] == '26.13.1' and provenance['build']['tool'] == 'tsdown@0.23.7', 'Review changed compiler toolchain identity')
for field, filename in {'producerSha256': 'scripts/build-unimport-source.py', 'sourceVerifierSha256': 'scripts/check-unimport-source.py', 'configSha256': 'scripts/unimport-build.config.mjs', 'lockSha256': 'vendor/unimport/build/package-lock.json'}.items():
    SOURCE.require(provenance['build'][field] == qualification['inputs'][filename], 'Compiler recipe differs from the qualified build provenance')
SOURCE.require(provenance['outputSha256'] == {name: hashlib.sha256(data).hexdigest() for name, data in files.items() if name != 'WEBOPS-SOURCE.json'}, 'Compiler output inventory mismatch')
for filename in ['LICENSE', 'README.md']:
    SOURCE.require(files[filename] == original[filename], 'Preserve original compiler license and documentation')
SOURCE.require(files['UPSTREAM-PACKAGE.json'] == original['package.json'], 'Original compiler metadata mismatch')
prepared = BUILD.maintained_source(original)
SOURCE.require(provenance['patches'] == {name: hashlib.sha256(prepared[name]).hexdigest() for name in original if original[name] != prepared[name]}, 'Review changed compiler source patches')
metadata = json.loads(files['package.json'])
SOURCE.require(metadata['name'] == 'unimport' and metadata['version'] == '7.0.3+webops.2', 'Qualified compiler package identity mismatch')
SOURCE.require(all(not value.startswith(('file:', 'link:', 'workspace:')) for value in metadata['dependencies'].values()), 'Compiler runtime requirements must remain portable')
if arguments.installed:
    BUILD.verify_installed(payload, ROOT)
if arguments.installed_prefix:
    BUILD.verify_installed(payload, arguments.installed_prefix.resolve())
print('Signed-source compiler, canonical qualification and public archive verified')
