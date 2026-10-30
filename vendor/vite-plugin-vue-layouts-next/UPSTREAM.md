# Local layouts-plugin dependency patch

Upstream package: `vite-plugin-vue-layouts-next@3.3.1` from npm.
Original tarball integrity: `sha512-lF6ur+g7rez4vYi/AY0txFFFIPl+Vv0upXQVf1eW1wHR1TZep10Erw5VKz3rOu3xZQJvRb6gbkyW/lk9VMLwrA==`.
License: MIT; retained in `LICENSE`.

The distributed plugin declares `brace-expansion@^3.0.9`, which is flagged by
GHSA-3jxr-9vmj-r5cp. Its 3.x line has no patched release. This copy changes
the dependency to `^5.0.12` and the import to that version's named `expand`
export. The local package manifest retains only runtime metadata and drops
upstream's development scripts and dependencies, which npm would otherwise
install into this repository. Keep the other distributed files byte-identical
to the upstream tarball and retest layout glob expansion, the built pages,
audits and the exact release artifact when updating this patch.
