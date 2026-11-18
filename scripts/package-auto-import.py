import argparse
import base64
import gzip
import hashlib
import io
import json
from pathlib import Path, PurePosixPath
import stat
import tarfile


ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / 'vendor/unplugin-auto-import'
TARGET = ROOT / 'vendor/unplugin-auto-import-21.1.0-webops.1.tgz'


def require(condition, message):
    if not condition:
        raise ValueError(message)


def integrity(payload):
    return 'sha512-' + base64.b64encode(hashlib.sha512(payload).digest()).decode()


def archive_files(payload):
    require(len(payload) <= 4 * 1024 * 1024, 'Compressed parent archive exceeds its bound')
    with gzip.GzipFile(fileobj=io.BytesIO(payload)) as compressed:
        expanded = compressed.read(8 * 1024 * 1024 + 1)
    require(len(expanded) <= 8 * 1024 * 1024, 'Expanded parent archive exceeds its bound')
    files, modes = {}, {}
    with tarfile.open(fileobj=io.BytesIO(expanded), mode='r:') as archive:
        for member in archive:
            name = PurePosixPath(member.name)
            require(member.isfile() and str(name) == member.name and name.parts[0] == 'package' and len(name.parts) > 1 and '..' not in name.parts, 'Parent members must be safe regular package files')
            require(member.name not in files and len(files) < 64, 'Duplicate or excessive parent members')
            require(member.mode == 0o644 and member.size <= 2 * 1024 * 1024, 'Unexpected parent file mode or size')
            files[member.name] = archive.extractfile(member).read()
            modes[member.name] = member.mode
    return files, modes


def build_archive(payload, record):
    require(record['schemaVersion'] == 1 and record['patchedVersion'] == '21.1.0+webops.1', 'Review changed parent identity')
    require(record['qualifiedDependencies'] == {'unimport': '^7.0.3', 'local-pkg': '^2.0.0'}, 'Review changed provider qualification')
    require(integrity(payload) == record['integrity'] and hashlib.sha256(payload).hexdigest() == record['archiveSha256'], 'Original parent integrity mismatch')
    files, modes = archive_files(payload)
    require(len(files) == 25, 'Review changed complete parent inventory')
    require({name.removeprefix('package/'): hashlib.sha256(value).hexdigest() for name, value in files.items()} == record['files'], 'Original parent file inventory mismatch')
    require({name.removeprefix('package/'): mode for name, mode in modes.items()} == record['modes'], 'Original parent modes mismatch')
    required = {'LICENSE', 'dist/index.mjs', 'dist/vite.mjs', 'dist/vite.d.mts', 'dist/types-BbDO-6wC.d.mts', 'dist/src-C6T5sjAq.mjs'}
    require({'package/' + name for name in required} <= files.keys(), 'Required parent runtime, declaration or license missing')
    original = files['package/package.json']
    metadata = json.loads(original)
    require(metadata == record['package'] and metadata['name'] == 'unplugin-auto-import' and metadata['version'] == '21.1.0', 'Original parent metadata mismatch')
    require(metadata['dependencies']['unimport'] == '^6.4.0' and metadata['dependencies']['local-pkg'] == '^1.2.1', 'Review changed upstream provider requirements')
    metadata.update(version=record['patchedVersion'], private=True)
    metadata['dependencies'].update(record['qualifiedDependencies'])
    files['package/package.json'] = (json.dumps(metadata, indent=2) + '\n').encode()
    files['package/UPSTREAM-PACKAGE.json'] = original
    files['package/WEBOPS-AUTO-IMPORT.json'] = (json.dumps(record, indent=2) + '\n').encode()
    output = io.BytesIO()
    with gzip.GzipFile(fileobj=output, mode='wb', filename='', mtime=0, compresslevel=9) as compressed:
        with tarfile.open(fileobj=compressed, mode='w', format=tarfile.PAX_FORMAT) as archive:
            for name, data in sorted(files.items()):
                member = tarfile.TarInfo(name)
                member.mode = 0o644
                member.size = len(data)
                archive.addfile(member, io.BytesIO(data))
    return output.getvalue()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--check', action='store_true')
    arguments = parser.parse_args()
    record = json.loads((SOURCE / 'UPSTREAM.json').read_text())
    require(record['archive'] == 'upstream/unplugin-auto-import-21.1.0.tgz', 'Review changed original parent path')
    payload = build_archive((SOURCE / record['archive']).read_bytes(), record)
    if arguments.check:
        require(stat.S_ISREG(TARGET.lstat().st_mode) and TARGET.read_bytes() == payload, 'Parent archive does not reproduce')
        lock = json.loads((ROOT / 'package-lock.json').read_text())['packages']
        consumers = [(filename, metadata) for filename, metadata in lock.items() if filename.endswith('node_modules/unplugin-auto-import')]
        require(bool(consumers), 'A real parent consumer is required')
        contents, _modes = archive_files(payload)
        for filename, metadata in consumers:
            require(metadata['version'] == record['patchedVersion'] and metadata['integrity'] == integrity(payload), 'Every parent consumer must bind the qualified archive')
            for name, data in contents.items():
                installed = ROOT / filename / name.removeprefix('package/')
                require(stat.S_ISREG(installed.lstat().st_mode) and installed.read_bytes() == data, 'Installed parent byte mismatch')
    else:
        require(not TARGET.is_symlink(), 'Parent output must remain local')
        TARGET.write_bytes(payload)
    print('Qualified auto-import parent ' + ('verified' if arguments.check else 'reproduced'))


if __name__ == '__main__':
    main()
