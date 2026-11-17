import argparse
import gzip
import hashlib
import io
import json
from pathlib import Path
import stat
import tarfile


root = Path(__file__).resolve().parent.parent
source = root / 'vendor/vite-plugin-vue-layouts-next'
destination = root / 'vendor/vite-plugin-vue-layouts-next-3.3.1-webops.1.tgz'
filenames = [
    'LICENSE', 'README.md', 'UPSTREAM.md', 'client.d.ts',
    'dist/index.d.mts', 'dist/index.mjs', 'dist/layoutName-DVkP7Qpo.mjs',
    'dist/runtime.d.mts', 'dist/runtime.mjs', 'package.json',
]
parser = argparse.ArgumentParser()
parser.add_argument('--check', action='store_true')
arguments = parser.parse_args()
manifest = json.loads((source / 'package.json').read_text())
assert manifest['name'] == 'vite-plugin-vue-layouts-next'
assert manifest['version'] == '3.3.1'
output = io.BytesIO()
with gzip.GzipFile(fileobj=output, mode='wb', filename='', mtime=0, compresslevel=9) as compressed:
    with tarfile.open(fileobj=compressed, mode='w', format=tarfile.PAX_FORMAT) as archive:
        for filename in sorted(filenames):
            original = source / filename
            assert stat.S_ISREG(original.lstat().st_mode), filename
            payload = original.read_bytes()
            member = tarfile.TarInfo(f'package/{filename}')
            member.size = len(payload)
            member.mode = 0o644
            archive.addfile(member, io.BytesIO(payload))
payload = output.getvalue()
if arguments.check:
    assert destination.read_bytes() == payload, 'The layouts archive must reproduce the retained source exactly'
else:
    with destination.open('xb') as archive:
        archive.write(payload)
print(json.dumps({'archive': destination.name, 'sha256': hashlib.sha256(payload).hexdigest(), 'sourceFiles': len(filenames)}))
